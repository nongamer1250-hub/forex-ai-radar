from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterator

DB_PATH = Path(os.getenv("DATABASE_URL", "forex_ai_radar.sqlite3").replace("sqlite:///", ""))


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def init_db() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS trades (
                signal_id TEXT PRIMARY KEY,
                pair TEXT NOT NULL,
                signal TEXT NOT NULL CHECK(signal IN ('BUY', 'SELL', 'WAIT')),
                setup_quality TEXT NOT NULL,
                setup_score REAL NOT NULL,
                confidence REAL NOT NULL,
                rr REAL NOT NULL,
                entry REAL NOT NULL,
                sl REAL NOT NULL,
                tp REAL NOT NULL,
                timestamp TEXT NOT NULL,
                trade_status TEXT NOT NULL CHECK(trade_status IN ('OPEN', 'WIN', 'LOSS', 'WAIT')),
                session TEXT NOT NULL,
                trend_bias TEXT NOT NULL,
                candle_strength REAL NOT NULL,
                rsi REAL NOT NULL,
                atr REAL NOT NULL,
                ema_fast REAL NOT NULL,
                ema_slow REAL NOT NULL,
                source TEXT NOT NULL,
                closed_at TEXT,
                close_price REAL
            )
            """
        )
        connection.execute("CREATE INDEX IF NOT EXISTS idx_trades_pair ON trades(pair)")
        connection.execute("CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(trade_status)")
        connection.execute("CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp)")
        existing_columns = connection.execute("PRAGMA table_info(telegram_notifications)").fetchall()
        if existing_columns and not any(row["name"] == "notification_key" for row in existing_columns):
            connection.execute("DROP TABLE telegram_notifications")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS telegram_notifications (
                notification_key TEXT PRIMARY KEY,
                signal_id TEXT NOT NULL,
                notification_type TEXT NOT NULL,
                sent_at TEXT NOT NULL
            )
            """
        )


def _row_to_trade(row: sqlite3.Row) -> dict[str, Any]:
    return dict(row)


def insert_trade(trade: dict[str, Any]) -> None:
    columns = ", ".join(trade.keys())
    placeholders = ", ".join([f":{key}" for key in trade.keys()])
    updates = ", ".join([f"{key}=excluded.{key}" for key in trade.keys() if key != "signal_id"])
    with get_connection() as connection:
        connection.execute(
            f"""
            INSERT INTO trades ({columns})
            VALUES ({placeholders})
            ON CONFLICT(signal_id) DO UPDATE SET {updates}
            """,
            trade,
        )


def get_all_trades(limit: int = 100) -> list[dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM trades ORDER BY timestamp DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [_row_to_trade(row) for row in rows]


def get_open_trades() -> list[dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM trades WHERE trade_status = 'OPEN' ORDER BY timestamp DESC"
        ).fetchall()
    return [_row_to_trade(row) for row in rows]


def update_trade_status(signal_id: str, status: str, close_price: float | None = None) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE trades
            SET trade_status = ?, closed_at = ?, close_price = ?
            WHERE signal_id = ?
            """,
            (status, now_iso(), close_price, signal_id),
        )


def has_notification(signal_id: str, notification_type: str) -> bool:
    notification_key = f"{signal_id}:{notification_type}"
    with get_connection() as connection:
        row = connection.execute(
            "SELECT notification_key FROM telegram_notifications WHERE notification_key = ?",
            (notification_key,),
        ).fetchone()
    return row is not None


def mark_notification_sent(signal_id: str, notification_type: str) -> None:
    notification_key = f"{signal_id}:{notification_type}"
    with get_connection() as connection:
        connection.execute(
            """
            INSERT OR IGNORE INTO telegram_notifications (notification_key, signal_id, notification_type, sent_at)
            VALUES (?, ?, ?, ?)
            """,
            (notification_key, signal_id, notification_type, now_iso()),
        )


def has_open_entry_notification() -> bool:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT entry.signal_id
            FROM telegram_notifications entry
            JOIN trades trade ON trade.signal_id = entry.signal_id
            LEFT JOIN telegram_notifications result
              ON result.signal_id = entry.signal_id
             AND result.notification_type IN ('result_win', 'result_loss')
            WHERE entry.notification_type = 'entry'
              AND trade.trade_status = 'OPEN'
              AND result.signal_id IS NULL
            ORDER BY entry.sent_at DESC
            LIMIT 1
            """
        ).fetchone()
    return row is not None


def get_active_entry_trade() -> dict[str, Any] | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT trade.*
            FROM telegram_notifications entry
            JOIN trades trade ON trade.signal_id = entry.signal_id
            LEFT JOIN telegram_notifications result
              ON result.signal_id = entry.signal_id
             AND result.notification_type IN ('result_win', 'result_loss')
            WHERE entry.notification_type = 'entry'
              AND trade.trade_status = 'OPEN'
              AND result.signal_id IS NULL
            ORDER BY entry.sent_at DESC
            LIMIT 1
            """
        ).fetchone()
    return _row_to_trade(row) if row else None


def get_latest_entry_trade() -> dict[str, Any] | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT trade.*
            FROM telegram_notifications entry
            JOIN trades trade ON trade.signal_id = entry.signal_id
            WHERE entry.notification_type = 'entry'
            ORDER BY entry.sent_at DESC
            LIMIT 1
            """
        ).fetchone()
    return _row_to_trade(row) if row else None
