from __future__ import annotations

import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, Future
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Optional


@dataclass
class TaskState:
    id: str
    status: str = "pending"  # pending|running|done|error|canceled
    progress: float = 0.0      # 0..100
    message: str = ""
    logs: list[str] = field(default_factory=list)
    result: Optional[dict[str, Any]] = None
    error: Optional[str] = None
    started_at: float = field(default_factory=time.time)
    finished_at: Optional[float] = None
    frames_done: int = 0
    frames_total: Optional[int] = None
    # Streaming fields for incremental UI updates
    frames: list[str] = field(default_factory=list)
    frames_base_url: Optional[str] = None
    frames_fps: Optional[int] = None
    emo_url: Optional[str] = None
    # Staged pipeline additions
    csv_name: Optional[str] = None
    csv_url: Optional[str] = None
    mode: Optional[str] = None  # for frames: 'image' | 'data'
    data_next_index: int = 0    # for frames data mode
    data_items: list[dict[str, Any]] = field(default_factory=list)  # buffered AU data items


class TaskManager:
    def __init__(self, max_workers: int = 2) -> None:
        self._executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="analyze")
        self._tasks: dict[str, TaskState] = {}
        self._futures: dict[str, Future] = {}
        self._lock = threading.Lock()

    def create(self) -> TaskState:
        tid = str(uuid.uuid4())
        st = TaskState(id=tid)
        with self._lock:
            self._tasks[tid] = st
        return st

    def get(self, task_id: str) -> Optional[TaskState]:
        with self._lock:
            return self._tasks.get(task_id)

    def log(self, task_id: str, msg: str) -> None:
        st = self.get(task_id)
        if not st:
            return
        msg_s = f"[{time.strftime('%H:%M:%S')}] {msg}"
        with self._lock:
            st.logs.append(msg_s)
            if len(st.logs) > 500:
                st.logs = st.logs[-500:]

    def update(self, task_id: str, **kwargs: Any) -> None:
        st = self.get(task_id)
        if not st:
            return
        with self._lock:
            for k, v in kwargs.items():
                setattr(st, k, v)

    def run(self, task_id: str, fn: Callable[..., dict[str, Any]], *args: Any, **kwargs: Any) -> None:
        st = self.get(task_id)
        if not st:
            return
        def _wrap() -> None:
            self.update(task_id, status="running")
            try:
                result = fn(*args, **kwargs)
                self.update(task_id, status="done", result=result, progress=100.0, finished_at=time.time())
            except Exception as e:
                self.update(task_id, status="error", error=str(e), finished_at=time.time())
        fut = self._executor.submit(_wrap)
        with self._lock:
            self._futures[task_id] = fut

    def cancel(self, task_id: str) -> bool:
        fut = self._futures.get(task_id)
        if fut and fut.cancel():
            self.update(task_id, status="canceled", finished_at=time.time())
            return True
        return False


# A module-level singleton for convenience
manager = TaskManager(max_workers=2)
