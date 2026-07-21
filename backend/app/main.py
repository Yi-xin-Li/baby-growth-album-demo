from __future__ import annotations

import uuid
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from .auth import (  # noqa: E402
    close_editor_session,
    create_editor_session,
    refresh_editor_session,
    require_editor,
    reset_auth_state,
)
from .backup import apply_backup, create_backup, inspect_backup
from .database import MEDIA_DIR, TEMP_DIR, get_active_album, get_album, get_album_revision, get_asset, initialize_database, put_album, reset_all_data, storage_stats
from .storage import clear_album_assets, delete_asset_group, save_generic_asset, save_photo

@asynccontextmanager
async def lifespan(_app: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="Baby Album Local API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=(
        r"^http://(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|"
        r"192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d+)?$"
    ),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AlbumPayload(BaseModel):
    album: dict


class ImportToken(BaseModel):
    token: str


class EditorLoginPayload(BaseModel):
    pin: str
    takeover: bool = False


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/auth/editor")
def login_editor(payload: EditorLoginPayload) -> dict:
    return create_editor_session(payload.pin, payload.takeover)


@app.post("/api/auth/heartbeat")
def heartbeat_editor(session: Annotated[str, Depends(require_editor)]) -> dict:
    return refresh_editor_session(session)


@app.post("/api/auth/logout", status_code=204)
def logout_editor(session: Annotated[str, Depends(require_editor)]) -> None:
    close_editor_session(session)


@app.post("/api/testing/reset", include_in_schema=False)
def reset_testing_data() -> dict:
    if os.environ.get("BABY_ALBUM_TESTING") != "1":
        raise HTTPException(404, "Not found")
    reset_all_data()
    reset_auth_state()
    return {"status": "reset"}


@app.get("/api/albums/active")
def read_active_album() -> dict:
    album = get_active_album()
    if not album:
        raise HTTPException(404, "尚未创建后端相册")
    return {
        "album": album,
        "storage": storage_stats(album["id"]),
        "revision": get_album_revision(album["id"]),
    }


@app.put("/api/albums/{album_id}")
def write_album(
    album_id: str,
    payload: AlbumPayload,
    _session: Annotated[str, Depends(require_editor)],
) -> dict:
    album = payload.album
    if str(album.get("id")) != album_id:
        raise HTTPException(400, "相册 ID 不一致")
    saved = put_album(album)
    return {
        "album": saved,
        "storage": storage_stats(album_id),
        "revision": get_album_revision(album_id),
    }


@app.post("/api/albums/{album_id}/reset")
def reset_album(
    album_id: str,
    payload: AlbumPayload,
    _session: Annotated[str, Depends(require_editor)],
) -> dict:
    album = payload.album
    album["id"] = album_id
    clear_album_assets(album_id)
    saved = put_album(album)
    return {
        "album": saved,
        "storage": storage_stats(album_id),
        "revision": get_album_revision(album_id),
    }


@app.post("/api/albums/{album_id}/photos")
async def upload_photo(
    album_id: str,
    file: UploadFile = File(...),
    retain_original: bool = Query(False),
    _session: Annotated[str, Depends(require_editor)] = None,
) -> dict:
    try:
        return save_photo(album_id, file.filename or "photo", file.content_type or "application/octet-stream", await file.read(), retain_original)
    except ValueError as error:
        raise HTTPException(400, str(error)) from error


@app.post("/api/albums/{album_id}/assets/{kind}")
async def upload_asset(
    album_id: str,
    kind: str,
    file: UploadFile = File(...),
    _session: Annotated[str, Depends(require_editor)] = None,
) -> dict:
    try:
        return save_generic_asset(album_id, kind, file.filename or "asset", file.content_type or "application/octet-stream", await file.read())
    except ValueError as error:
        raise HTTPException(400, str(error)) from error


@app.get("/api/assets/{asset_id}")
def read_asset(asset_id: str) -> FileResponse:
    asset = get_asset(asset_id)
    if not asset:
        raise HTTPException(404, "素材不存在")
    path = MEDIA_DIR / asset["relative_path"]
    if not path.is_file():
        raise HTTPException(404, "素材文件已丢失")
    return FileResponse(path, media_type=asset["mime_type"], filename=asset["original_name"])


@app.delete("/api/assets/groups/{group_id}", status_code=204)
def remove_asset_group(
    group_id: str,
    _session: Annotated[str, Depends(require_editor)],
) -> None:
    delete_asset_group(group_id)


@app.get("/api/albums/{album_id}/storage")
def read_storage(
    album_id: str,
    _session: Annotated[str, Depends(require_editor)],
) -> dict:
    return storage_stats(album_id)


@app.get("/api/albums/{album_id}/export")
def export_album(
    album_id: str,
    background_tasks: BackgroundTasks,
    _session: Annotated[str, Depends(require_editor)],
) -> FileResponse:
    album = get_album(album_id)
    if not album:
        raise HTTPException(404, "相册不存在")
    try:
        path, filename = create_backup()
    except ValueError as error:
        raise HTTPException(400, str(error)) from error
    background_tasks.add_task(path.unlink, missing_ok=True)
    return FileResponse(path, media_type="application/zip", filename=filename, background=background_tasks)


@app.post("/api/import/inspect")
async def inspect_import(
    file: UploadFile = File(...),
    _session: Annotated[str, Depends(require_editor)] = None,
) -> dict:
    if not (file.filename or "").lower().endswith(".zip"):
        raise HTTPException(400, "请选择 ZIP 格式的完整备份")
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    token = uuid.uuid4().hex
    path = TEMP_DIR / f"import-{token}.baby-album.zip"
    try:
        with path.open("wb") as output:
            while chunk := await file.read(1024 * 1024):
                output.write(chunk)
        summary = inspect_backup(path)
        return {"token": token, "summary": summary}
    except ValueError as error:
        path.unlink(missing_ok=True)
        raise HTTPException(400, str(error)) from error


@app.post("/api/import/apply")
def apply_import(
    payload: ImportToken,
    _session: Annotated[str, Depends(require_editor)],
) -> dict:
    if not payload.token.isalnum():
        raise HTTPException(400, "无效的导入令牌")
    path = TEMP_DIR / f"import-{payload.token}.baby-album.zip"
    if not path.is_file():
        raise HTTPException(404, "待导入备份不存在或已过期")
    try:
        album = apply_backup(path)
        return {
            "album": album,
            "storage": storage_stats(album["id"]),
            "revision": get_album_revision(album["id"]),
        }
    except ValueError as error:
        raise HTTPException(400, str(error)) from error
    finally:
        path.unlink(missing_ok=True)
