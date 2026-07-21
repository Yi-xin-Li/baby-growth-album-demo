from __future__ import annotations

import json
import hashlib
import shutil
import uuid
import zipfile
from pathlib import Path, PurePosixPath

from .database import MEDIA_DIR, TEMP_DIR, connect, get_active_album, list_assets, utc_now

FORMAT_VERSION = 1
MAX_FILES = 10_000
MAX_EXTRACTED_BYTES = 10 * 1024 * 1024 * 1024


def create_backup() -> tuple[Path, str]:
    album = get_active_album()
    if not album:
        raise ValueError("当前没有可导出的相册")
    album_id = album["id"]
    serialized_album = json.dumps(album, ensure_ascii=False)
    assets = [asset for asset in list_assets(album_id) if asset["id"] in serialized_album]
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    path = TEMP_DIR / f"baby-album-{uuid.uuid4().hex}.baby-album.zip"
    manifest_assets = []
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_STORED, allowZip64=True) as archive:
        for asset in assets:
            source = MEDIA_DIR / asset["relative_path"]
            if not source.is_file():
                raise ValueError(f"素材文件缺失：{asset['original_name']}")
            archive_path = f"assets/{asset['relative_path']}"
            archive.write(source, archive_path)
            manifest_assets.append({key: asset[key] for key in asset.keys() if key != "created_at"} | {"archivePath": archive_path})
        archive.writestr("album.json", json.dumps(album, ensure_ascii=False, indent=2))
        archive.writestr(
            "manifest.json",
            json.dumps(
                {"format": "baby-album", "version": FORMAT_VERSION, "albumId": album_id, "assets": manifest_assets},
                ensure_ascii=False,
                indent=2,
            ),
        )
    return path, f"{album.get('slug') or 'baby-album'}.baby-album.zip"


def _validate_member(name: str) -> None:
    path = PurePosixPath(name)
    if path.is_absolute() or ".." in path.parts or "\\" in name:
        raise ValueError("备份包含不安全的文件路径")


def inspect_backup(path: Path) -> dict:
    try:
        with zipfile.ZipFile(path) as archive:
            members = archive.infolist()
            if len(members) > MAX_FILES:
                raise ValueError("备份中的文件数量过多")
            if sum(item.file_size for item in members) > MAX_EXTRACTED_BYTES:
                raise ValueError("备份解压后的体积超过 10GB")
            for item in members:
                _validate_member(item.filename)
            if len({item.filename for item in members}) != len(members):
                raise ValueError("备份中包含重复文件")
            manifest = json.loads(archive.read("manifest.json"))
            album = json.loads(archive.read("album.json"))
            if manifest.get("format") != "baby-album" or manifest.get("version") != FORMAT_VERSION:
                raise ValueError("不支持的备份版本")
            expected = {item["archivePath"] for item in manifest.get("assets", [])}
            actual = {item.filename for item in members}
            if not expected.issubset(actual):
                raise ValueError("备份中的素材文件不完整")
            for asset in manifest.get("assets", []):
                digest = hashlib.sha256()
                with archive.open(asset["archivePath"]) as source:
                    while chunk := source.read(1024 * 1024):
                        digest.update(chunk)
                if digest.hexdigest() != asset.get("sha256"):
                    raise ValueError(f"素材校验失败：{asset.get('original_name', '未知文件')}")
    except (zipfile.BadZipFile, KeyError, json.JSONDecodeError) as error:
        raise ValueError("备份文件已损坏或格式不正确") from error
    chapters = album.get("chapters", [])
    stories = [story for chapter in chapters for story in chapter.get("stories", [])]
    photo_count = sum(
        1 for story in stories for media in story.get("media", []) if media.get("type") == "image"
    )
    return {
        "albumId": album.get("id"),
        "displayName": album.get("profile", {}).get("displayName", "未命名宝宝"),
        "chapterCount": len(chapters),
        "storyCount": len(stories),
        "photoCount": photo_count,
        "assetCount": len(manifest.get("assets", [])),
        "backupBytes": path.stat().st_size,
    }


def apply_backup(path: Path) -> dict:
    inspect_backup(path)
    stage = TEMP_DIR / f"restore-{uuid.uuid4().hex}"
    stage.mkdir(parents=True, exist_ok=True)
    try:
        with zipfile.ZipFile(path) as archive:
            archive.extractall(stage)
        album = json.loads((stage / "album.json").read_text(encoding="utf-8"))
        manifest = json.loads((stage / "manifest.json").read_text(encoding="utf-8"))
        album_id = str(album["id"])
        old = TEMP_DIR / f"old-media-{uuid.uuid4().hex}"
        if MEDIA_DIR.exists():
            MEDIA_DIR.replace(old)
        try:
            restored_root = stage / "assets"
            if restored_root.exists():
                shutil.copytree(restored_root, MEDIA_DIR)
            else:
                MEDIA_DIR.mkdir(parents=True, exist_ok=True)
            with connect() as database:
                database.execute("DELETE FROM assets")
                database.execute("DELETE FROM albums")
                for asset in manifest.get("assets", []):
                    database.execute(
                        """INSERT INTO assets(id, album_id, group_id, kind, variant, original_name,
                                              mime_type, size, relative_path, sha256, created_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            asset["id"], asset["album_id"], asset["group_id"], asset["kind"],
                            asset["variant"], asset["original_name"], asset["mime_type"], asset["size"],
                            asset["relative_path"], asset["sha256"], utc_now(),
                        ),
                    )
                album.setdefault("storagePreferences", {"retainOriginalPhotos": False})
                database.execute(
                    "INSERT INTO albums(id, payload, updated_at) VALUES (?, ?, ?)",
                    (album_id, json.dumps(album, ensure_ascii=False, separators=(",", ":")), utc_now()),
                )
            shutil.rmtree(old, ignore_errors=True)
        except Exception:
            shutil.rmtree(MEDIA_DIR, ignore_errors=True)
            if old.exists():
                old.replace(MEDIA_DIR)
            raise
        return album
    finally:
        shutil.rmtree(stage, ignore_errors=True)
