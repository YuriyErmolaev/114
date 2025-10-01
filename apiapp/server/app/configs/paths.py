from enum import Enum
from pathlib import Path

# TODO: перенести обработку ошибок http в общий http-адаптер (когда-нибудь)
from fastapi import HTTPException

# Единое место хранения того, что читаем из env
from app.configs.settings import get_settings

# Получаем абсолютные директории из настроек
settings = get_settings()
_DIRS = settings.resolved()

class DirectoryEnum(str, Enum):
    uploads = "uploads"
    workspace = "workspace"
    storage = "storage"
    downloads = "downloads"

# Карта допустимых директорий
VALID_DIRECTORIES: dict[DirectoryEnum, Path] = {
    DirectoryEnum.uploads: _DIRS["uploads"],
    DirectoryEnum.workspace: _DIRS["workspace"],
    DirectoryEnum.storage: _DIRS["storage"],
    DirectoryEnum.downloads: _DIRS["downloads"],
}

def ensure_session_dir(directory: DirectoryEnum, session_id: str) -> Path:
    """
    Возвращает путь к session-папке и гарантирует, что базовая директория существует.
    НЕ создаёт session-папку "молча", возвращает 404, если папки с session_id нет.
    """
    base = VALID_DIRECTORIES[directory]
    session_path = base / session_id
    if not session_path.is_dir():
        raise HTTPException(status_code=404, detail=f"Session in '{directory.value}' not found")
    return session_path

# TODO: пагинация и сортировка, а то "умрем" на фронте

def assert_safe_filename(filename: str) -> None:
    """
    Простая защита от пустых имён и "..'
    """
    if not filename or filename.strip() == "":
        raise HTTPException(status_code=400, detail="Filename must not be empty")
    # запрет на разделители каталогов и '..'
    if "/" in filename or "\\" in filename or filename == ".." or ".." in filename:
        raise HTTPException(status_code=400, detail="Unsafe filename")
