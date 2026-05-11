from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterator

import psycopg
from psycopg.rows import dict_row

SQLITE_DEFAULT_PATH = "forex_ai_radar.sqlite3"
POSTGRES_PREFIXES = ("postgres://", "postgresql://")


def database_url() -> str:
    return os.getenv("DATABASE_URL", SQLITE_DEFAULT_PATH)


def is_postgres() -> bool:
    return database_url().startswith(POSTGRES_PREFIXES)


def sqlite_path() -> Path:
    return Path(database_url().replace("sqlite:///", ""))


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection | psycopg.Connection[Any]]:
    if is_postgres():
        connection = psycopg.connect(database_url(), row_factory=dict_row)
    else:
        path = sqlite_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(path)
        connection.row_factory = sqlite3.Row

    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _fetchall_dicts(cursor: Any) -> list[dict[str, Any]]:
    rows = cursor.fetchall()
    if not rows:
        return []
    if isinstance(rows[0], dict):
        return [dict(row) for row in rows]
    return [dict(row) for row in rows]


def _fetchone_dict(cursor: Any) -> dict[str, Any] | None:
    row = cursor.fetchone()
    if row is None:
        return None
    return dict(row)


def _execute(connection: sqlite3.Connection | psycopg.Connection[Any], query: str, params: tuple[Any, ...] = ()) -> Any:
    return connection.execute(query, params)


def init_db() -> None:
    with get_connection() as connection:
        _execute(
            connection,
            """
            CREATE TABLE IF NOT EXISTS trades (
                signal_id TEXT PRIMARY KEY,
                pair TEXT NOT NULL,
                signal TEXT NOT NULL,
                setup_quality TEXT NOT NULL,
                setup_score DOUBLE PRECISION NOT NULL,
                confidence DOUBLE PRECISION NOT NULL,
                rr DOUBLE PRECISION NOT NULL,
                entry DOUBLE PRECISION NOT NULL,
                sl DOUBLE PRECISION NOT NULL,
                tp DOUBLE PRECISION NOT NULL,
                timestamp TEXT NOT NULL,
                trade_status TEXT NOT NULL,
                session TEXT NOT NULL,
                trend_bias TEXT NOT NULL,
                candle_strength DOUBLE PRECISION NOT NULL,
                rsi DOUBLE PRECISION NOT NULL,
                atr DOUBLE PRECISION NOT NULL,
                ema_fast DOUBLE PRECISION NOT NULL,
                ema_slow DOUBLE PRECISION NOT NULL,
                setup_type TEXT NOT NULL DEFAULT 'NONE',
                learning_bias DOUBLE PRECISION NOT NULL DEFAULT 0,
                source TEXT NOT NULL,
                closed_at TEXT,
                close_price DOUBLE PRECISION
            )
            """,
        )

        trade_columns = {
            row["column_name"] if isinstance(row, dict) and "column_name" in row else row["name"]
            for row in (
                _fetchall_dicts(
                    _execute(
                        connection,
                        """
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_name = 'trades'
                        """
                        if is_postgres()
                        else "PRAGMA table_info(trades)"
                    )
                )
            )
        }
        if "setup_type" not in trade_columns:
            _execute(connection, "ALTER TABLE trades ADD COLUMN setup_type TEXT NOT NULL DEFAULT 'NONE'")
        if "learning_bias" not in trade_columns:
            _execute(connection, "ALTER TABLE trades ADD COLUMN learning_bias DOUBLE PRECISION NOT NULL DEFAULT 0")

        _execute(connection, "CREATE INDEX IF NOT EXISTS idx_trades_pair ON trades(pair)")
        _execute(connection, "CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(trade_status)")
        _execute(connection, "CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp)")

        existing_notification_columns = {
            row["column_name"] if isinstance(row, dict) and "column_name" in row else row["name"]
            for row in (
                _fetchall_dicts(
                    _execute(
                        connection,
                        """
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_name = 'telegram_notifications'
                        """
                        if is_postgres()
                        else "PRAGMA table_info(telegram_notifications)"
                    )
                )
            )
        }
        if existing_notification_columns and "notification_key" not in existing_notification_columns:
            _execute(connection, "DROP TABLE telegram_notifications")

        _execute(
            connection,
            """
            CREATE TABLE IF NOT EXISTS telegram_notifications (
                notification_key TEXT PRIMARY KEY,
                signal_id TEXT NOT NULL,
                notification_type TEXT NOT NULL,
                sent_at TEXT NOT NULL
            )
            """,
        )


def insert_trade(trade: dict[str, Any]) -> None:
    columns = list(trade.keys())
    placeholders = ", ".join(["%s" if is_postgres() else "?" for _ in columns])
    updates = ", ".join([f"{column}=EXCLUDED.{column}" for column in columns if column != "signal_id"])
    query = f"""
        INSERT INTO trades ({", ".join(columns)})
        VALUES ({placeholders})
        ON CONFLICT(signal_id) DO UPDATE SET {updates}
    """
    with get_connection() as connection:
        _execute(connection, query, tuple(trade[column] for column in columns))


def get_all_trades(limit: int = 100) -> list[dict[str, Any]]:
    with get_connection() as connection:
        cursor = _execute(
            connection,
            "SELECT * FROM trades ORDER BY timestamp DESC LIMIT %s" if is_postgres() else "SELECT * FROM trades ORDER BY timestamp DESC LIMIT ?",
            (limit,),
        )
        return _fetchall_dicts(cursor)


def get_open_trades() -> list[dict[str, Any]]:
    with get_connection() as connection:
        cursor = _execute(
            connection,
            "SELECT * FROM trades WHERE trade_status = %s ORDER BY timestamp DESC"
            if is_postgres()
            else "SELECT * FROM trades WHERE trade_status = ? ORDER BY timestamp DESC",
            ("OPEN",),
        )
        return _fetchall_dicts(cursor)


def get_closed_trades(limit: int = 200) -> list[dict[str, Any]]:
    with get_connection() as connection:
        cursor = _execute(
            connection,
            """
            SELECT *
            FROM trades
            WHERE trade_status IN ('WIN', 'LOSS')
              AND signal IN ('BUY', 'SELL')
            ORDER BY closed_at DESC, timestamp DESC
            LIMIT %s
            """
            if is_postgres()
            else """
            SELECT *
            FROM trades
            WHERE trade_status IN ('WIN', 'LOSS')
              AND signal IN ('BUY', 'SELL')
            ORDER BY closed_at DESC, timestamp DESC
            LIMIT ?
            """,
            (limit,),
        )
        return _fetchall_dicts(cursor)


def update_trade_status(signal_id: str, status: str, close_price: float | None = None) -> None:
    with get_connection() as connection:
        _execute(
            connection,
            """
            UPDATE trades
            SET trade_status = %s, closed_at = %s, close_price = %s
            WHERE signal_id = %s
            """
            if is_postgres()
            else """
            UPDATE trades
            SET trade_status = ?, closed_at = ?, close_price = ?
            WHERE signal_id = ?
            """,
            (status, now_iso(), close_price, signal_id),
        )


def has_notification(signal_id: str, notification_type: str) -> bool:
    notification_key = f"{signal_id}:{notification_type}"
    with get_connection() as connection:
        cursor = _execute(
            connection,
            "SELECT notification_key FROM telegram_notifications WHERE notification_key = %s"
            if is_postgres()
            else "SELECT notification_key FROM telegram_notifications WHERE notification_key = ?",
            (notification_key,),
        )
        return _fetchone_dict(cursor) is not None


def mark_notification_sent(signal_id: str, notification_type: str) -> None:
    notification_key = f"{signal_id}:{notification_type}"
    with get_connection() as connection:
        _execute(
            connection,
            """
            INSERT INTO telegram_notifications (notification_key, signal_id, notification_type, sent_at)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT(notification_key) DO NOTHING
            """
            if is_postgres()
            else """
            INSERT OR IGNORE INTO telegram_notifications (notification_key, signal_id, notification_type, sent_at)
            VALUES (?, ?, ?, ?)
            """,
            (notification_key, signal_id, notification_type, now_iso()),
        )


def has_open_entry_notification() -> bool:
    with get_connection() as connection:
        cursor = _execute(
            connection,
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
            """,
        )
        return _fetchone_dict(cursor) is not None


def get_active_entry_trade() -> dict[str, Any] | None:
    with get_connection() as connection:
        cursor = _execute(
            connection,
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
            """,
        )
        return _fetchone_dict(cursor)


def get_latest_entry_trade() -> dict[str, Any] | None:
    with get_connection() as connection:
        cursor = _execute(
            connection,
            """
            SELECT trade.*
            FROM telegram_notifications entry
            JOIN trades trade ON trade.signal_id = entry.signal_id
            WHERE entry.notification_type = 'entry'
            ORDER BY entry.sent_at DESC
            LIMIT 1
            """,
        )
        return _fetchone_dict(cursor)
