from __future__ import annotations

import re
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np

# Use non-interactive backend for headless servers
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# Optional py-feat helpers
try:  # pragma: no cover
    from feat.utils.io import read_feat as _read_feat  # type: ignore
except Exception:  # pragma: no cover
    _read_feat = None  # type: ignore

try:  # pragma: no cover
    from feat.plotting import plot_face  # type: ignore
except Exception:  # pragma: no cover
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
    # CSV roundtrip fallback
    try:
        from io import StringIO
        s = StringIO()
        if hasattr(obj, "to_csv"):
            obj.to_csv(s)  # type: ignore
            s.seek(0)
            import pandas as pd
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
        except Exception:
            pass
    return pd.read_csv(path)


def _collect_au_columns_real(df) -> List[str]:
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
    cols = list(df.columns)
    pat = re.compile(r"^HMM_AUexp_(AU(\d{2}))$")
    pairs: List[tuple[int, str]] = []
    for c in cols:
        if isinstance(c, str):
            m = pat.match(c)
            if m:
                au_num = int(m.group(2))
                pairs.append((au_num, c))
    pairs.sort(key=lambda t: t[0])
    return [c for _, c in pairs]


def _values_from_columns(df, cols: List[str]) -> Tuple[np.ndarray, List[str]]:
    import pandas as pd
    if not cols:
        return np.zeros((0, 0), dtype=float), []
    aur_pat = re.compile(r"^AU(\d{2})_r$")
    names: List[str] = []
    for c in cols:
        m = aur_pat.match(c)
        if m:
            names.append(f"AU{m.group(1)}")
        else:
            if isinstance(c, str) and c.startswith("HMM_AUexp_"):
                names.append(c.replace("HMM_AUexp_", ""))
            else:
                names.append(c)
    values = df[cols].astype(float).values
    values = np.where(np.isfinite(values), values, 0.0)
    return values, names


def _plot_bar_avatar(ax, au_map):
    names = list(au_map.keys())
    vals = [float(au_map[k]) for k in names]
    ax.barh(range(len(names)), vals, color="#1f77b4")
    ax.set_yticks(range(len(names)))
    ax.set_yticklabels(names, fontsize=6)
    ax.set_xlim(0, max(1.0, max(vals) if vals else 1.0))
    ax.invert_yaxis()
    ax.set_xlabel("Intensity", fontsize=7)
    ax.set_title("AU Avatar", fontsize=8)


def _plot_face_fallback(ax, au_map: dict) -> None:
    """Draw a simple schematic face using Matplotlib primitives based on a few AUs.
    This avoids bar charts and does not depend on py-feat.
    """
    from matplotlib.patches import Circle, Arc
    # Setup axes
    ax.set_xlim(-1.0, 1.0)
    ax.set_ylim(-1.2, 1.2)
    ax.set_aspect("equal")
    # Helpers
    def _get(name: str, scale: float = 1.0) -> float:
        try:
            v = float(au_map.get(name, 0.0))
        except Exception:
            v = 0.0
        return max(-1.0, min(1.0, v * scale))
    # Outline
    face = Circle((0, 0), radius=0.98, linewidth=2, edgecolor="black", facecolor=(1, 1, 1, 0.0))
    ax.add_patch(face)
    # Eyes parameters
    eye_y = 0.35
    eye_dx = 0.35
    eye_base_r = 0.10
    close_amt = max(0.0, min(1.0, 0.5 * abs(_get("AU06")) + 0.5 * abs(_get("AU07"))))
    eye_r_y = eye_base_r * (1.0 - 0.7 * close_amt)
    eye_r_x = eye_base_r
    left_eye = Circle((-eye_dx, eye_y), radius=eye_base_r, linewidth=1.5, edgecolor="black", facecolor=(0, 0, 0, 0))
    right_eye = Circle((eye_dx, eye_y), radius=eye_base_r, linewidth=1.5, edgecolor="black", facecolor=(0, 0, 0, 0))
    ax.add_patch(left_eye)
    ax.add_patch(right_eye)
    if close_amt > 0:
        lid_angle = max(5, int(170 * (1.0 - close_amt)))
        ax.add_patch(Arc((-eye_dx, eye_y), 2*eye_r_x, 2*eye_r_y, angle=0, theta1=180-lid_angle, theta2=180+lid_angle, lw=1.2))
        ax.add_patch(Arc((eye_dx, eye_y), 2*eye_r_x, 2*eye_r_y, angle=0, theta1=0-lid_angle, theta2=0+lid_angle, lw=1.2))
    # Brows
    au01 = _get("AU01"); au02 = _get("AU02"); au04 = _get("AU04")
    brow_raise = 0.15 * (max(0.0, au01) + max(0.0, au02))
    brow_lower = 0.18 * max(0.0, au04)
    brow_y = 0.58 + brow_raise - brow_lower
    brow_len = 0.28
    ax.plot([-eye_dx - brow_len/2, -eye_dx + brow_len/2], [brow_y + 0.03*au02, brow_y - 0.02*au01], color="black", lw=2)
    ax.plot([eye_dx - brow_len/2, eye_dx + brow_len/2], [brow_y - 0.02*au01, brow_y + 0.03*au02], color="black", lw=2)
    # Nose
    ax.plot([0, -0.05, 0.0], [0.35, 0.05, -0.1], color="black", lw=1)
    # Mouth
    au12 = _get("AU12"); au15 = _get("AU15"); au20 = _get("AU20")
    smile = max(0.0, au12); frown = max(0.0, au15); stretch = max(0.0, au20)
    mouth_y = -0.35 + 0.08 * (smile - frown)
    mouth_w = 0.8 + 0.3 * stretch
    mouth_h = 0.25 * (smile - frown)
    mouth_h = max(-0.35, min(0.5, mouth_h))
    if mouth_h >= 0:
        ax.add_patch(Arc((0, mouth_y), mouth_w, 0.6 * (0.4 + mouth_h), angle=0, theta1=200, theta2=340, lw=2))
    else:
        ax.add_patch(Arc((0, mouth_y), mouth_w, 0.6 * (0.4 + abs(mouth_h)), angle=0, theta1=20, theta2=160, lw=2))


def _try_plot_face(ax, au_map: dict, row) -> None:
    """Try py-feat's plot_face with multiple signatures; fallback to our schematic face."""
    if plot_face is not None:
        try:
            plot_face(model=None, ax=ax, au=au_map)  # type: ignore
            return
        except Exception:
            try:
                plot_face(ax=ax, au=au_map)  # type: ignore
                return
            except Exception:
                try:
                    plot_face(model=None, ax=ax, au=row)  # type: ignore
                    return
                except Exception:
                    pass
    # Fallback
    print("[avatar_frames] plot_face unavailable or failed; using built-in schematic face")
    _plot_face_fallback(ax, au_map)


def render_avatar_frames(
    csv_path: Path,
    out_prefix: Path,
    source: str = "hmm",
    fps: int = 10,
    dpi: int = 150,
    limit: Optional[int] = None,
    size: tuple[int, int] = (400, 500),
    progress_cb: Optional[callable] = None,
) -> tuple[int, List[Path]]:
    """
    Render per-frame avatar images from CSV into PNG files (schematic face).

    Args:
        csv_path: path to CSV with predictions
        out_prefix: path WITHOUT extension; files will be saved as f"{out_prefix}_aframe_0001.png"
        source: 'real' to use AUxx/AUxx_r or 'hmm' to use HMM_AUexp_AUxx
        fps: nominal frames per second (returned for UI)
        dpi: DPI for matplotlib figure
        limit: optional limit of frames to render
        size: figure size in pixels (width, height)

    Returns:
        (fps, list_of_paths)
    """
    df = _load_csv(csv_path)

    if source == "real":
        cols = _collect_au_columns_real(df)
        if not cols:
            raise RuntimeError("No AU columns for source=real")
    else:
        cols = _collect_au_columns_hmm(df)
        if not cols:
            raise RuntimeError("No HMM_AUexp_AUxx columns found")

    values, au_names = _values_from_columns(df, cols)
    if values.size == 0:
        return fps, []

    au_pat = re.compile(r"^AU(\d{2})$")
    idx_order = sorted(range(len(au_names)), key=lambda i: int(au_pat.match(au_names[i]).group(1)) if au_pat.match(au_names[i]) else 999)  # type: ignore
    values = values[:, idx_order]
    au_names = [au_names[i] for i in idx_order]

    if isinstance(limit, int) and limit > 0:
        values = values[:limit]

    # Convert pixel size to inches for matplotlib
    fig_w = max(100, int(size[0])) / float(dpi)
    fig_h = max(100, int(size[1])) / float(dpi)
    fig, ax = plt.subplots(figsize=(fig_w, fig_h), dpi=dpi)
    # White background
    try:
        fig.patch.set_facecolor("white")
        ax.set_facecolor("white")
    except Exception:
        pass
    ax.set_axis_off()

    out_files: List[Path] = []
    out_prefix.parent.mkdir(parents=True, exist_ok=True)

    total = int(values.shape[0])
    for i, row in enumerate(values):
        au_map = {name: float(val) for name, val in zip(au_names, row.tolist())}
        _try_plot_face(ax, au_map, row)
        fig.canvas.draw()
        out_file = Path(f"{str(out_prefix)}_aframe_{i:04d}.png")
        print(f"[avatar_frames] rendering frame {i+1}/{total} -> {out_file.name}")
        try:
            fig.savefig(out_file, dpi=dpi, bbox_inches='tight', pad_inches=0)
        finally:
            if callable(progress_cb):
                try:
                    progress_cb(i + 1, total)
                except Exception:
                    pass
        out_files.append(out_file)
        ax.cla()
        try:
            ax.set_facecolor("white")
        except Exception:
            pass
        ax.set_axis_off()

    plt.close(fig)
    return fps, out_files
