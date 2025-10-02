from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, HTTPException

from app.configs.paths import DirectoryEnum, VALID_DIRECTORIES, ensure_session_dir

# Reuse existing CLI-like utilities as library functions
from app import _predict_bridge  # type: ignore

from app.utils.tasks import manager as task_manager

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


def _analysis_worker_impl(payload: Dict[str, Any], task_id: Optional[str] = None) -> Dict[str, Any]:
    """Heavy synchronous analysis, factored for reuse by sync and async endpoints.
    Updates TaskManager if task_id is provided.
    """
    def tlog(msg: str) -> None:
        if task_id:
            task_manager.log(task_id, msg)
            task_manager.update(task_id, message=msg)
        print(f"[analyze] {msg}")

    session_id = payload.get("session_id")
    filename = payload.get("filename")
    artifacts = payload.get("artifacts") or "artifacts"
    fps = int(payload.get("fps") or 25)
    skip_frames = int(payload.get("skip_frames") or 25)
    face_threshold = float(payload.get("face_threshold") or 0.95)
    render_avatar = bool(payload.get("render_avatar") if payload.get("render_avatar") is not None else True)
    avatar_source = str(payload.get("avatar_source") or "hmm")

    # For building URLs early (for streaming updates)
    base_prefix = "/api/v1/core/download"

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
        tlog("Prediction started")
        _predict_bridge.run_predict(
            video_path=in_video,
            output_csv=out_csv,
            artifacts_dir=Path(artifacts),
            fps=fps,
            skip_frames=skip_frames,
            face_threshold=face_threshold,
        )
        if task_id:
            task_manager.update(task_id, progress=40.0)
        tlog("Prediction finished")
    except Exception as e:
        import traceback
        print("[analyze] Prediction failed:\n", traceback.format_exc())
        if task_id:
            task_manager.update(task_id, status="error", error=str(e))
        raise

    # Emotions plot
    emo_png_path: Optional[Path] = None
    try:
        tlog("Emotions plot rendering")
        emo_png_path = downloads_dir / f"{base_stem}_emotions.png"
        _predict_bridge.render_emotions(csv_path=out_csv, out_png=emo_png_path, cols=None, dpi=160)
        if task_id:
            # expose emotions plot early via status
            emo_url_early = f"{base_prefix}/downloads/{session_id}/{emo_png_path.name}/"
            task_manager.update(task_id, progress=55.0, emo_url=emo_url_early)
    except Exception as e:
        tlog(f"Emotions plot failed: {e}")
        emo_png_path = None

    # Avatar frames and GIF
    gif_path: Optional[Path] = None
    avatar_frames: list[Path] = []
    frames_fps: Optional[int] = None
    if render_avatar:
        # Prepare streaming base URL and fps for UI
        if task_id:
            try:
                task_manager.update(task_id, frames_base_url=f"{base_prefix}/downloads/{session_id}/", frames_fps=max(1, min(25, fps)))
            except Exception:
                pass
        def _pcb(done: int, total: int) -> None:
            if task_id and total > 0:
                # map frames progress to 60..98
                pr = 60.0 + (max(0, min(done, total)) / total) * 38.0
                # Push incremental frame name for UI to pick up
                try:
                    st = task_manager.get(task_id)
                    if st is not None:
                        from pathlib import Path as _P
                        # We know file pattern: prefix + _aframe_{index:04d}.png; index = done-1
                        name = f"{out_prefix.name}_aframe_{done-1:04d}.png"
                        if st.frames_base_url is None:
                            task_manager.update(task_id, frames_base_url=f"{base_prefix}/downloads/{session_id}/")
                        if name not in st.frames:
                            task_manager.update(task_id, frames=st.frames + [name])
                except Exception:
                    pass
                task_manager.update(task_id, frames_done=done, frames_total=total, progress=pr, message=f"Кадры: {done}/{total}")
        try:
            tlog("Avatar frames rendering")
            out_prefix = downloads_dir / f"{base_stem}_avatar_{avatar_source}"
            frames_fps, avatar_frames = _predict_bridge.render_avatar_frames(
                csv_path=out_csv,
                out_prefix=out_prefix,
                source=avatar_source,
                fps=max(1, min(25, fps)),
                dpi=150,
                limit=None,
                progress_cb=_pcb,
            )
        except Exception as e:
            tlog(f"Avatar frames failed: {e}")
            avatar_frames = []
            frames_fps = None
        if not avatar_frames:
            try:
                tlog("Avatar frames fallback: source=real")
                out_prefix_real = downloads_dir / f"{base_stem}_avatar_real"
                frames_fps, avatar_frames = _predict_bridge.render_avatar_frames(
                    csv_path=out_csv,
                    out_prefix=out_prefix_real,
                    source="real",
                    fps=max(1, min(25, fps)),
                    dpi=150,
                    limit=None,
                    progress_cb=_pcb,
                )
            except Exception as e:
                tlog(f"Avatar frames fallback failed: {e}")
        # Legacy GIF best-effort (non-blocking for progress)
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

    if task_id:
        task_manager.update(task_id, progress=100.0)
        tlog("Analysis finished")

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
    # Keep the synchronous route for compatibility; run worker inline
    return _analysis_worker_impl(payload, None)


@router.post("/run_async")
async def run_analysis_async(
    payload: Dict[str, Any] = Body(...),
) -> Dict[str, Any]:
    """Start analysis in background and return task_id immediately."""
    st = task_manager.create()
    task_manager.log(st.id, "Task created")
    task_manager.run(st.id, _analysis_worker_impl, payload, st.id)
    return {"task_id": st.id}


@router.get("/status/{task_id}")
async def analysis_status(task_id: str) -> Dict[str, Any]:
    st = task_manager.get(task_id)
    if not st:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "id": st.id,
        "status": st.status,
        "progress": st.progress,
        "message": st.message,
        "frames_done": st.frames_done,
        "frames_total": st.frames_total,
        # Streaming fields
        "emo_url": st.emo_url,
        "frames_base_url": st.frames_base_url,
        "frames_fps": st.frames_fps,
        "frames": st.frames,
        # Errors/logs/final result
        "error": st.error,
        "logs": st.logs,
        "result": st.result if st.status == "done" else None,
    }
