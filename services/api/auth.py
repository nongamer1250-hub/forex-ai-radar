from __future__ import annotations

import os
from typing import Any
from datetime import UTC, datetime, timedelta
from collections import defaultdict

from fastapi import Header, HTTPException

from database import (
    bind_access_key,
    create_access_key,
    create_auth_session,
    get_access_key,
    get_auth_session,
    list_access_keys,
    list_auth_sessions,
    revoke_sessions_for_key,
    revoke_access_key,
    revoke_auth_session,
    touch_auth_session,
)

LOGIN_WINDOW_SECONDS = 300
LOGIN_MAX_ATTEMPTS = 8
_LOGIN_ATTEMPTS: dict[str, list[float]] = defaultdict(list)


def admin_access_key() -> str:
    return os.getenv("ADMIN_ACCESS_KEY", "")


def bootstrap_admin_key() -> str:
    current = admin_access_key()
    if current:
        return current
    generated = "fxr_admin_terminal_9f2c71_gate"
    os.environ["ADMIN_ACCESS_KEY"] = generated
    return generated


def mask_secret(value: str) -> str:
    if len(value) <= 10:
        return "*" * len(value)
    return f"{value[:6]}...{value[-4:]}"


def session_expiry_for_role(role: str) -> str:
    now = datetime.now(UTC)
    if role == "ADMIN":
        return (now + timedelta(minutes=20)).isoformat()
    return (now + timedelta(days=7)).isoformat()


def is_expired(timestamp: str | None) -> bool:
    if not timestamp:
        return True
    try:
        return datetime.fromisoformat(timestamp) <= datetime.now(UTC)
    except ValueError:
        return True


def check_login_rate_limit(source_id: str) -> None:
    now_ts = datetime.now(UTC).timestamp()
    recent = [ts for ts in _LOGIN_ATTEMPTS[source_id] if now_ts - ts <= LOGIN_WINDOW_SECONDS]
    if len(recent) >= LOGIN_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")
    recent.append(now_ts)
    _LOGIN_ATTEMPTS[source_id] = recent


def login_with_key(*, access_key: str, user_name: str, source_id: str) -> dict[str, Any]:
    check_login_rate_limit(source_id or "unknown")
    cleaned_key = access_key.strip()
    cleaned_user = user_name.strip()
    if not cleaned_key or not cleaned_user:
        raise HTTPException(status_code=400, detail="Key and user name are required.")

    if cleaned_key == admin_access_key():
        revoke_sessions_for_key("admin_env_key")
        session = create_auth_session(
            key_id="admin_env_key",
            role="ADMIN",
            user_name=cleaned_user,
            expires_at=session_expiry_for_role("ADMIN"),
        )
        return {
            "session_token": session["session_token"],
            "role": "ADMIN",
            "user_name": cleaned_user,
            "label": "Admin",
            "expires_at": session["expires_at"],
        }

    key_record = get_access_key(cleaned_key)
    if not key_record or key_record["status"] != "ACTIVE":
        raise HTTPException(status_code=401, detail="Invalid or revoked access key.")
    assigned_user = (key_record.get("assigned_user") or "").strip()
    if not assigned_user:
        key_record = bind_access_key(cleaned_key, cleaned_user)
        assigned_user = cleaned_user
    if assigned_user.lower() != cleaned_user.lower():
        raise HTTPException(status_code=403, detail="This key is already assigned to another user.")

    key_id = str(key_record["key_id"])
    role = str(key_record["role"])
    revoke_sessions_for_key(key_id)
    session = create_auth_session(
        key_id=key_id,
        role=role,
        user_name=assigned_user,
        expires_at=session_expiry_for_role(role),
    )
    return {
        "session_token": session["session_token"],
        "role": role,
        "user_name": assigned_user,
        "label": key_record["label"],
        "expires_at": session["expires_at"],
    }


def require_session(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    token = (authorization or "").removeprefix("Bearer").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing session token.")
    session = get_auth_session(token)
    if not session:
        raise HTTPException(status_code=401, detail="Session not found.")
    if session.get("revoked_at"):
        raise HTTPException(status_code=401, detail="Session revoked.")
    if is_expired(str(session.get("expires_at") or "")):
        revoke_auth_session(token)
        raise HTTPException(status_code=401, detail="Session expired.")
    if session.get("role") != "ADMIN" and session.get("key_status") != "ACTIVE":
        raise HTTPException(status_code=401, detail="Key revoked.")
    touch_auth_session(token)
    return session


def require_admin(session: dict[str, Any]) -> dict[str, Any]:
    if session.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return session


def is_admin_session(session: dict[str, Any]) -> bool:
    return session.get("role") == "ADMIN"


def current_session_payload(session: dict[str, Any]) -> dict[str, Any]:
    return {
        "role": session.get("role"),
        "user_name": session.get("user_name"),
        "label": session.get("label") or ("Admin" if session.get("role") == "ADMIN" else "User"),
        "expires_at": session.get("expires_at"),
    }


def create_user_key(*, label: str) -> dict[str, Any]:
    return create_access_key(role="USER", label=label)


def admin_key_state() -> dict[str, Any]:
    keys = list_access_keys()
    masked_keys = [
        {
            **record,
            "access_key": mask_secret(str(record.get("access_key", ""))),
        }
        for record in keys
    ]
    return {
        "admin_key_configured": bool(admin_access_key()),
        "generated_keys": masked_keys,
        "active_sessions": list_auth_sessions(limit=200),
    }


def logout_session(session_token: str) -> None:
    revoke_auth_session(session_token)


def revoke_user_key(key_id: str) -> dict[str, Any]:
    revoke_access_key(key_id)
    return admin_key_state()
