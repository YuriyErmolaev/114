from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, HTTPException

from app.configs.paths import DirectoryEnum, VALID_DIRECTORIES, ensure_session_dir

# Reuse existing CLI-like utilities as library functions
from app import _predict_bridge  # type: ignore

router = APIRouter()


def _safe_name(base: str) -> str:
    # Keep only safe chars
    import re
    s = re.sub(r"[^A-Za-z0-9._-]+", "_", base)
    return s or "out"


def _parse_csv_for_front(csv_path: Path) -> Dict[str, Any]:
    import pandas as pd

    if not csv_path.exists():
        raise HTTPException(status_code=500, detail=f"CSV not found: {csv_path}")

    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read CSV: {e}")

    # Emotions common set
    emo_names = [
        "anger", "disgust", "fear", "happiness", "sadness", "surprise", "neutral",
    ]
    lower_to_orig = {c.lower(): c for c in df.columns if isinstance(c, str)}
    emo_cols = [lower_to_orig[c] for c in emo_names if c in lower_to_orig]

    # Landmarks heuristic: columns like landmark_x_0, face_x_0, or x_0/y_0 pairs
    lm_x_cols = [c for c in df.columns if isinstance(c, str) and (c.startswith("x_") or c.startswith("landmark_x") or c.startswith("face_landmark_x"))]
    lm_y_cols = [c for c in df.columns if isinstance(c, str) and (c.startswith("y_") or c.startswith("landmark_y") or c.startswith("face_landmark_y"))]

    # AU/HMM
    au_cols = [c for c in df.columns if isinstance(c, str) and c.startswith("AU") and "_" not in c]
    hmm_state_col = next((c for c in df.columns if isinstance(c, str) and c == "HMM_state"), None)
    hmm_au_cols = [c for c in df.columns if isinstance(c, str) and c.startswith("HMM_AUexp_")]

    # Build preview limited data to keep payload modest
    max_points = int(min(2000, len(df)))
    idx = list(range(max_points))

    def _series(cols: List[str]) -> List[Dict[str, Any]]:
        out = []
        for c in cols:
            try:
                vals = df[c].astype(float).values[:max_points].tolist()
            except Exception:
                try:
                    vals = df[c].values[:max_points].tolist()
                except Exception:
                    vals = []
            out.append({"name": c, "values": vals})
        return out

    result: Dict[str, Any] = {
        "frame": df.index[:max_points].tolist(),
        "emotions": _series(emo_cols),
        "aus": _series(au_cols[:10]),  # limit for preview
        "hmm": {
            "state": (df[hmm_state_col].astype(int).values[:max_points].tolist() if hmm_state_col else []),
            "au_expected": _series(sorted(hmm_au_cols)[:10]),  # limit
        },
        "landmarks": {
            "x_cols": lm_x_cols,
            "y_cols": lm_y_cols,
            # optionally collect first frame landmarks sample for quick preview
            "first_frame": {
                "x": [float(v) for v in (df[lm_x_cols].iloc[0].tolist() if lm_x_cols else [])],
                "y": [float(v) for v in (df[lm_y_cols].iloc[0].tolist() if lm_y_cols else [])],
            } if len(df) > 0 else {"x": [], "y": []},
        }
    }

    # also include which columns were found
    result["columns"] = {
        "emotions": emo_cols,
        "aus": au_cols,
        "hmm_state": hmm_state_col,
        "hmm_au_expected": sorted(hmm_au_cols),
        "landmarks_x": lm_x_cols,
        "landmarks_y": lm_y_cols,
    }

    return result


@router.post("/run")
async def run_analysis(
    payload: Dict[str, Any] = Body(..., example={
        "session_id": "uuid-here",
        "filename": "video.mp4",
        "artifacts": "artifacts",
        "fps": 25,
        "skip_frames": 25,
        "face_threshold": 0.95,
        "render_avatar": True,
        "avatar_source": "hmm"
    })
) -> Dict[str, Any]:
    """
    Run deep analysis for an uploaded video within a session.

    Expected workflow on frontend:
      1) Create session via /core/ (POST) to obtain session_id
      2) Upload a video to /core/upload/uploads/{session_id}/ with field name 'file'
      3) Call POST /analyze/run with session_id and uploaded filename

    Returns JSON with parsed data and URLs to download artifacts (CSV, GIF).
    """
    session_id = payload.get("session_id")
    filename = payload.get("filename")
    artifacts = payload.get("artifacts") or "artifacts"
    fps = int(payload.get("fps") or 25)
    skip_frames = int(payload.get("skip_frames") or 25)
    face_threshold = float(payload.get("face_threshold") or 0.95)
    render_avatar = bool(payload.get("render_avatar") if payload.get("render_avatar") is not None else True)
    avatar_source = str(payload.get("avatar_source") or "hmm")

    if not session_id or not filename:
        raise HTTPException(status_code=400, detail="session_id and filename are required")

    uploads_dir = ensure_session_dir(DirectoryEnum.uploads, session_id)
    workspace_dir = ensure_session_dir(DirectoryEnum.workspace, session_id)
    downloads_dir = ensure_session_dir(DirectoryEnum.downloads, session_id)

    in_video = uploads_dir / filename
    if not in_video.exists():
        raise HTTPException(status_code=404, detail=f"Uploaded file not found: {filename}")

    base_stem = _safe_name(Path(filename).stem)
    out_csv = workspace_dir / f"{base_stem}_analysis.csv"

    # Run prediction to CSV (sync)
    try:
        _predict_bridge.run_predict(
            video_path=in_video,
            output_csv=out_csv,
            artifacts_dir=Path(artifacts),
            fps=fps,
            skip_frames=skip_frames,
            face_threshold=face_threshold,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")

    # Optionally render schematic face GIF and emotions plot
    emo_png_path: Optional[Path] = None
    try:
        emo_png_path = downloads_dir / f"{base_stem}_emotions.png"
        _predict_bridge.render_emotions(csv_path=out_csv, out_png=emo_png_path, cols=None, dpi=160)
    except Exception:
        emo_png_path = None

    # Optionally render schematic face GIF (legacy) and frames (new)
    gif_path: Optional[Path] = None
    avatar_frames: list[Path] = []
    frames_fps: Optional[int] = None
    if render_avatar:
        # New: render frames (cap to first 300 to keep payload sane)
        try:
            out_prefix = downloads_dir / f"{base_stem}_avatar_{avatar_source}"
            frames_fps, avatar_frames = _predict_bridge.render_avatar_frames(
                csv_path=out_csv,
                out_prefix=out_prefix,
                source=avatar_source,
                fps=max(1, min(25, fps)),
                dpi=150,
                limit=300,
            )
        except Exception:
            avatar_frames = []
            frames_fps = None
        # Fallback: if frames not produced (e.g., no HMM_AUexp_*), try source='real'
        if not avatar_frames:
            try:
                out_prefix_real = downloads_dir / f"{base_stem}_avatar_real"
                frames_fps, avatar_frames = _predict_bridge.render_avatar_frames(
                    csv_path=out_csv,
                    out_prefix=out_prefix_real,
                    source="real",
                    fps=max(1, min(25, fps)),
                    dpi=150,
                    limit=300,
                )
            except Exception:
                pass
        # Legacy GIF (best-effort)
        try:
            gif_path = downloads_dir / f"{base_stem}_avatar_{avatar_source}.gif"
            _predict_bridge.render_avatar(csv_path=out_csv, out_gif=gif_path, source=avatar_source, fps=max(1, min(25, fps)))
        except Exception:
            gif_path = None

    # Parse CSV for frontend
    parsed = _parse_csv_for_front(out_csv)

    # Move CSV to downloads as well for convenient download
    csv_download = downloads_dir / out_csv.name
    if out_csv.exists():
        try:
            if csv_download.exists():
                csv_download.unlink()
            out_csv.replace(csv_download)
        except Exception:
            csv_download = out_csv  # keep in workspace if moving fails

    # Build URLs via existing core download route
    base_prefix = "/api/v1/core/download"
    csv_url = f"{base_prefix}/downloads/{session_id}/{csv_download.name}/" if csv_download.exists() else None
    gif_url = f"{base_prefix}/downloads/{session_id}/{gif_path.name}/" if gif_path and gif_path.exists() else None
    emo_url = f"{base_prefix}/downloads/{session_id}/{emo_png_path.name}/" if emo_png_path and emo_png_path.exists() else None

    # Build frames URLs
    frames_list: List[Dict[str, Any]] = []
    if avatar_frames:
        for p in avatar_frames:
            name = Path(p).name
            url = f"{base_prefix}/downloads/{session_id}/{name}/"
            frames_list.append({"name": name, "url": url})

    return {
        "session_id": session_id,
        "video": filename,
        "csv": {
            "path": str(csv_download) if csv_download else None,
            "url": csv_url,
        },
        "avatar": {
            "path": str(gif_path) if gif_path else None,
            "url": gif_url,
            "source": avatar_source if gif_url else None,
        },
        "emotions_plot": {
            "path": str(emo_png_path) if emo_png_path else None,
            "url": emo_url,
        },
        "avatar_frames": {
            "fps": int(frames_fps or fps) if (frames_fps or fps) else None,
            "files": frames_list,
        },
        "data": parsed,
    }
