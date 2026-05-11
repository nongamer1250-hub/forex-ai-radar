from __future__ import annotations

import os
import secrets
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

        _execute(
            connection,
            """
            CREATE TABLE IF NOT EXISTS strategy_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """,
        )

        _execute(
            connection,
            """
            CREATE TABLE IF NOT EXISTS demo_accounts (
                account_id TEXT PRIMARY KEY,
                start_balance DOUBLE PRECISION NOT NULL,
                balance DOUBLE PRECISION NOT NULL,
                updated_at TEXT NOT NULL
            )
            """,
        )

        _execute(
            connection,
            """
            CREATE TABLE IF NOT EXISTS demo_trades (
                demo_trade_id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL DEFAULT 'primary',
                pair TEXT NOT NULL,
                signal TEXT NOT NULL,
                units DOUBLE PRECISION NOT NULL,
                entry DOUBLE PRECISION NOT NULL,
                sl DOUBLE PRECISION NOT NULL,
                tp DOUBLE PRECISION NOT NULL,
                rr DOUBLE PRECISION NOT NULL,
                status TEXT NOT NULL,
                opened_at TEXT NOT NULL,
                closed_at TEXT,
                close_price DOUBLE PRECISION,
                realized_pnl DOUBLE PRECISION,
                source_signal_id TEXT
            )
            """,
        )
        demo_trade_columns = {
            row["column_name"] if isinstance(row, dict) and "column_name" in row else row["name"]
            for row in (
                _fetchall_dicts(
                    _execute(
                        connection,
                        """
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_name = 'demo_trades'
                        """
                        if is_postgres()
                        else "PRAGMA table_info(demo_trades)"
                    )
                )
            )
        }
        if "account_id" not in demo_trade_columns:
            _execute(connection, "ALTER TABLE demo_trades ADD COLUMN account_id TEXT NOT NULL DEFAULT 'primary'")
        _execute(connection, "CREATE INDEX IF NOT EXISTS idx_demo_trades_status ON demo_trades(status)")
        _execute(connection, "CREATE INDEX IF NOT EXISTS idx_demo_trades_opened_at ON demo_trades(opened_at)")
        _execute(connection, "CREATE INDEX IF NOT EXISTS idx_demo_trades_account_id ON demo_trades(account_id)")

        _execute(
            connection,
            """
            CREATE TABLE IF NOT EXISTS access_keys (
                key_id TEXT PRIMARY KEY,
                access_key TEXT NOT NULL UNIQUE,
                role TEXT NOT NULL,
                label TEXT NOT NULL,
                assigned_user TEXT,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                redeemed_at TEXT
            )
            """,
        )
        _execute(connection, "CREATE INDEX IF NOT EXISTS idx_access_keys_role ON access_keys(role)")
        _execute(connection, "CREATE INDEX IF NOT EXISTS idx_access_keys_status ON access_keys(status)")

        _execute(
            connection,
            """
            CREATE TABLE IF NOT EXISTS auth_sessions (
                session_token TEXT PRIMARY KEY,
                key_id TEXT NOT NULL,
                role TEXT NOT NULL,
                user_name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_seen_at TEXT NOT NULL,
                revoked_at TEXT
            )
            """,
        )
        _execute(connection, "CREATE INDEX IF NOT EXISTS idx_auth_sessions_key_id ON auth_sessions(key_id)")

        _execute(
            connection,
            """
            CREATE TABLE IF NOT EXISTS feature_logs (
                signal_id TEXT PRIMARY KEY,
                pair TEXT NOT NULL,
                signal TEXT NOT NULL,
                trade_status TEXT NOT NULL,
                setup_type TEXT NOT NULL,
                setup_score DOUBLE PRECISION NOT NULL,
                confidence DOUBLE PRECISION NOT NULL,
                learning_bias DOUBLE PRECISION NOT NULL,
                rr DOUBLE PRECISION NOT NULL,
                session TEXT NOT NULL,
                trend_bias TEXT NOT NULL,
                higher_timeframe_bias TEXT NOT NULL DEFAULT '',
                candle_strength DOUBLE PRECISION NOT NULL,
                rsi DOUBLE PRECISION NOT NULL,
                atr DOUBLE PRECISION NOT NULL,
                atr_ratio DOUBLE PRECISION NOT NULL DEFAULT 0,
                adx DOUBLE PRECISION NOT NULL DEFAULT 0,
                macd_hist DOUBLE PRECISION NOT NULL DEFAULT 0,
                trend_strength DOUBLE PRECISION NOT NULL DEFAULT 0,
                fast_slope DOUBLE PRECISION NOT NULL DEFAULT 0,
                ema_50_slope DOUBLE PRECISION NOT NULL DEFAULT 0,
                market_ok INTEGER NOT NULL DEFAULT 0,
                structural_ok INTEGER NOT NULL DEFAULT 0,
                ema_fast DOUBLE PRECISION NOT NULL,
                ema_slow DOUBLE PRECISION NOT NULL,
                source TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                closed_at TEXT,
                close_price DOUBLE PRECISION
            )
            """,
        )
        feature_columns = {
            row["column_name"] if isinstance(row, dict) and "column_name" in row else row["name"]
            for row in (
                _fetchall_dicts(
                    _execute(
                        connection,
                        """
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_name = 'feature_logs'
                        """
                        if is_postgres()
                        else "PRAGMA table_info(feature_logs)"
                    )
                )
            )
        }
        feature_defaults = {
            "higher_timeframe_bias": "TEXT NOT NULL DEFAULT ''",
            "atr_ratio": "DOUBLE PRECISION NOT NULL DEFAULT 0",
            "adx": "DOUBLE PRECISION NOT NULL DEFAULT 0",
            "macd_hist": "DOUBLE PRECISION NOT NULL DEFAULT 0",
            "trend_strength": "DOUBLE PRECISION NOT NULL DEFAULT 0",
            "fast_slope": "DOUBLE PRECISION NOT NULL DEFAULT 0",
            "ema_50_slope": "DOUBLE PRECISION NOT NULL DEFAULT 0",
            "market_ok": "INTEGER NOT NULL DEFAULT 0",
            "structural_ok": "INTEGER NOT NULL DEFAULT 0",
        }
        for column, definition in feature_defaults.items():
            if column not in feature_columns:
                _execute(connection, f"ALTER TABLE feature_logs ADD COLUMN {column} {definition}")
        _execute(connection, "CREATE INDEX IF NOT EXISTS idx_feature_logs_pair ON feature_logs(pair)")
        _execute(connection, "CREATE INDEX IF NOT EXISTS idx_feature_logs_status ON feature_logs(trade_status)")
        _execute(
            connection,
            """
            INSERT INTO demo_accounts (account_id, start_balance, balance, updated_at)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT(account_id) DO NOTHING
            """
            if is_postgres()
            else """
            INSERT OR IGNORE INTO demo_accounts (account_id, start_balance, balance, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            ("primary", 10000.0, 10000.0, now_iso()),
        )


def insert_trade(trade: dict[str, Any]) -> None:
    columns = [
        "signal_id",
        "pair",
        "signal",
        "setup_quality",
        "setup_score",
        "confidence",
        "rr",
        "entry",
        "sl",
        "tp",
        "timestamp",
        "trade_status",
        "session",
        "trend_bias",
        "candle_strength",
        "rsi",
        "atr",
        "ema_fast",
        "ema_slow",
        "setup_type",
        "learning_bias",
        "source",
        "closed_at",
        "close_price",
    ]
    placeholders = ", ".join(["%s" if is_postgres() else "?" for _ in columns])
    updates = ", ".join([f"{column}=EXCLUDED.{column}" for column in columns if column != "signal_id"])
    query = f"""
        INSERT INTO trades ({", ".join(columns)})
        VALUES ({placeholders})
        ON CONFLICT(signal_id) DO UPDATE SET {updates}
    """
    with get_connection() as connection:
        _execute(connection, query, tuple(trade.get(column) for column in columns))
        feature_columns = [
            "signal_id",
            "pair",
            "signal",
            "trade_status",
            "setup_type",
            "setup_score",
            "confidence",
            "learning_bias",
            "rr",
            "session",
            "trend_bias",
            "higher_timeframe_bias",
            "candle_strength",
            "rsi",
            "atr",
            "atr_ratio",
            "adx",
            "macd_hist",
            "trend_strength",
            "fast_slope",
            "ema_50_slope",
            "market_ok",
            "structural_ok",
            "ema_fast",
            "ema_slow",
            "source",
            "timestamp",
            "closed_at",
            "close_price",
        ]
        feature_values = {column: trade.get(column) for column in feature_columns}
        for key in ("market_ok", "structural_ok"):
            if key in feature_values:
                feature_values[key] = 1 if feature_values[key] else 0
        feature_placeholders = ", ".join(["%s" if is_postgres() else "?" for _ in feature_columns])
        feature_updates = ", ".join([f"{column}=EXCLUDED.{column}" for column in feature_columns if column != "signal_id"])
        feature_query = f"""
            INSERT INTO feature_logs ({", ".join(feature_columns)})
            VALUES ({feature_placeholders})
            ON CONFLICT(signal_id) DO UPDATE SET {feature_updates}
        """
        _execute(connection, feature_query, tuple(feature_values[column] for column in feature_columns))


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
        closed_at = now_iso()
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
            (status, closed_at, close_price, signal_id),
        )
        _execute(
            connection,
            """
            UPDATE feature_logs
            SET trade_status = %s, closed_at = %s, close_price = %s
            WHERE signal_id = %s
            """
            if is_postgres()
            else """
            UPDATE feature_logs
            SET trade_status = ?, closed_at = ?, close_price = ?
            WHERE signal_id = ?
            """,
            (status, closed_at, close_price, signal_id),
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


def get_feature_logs(limit: int = 500) -> list[dict[str, Any]]:
    with get_connection() as connection:
        cursor = _execute(
            connection,
            "SELECT * FROM feature_logs ORDER BY timestamp DESC LIMIT %s"
            if is_postgres()
            else "SELECT * FROM feature_logs ORDER BY timestamp DESC LIMIT ?",
            (limit,),
        )
        return _fetchall_dicts(cursor)


def get_strategy_settings() -> dict[str, Any]:
    with get_connection() as connection:
        cursor = _execute(connection, "SELECT key, value FROM strategy_settings")
        rows = _fetchall_dicts(cursor)
    settings = {row["key"]: row["value"] for row in rows}
    enabled_pairs = settings.get("enabled_pairs", "ALL")
    enabled_setups = settings.get("enabled_setups", "BUY_PULLBACK,SELL_PULLBACK")
    min_confidence = float(settings.get("min_confidence", "0.60"))
    auto_block_enabled = settings.get("auto_block_enabled", "true").lower() == "true"
    telegram_chat_ids = settings.get("telegram_chat_ids", "").strip()
    recipients = [item.strip() for item in telegram_chat_ids.split(",") if item.strip()]
    return {
        "enabled_pairs": [] if enabled_pairs == "ALL" else [item for item in enabled_pairs.split(",") if item],
        "enabled_setups": [item for item in enabled_setups.split(",") if item],
        "min_confidence": min_confidence,
        "auto_block_enabled": auto_block_enabled,
        "telegram_chat_ids": recipients,
    }


def save_strategy_settings(
    *,
    enabled_pairs: list[str],
    enabled_setups: list[str],
    min_confidence: float,
    auto_block_enabled: bool,
    telegram_chat_ids: list[str] | None = None,
) -> dict[str, Any]:
    normalized_pairs = sorted(set(enabled_pairs))
    normalized_setups = sorted(set(enabled_setups))
    normalized_chat_ids = sorted({item.strip() for item in (telegram_chat_ids or []) if item and item.strip()})
    payload = {
        "enabled_pairs": ",".join(normalized_pairs) if normalized_pairs else "ALL",
        "enabled_setups": ",".join(normalized_setups),
        "min_confidence": f"{min_confidence:.2f}",
        "auto_block_enabled": "true" if auto_block_enabled else "false",
        "telegram_chat_ids": ",".join(normalized_chat_ids),
    }
    with get_connection() as connection:
        for key, value in payload.items():
            _execute(
                connection,
                """
                INSERT INTO strategy_settings (key, value, updated_at)
                VALUES (%s, %s, %s)
                ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
                """
                if is_postgres()
                else """
                INSERT INTO strategy_settings (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
                """,
                (key, value, now_iso()),
            )
    return get_strategy_settings()


def create_access_key(*, role: str, label: str) -> dict[str, Any]:
    record = {
        "key_id": f"key_{secrets.token_hex(8)}",
        "access_key": f"fxr_{secrets.token_urlsafe(18)}",
        "role": role,
        "label": label,
        "assigned_user": None,
        "status": "ACTIVE",
        "created_at": now_iso(),
        "redeemed_at": None,
    }
    columns = ["key_id", "access_key", "role", "label", "assigned_user", "status", "created_at", "redeemed_at"]
    placeholders = ", ".join(["%s" if is_postgres() else "?" for _ in columns])
    with get_connection() as connection:
        _execute(
            connection,
            f"INSERT INTO access_keys ({', '.join(columns)}) VALUES ({placeholders})",
            tuple(record[column] for column in columns),
        )
    return record


def list_access_keys() -> list[dict[str, Any]]:
    with get_connection() as connection:
        cursor = _execute(connection, "SELECT * FROM access_keys ORDER BY created_at DESC")
        return _fetchall_dicts(cursor)


def get_access_key(access_key: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        cursor = _execute(
            connection,
            "SELECT * FROM access_keys WHERE access_key = %s" if is_postgres() else "SELECT * FROM access_keys WHERE access_key = ?",
            (access_key,),
        )
        return _fetchone_dict(cursor)


def bind_access_key(access_key: str, user_name: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        redeemed_at = now_iso()
        _execute(
            connection,
            """
            UPDATE access_keys
            SET assigned_user = %s, redeemed_at = %s
            WHERE access_key = %s
            """
            if is_postgres()
            else """
            UPDATE access_keys
            SET assigned_user = ?, redeemed_at = ?
            WHERE access_key = ?
            """,
            (user_name, redeemed_at, access_key),
        )
    return get_access_key(access_key)


def revoke_access_key(key_id: str) -> None:
    with get_connection() as connection:
        _execute(
            connection,
            "UPDATE access_keys SET status = %s WHERE key_id = %s" if is_postgres() else "UPDATE access_keys SET status = ? WHERE key_id = ?",
            ("REVOKED", key_id),
        )
        _execute(
            connection,
            "UPDATE auth_sessions SET revoked_at = %s WHERE key_id = %s AND revoked_at IS NULL"
            if is_postgres()
            else "UPDATE auth_sessions SET revoked_at = ? WHERE key_id = ? AND revoked_at IS NULL",
            (now_iso(), key_id),
        )


def create_auth_session(*, key_id: str, role: str, user_name: str) -> dict[str, Any]:
    record = {
        "session_token": f"session_{secrets.token_urlsafe(32)}",
        "key_id": key_id,
        "role": role,
        "user_name": user_name,
        "created_at": now_iso(),
        "last_seen_at": now_iso(),
        "revoked_at": None,
    }
    columns = ["session_token", "key_id", "role", "user_name", "created_at", "last_seen_at", "revoked_at"]
    placeholders = ", ".join(["%s" if is_postgres() else "?" for _ in columns])
    with get_connection() as connection:
        _execute(
            connection,
            f"INSERT INTO auth_sessions ({', '.join(columns)}) VALUES ({placeholders})",
            tuple(record[column] for column in columns),
        )
    return record


def get_auth_session(session_token: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        cursor = _execute(
            connection,
            """
            SELECT session.session_token, session.key_id, session.role, session.user_name, session.created_at, session.last_seen_at, session.revoked_at,
                   key.status AS key_status, key.label, key.assigned_user
            FROM auth_sessions session
            LEFT JOIN access_keys key ON key.key_id = session.key_id
            WHERE session.session_token = %s
            """
            if is_postgres()
            else """
            SELECT session.session_token, session.key_id, session.role, session.user_name, session.created_at, session.last_seen_at, session.revoked_at,
                   key.status AS key_status, key.label, key.assigned_user
            FROM auth_sessions session
            LEFT JOIN access_keys key ON key.key_id = session.key_id
            WHERE session.session_token = ?
            """,
            (session_token,),
        )
        return _fetchone_dict(cursor)


def touch_auth_session(session_token: str) -> None:
    with get_connection() as connection:
        _execute(
            connection,
            "UPDATE auth_sessions SET last_seen_at = %s WHERE session_token = %s"
            if is_postgres()
            else "UPDATE auth_sessions SET last_seen_at = ? WHERE session_token = ?",
            (now_iso(), session_token),
        )


def revoke_auth_session(session_token: str) -> None:
    with get_connection() as connection:
        _execute(
            connection,
            "UPDATE auth_sessions SET revoked_at = %s WHERE session_token = %s"
            if is_postgres()
            else "UPDATE auth_sessions SET revoked_at = ? WHERE session_token = ?",
            (now_iso(), session_token),
        )


def list_auth_sessions(limit: int = 100) -> list[dict[str, Any]]:
    with get_connection() as connection:
        cursor = _execute(
            connection,
            "SELECT * FROM auth_sessions ORDER BY created_at DESC LIMIT %s" if is_postgres() else "SELECT * FROM auth_sessions ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        return _fetchall_dicts(cursor)


def get_demo_account(account_id: str = "primary") -> dict[str, Any]:
    with get_connection() as connection:
        cursor = _execute(
            connection,
            "SELECT * FROM demo_accounts WHERE account_id = %s" if is_postgres() else "SELECT * FROM demo_accounts WHERE account_id = ?",
            (account_id,),
        )
        account = _fetchone_dict(cursor)
        if account:
            return account
        _execute(
            connection,
            """
            INSERT INTO demo_accounts (account_id, start_balance, balance, updated_at)
            VALUES (%s, %s, %s, %s)
            """
            if is_postgres()
            else """
            INSERT INTO demo_accounts (account_id, start_balance, balance, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            (account_id, 10000.0, 10000.0, now_iso()),
        )
        cursor = _execute(
            connection,
            "SELECT * FROM demo_accounts WHERE account_id = %s" if is_postgres() else "SELECT * FROM demo_accounts WHERE account_id = ?",
            (account_id,),
        )
        return _fetchone_dict(cursor) or {
            "account_id": account_id,
            "start_balance": 10000.0,
            "balance": 10000.0,
            "updated_at": now_iso(),
        }


def get_demo_trades(limit: int = 200) -> list[dict[str, Any]]:
    return get_demo_trades_for_account("primary", limit=limit)


def get_demo_trades_for_account(account_id: str, limit: int = 200) -> list[dict[str, Any]]:
    with get_connection() as connection:
        cursor = _execute(
            connection,
            "SELECT * FROM demo_trades WHERE account_id = %s ORDER BY opened_at DESC LIMIT %s"
            if is_postgres()
            else "SELECT * FROM demo_trades WHERE account_id = ? ORDER BY opened_at DESC LIMIT ?",
            (account_id, limit),
        )
        return _fetchall_dicts(cursor)


def get_open_demo_trades() -> list[dict[str, Any]]:
    return get_open_demo_trades_for_account("primary")


def get_open_demo_trades_for_account(account_id: str) -> list[dict[str, Any]]:
    with get_connection() as connection:
        cursor = _execute(
            connection,
            "SELECT * FROM demo_trades WHERE account_id = %s AND status = %s ORDER BY opened_at DESC"
            if is_postgres()
            else "SELECT * FROM demo_trades WHERE account_id = ? AND status = ? ORDER BY opened_at DESC",
            (account_id, "OPEN"),
        )
        return _fetchall_dicts(cursor)


def insert_demo_trade(trade: dict[str, Any]) -> None:
    columns = [
        "demo_trade_id",
        "account_id",
        "pair",
        "signal",
        "units",
        "entry",
        "sl",
        "tp",
        "rr",
        "status",
        "opened_at",
        "closed_at",
        "close_price",
        "realized_pnl",
        "source_signal_id",
    ]
    placeholders = ", ".join(["%s" if is_postgres() else "?" for _ in columns])
    with get_connection() as connection:
        _execute(
            connection,
            f"""
            INSERT INTO demo_trades ({", ".join(columns)})
            VALUES ({placeholders})
            """,
            tuple(trade.get(column) for column in columns),
        )


def update_demo_trade_status(demo_trade_id: str, account_id: str, status: str, close_price: float, realized_pnl: float) -> None:
    with get_connection() as connection:
        cursor = _execute(
            connection,
            "SELECT balance FROM demo_accounts WHERE account_id = %s" if is_postgres() else "SELECT balance FROM demo_accounts WHERE account_id = ?",
            (account_id,),
        )
        account_row = _fetchone_dict(cursor) or {"balance": 10000.0}
        _execute(
            connection,
            """
            UPDATE demo_trades
            SET status = %s, closed_at = %s, close_price = %s, realized_pnl = %s
            WHERE demo_trade_id = %s AND account_id = %s
            """
            if is_postgres()
            else """
            UPDATE demo_trades
            SET status = ?, closed_at = ?, close_price = ?, realized_pnl = ?
            WHERE demo_trade_id = ? AND account_id = ?
            """,
            (status, now_iso(), close_price, realized_pnl, demo_trade_id, account_id),
        )
        _execute(
            connection,
            """
            UPDATE demo_accounts
            SET balance = %s, updated_at = %s
            WHERE account_id = %s
            """
            if is_postgres()
            else """
            UPDATE demo_accounts
            SET balance = ?, updated_at = ?
            WHERE account_id = ?
            """,
            (float(account_row["balance"]) + realized_pnl, now_iso(), account_id),
        )


def reset_demo_state(account_id: str = "primary") -> None:
    with get_connection() as connection:
        _execute(
            connection,
            "DELETE FROM demo_trades WHERE account_id = %s" if is_postgres() else "DELETE FROM demo_trades WHERE account_id = ?",
            (account_id,),
        )
        _execute(
            connection,
            """
            UPDATE demo_accounts
            SET start_balance = %s, balance = %s, updated_at = %s
            WHERE account_id = %s
            """
            if is_postgres()
            else """
            UPDATE demo_accounts
            SET start_balance = ?, balance = ?, updated_at = ?
            WHERE account_id = ?
            """,
            (10000.0, 10000.0, now_iso(), account_id),
        )


def reset_runtime_state() -> None:
    with get_connection() as connection:
        _execute(connection, "DELETE FROM telegram_notifications")
        _execute(connection, "DELETE FROM feature_logs")
        _execute(connection, "DELETE FROM trades")
        _execute(connection, "DELETE FROM demo_trades")
        _execute(
            connection,
            "UPDATE demo_accounts SET start_balance = %s, balance = %s, updated_at = %s"
            if is_postgres()
            else "UPDATE demo_accounts SET start_balance = ?, balance = ?, updated_at = ?",
            (10000.0, 10000.0, now_iso()),
        )
