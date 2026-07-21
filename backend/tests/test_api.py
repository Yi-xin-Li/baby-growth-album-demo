import io
import zipfile

from fastapi.testclient import TestClient
from PIL import Image

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
