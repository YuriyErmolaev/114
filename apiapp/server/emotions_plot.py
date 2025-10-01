#!/usr/bin/env python3
"""
Plot emotion time-series from a FEX CSV and save as PNG.

Examples:
  python emotions_plot.py --csv output_video_analize_2.csv
  python emotions_plot.py --csv output_video_analize_2.csv --cols happiness,sadness --out emotions_hs.png --dpi 200
"""
from __future__ import annotations

import argparse
from pathlib import Path
from typing import List, Optional, Sequence, Tuple
import sys

import matplotlib
matplotlib.use("Agg")  # default to non-interactive backend; --show will switch later
import matplotlib.pyplot as plt

# SciPy compatibility shim for py-feat expecting scipy.integrate.simps on modern SciPy
try:  # pragma: no cover - best-effort compatibility
    from scipy import integrate as _integrate  # type: ignore
    if not hasattr(_integrate, "simps"):
        from scipy.integrate import simpson as _simpson  # type: ignore
        setattr(_integrate, "simps", _simpson)
except Exception:
    pass

# Optional deps
try:
    from feat.utils.io import read_feat as _read_feat  # type: ignore
    from feat import Fex as _Fex  # type: ignore
except Exception:  # pragma: no cover - if py-feat not installed
    _read_feat = None
    _Fex = None


def _fex_to_dataframe(obj):
    """Convert a py-feat Fex or DataFrame-like object to pandas DataFrame."""
    import pandas as pd
    if isinstance(obj, pd.DataFrame):
        return obj
    # Known Fex accessors across versions
    for attr in ("to_pandas", "to_dataframe", "df", "data"):
        if hasattr(obj, attr):
            val = getattr(obj, attr)
            try:
                df = val() if callable(val) else val
                if isinstance(df, pd.DataFrame):
                    return df
            except Exception:
                pass
    # Last resort: try CSV roundtrip if Fex-like
    try:
        from io import StringIO
        s = StringIO()
        if hasattr(obj, "to_csv"):
            obj.to_csv(s)  # type: ignore
            s.seek(0)
            return pd.read_csv(s)
    except Exception as e:  # pragma: no cover
        raise RuntimeError("Could not obtain DataFrame from Fex") from e
    raise TypeError("Unsupported object type for DataFrame conversion")


def _load_csv(path: Path):
    """Load CSV; prefer feat.utils.io.read_feat if available; else pandas.read_csv.
    Returns (df, meta_title)
    """
    import pandas as pd
    if _read_feat is not None:
        try:
            fex = _read_feat(str(path))
            df = _fex_to_dataframe(fex)
            return df, "FEX (py-feat)"
        except Exception as e:
            print(f"[warn] read_feat failed ({e}); falling back to pandas.read_csv", file=sys.stderr)
    df = pd.read_csv(path)
    return df, "CSV"


def _detect_emotion_columns(columns: Sequence[str]) -> Tuple[List[str], List[str]]:
    """Return (available_emotions, normalized_lowercase) intersecting typical set.
    Keeps original case as in CSV for plotting labels.
    """
    typical = ["anger", "disgust", "fear", "happiness", "sadness", "surprise", "neutral"]
    lower_to_orig = {c.lower(): c for c in columns if isinstance(c, str)}
    available_lower = [c for c in typical if c in lower_to_orig]
    available_orig = [lower_to_orig[c] for c in available_lower]
    return available_orig, available_lower


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Plot emotion time-series from a prediction CSV")
    p.add_argument("--csv", required=True, type=Path, help="Path to the CSV file produced by predict_video_to_csv.py")
    p.add_argument("--out", default=Path("emotions.png"), type=Path, help="Output PNG filename")
    p.add_argument("--cols", default=None, type=str, help="Comma-separated subset of emotions to plot, e.g., happiness,sadness")
    p.add_argument("--dpi", default=150, type=int, help="DPI for the saved figure")
    p.add_argument("--show", action="store_true", help="Show the plot window in addition to saving")
    return p.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)

    if not args.csv.exists():
        print(f"[error] CSV not found: {args.csv}", file=sys.stderr)
        return 2

    df, source = _load_csv(args.csv)

    # Select x-axis: use 'frame' column if present (case-insensitive), else index
    frame_col = None
    for c in df.columns:
        if isinstance(c, str) and c.lower() == "frame":
            frame_col = c
            break
    x = df[frame_col].values if frame_col is not None else range(len(df))

    available_orig, available_lower = _detect_emotion_columns(df.columns)
    if not available_orig:
        print("[error] No standard emotion columns found in CSV. Expected any of: anger, disgust, fear, happiness, sadness, surprise, neutral.", file=sys.stderr)
        return 3

    # Restrict to subset if provided
    to_plot_cols: List[str]
    if args.cols:
        requested = [c.strip().lower() for c in args.cols.split(",") if c.strip()]
        missing = [c for c in requested if c not in available_lower]
        if missing:
            print(f"[error] Requested emotions not found in CSV: {', '.join(missing)}", file=sys.stderr)
            print(f"[info] Available emotions: {', '.join(available_lower)}", file=sys.stderr)
            return 4
        # Map back to original column names preserving order of request
        lower_to_orig = {c.lower(): c for c in df.columns if isinstance(c, str)}
        to_plot_cols = [lower_to_orig[c] for c in requested]
    else:
        to_plot_cols = available_orig

    if len(to_plot_cols) == 0:
        print("[error] No columns selected to plot.", file=sys.stderr)
        return 5

    # If --show requested, switch backend to interactive if possible
    if args.show:
        try:
            matplotlib.use("TkAgg")  # try a common interactive backend
        except Exception:
            pass

    fig, ax = plt.subplots(figsize=(10, 5), dpi=args.dpi)

    for col in to_plot_cols:
        y = df[col].astype(float).values
        ax.plot(x, y, label=col)

    title = f"Emotion time-series ({source})"
    ax.set_title(title)
    ax.set_xlabel("Frame" if frame_col is not None else "Index")
    ax.set_ylabel("Probability / intensity")
    ax.grid(True, linestyle=":", alpha=0.4)
    ax.legend(loc="upper right", ncol=2, fontsize=9)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(args.out, dpi=args.dpi)

    if args.show:
        plt.show()
    plt.close(fig)

    print(f"Saved: {args.out}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
