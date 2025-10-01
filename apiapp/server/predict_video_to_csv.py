#!/usr/bin/env python3
"""
Predict FACS/HMM from a video and save predictions to CSV.

- Uses py-feat Detector to extract FACS Action Units (AUs) from the video.
- Loads a pre-trained Poisson HMM from the artifacts directory and predicts HMM states
  over the AU time series.
- Appends the predicted state per frame to the extracted features and saves to CSV.
- Optionally appends expected AUs per frame under the HMM model (if lambdas_ present).

Example:
    python predict_video_to_csv.py \
        --video 1_video.mp4 \
        --output output_video_analize.csv \
        --artifacts artifacts \
        --fps 25 --skip-frames 25 --face-threshold 0.95

Artifacts expected (created by FACS_HMM.ipynb):
    - artifacts/hmm_poisson.joblib
    - artifacts/meta.json           (must contain: labels, raw_data_multiplier)

Notes:
- The HMM was trained on integer-valued observations. We align incoming AU columns to
  the training labels and scale to non-negative integers using the saved
  raw_data_multiplier. This matches the notebook's data preparation for PoissonHMM.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import List, Optional

import numpy as np

# SciPy compatibility shim for py-feat expecting scipy.integrate.simps on modern SciPy
try:
    import scipy
    from scipy import integrate as _integrate  # type: ignore
    if not hasattr(_integrate, "simps"):
        from scipy.integrate import simpson as _simpson  # type: ignore
        setattr(_integrate, "simps", _simpson)  # provide alias
except Exception as _e:
    print("[warn] SciPy simps compatibility shim failed:", _e, file=sys.stderr)

# Compatibility shim for environments where lib2to3 is unavailable (e.g., Python 3.12+)
try:
    import sys as _sys, types as _types  # noqa: F401
    if 'lib2to3.pytree' not in _sys.modules:
        _lib2to3 = _types.ModuleType('lib2to3')
        _pytree = _types.ModuleType('lib2to3.pytree')
        def convert(node):  # minimal stub used by py-feat's ResMaskNet wrapper
            return node
        _pytree.convert = convert  # type: ignore
        _lib2to3.pytree = _pytree  # type: ignore
        _sys.modules['lib2to3'] = _lib2to3
        _sys.modules['lib2to3.pytree'] = _pytree
except Exception as _e:
    print("[warn] lib2to3 compatibility shim failed:", _e, file=sys.stderr)

from joblib import load

# py-feat
try:
    from feat import Detector, Fex  # type: ignore
except Exception:
    # Fallback import path as used in the notebook
    import feat as _feat  # type: ignore
    try:
        from feat.data import Fex as _Fex  # type: ignore
        setattr(_feat, "Fex", _Fex)
        from feat.detector import Detector  # type: ignore
        Fex = _Fex  # type: ignore
    except Exception as e:  # pragma: no cover
        print("[error] Could not import py-feat Detector/Fex:", e, file=sys.stderr)
        raise


def _load_artifacts(artifacts_dir: Path):
    model_path = artifacts_dir / "hmm_poisson.joblib"
    meta_path = artifacts_dir / "meta.json"
    if not model_path.exists():
        raise FileNotFoundError(f"HMM model not found: {model_path}")
    if not meta_path.exists():
        raise FileNotFoundError(f"Meta file not found: {meta_path}")
    model = load(model_path)
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
    labels: List[str] = list(meta.get("labels", []))
    if not labels:
        raise ValueError("meta.json does not contain non-empty 'labels'")
    raw_data_multiplier: int = int(meta.get("raw_data_multiplier", 100))
    return model, labels, raw_data_multiplier, meta


def _get_fex_dataframe(fex: Fex):
    """Obtain a pandas DataFrame from a Fex while remaining robust to py-feat versions."""
    import pandas as pd  # local import to keep import-time fast if unused
    # Try known accessors in order
    for attr in ("to_pandas", "to_dataframe", "df", "data"):
        if hasattr(fex, attr):
            obj = getattr(fex, attr)
            try:
                df = obj() if callable(obj) else obj
                if isinstance(df, pd.DataFrame):
                    return df
            except Exception:
                pass
    # As a last resort, try converting via CSV roundtrip in-memory
    try:
        from io import StringIO
        s = StringIO()
        fex.to_csv(s)  # type: ignore
        s.seek(0)
        return pd.read_csv(s)
    except Exception as e:  # pragma: no cover
        raise RuntimeError("Could not obtain pandas DataFrame from Fex") from e


def _extract_aus_df(fex: Fex, prefer_labels: Optional[List[str]] = None):
    """Get AU intensity DataFrame from Fex. If prefer_labels provided, reindex to those."""
    import pandas as pd
    aus_df: Optional["pd.DataFrame"] = None

    # Preferred: property/attribute .aus
    if hasattr(fex, "aus"):
        try:
            aus = getattr(fex, "aus")
            # Some versions expose a property that is already a DataFrame
            if hasattr(aus, "reindex"):
                aus_df = aus  # type: ignore
        except Exception:
            aus_df = None

    # Fallback: filter columns from full DataFrame
    if aus_df is None:
        df = _get_fex_dataframe(fex)
        au_cols = [c for c in df.columns if isinstance(c, str) and c.startswith("AU") and "_" not in c]
        if not au_cols:
            # Try OpenFace-like columns AUxx_r
            au_cols_r = [c for c in df.columns if isinstance(c, str) and c.startswith("AU") and c.endswith("_r")]
            if au_cols_r:
                # Map AU01_r -> AU01
                mapping = {c: c.split("_")[0] for c in au_cols_r}
                tmp = df[au_cols_r].copy()
                tmp.columns = [mapping[c] for c in au_cols_r]
                aus_df = tmp
        else:
            aus_df = df[au_cols].copy()

    if aus_df is None:
        raise ValueError("Could not locate AU columns in Fex/DataFrame")

    if prefer_labels:
        aus_df = aus_df.reindex(columns=list(prefer_labels), fill_value=0.0)

    return aus_df


def _predict_states(model, aus_df, raw_multiplier: int):
    """Convert AU DF to integer matrix X and predict HMM states and probs."""
    # Ensure non-negative values as in the notebook: X = int(raw_mult * (obs - min(obs)))
    values = aus_df.values.astype(float)
    if values.size == 0:
        raise ValueError("Empty AU matrix for HMM prediction")
    min_val = np.nanmin(values)
    shift = 0.0
    if np.isfinite(min_val) and min_val < 0:
        shift = -min_val
    X = (raw_multiplier * (values + shift)).astype(np.int64)

    # HMM predictions
    states = model.predict(X)
    proba = None
    if hasattr(model, "predict_proba"):
        try:
            proba = model.predict_proba(X)
        except Exception:
            proba = None
    return states, proba, X


def run(video_path: Path, output_csv: Path, artifacts_dir: Path,
        fps: int = 25, skip_frames: int = 25, face_threshold: float = 0.95,
        write_lambda_aus: bool = True) -> Path:
    """Run detection + HMM prediction and save CSV. Returns output path."""
    # Load artifacts
    model, labels, raw_multiplier, meta = _load_artifacts(artifacts_dir)

    # Detect features using py-feat
    detector = Detector()

    # Call detect_video with robust kwargs handling across py-feat versions
    kwargs = {}
    for k, v in {
        "skip_frames": skip_frames,
        "output_fps": fps,
        "face_detection_threshold": face_threshold,
    }.items():
        kwargs[k] = v

    video_prediction = detector.detect_video(str(video_path), **kwargs)

    # Predict HMM state sequence
    aus_df = _extract_aus_df(video_prediction, prefer_labels=labels)
    # Reindex ensures columns order exactly matches training labels
    aus_df = aus_df.reindex(columns=labels, fill_value=0.0)

    states, proba, X = _predict_states(model, aus_df, raw_multiplier)

    # Attach predictions to Fex
    try:
        video_prediction["HMM_state"] = states
    except Exception:
        # Fallback: convert to DF and add columns
        df = _get_fex_dataframe(video_prediction)
        df["HMM_state"] = states
        df.to_csv(output_csv, index=False)
        return output_csv

    # Optionally append expected AU per frame under the model (if available)
    if write_lambda_aus and hasattr(model, "lambdas_"):
        try:
            lamb = model.lambdas_[states]
            if lamb.shape[1] == len(labels):
                # scale back to float "expected" AUs
                est = lamb.astype(float) / float(raw_multiplier)
                for i, lab in enumerate(labels):
                    col_name = f"HMM_AUexp_{lab}"
                    try:
                        video_prediction[col_name] = est[:, i]
                    except Exception:
                        # ignore if Fex does not allow adding many columns
                        break
        except Exception:
            pass

    # Optionally add per-state probabilities
    if proba is not None:
        try:
            for i in range(proba.shape[1]):
                col_name = f"HMM_p_state_{i}"
                video_prediction[col_name] = proba[:, i]
        except Exception:
            pass

    # Save to CSV using Fex's built-in method if available
    try:
        video_prediction.to_csv(str(output_csv))
    except Exception:
        # Fallback: convert to DataFrame and write
        df = _get_fex_dataframe(video_prediction)
        df.to_csv(output_csv, index=False)

    return output_csv


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Predict HMM states from a video using saved artifacts and save CSV.")
    p.add_argument("--video", required=True, help="Path to input video")
    p.add_argument("--output", required=True, help="Path to output CSV")
    p.add_argument("--artifacts", default="artifacts", help="Path to artifacts directory (with hmm_poisson.joblib, meta.json)")
    p.add_argument("--fps", type=int, default=25, help="Output fps used during detection (py-feat)")
    p.add_argument("--skip-frames", type=int, default=25, help="Process every Nth frame (py-feat)")
    p.add_argument("--face-threshold", type=float, default=0.95, help="Face detection threshold (py-feat)")
    p.add_argument("--no-lambda-aus", action="store_true", help="Do not append model expected AU columns")

    args = p.parse_args(argv)

    video_path = Path(args.video)
    output_csv = Path(args.output)
    artifacts_dir = Path(args.artifacts)

    if not video_path.exists():
        print(f"[error] Video not found: {video_path}", file=sys.stderr)
        return 2
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    output_csv.parent.mkdir(parents=True, exist_ok=True)

    try:
        out = run(
            video_path=video_path,
            output_csv=output_csv,
            artifacts_dir=artifacts_dir,
            fps=args.fps,
            skip_frames=args.skip_frames,
            face_threshold=args.face_threshold,
            write_lambda_aus=(not args.no_lambda_aus),
        )
        print(f"Saved predictions to: {out}")
        return 0
    except Exception as e:
        print(f"[error] Failed: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
