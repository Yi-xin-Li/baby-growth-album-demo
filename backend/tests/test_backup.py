import io
import json
import zipfile

import pytest

from app.backup import inspect_backup


def test_rejects_zip_slip(tmp_path):
    path = tmp_path / "unsafe.baby-album.zip"
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("../escape.txt", "no")
        archive.writestr("manifest.json", json.dumps({"format": "baby-album", "version": 1, "assets": []}))
        archive.writestr("album.json", json.dumps({"id": "test", "profile": {}, "chapters": []}))
    with pytest.raises(ValueError, match="不安全"):
        inspect_backup(path)


def test_inspects_complete_backup(tmp_path):
    path = tmp_path / "valid.baby-album.zip"
    album = {
        "id": "test",
        "profile": {"displayName": "宝宝"},
        "chapters": [{"stories": [{"media": [{"type": "image"}]}]}],
    }
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("manifest.json", json.dumps({"format": "baby-album", "version": 1, "assets": []}))
        archive.writestr("album.json", json.dumps(album, ensure_ascii=False))
    summary = inspect_backup(path)
    assert summary["displayName"] == "宝宝"
    assert summary["photoCount"] == 1
