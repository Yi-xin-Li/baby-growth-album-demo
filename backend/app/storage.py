from __future__ import annotations

import hashlib
import io
import mimetypes
import os
import shutil
import uuid
from pathlib import Path

from fastapi import UploadFile
from PIL import Image, ImageOps

from .database import MEDIA_DIR, connect, ensure_data_dirs, utc_now

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif"}
ASSET_TYPES = IMAGE_TYPES | {"image/svg+xml", "audio/mpeg"}
VIDEO_TYPES = {"video/mp4": ".mp4", "video/webm": ".webm"}
KIND_DIRS = {
    "photo": "photos",
    "background": "backgrounds",
    "illustration": "illustrations",
    "music": "music",
    "video": "videos",
}


def _video_limit_bytes() -> int:
    try:
        megabytes = int(os.environ.get("BABY_ALBUM_MAX_VIDEO_MB", "200"))
    except ValueError:
        megabytes = 200
    return max(1, megabytes) * 1024 * 1024


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
    _record_asset(
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
    )
    return asset_id


def _record_asset(
    asset_id: str,
    album_id: str,
    group_id: str,
    kind: str,
    variant: str,
    original_name: str,
    mime_type: str,
    size: int,
    relative_path: str,
    sha256: str,
) -> None:
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
                size,
                relative_path,
                sha256,
                utc_now(),
            ),
        )


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
    return {
        "id": group_id,
        "assetId": asset_id,
        "source": f"backend://asset/{asset_id}",
        "name": Path(filename).stem,
    }


def _valid_video_header(mime_type: str, header: bytes) -> bool:
    if mime_type == "video/mp4":
        return len(header) >= 12 and header[4:8] == b"ftyp"
    if mime_type == "video/webm":
        return header.startswith(b"\x1a\x45\xdf\xa3")
    return False


async def save_video(album_id: str, upload: UploadFile) -> dict:
    filename = upload.filename or "video"
    mime_type = (upload.content_type or "application/octet-stream").split(";", 1)[0].lower()
    expected_extension = VIDEO_TYPES.get(mime_type)
    if not expected_extension or Path(filename).suffix.lower() != expected_extension:
        raise ValueError("视频仅支持 MP4 或 WebM，文件格式与扩展名必须一致")

    limit = _video_limit_bytes()
    upload_root = MEDIA_DIR / ".uploads"
    upload_root.mkdir(parents=True, exist_ok=True)
    temporary_path = upload_root / f"{uuid.uuid4().hex}.part"
    digest = hashlib.sha256()
    header = bytearray()
    size = 0
    try:
        with temporary_path.open("wb") as output:
            while chunk := await upload.read(1024 * 1024):
                size += len(chunk)
                if size > limit:
                    raise ValueError(f"单个视频不能超过 {limit // 1024 // 1024}MB")
                if len(header) < 16:
                    header.extend(chunk[: 16 - len(header)])
                digest.update(chunk)
                output.write(chunk)
        if size == 0 or not _valid_video_header(mime_type, bytes(header)):
            raise ValueError("无法识别视频文件，请上传有效的 MP4 或 WebM")

        group_id = uuid.uuid4().hex
        asset_id = uuid.uuid4().hex
        folder = MEDIA_DIR / album_id / KIND_DIRS["video"] / group_id
        folder.mkdir(parents=True, exist_ok=True)
        final_path = folder / f"source-{asset_id}{expected_extension}"
        temporary_path.replace(final_path)
        relative_path = final_path.relative_to(MEDIA_DIR).as_posix()
        try:
            _record_asset(
                asset_id,
                album_id,
                group_id,
                "video",
                "source",
                filename,
                mime_type,
                size,
                relative_path,
                digest.hexdigest(),
            )
        except Exception:
            final_path.unlink(missing_ok=True)
            shutil.rmtree(folder, ignore_errors=True)
            raise
        return {
            "id": group_id,
            "type": "video",
            "sourceId": asset_id,
            "source": f"backend://asset/{asset_id}",
            "name": Path(filename).name,
            "size": size,
            "mimeType": mime_type,
            "alt": Path(filename).stem,
        }
    finally:
        temporary_path.unlink(missing_ok=True)


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
