from __future__ import annotations

from pathlib import Path
from typing import Optional

# Import the existing scripts as modules
from ..predict_video_to_csv import run as _predict_run
from ..avatar_animation import main as _avatar_main
from ..emotions_plot import main as _emotions_main


def run_predict(
    video_path: Path,
    output_csv: Path,
    artifacts_dir: Path,
    fps: int = 25,
    skip_frames: int = 25,
    face_threshold: float = 0.95,
) -> Path:
    """Call predict_video_to_csv.run and return output CSV path."""
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    return _predict_run(
        video_path=video_path,
        output_csv=output_csv,
        artifacts_dir=artifacts_dir,
        fps=fps,
        skip_frames=skip_frames,
        face_threshold=face_threshold,
    )


def render_avatar(
    csv_path: Path,
    out_gif: Path,
    source: str = "hmm",
    fps: int = 10,
    dpi: int = 150,
    limit: Optional[int] = None,
) -> Optional[Path]:
    """Invoke avatar_animation.main with argv list; return output path on success."""
    argv = [
        "--csv", str(csv_path),
        "--source", str(source),
        "--out", str(out_gif),
        "--fps", str(int(fps)),
        "--dpi", str(int(dpi)),
    ]
    if isinstance(limit, int) and limit > 0:
        argv += ["--limit", str(int(limit))]
    rc = _avatar_main(argv)
    if rc == 0:
        return out_gif
    return None


def render_emotions(
    csv_path: Path,
    out_png: Path,
    cols: Optional[list[str]] = None,
    dpi: int = 150,
    show: bool = False,
) -> Optional[Path]:
    argv = ["--csv", str(csv_path), "--out", str(out_png), "--dpi", str(int(dpi))]
    if cols:
        argv += ["--cols", ",".join(cols)]
    if show:
        argv += ["--show"]
    rc = _emotions_main(argv)
    if rc == 0:
        return out_png
    return None
