from __future__ import annotations

import os
import secrets
import threading
import time
from dataclasses import dataclass
from typing import Annotated

from fastapi import Header, HTTPException

SESSION_SECONDS = 12 * 60 * 60
LEASE_SECONDS = 90


@dataclass
class EditorSession:
    token: str
    expires_at: float
    lease_expires_at: float


_lock = threading.Lock()
_sessions: dict[str, EditorSession] = {}
_active_token: str | None = None


def _editor_pin() -> str:
    pin = os.environ.get("BABY_ALBUM_EDITOR_PIN", "").strip()
    if not pin:
        raise HTTPException(503, "尚未配置编辑密码，请设置 backend/.env")
    return pin


def _cleanup(now: float) -> None:
    global _active_token
    expired = [token for token, session in _sessions.items() if session.expires_at <= now]
    for token in expired:
        _sessions.pop(token, None)
    if _active_token not in _sessions:
        _active_token = None
    elif _active_token and _sessions[_active_token].lease_expires_at <= now:
        _active_token = None


def create_editor_session(pin: str, takeover: bool = False) -> dict[str, object]:
    global _active_token
    if not secrets.compare_digest(pin, _editor_pin()):
        raise HTTPException(401, "编辑密码错误")
    now = time.time()
    with _lock:
        _cleanup(now)
        if _active_token and not takeover:
            raise HTTPException(409, "另一台设备正在编辑")
        if _active_token:
            _sessions.pop(_active_token, None)
        token = secrets.token_urlsafe(32)
        session = EditorSession(
            token=token,
            expires_at=now + SESSION_SECONDS,
            lease_expires_at=now + LEASE_SECONDS,
        )
        _sessions[token] = session
        _active_token = token
    return {
        "token": token,
        "expiresAt": int(session.expires_at * 1000),
        "leaseExpiresAt": int(session.lease_expires_at * 1000),
    }


def _bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "请先验证编辑密码")
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(401, "编辑会话无效")
    return token


def require_editor(
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    global _active_token
    token = _bearer_token(authorization)
    now = time.time()
    with _lock:
        _cleanup(now)
        session = _sessions.get(token)
        if not session or _active_token != token:
            raise HTTPException(401, "编辑会话已失效，请重新输入密码")
        if session.lease_expires_at <= now:
            _active_token = None
            raise HTTPException(409, "编辑占用已过期，请重新进入编辑模式")
        session.lease_expires_at = now + LEASE_SECONDS
    return token


def refresh_editor_session(token: str) -> dict[str, int]:
    require_editor(f"Bearer {token}")
    with _lock:
        session = _sessions[token]
        return {
            "expiresAt": int(session.expires_at * 1000),
            "leaseExpiresAt": int(session.lease_expires_at * 1000),
        }


def close_editor_session(token: str) -> None:
    global _active_token
    with _lock:
        _sessions.pop(token, None)
        if _active_token == token:
            _active_token = None


def reset_auth_state() -> None:
    global _active_token
    with _lock:
        _sessions.clear()
        _active_token = None
