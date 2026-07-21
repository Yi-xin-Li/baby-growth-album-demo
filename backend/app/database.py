from __future__ import annotations

import json
import os
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = Path(os.environ.get("BABY_ALBUM_DATA_DIR", BASE_DIR / "data"))
MEDIA_DIR = DATA_DIR / "media"
TEMP_DIR = DATA_DIR / "tmp"
DATABASE_PATH = DATA_DIR / "app.db"


def ensure_data_dirs() -> None:
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    TEMP_DIR.mkdir(parents=True, exist_ok=True)


def connect() -> sqlite3.Connection:
    ensure_data_dirs()
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    return connection


def initialize_database() -> None:
    with connect() as database:
        database.executescript(
            """
            CREATE TABLE IF NOT EXISTS albums (
                id TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS assets (
                id TEXT PRIMARY KEY,
                album_id TEXT NOT NULL,
                group_id TEXT NOT NULL,
                kind TEXT NOT NULL,
                variant TEXT NOT NULL,
                original_name TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                size INTEGER NOT NULL,
                relative_path TEXT NOT NULL UNIQUE,
                sha256 TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_assets_album ON assets(album_id);
            CREATE INDEX IF NOT EXISTS idx_assets_group ON assets(group_id);
            """
        )


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def get_album(album_id: str) -> dict[str, Any] | None:
    with connect() as database:
        row = database.execute("SELECT payload FROM albums WHERE id = ?", (album_id,)).fetchone()
    return json.loads(row["payload"]) if row else None


def get_active_album() -> dict[str, Any] | None:
    with connect() as database:
        row = database.execute(
            "SELECT payload FROM albums ORDER BY updated_at DESC LIMIT 1"
        ).fetchone()
    return json.loads(row["payload"]) if row else None


def get_album_revision(album_id: str) -> str | None:
    with connect() as database:
        row = database.execute("SELECT updated_at FROM albums WHERE id = ?", (album_id,)).fetchone()
    return str(row["updated_at"]) if row else None


def put_album(album: dict[str, Any]) -> dict[str, Any]:
    album_id = str(album.get("id") or "active-album")
    album["id"] = album_id
    album.setdefault("storagePreferences", {"retainOriginalPhotos": False})
    payload = json.dumps(album, ensure_ascii=False, separators=(",", ":"))
    with connect() as database:
        database.execute(
            """
            INSERT INTO albums(id, payload, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
            """,
            (album_id, payload, utc_now()),
        )
    return album


def get_asset(asset_id: str) -> sqlite3.Row | None:
    with connect() as database:
        return database.execute("SELECT * FROM assets WHERE id = ?", (asset_id,)).fetchone()


def list_assets(album_id: str) -> list[sqlite3.Row]:
    with connect() as database:
        return list(database.execute("SELECT * FROM assets WHERE album_id = ?", (album_id,)))


def storage_stats(album_id: str) -> dict[str, int]:
    with connect() as database:
        row = database.execute(
            """
            SELECT COALESCE(SUM(size), 0) total,
                   COALESCE(SUM(CASE WHEN variant = 'source' THEN size ELSE 0 END), 0) originals,
                   COUNT(*) files
            FROM assets WHERE album_id = ?
            """,
            (album_id,),
        ).fetchone()
    return {"totalBytes": row["total"], "originalBytes": row["originals"], "fileCount": row["files"]}


def reset_all_data() -> None:
    with connect() as database:
        database.execute("DELETE FROM assets")
        database.execute("DELETE FROM albums")
    if MEDIA_DIR.exists():
        import shutil

        shutil.rmtree(MEDIA_DIR, ignore_errors=True)
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
