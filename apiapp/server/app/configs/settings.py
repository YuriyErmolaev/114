from pathlib import Path
from typing import Optional, Dict
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator

#TODO: пока сильно недоделка, смысл был в том, чтобы переделать часть, связанную с core.py

class Settings(BaseSettings):
    """
    Настройки приложения (pydantic v2) с чтением из ENV и значениями по умолчанию.
    Все пути нормализуются и создаются при необходимости.
    """

    # TODO: часть связанная с keycloak тут не совсем "в тему"
    keycloak_url: str = "http://keycloak:8080"
    keycloak_realm: str = "demo"
    keycloak_client_id: str = "fastapi-client"
    keycloak_client_secret: str = "fastapi-client-secret"

    # Возможность подключения с заданных точек (* -- с любой)
    cors_allow_origins: list[str] = ["*"]

    # --- Ниже часть, связанная с хранением на файловой системе ---

    # Корень для хранения (по умолчанию — ./ai_data)
    DATA_ROOT: Path = Path("./ai_data")

    # Поддиректории (по умолчанию как в ТЗ)
    UPLOADS_DIR: Path = Path("uploads")
    WORKSPACE_DIR: Path = Path("workspace")
    STORAGE_DIR: Path = Path("storage")
    DOWNLOADS_DIR: Path = Path("downloads")

    CUSTOM_TMP_DIR: Optional[Path] = None

    # Префикс маршрутов API
    FILES_API_PREFIX: str = "/core"

    model_config = SettingsConfigDict(
        env_prefix="",  # без префикса; можно задать "APP_"
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Кэш абсолютных путей, заполняется в _finalize()
    _resolved_dirs: Dict[str, Path] = {}

    @model_validator(mode="after")
    def _finalize(self) -> "Settings":
        """
        Пост-валидатор:
        1) нормализует относительные пути до абсолютных, используя DATA_ROOT;
        2) создаёт директории;
        3) подставляет значение для CUSTOM_TMP_DIR (если нужно).
        """
        base = self.DATA_ROOT

        def _abs(p: Path) -> Path:
            # если p не абсолютный, то считаем его относительным от DATA_ROOT
            return p if p.is_absolute() else (base / p)

        uploads = _abs(self.UPLOADS_DIR).resolve()
        workspace = _abs(self.WORKSPACE_DIR).resolve()
        storage = _abs(self.STORAGE_DIR).resolve()
        downloads = _abs(self.DOWNLOADS_DIR).resolve()

        for d in (uploads, workspace, storage, downloads):
            d.mkdir(parents=True, exist_ok=True)

        # Значение по умолчанию для CUSTOM_TMP_DIR, если он не задан
        if self.CUSTOM_TMP_DIR is None:
            self.CUSTOM_TMP_DIR = (base / "tmp").resolve()
            self.CUSTOM_TMP_DIR.mkdir(parents=True, exist_ok=True)
        else:
            self.CUSTOM_TMP_DIR = _abs(self.CUSTOM_TMP_DIR).resolve()
            self.CUSTOM_TMP_DIR.mkdir(parents=True, exist_ok=True)

        # кэш результата
        object.__setattr__(self, "_resolved_dirs", {
            "uploads": uploads,
            "workspace": workspace,
            "storage": storage,
            "downloads": downloads,
        })
        return self

    # Метод доступа к абсолютным путям
    def resolved(self) -> Dict[str, Path]:
        return self._resolved_dirs

@lru_cache
def get_settings():
    return Settings()

