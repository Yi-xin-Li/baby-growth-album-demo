import os
import shutil
import sys
import tempfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

_test_data_dir = tempfile.mkdtemp(prefix="baby-album-tests-")
os.environ["BABY_ALBUM_DATA_DIR"] = _test_data_dir
os.environ["BABY_ALBUM_TESTING"] = "1"
os.environ["BABY_ALBUM_EDITOR_PIN"] = "test-editor-pin"


@pytest.fixture(autouse=True)
def reset_editor_sessions():
    from app.auth import reset_auth_state

    reset_auth_state()
    yield
    reset_auth_state()


def pytest_sessionfinish(session, exitstatus):
    shutil.rmtree(_test_data_dir, ignore_errors=True)
