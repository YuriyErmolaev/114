#!/usr/bin/env python3
"""
Create a schematic face animation (py-feat's feat.plotting.plot_face) from a prediction CSV.

Examples:
  python face_avatar_from_csv.py --csv output_video_analize_2.csv --out avatar_face_real.gif --source real --fps 12
  python face_avatar_from_csv.py --csv output_video_analize_2.csv --out avatar_face_hmm.gif --source hmm --fps 12 --limit 300 --size 500x600
"""
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Iterable, List, Optional, Sequence, Tuple
import re
import sys

import numpy as np
import matplotlib
# Non-interactive backend
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from celluloid import Camera

# Optional progress bar
try:
    from tqdm import tqdm
except Exception:  # pragma: no cover
    def tqdm(it: Iterable, **kwargs):
        return it  # type: ignore

# SciPy compatibility shim for py-feat expecting scipy.integrate.simps on modern SciPy
try:  # pragma: no cover - best-effort compatibility
    from scipy import integrate as _integrate  # type: ignore
    if not hasattr(_integrate, "simps"):
        from scipy.integrate import simpson as _simpson  # type: ignore
        setattr(_integrate, "simps", _simpson)
except Exception:
    pass

# Prefer py-feat's read_feat for CSVs if available
try:
    from feat.utils.io import read_feat as _read_feat  # type: ignore
except Exception:  # pragma: no cover
    _read_feat = None

# Required for rendering
try:
    from feat.plotting import plot_face  # type: ignore
except Exception as e:
    plot_face = None  # type: ignore


def _fex_to_dataframe(obj):
    import pandas as pd
    if isinstance(obj, pd.DataFrame):
        return obj
    # Common attribute/methods on Fex-like objects
    for attr in ("to_pandas", "to_dataframe", "df", "data"):
        if hasattr(obj, attr):
            val = getattr(obj, attr)
            try:
                df = val() if callable(val) else val
                if isinstance(df, pd.DataFrame):
                    return df
            except Exception:
                pass
    # Fallback: convert via CSV string roundtrip if possible
    try:
        from io import StringIO
        s = StringIO()
        if hasattr(obj, "to_csv"):
            obj.to_csv(s)  # type: ignore
            s.seek(0)
            return pd.read_csv(s)
    except Exception as e:  # pragma: no cover
        raise RuntimeError("Could not obtain DataFrame from Feat/Fex-like object") from e
    raise TypeError("Unsupported object type for DataFrame conversion")


def _load_csv(path: Path):
    import pandas as pd
    if _read_feat is not None:
        try:
            fex = _read_feat(str(path))
            return _fex_to_dataframe(fex)
        except Exception as e:
            print(f"[warn] read_feat failed ({e}); falling back to pandas.read_csv", file=sys.stderr)
    return pd.read_csv(path)


def _collect_au_columns_real(df) -> List[str]:
    """Return AU columns for source=real. Prefer AUxx; else AUxx_r renamed to AUxx."""
    cols = list(df.columns)
    au_pat = re.compile(r"^AU(\d{2})$")
    aur_pat = re.compile(r"^AU(\d{2})_r$")

    au_cols = [c for c in cols if isinstance(c, str) and au_pat.match(c)]
    if au_cols:
        au_cols.sort(key=lambda c: int(au_pat.match(c).group(1)))  # type: ignore
        return au_cols

    aur_cols = [c for c in cols if isinstance(c, str) and aur_pat.match(c)]
    if aur_cols:
        aur_cols.sort(key=lambda c: int(aur_pat.match(c).group(1)))  # type: ignore
        return aur_cols

    return []


def _collect_au_columns_hmm(df) -> List[str]:
    """Return HMM expected AU columns: HMM_AUexp_AUxx sorted by AU number."""
    cols = list(df.columns)
    pat = re.compile(r"^HMM_AUexp_(AU(\d{2}))$")
    pairs: List[Tuple[int, str]] = []
    for c in cols:
        if isinstance(c, str):
            m = pat.match(c)
            if m:
                au_num = int(m.group(2))
                pairs.append((au_num, c))
    pairs.sort(key=lambda t: t[0])
    return [c for _, c in pairs]


def _values_from_columns(df, cols: List[str]) -> Tuple[np.ndarray, List[str]]:
    """Get numeric array from DataFrame columns. Handles AUxx_r -> AUxx and HMM_AUexp_AUxx -> AUxx renaming."""
    if not cols:
        return np.zeros((0, 0), dtype=float), []
    aur_pat = re.compile(r"^AU(\d{2})_r$")
    names: List[str] = []
    for c in cols:
        m = aur_pat.match(c) if isinstance(c, str) else None
        if m:
            names.append(f"AU{m.group(1)}")
        else:
            if isinstance(c, str) and c.startswith("HMM_AUexp_"):
                names.append(c.replace("HMM_AUexp_", ""))
            else:
                names.append(c if isinstance(c, str) else str(c))
    # Extract values and sanitize
    values = df[cols].astype(float).values
    values = np.where(np.isfinite(values), values, 0.0)
    return values, names


def _parse_size(size_str: Optional[str], dpi: int) -> Tuple[float, float]:
    """Parse size WxH in pixels into matplotlib figsize in inches."""
    default = (400, 500)
    if not size_str:
        w_px, h_px = default
    else:
        m = re.match(r"^(\d+)x(\d+)$", str(size_str).strip())
        if not m:
            raise argparse.ArgumentTypeError("--size must be in the form WxH, e.g., 400x500")
        w_px, h_px = int(m.group(1)), int(m.group(2))
    # Convert pixels to inches using dpi
    return w_px / float(dpi), h_px / float(dpi)


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Generate a schematic face animation from a prediction CSV (AU time series)")
    p.add_argument("--csv", required=True, type=Path, help="Path to the CSV produced by the prediction pipeline")
    p.add_argument("--source", choices=["real", "hmm"], default="real",
                   help="Which AU source to use: real uses AUxx (or AUxx_r fallback), hmm uses HMM_AUexp_AUxx")
    p.add_argument("--out", default=Path("avatar_face.gif"), type=Path, help="Output GIF path")
    p.add_argument("--fps", default=10, type=int, help="Frames per second")
    p.add_argument("--dpi", default=200, type=int, help="DPI for figure rendering")
    p.add_argument("--limit", type=int, default=None, help="Limit to first N frames")
    p.add_argument("--size", type=str, default="400x500", help="Figure size in pixels, WxH (e.g., 400x500)")
    p.add_argument("--title", type=str, default="AU Avatar", help="Figure title")
    p.add_argument("--bgcolor", type=str, default="white", help="Figure background color")
    p.add_argument("--quiet", action="store_true", help="Suppress progress bar")
    return p.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)

    # Check CSV path
    if not args.csv.exists():
        print(f"[error] CSV not found: {args.csv}", file=sys.stderr)
        return 2

    if plot_face is None:
        print("[error] py-feat not available (feat.plotting.plot_face import failed)", file=sys.stderr)
        return 2

    # Load
    try:
        df = _load_csv(args.csv)
    except Exception as e:
        print(f"[error] Failed to load CSV: {e}", file=sys.stderr)
        return 2

    # Collect AUs
    if args.source == "real":
        cols = _collect_au_columns_real(df)
        if not cols:
            print("[error] No AU columns found for source=real. Expected AUxx or AUxx_r columns.", file=sys.stderr)
            return 3
    else:  # hmm
        cols = _collect_au_columns_hmm(df)
        if not cols:
            print("[error] No HMM AU columns found. Expected columns like HMM_AUexp_AU01.", file=sys.stderr)
            return 4

    # Build array and AU names
    values, au_names = _values_from_columns(df, cols)
    if values.size == 0:
        print("[error] AU matrix is empty.", file=sys.stderr)
        return 5

    # Sort AUs numerically by AUxx
    au_pat = re.compile(r"^AU(\d{2})$")
    order = sorted(range(len(au_names)), key=lambda i: int(au_pat.match(au_names[i]).group(1)) if au_pat.match(au_names[i]) else 999)  # type: ignore
    values = values[:, order]
    au_names = [au_names[i] for i in order]

    # Apply frame limit
    if isinstance(args.limit, int) and args.limit is not None and args.limit > 0:
        values = values[: args.limit]

    n_frames, au_dim = values.shape

    # Prepare figure
    try:
        figsize_in = _parse_size(args.size, args.dpi)
    except argparse.ArgumentTypeError as e:
        print(f"[error] {e}", file=sys.stderr)
        return 2

    fig, ax = plt.subplots(figsize=figsize_in, dpi=int(args.dpi))
    # Background color
    try:
        fig.patch.set_facecolor(args.bgcolor)
        ax.set_facecolor(args.bgcolor)
    except Exception:
        pass

    ax.set_axis_off()
    ax.set_title(args.title)

    camera = Camera(fig)

    iterator: Iterable = values
    if not args.quiet:
        iterator = tqdm(values, desc="Rendering frames", unit="f")

    # Render each frame
    # Prefer mapping AU name->value if supported by installed py-feat; otherwise vector
    for row in iterator:
        au_map = {name: float(val) for name, val in zip(au_names, row.tolist())}
        try:
            # as per spec: provide model=None explicitly
            plot_face(model=None, ax=ax, au=au_map)
        except Exception:
            try:
                plot_face(ax=ax, au=au_map)
            except Exception:
                # Last resort: positional vector
                plot_face(model=None, ax=ax, au=row)
        camera.snap()
        # Clear for next frame but keep background and title
        ax.cla()
        try:
            ax.set_facecolor(args.bgcolor)
        except Exception:
            pass
        ax.set_axis_off()
        ax.set_title(args.title)

    # Build animation
    interval_ms = int(round(1000.0 / max(1, int(args.fps))))
    anim = camera.animate(interval=interval_ms, blit=False)

    # Ensure output directory exists
    args.out.parent.mkdir(parents=True, exist_ok=True)

    # Save GIF
    try:
        anim.save(str(args.out), writer="pillow", dpi=int(args.dpi), fps=int(args.fps))
    except Exception as e:
        print(f"[error] Failed to save GIF: {e}", file=sys.stderr)
        return 6

    print(f"Frames: {n_frames}, AUs: {au_dim}, saved to: {args.out}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
