#!/usr/bin/env python3
"""
Render an avatar animation from AU time-series in a FEX CSV.

Examples:
  python avatar_animation.py --csv output_video_analize_2.csv --out avatar_real.gif --source real --fps 12
  python avatar_animation.py --csv output_video_analize_2.csv --out avatar_hmm.gif --source hmm --fps 12 --limit 300
"""
from __future__ import annotations

import argparse
from pathlib import Path
from typing import List, Optional, Sequence, Tuple
import re
import sys

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from celluloid import Camera
from tqdm import tqdm

# SciPy compatibility shim for py-feat expecting scipy.integrate.simps on modern SciPy
try:  # pragma: no cover - best-effort compatibility
    from scipy import integrate as _integrate  # type: ignore
    if not hasattr(_integrate, "simps"):
        from scipy.integrate import simpson as _simpson  # type: ignore
        setattr(_integrate, "simps", _simpson)
except Exception:
    pass

# py-feat imports (optional for reading CSV, required for plotting)
try:
    from feat.utils.io import read_feat as _read_feat  # type: ignore
except Exception:  # pragma: no cover
    _read_feat = None

try:
    from feat.plotting import plot_face  # type: ignore
except Exception as e:  # pragma: no cover
    plot_face = None  # type: ignore


def _fex_to_dataframe(obj):
    import pandas as pd
    if isinstance(obj, pd.DataFrame):
        return obj
    for attr in ("to_pandas", "to_dataframe", "df", "data"):
            if hasattr(obj, attr):
                val = getattr(obj, attr)
                try:
                    df = val() if callable(val) else val
                    if isinstance(df, pd.DataFrame):
                        return df
                except Exception:
                    pass
    # Fallback CSV roundtrip
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
        # sort by numeric
        au_cols.sort(key=lambda c: int(au_pat.match(c).group(1)))  # type: ignore
        return au_cols

    aur_cols = [c for c in cols if isinstance(c, str) and aur_pat.match(c)]
    if aur_cols:
        aur_cols.sort(key=lambda c: int(aur_pat.match(c).group(1)))  # type: ignore
        # We'll rename later when extracting values
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
    """Get numeric array from DataFrame columns. Handles AUxx_r -> AUxx renaming."""
    import pandas as pd
    if not cols:
        return np.zeros((0, 0), dtype=float), []
    # If AUxx_r pattern, convert to AUxx names
    aur_pat = re.compile(r"^AU(\d{2})_r$")
    names = []
    for c in cols:
        m = aur_pat.match(c)
        if m:
            names.append(f"AU{m.group(1)}")
        else:
            # For HMM_AUexp_AUxx, strip prefix
            if isinstance(c, str) and c.startswith("HMM_AUexp_"):
                names.append(c.replace("HMM_AUexp_", ""))
            else:
                names.append(c)
    # Extract values
    values = df[cols].astype(float).values
    # Clean up NaNs/Infs
    values = np.where(np.isfinite(values), values, 0.0)
    return values, names


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Render an AU-based avatar animation from a prediction CSV")
    p.add_argument("--csv", required=True, type=Path, help="Path to the CSV file")
    p.add_argument("--source", choices=["real", "hmm"], default="real", help="Select AU source: real (AUxx/AUxx_r) or hmm (HMM_AUexp_AUxx)")
    p.add_argument("--out", default=Path("avatar.gif"), type=Path, help="Output GIF filename")
    p.add_argument("--fps", default=10, type=int, help="Frames per second for the GIF")
    p.add_argument("--dpi", default=200, type=int, help="DPI for saved GIF frames")
    p.add_argument("--limit", default=None, type=int, help="If provided, limit to the first N frames")
    return p.parse_args(argv)


def _plot_bar_avatar(ax, au_map):
    """Fallback simple avatar: horizontal bar plot of AU intensities."""
    names = list(au_map.keys())
    vals = [float(au_map[k]) for k in names]
    ax.barh(range(len(names)), vals, color="#1f77b4")
    ax.set_yticks(range(len(names)))
    ax.set_yticklabels(names, fontsize=6)
    ax.set_xlim(0, max(1.0, max(vals) if vals else 1.0))
    ax.invert_yaxis()
    ax.set_xlabel("Intensity", fontsize=7)
    ax.set_title("AU Avatar", fontsize=8)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)

    if not args.csv.exists():
        print(f"[error] CSV not found: {args.csv}", file=sys.stderr)
        return 2

    df = _load_csv(args.csv)

    # Collect AU columns according to source
    if args.source == "real":
        cols = _collect_au_columns_real(df)
        if not cols:
            print("[error] No AU columns found for source=real. Expected AUxx or AUxx_r columns.", file=sys.stderr)
            return 3
    else:  # hmm
        cols = _collect_au_columns_hmm(df)
        if not cols:
            print("[error] No HMM expected AU columns found. Expected columns like HMM_AUexp_AU01.", file=sys.stderr)
            return 4

    values, au_names = _values_from_columns(df, cols)

    if values.size == 0:
        print("[error] AU matrix is empty.", file=sys.stderr)
        return 5

    # Sort consistently by AU numeric order (au_names are AUxx)
    au_pat = re.compile(r"^AU(\d{2})$")
    idx_order = sorted(range(len(au_names)), key=lambda i: int(au_pat.match(au_names[i]).group(1)) if au_pat.match(au_names[i]) else 999)  # type: ignore
    values = values[:, idx_order]
    au_names = [au_names[i] for i in idx_order]

    # Apply frame limit if provided
    if isinstance(args.limit, int) and args.limit > 0:
        values = values[: args.limit]

    # Render frames using celluloid.Camera and feat.plotting.plot_face
    fig, ax = plt.subplots(figsize=(4, 4), dpi=args.dpi)
    camera = Camera(fig)

    # Remove axes for cleaner avatar
    ax.set_axis_off()

    for row in tqdm(values, desc="Rendering frames"):
        # Build AU map for this frame
        au_map = {name: float(val) for name, val in zip(au_names, row.tolist())}
        if plot_face is not None:
            try:
                # Prefer passing dictionary mapping AU names to values
                plot_face(au=au_map, ax=ax)
            except Exception:
                try:
                    # Fallback: pass vector; most versions support au=list/np.ndarray ordered by AU names
                    plot_face(au=row, ax=ax)
                except Exception:
                    _plot_bar_avatar(ax, au_map)
        else:
            _plot_bar_avatar(ax, au_map)
        camera.snap()
        ax.cla()
        ax.set_axis_off()

    interval_ms = int(round(1000.0 / max(1, int(args.fps))))
    anim = camera.animate(interval=interval_ms, blit=False)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    try:
        anim.save(str(args.out), writer="pillow", dpi=args.dpi, fps=int(args.fps))
        print(f"Saved: {args.out}")
        return 0
    except Exception as e_anim:
        # Fallback: manual rendering to GIF via Pillow
        try:
            from PIL import Image
        except Exception as e_pil:
            print(f"[error] Failed to save animation (Matplotlib) and Pillow not available: {e_anim} / {e_pil}", file=sys.stderr)
            return 6

        frames: List[Image.Image] = []
        # Re-render frames to collect images on a fresh figure to avoid animation callbacks
        plt.close(fig)
        fig2, ax2 = plt.subplots(figsize=(4, 4), dpi=args.dpi)
        ax2.set_axis_off()
        for row in tqdm(values, desc="Rendering frames (fallback)"):
            au_map = {name: float(val) for name, val in zip(au_names, row.tolist())}
            if plot_face is not None:
                try:
                    plot_face(au=au_map, ax=ax2)
                except Exception:
                    try:
                        plot_face(au=row, ax=ax2)
                    except Exception:
                        _plot_bar_avatar(ax2, au_map)
            else:
                _plot_bar_avatar(ax2, au_map)
            fig2.canvas.draw()
            w, h = fig2.canvas.get_width_height()
            rgba = np.asarray(fig2.canvas.buffer_rgba())
            if rgba.shape[2] == 4:
                rgb = rgba[:, :, :3]
            else:
                rgb = rgba
            img = Image.fromarray(rgb)
            frames.append(img)
            ax2.cla(); ax2.set_axis_off()
        plt.close(fig2)

        if not frames:
            print(f"[error] No frames captured for GIF.", file=sys.stderr)
            return 7
        duration_ms = int(round(1000.0 / max(1, int(args.fps))))
        try:
            frames[0].save(str(args.out), save_all=True, append_images=frames[1:], format="GIF", loop=0, duration=duration_ms)
            print(f"Saved (fallback): {args.out}")
            return 0
        except Exception as e_save:
            print(f"[error] Failed to save GIF via Pillow fallback: {e_save}", file=sys.stderr)
            return 8


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
