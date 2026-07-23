import io
import zipfile

from fastapi.testclient import TestClient
from PIL import Image

from app.database import MEDIA_DIR
from app.main import app


def make_image() -> bytes:
    output = io.BytesIO()
    Image.new("RGB", (900, 600), "#f2c7a5").save(output, format="JPEG")
    return output.getvalue()


def editor_headers(client: TestClient, takeover: bool = False) -> dict[str, str]:
    response = client.post(
        "/api/auth/editor",
        json={"pin": "test-editor-pin", "takeover": takeover},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def make_mp4(payload_size: int = 128) -> bytes:
    return b"\x00\x00\x00\x18ftypisom" + bytes(payload_size)


def test_album_photo_and_complete_export():
    album = {
        "id": "test-album",
        "slug": "test-album",
        "profile": {"displayName": "测试宝宝"},
        "chapters": [],
        "storagePreferences": {"retainOriginalPhotos": True},
    }
    with TestClient(app) as client:
        headers = editor_headers(client)
        saved = client.put("/api/albums/test-album", json={"album": album}, headers=headers)
        assert saved.status_code == 200
        assert saved.json()["revision"]

        uploaded = client.post(
            "/api/albums/test-album/photos?retain_original=true",
            files={"file": ("photo.jpg", make_image(), "image/jpeg")},
            headers=headers,
        )
        assert uploaded.status_code == 200
        media = uploaded.json()
        assert media["thumbnailId"]
        assert media["sourceId"]
        album["chapters"] = [{"stories": [{"media": [media]}]}]
        assert client.put(
            "/api/albums/test-album", json={"album": album}, headers=headers
        ).status_code == 200

        stats = client.get("/api/albums/test-album/storage", headers=headers).json()
        assert stats["fileCount"] == 4
        assert stats["originalBytes"] > 0

        asset = client.get(f"/api/assets/{media['thumbnailId']}")
        assert asset.status_code == 200
        assert asset.headers["content-type"].startswith("image/webp")

        exported = client.get("/api/albums/test-album/export", headers=headers)
        assert exported.status_code == 200
        with zipfile.ZipFile(io.BytesIO(exported.content)) as archive:
            assert "manifest.json" in archive.namelist()
            assert "album.json" in archive.namelist()
            assert any(name.startswith("assets/test-album/photos/") for name in archive.namelist())

        inspected = client.post(
            "/api/import/inspect",
            files={"file": ("backup.ZIP", exported.content, "application/zip")},
            headers=headers,
        )
        assert inspected.status_code == 200
        token = inspected.json()["token"]
        assert client.post("/api/testing/reset").status_code == 200
        headers = editor_headers(client)
        restored = client.post("/api/import/apply", json={"token": token}, headers=headers)
        assert restored.status_code == 200
        assert restored.json()["album"]["profile"]["displayName"] == "测试宝宝"
        assert client.get(f"/api/assets/{media['thumbnailId']}").status_code == 200


def test_editor_authentication_takeover_and_lan_cors():
    album = {"id": "auth-test", "profile": {}, "chapters": []}
    with TestClient(app) as client:
        unauthorized = client.put("/api/albums/auth-test", json={"album": album})
        assert unauthorized.status_code == 401

        wrong_pin = client.post("/api/auth/editor", json={"pin": "wrong"})
        assert wrong_pin.status_code == 401

        first_headers = editor_headers(client)
        occupied = client.post("/api/auth/editor", json={"pin": "test-editor-pin"})
        assert occupied.status_code == 409

        second_headers = editor_headers(client, takeover=True)
        assert client.post("/api/auth/heartbeat", headers=first_headers).status_code == 401
        assert client.put(
            "/api/albums/auth-test", json={"album": album}, headers=second_headers
        ).status_code == 200

        allowed = client.options(
            "/api/albums/active",
            headers={
                "Origin": "http://192.168.1.20:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert allowed.headers["access-control-allow-origin"] == "http://192.168.1.20:5173"

        rejected = client.options(
            "/api/albums/active",
            headers={
                "Origin": "http://example.com",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert "access-control-allow-origin" not in rejected.headers


def test_video_upload_range_validation_and_backup(monkeypatch):
    album = {
        "id": "video-album",
        "slug": "video-album",
        "profile": {"displayName": "视频宝宝"},
        "chapters": [{"stories": [{"media": []}]}],
    }
    with TestClient(app) as client:
        unauthorized = client.post(
            "/api/albums/video-album/videos",
            files={"file": ("memory.mp4", make_mp4(), "video/mp4")},
        )
        assert unauthorized.status_code == 401

        headers = editor_headers(client)
        assert client.put(
            "/api/albums/video-album", json={"album": album}, headers=headers
        ).status_code == 200
        uploaded = client.post(
            "/api/albums/video-album/videos",
            files={"file": ("memory.mp4", make_mp4(), "video/mp4")},
            headers=headers,
        )
        assert uploaded.status_code == 200
        video = uploaded.json()
        assert video["type"] == "video"
        assert video["source"].startswith("backend://asset/")
        album["chapters"][0]["stories"][0]["media"] = [video]
        assert client.put(
            "/api/albums/video-album", json={"album": album}, headers=headers
        ).status_code == 200

        ranged = client.get(
            f"/api/assets/{video['sourceId']}", headers={"Range": "bytes=0-7"}
        )
        assert ranged.status_code == 206
        assert ranged.content == make_mp4()[:8]
        assert ranged.headers["content-range"].startswith("bytes 0-7/")
        assert ranged.headers["content-disposition"].startswith("inline")

        invalid = client.post(
            "/api/albums/video-album/videos",
            files={"file": ("fake.mp4", b"not-a-video", "video/mp4")},
            headers=headers,
        )
        assert invalid.status_code == 400

        mismatch = client.post(
            "/api/albums/video-album/videos",
            files={"file": ("wrong.webm", make_mp4(), "video/mp4")},
            headers=headers,
        )
        assert mismatch.status_code == 400

        monkeypatch.setenv("BABY_ALBUM_MAX_VIDEO_MB", "1")
        oversized = client.post(
            "/api/albums/video-album/videos",
            files={"file": ("large.mp4", make_mp4(1024 * 1024), "video/mp4")},
            headers=headers,
        )
        assert oversized.status_code == 400
        assert not list((MEDIA_DIR / ".uploads").glob("*.part"))
        monkeypatch.delenv("BABY_ALBUM_MAX_VIDEO_MB", raising=False)

        exported = client.get("/api/albums/video-album/export", headers=headers)
        assert exported.status_code == 200
        with zipfile.ZipFile(io.BytesIO(exported.content)) as archive:
            assert any(name.startswith("assets/video-album/videos/") for name in archive.namelist())
        inspected = client.post(
            "/api/import/inspect",
            files={"file": ("video-backup.zip", exported.content, "application/zip")},
            headers=headers,
        )
        assert inspected.status_code == 200
        assert inspected.json()["summary"]["videoCount"] == 1
        restored = client.post(
            "/api/import/apply",
            json={"token": inspected.json()["token"]},
            headers=headers,
        )
        assert restored.status_code == 200
        restored_video = client.get(
            f"/api/assets/{video['sourceId']}", headers={"Range": "bytes=0-7"}
        )
        assert restored_video.status_code == 206
        assert restored_video.content == make_mp4()[:8]
