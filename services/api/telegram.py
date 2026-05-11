from __future__ import annotations

import os

import httpx

from database import get_strategy_settings, has_notification, has_open_entry_notification, mark_notification_sent


def telegram_chat_ids() -> list[str]:
    settings = get_strategy_settings()
    configured_ids = [str(item).strip() for item in settings.get("telegram_chat_ids", []) if str(item).strip()]
    if configured_ids:
        return configured_ids
    raw = os.getenv("TELEGRAM_CHAT_IDS") or os.getenv("TELEGRAM_CHAT_ID", "")
    return [item.strip() for item in raw.split(",") if item.strip()]


def telegram_configured() -> bool:
    return bool(os.getenv("TELEGRAM_BOT_TOKEN") and telegram_chat_ids())


def _send_message(text: str) -> None:
    token = os.environ["TELEGRAM_BOT_TOKEN"]
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    with httpx.Client(timeout=10) as client:
        for chat_id in telegram_chat_ids():
            response = client.post(url, json={"chat_id": chat_id, "text": text})
            response.raise_for_status()


def send_signal_notification(signal: dict[str, object]) -> bool:
    if signal["signal"] not in {"BUY", "SELL"}:
        return False
    if float(signal["confidence"]) < 0.7:
        return False
    if not telegram_configured():
        return False
    if has_open_entry_notification():
        return False

    signal_id = str(signal["signal_id"])
    if has_notification(signal_id, "entry"):
        return False

    text = (
        "Forex AI Radar - Best Signal\n"
        f"Pair: {signal['pair']}\n"
        f"Signal: {signal['signal']} | Confidence: {float(signal['confidence']) * 100:.0f}%\n"
        f"Quality: {signal['setup_quality']} | Score: {signal['setup_score']} | RR: {signal['rr']}\n"
        f"Entry: {signal['entry']} | SL: {signal['sl']} | TP: {signal['tp']}\n"
        f"Session: {signal['session']} | Trend: {signal['trend_bias']}\n"
        f"Source: {signal['source']}"
    )

    _send_message(text)
    mark_notification_sent(signal_id, "entry")
    return True


def send_trade_result_notification(trade: dict[str, object], status: str, close_price: float) -> bool:
    if status not in {"WIN", "LOSS"}:
        return False
    if not telegram_configured():
        return False

    signal_id = str(trade["signal_id"])
    if not has_notification(signal_id, "entry"):
        return False

    notification_type = f"result_{status.lower()}"
    if has_notification(signal_id, notification_type):
        return False

    label = "PASSED" if status == "WIN" else "FAILED"
    text = (
        f"Forex AI Radar - Signal {label}\n"
        f"Pair: {trade['pair']}\n"
        f"Original signal: {trade['signal']}\n"
        f"Entry: {trade['entry']} | Close: {close_price}\n"
        f"TP: {trade['tp']} | SL: {trade['sl']}\n"
        f"Result: {status}"
    )
    _send_message(text)
    mark_notification_sent(signal_id, notification_type)
    return True
