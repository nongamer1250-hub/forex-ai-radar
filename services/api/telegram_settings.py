from __future__ import annotations

from fastapi import HTTPException

from database import add_telegram_recipient, list_telegram_recipients, remove_telegram_recipient, set_telegram_recipient_enabled


def recipients_for_session(session: dict[str, object]) -> list[dict[str, object]]:
    if session.get("role") == "ADMIN":
        return list_telegram_recipients()
    return list_telegram_recipients(owner_key_id=str(session["key_id"]))


def add_recipient_for_session(session: dict[str, object], chat_id: str) -> list[dict[str, object]]:
    cleaned = chat_id.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="Chat id is required.")

    if session.get("role") == "ADMIN":
        add_telegram_recipient(owner_key_id=str(session["key_id"]), owner_role="ADMIN", chat_id=cleaned)
        return list_telegram_recipients()

    existing = list_telegram_recipients(owner_key_id=str(session["key_id"]))
    if len(existing) >= 1:
        raise HTTPException(status_code=400, detail="User accounts can have only one Telegram chat id.")
    add_telegram_recipient(owner_key_id=str(session["key_id"]), owner_role="USER", chat_id=cleaned)
    return list_telegram_recipients(owner_key_id=str(session["key_id"]))


def remove_recipient_for_session(session: dict[str, object], recipient_id: str) -> list[dict[str, object]]:
    visible = recipients_for_session(session)
    if not any(str(item["recipient_id"]) == recipient_id for item in visible):
        raise HTTPException(status_code=404, detail="Recipient not found.")
    remove_telegram_recipient(recipient_id)
    return recipients_for_session(session)


def toggle_recipient_for_session(session: dict[str, object], recipient_id: str, is_enabled: bool) -> list[dict[str, object]]:
    visible = recipients_for_session(session)
    if not any(str(item["recipient_id"]) == recipient_id for item in visible):
        raise HTTPException(status_code=404, detail="Recipient not found.")
    set_telegram_recipient_enabled(recipient_id, is_enabled)
    return recipients_for_session(session)
