from __future__ import annotations

import hashlib
import io
import mimetypes
import shutil
import uuid
from pathlib import Path

from PIL import Image, ImageOps

from .database import MEDIA_DIR, connect, ensure_data_dirs, utc_now

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif"}
ASSET_TYPES = IMAGE_TYPES | {"image/svg+xml", "audio/mpeg"}
KIND_DIRS = {"photo": "photos", "background": "backgrounds", "illustration": "illustrations", "music": "music"}


def _safe_extension(filename: str, mime_type: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix and len(suffix) <= 8 and suffix.replace(".", "").isalnum():
        return suffix
    return mimetypes.guess_extension(mime_type) or ".bin"


def _write_asset(
    album_id: str,
    group_id: str,
    kind: str,
    variant: str,
    original_name: str,
    mime_type: str,
    content: bytes,
    extension: str,
) -> str:
    ensure_data_dirs()
    asset_id = uuid.uuid4().hex
    folder = MEDIA_DIR / album_id / KIND_DIRS[kind] / group_id
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{variant}-{asset_id}{extension}"
    path.write_bytes(content)
    relative_path = path.relative_to(MEDIA_DIR).as_posix()
    with connect() as database:
        database.execute(
            """
            INSERT INTO assets(id, album_id, group_id, kind, variant, original_name,
                               mime_type, size, relative_path, sha256, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                asset_id,
                album_id,
                group_id,
                kind,
                variant,
                original_name,
                mime_type,
                len(content),
                relative_path,
                hashlib.sha256(content).hexdigest(),
                utc_now(),
            ),
        )
    return asset_id


def _webp_variant(image: Image.Image, max_edge: int, quality: int) -> bytes:
    prepared = ImageOps.exif_transpose(image).convert("RGB")
    prepared.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
    output = io.BytesIO()
    prepared.save(output, format="WEBP", quality=quality, method=6)
    return output.getvalue()


def save_photo(album_id: str, filename: str, mime_type: str, content: bytes, retain_source: bool) -> dict:
    if mime_type not in IMAGE_TYPES:
        raise ValueError("照片仅支持 JPG、PNG、WebP 或 AVIF")
    if len(content) > 12 * 1024 * 1024:
        raise ValueError("单张照片不能超过 12MB")
    group_id = uuid.uuid4().hex
    try:
        with Image.open(io.BytesIO(content)) as image:
            thumbnail = _webp_variant(image, 480, 76)
            preview = _webp_variant(image, 1440, 82)
            display = _webp_variant(image, 2560, 88)
    except Exception as error:
        raise ValueError("无法识别或处理这张照片") from error
    ids = {
        "thumbnailId": _write_asset(album_id, group_id, "photo", "thumbnail", filename, "image/webp", thumbnail, ".webp"),
        "previewId": _write_asset(album_id, group_id, "photo", "preview", filename, "image/webp", preview, ".webp"),
        "originalId": _write_asset(album_id, group_id, "photo", "display", filename, "image/webp", display, ".webp"),
    }
    if retain_source:
        ids["sourceId"] = _write_asset(
            album_id, group_id, "photo", "source", filename, mime_type, content, _safe_extension(filename, mime_type)
        )
    return {"id": group_id, "type": "image", "alt": Path(filename).stem, **ids}


def save_generic_asset(album_id: str, kind: str, filename: str, mime_type: str, content: bytes) -> dict:
    if kind not in {"background", "illustration", "music"}:
        raise ValueError("不支持的素材类型")
    if mime_type not in ASSET_TYPES:
        messages = {
            "background": "背景仅支持 JPG、PNG、WebP 或 AVIF",
            "illustration": "插画仅支持 JPG、PNG、WebP、SVG 或 AVIF",
            "music": "背景音乐仅支持 MP3",
        }
        raise ValueError(messages[kind])
    limit = 8 * 1024 * 1024 if kind == "music" else 12 * 1024 * 1024
    if len(content) > limit:
        raise ValueError("文件大小超过限制")
    group_id = uuid.uuid4().hex
    asset_id = _write_asset(
        album_id, group_id, kind, "source", filename, mime_type, content, _safe_extension(filename, mime_type)
    )
    return {"assetId": asset_id, "source": f"backend://asset/{asset_id}", "name": Path(filename).stem}


def delete_asset_group(group_id: str) -> None:
    with connect() as database:
        rows = list(database.execute("SELECT relative_path FROM assets WHERE group_id = ?", (group_id,)))
    for row in rows:
        path = MEDIA_DIR / row["relative_path"]
        try:
            path.unlink(missing_ok=True)
        except PermissionError:
            return
        try:
            path.parent.rmdir()
        except OSError:
            pass
    with connect() as database:
        database.execute("DELETE FROM assets WHERE group_id = ?", (group_id,))


def clear_album_assets(album_id: str) -> None:
    with connect() as database:
        database.execute("DELETE FROM assets WHERE album_id = ?", (album_id,))
    shutil.rmtree(MEDIA_DIR / album_id, ignore_errors=True)
