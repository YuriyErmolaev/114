from typing import Optional
import uuid
import stat
import shutil
import zipfile
import datetime
import humanize

from fastapi import APIRouter, UploadFile, File, HTTPException, Header, Query
from fastapi.responses import FileResponse

from app.configs.paths import DirectoryEnum, VALID_DIRECTORIES
from app.configs.paths import ensure_session_dir, assert_safe_filename

router = APIRouter()

# TODO: сделать создание во всех, если без параметров
# и опционально по параметрам в какой-то отдельно

@router.post("/")
async def create_session(
        x_session_id: str | None = Header(default=None, alias="X-Session-Id"),
        session_id: str | None = Query(default=None),
):
    raw = session_id or x_session_id
    if raw:
        try:
            uuid.UUID(str(raw))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid session_id (must be UUID).")
        sid = str(raw)
    else:
        sid = str(uuid.uuid4())
    for directory in VALID_DIRECTORIES.values():
        directory_path = directory / sid
        directory_path.mkdir(parents=True, exist_ok=True)
    return {"session_id": sid}


@router.get("/sessions/")
async def list_all_sessions():
    """
    Посмотреть список sessions для всех доступных директорий.
    """
    result = {}
    for name, base_dir in VALID_DIRECTORIES.items():
        if not base_dir.exists():
            base_dir.mkdir(parents=True, exist_ok=True)
        sessions = sorted([p.name for p in base_dir.iterdir() if p.is_dir()])
        result[name.value if hasattr(name, "value") else str(name)] = sessions
    return result

# TODO: сделать docstrings для автогенерации на все методы

@router.get("/sessions/{directory}/")
async def list_sessions_for_directory(directory: DirectoryEnum):
    """
    Посмотреть список sessions для выбранной директории.
    """
    base_dir = VALID_DIRECTORIES[directory]
    if not base_dir.exists():
        base_dir.mkdir(parents=True, exist_ok=True)
    sessions = sorted([p.name for p in base_dir.iterdir() if p.is_dir()])
    return {"directory": directory.value, "sessions": sessions}


@router.get("/list/{directory}/{session_id}/")
async def list_files(session_id: str, directory: DirectoryEnum):
    """
    Посмотреть список файлов для выбранной session-папки выбранной директории.
    """
    directory_path = VALID_DIRECTORIES[directory] / session_id

    if not directory_path.is_dir():
        # было: detail="Session in '{directory.value}' not found" без f-string :contentReference[oaicite:1]{index=1}
        raise HTTPException(
            status_code=404, detail=f"Session in '{directory.value}' not found"
        )

    files_list = []
    for file in directory_path.iterdir():
        if file.is_file():
            try:
                file_stat = file.stat()
            except OSError:
                # пропускаем файл, если не удаётся прочитать метаданные
                continue
            files_list.append(
                {
                    "name": file.name,
                    "size": humanize.naturalsize(file_stat.st_size),
                    "modified": datetime.datetime.fromtimestamp(
                        file_stat.st_mtime
                    ).isoformat(),
                    "permissions": stat.filemode(file_stat.st_mode),
                }
            )

    return {"directory": str(directory_path), "files": files_list}


@router.post("/upload/{directory}/{session_id}/")
async def upload_file(
    session_id: str, directory: DirectoryEnum, file: UploadFile = File(...)
):
    """
    Загрузить файл.
    """
    directory_path = ensure_session_dir(directory, session_id)

    # защита от .. и пустых имён
    assert_safe_filename(file.filename)

    file_path = directory_path / file.filename
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=f"Permission denied: {e}")
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Filesystem error: {e}")

    return {"message": "File uploaded successfully", "path": str(file_path)}


@router.get("/download/{directory}/{session_id}/{filename}/")
async def download_file(session_id: str, directory: DirectoryEnum, filename: str):
    """
    Скачать файл.
    """
    directory_path = ensure_session_dir(directory, session_id)
    assert_safe_filename(filename)

    file_path = directory_path / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found")

    try:
        return FileResponse(file_path, filename=filename)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=f"Permission denied: {e}")
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Filesystem error: {e}")


@router.delete("/delete/{directory}/{session_id}/{filename}/")
async def delete_file(session_id: str, directory: DirectoryEnum, filename: str):
    """
    Удалить файл.
    """
    directory_path = ensure_session_dir(directory, session_id)
    assert_safe_filename(filename)

    file_path = directory_path / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found")

    try:
        file_path.unlink()
        return {"message": f"File '{filename}' deleted from '{directory_path}'"}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=f"Permission denied: {e}")
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Filesystem error: {e}")


@router.post("/move/{source_directory}/{session_id}/{filename}/{dest_directory}/")
async def move_file(
    session_id: str,
    source_directory: DirectoryEnum,
    dest_directory: DirectoryEnum,
    filename: str,
):
    """
    Переместить файл между директориями
    TODO: есть вопросы к этому методу
    """
    assert_safe_filename(filename)
    source_path = ensure_session_dir(source_directory, session_id)
    dest_path = ensure_session_dir(dest_directory, session_id)

    source_file = source_path / filename
    if not source_file.is_file():
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found")

    dest_file = dest_path / filename
    try:
        shutil.move(str(source_file), str(dest_file))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=f"Permission denied: {e}")
    except shutil.Error as e:
        raise HTTPException(status_code=409, detail=f"Move error: {e}")
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Filesystem error: {e}")

    return {
        "message": f"File '{filename}' successfully moved to '{dest_directory.value}'",
        "source": str(source_file),
        "destination": str(dest_file),
    }


@router.post("/copy/{source_directory}/{session_id}/{filename}/{dest_directory}/")
async def copy_file(
    session_id: str,
    source_directory: DirectoryEnum,
    dest_directory: DirectoryEnum,
    filename: str,
):
    """
    Скопировать файл
    TODO: есть вопросы к этому методу
    """
    assert_safe_filename(filename)
    source_path = ensure_session_dir(source_directory, session_id)
    dest_path = ensure_session_dir(dest_directory, session_id)

    source_file = source_path / filename
    if not source_file.is_file():
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found")

    dest_file = dest_path / filename
    try:
        shutil.copy2(str(source_file), str(dest_file))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=f"Permission denied: {e}")
    except shutil.Error as e:
        raise HTTPException(status_code=409, detail=f"Copy error: {e}")
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Filesystem error: {e}")

    return {
        "message": f"File '{filename}' successfully copied to '{dest_directory.value}'",
        "source": str(source_file),
        "destination": str(dest_file),
    }


@router.post("/zip/{source_directory}/{session_id}/{filename}/{dest_directory}/")
async def zip_file(
    session_id: str,
    source_directory: DirectoryEnum,
    dest_directory: DirectoryEnum,
    filename: str,
):
    """
    Заархивировать файл
    TODO: разобраться с этим методом... он делает что-то странное
    """
    assert_safe_filename(filename)
    source_path = ensure_session_dir(source_directory, session_id)
    dest_path = ensure_session_dir(dest_directory, session_id)

    source_file = source_path / filename
    if not source_file.is_file():
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found")

    dest_file = dest_path / f"{filename}.zip"
    try:
        with zipfile.ZipFile(dest_file, "w", zipfile.ZIP_DEFLATED) as zipf:
            zipf.write(source_file, arcname=source_file.name)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=f"Permission denied: {e}")
    except (OSError, zipfile.BadZipFile) as e:
        raise HTTPException(status_code=500, detail=f"Zip error: {e}")

    return {
        "message": "File zipped successfully",
        "source": str(source_file),
        "destination": str(dest_file),
    }


@router.post("/unzip/{source_directory}/{session_id}/{filename}/{dest_directory}/")
async def unzip_file(
    session_id: str,
    source_directory: DirectoryEnum,
    dest_directory: DirectoryEnum,
    filename: str,
):
    """
    Распаковать архив
    TODO: разобраться с этим методом отдельно
    """
    assert_safe_filename(filename)
    source_path = ensure_session_dir(source_directory, session_id)
    dest_path = ensure_session_dir(dest_directory, session_id)

    source_file = source_path / filename
    if not source_file.is_file() or source_file.suffix.lower() != ".zip":
        raise HTTPException(status_code=404, detail=f"Zip file '{filename}' not found")

    try:
        with zipfile.ZipFile(source_file, "r") as zipf:
            zipf.extractall(dest_path)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=f"Permission denied: {e}")
    except zipfile.BadZipFile as e:
        raise HTTPException(status_code=400, detail=f"Bad zip file: {e}")
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Unzip error: {e}")

    return {
        "message": "File unzipped successfully",
        "source": str(source_file),
        "destination": str(dest_path),
    }


@router.post("/create/{directory}/{session_id}/")
async def create_directory(
    session_id: str, 
    directory: DirectoryEnum,
    name: Optional[str] = None
):
    """
    Create a session directory with the specified UUID in the target directory.
    
    This endpoint creates a new session folder using the provided UUID as the folder name.
    The folder will be created within the specified base directory (e.g., 'uploads', 'temp').
    An optional name parameter can be provided to attach a human-readable name to the session.
    
    Args:
        session_id: A valid UUID string that will be used as the folder name
        directory: The target base directory where the session folder will be created
        name: Optional human-readable name for the session (stored in a .name file within the folder)
    
    Returns:
        A confirmation message with details about the created directory
    
    Raises:
        HTTPException 400: If the session_id is not a valid UUID format
        HTTPException 409: If a directory with the same UUID already exists
        HTTPException 403: If permission is denied for directory creation
        HTTPException 500: If any other filesystem error occurs during creation
    """
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid UUID format for session_id: '{session_id}'"
        )
    
    directory_path = VALID_DIRECTORIES[directory] / session_id

    if directory_path.exists():
        raise HTTPException(
            status_code=409, 
            detail=f"Directory with UUID '{session_id}' already exists in '{directory.value}'"
        )
    
    try:
        directory_path.mkdir(parents=False, exist_ok=False)
        
        if name:
            name_file = directory_path / ".name"
            name_file.write_text(name, encoding="utf-8")
        
        return {
            "status": "success",
            "message": f"Directory created successfully in '{directory.value}'",
            "directory": str(directory_path),
            "session_id": session_id,
            "name": name
        }
        
    except FileExistsError:
        raise HTTPException(
            status_code=409, 
            detail=f"Directory with UUID '{session_id}' already exists in '{directory.value}'"
        )
    except PermissionError:
        raise HTTPException(
            status_code=403, 
            detail=f"Permission denied to create directory in '{directory.value}'"
        )
    except OSError as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to create directory: {str(e)}"
        )
    