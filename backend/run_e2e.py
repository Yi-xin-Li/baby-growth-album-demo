import os
from pathlib import Path

os.environ["BABY_ALBUM_DATA_DIR"] = str(Path(__file__).resolve().parent / ".e2e-data")
os.environ["BABY_ALBUM_TESTING"] = "1"
os.environ["BABY_ALBUM_EDITOR_PIN"] = "test-editor-pin"

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000)
