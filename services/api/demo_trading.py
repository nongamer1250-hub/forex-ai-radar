from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from database import (
    get_demo_trade_by_source_signal,
    get_demo_account,
    get_distinct_recent_trades,
    get_demo_trades_for_account,
    get_open_demo_trades_for_account,
    get_strategy_settings,
    get_user_profile,
    insert_demo_trade,
    update_demo_trade_status,
)
from market_data import get_current_price


def place_demo_trade(
    *,
    account_id: str,
    pair: str,
    signal: str,
    units: float,
    entry: float,
    sl: float,
    tp: float,
    rr: float,
    source_signal_id: str | None = None,
) -> dict[str, Any]:
    trade = {
        "demo_trade_id": f"demo-{pair}-{int(datetime.now(UTC).timestamp() * 1000)}",
        "account_id": account_id,
        "pair": pair,
        "signal": signal,
        "units": round(units, 2),
        "entry": entry,
        "sl": sl,
        "tp": tp,
        "rr": rr,
        "status": "OPEN",
        "opened_at": datetime.now(UTC).isoformat(),
        "closed_at": None,
        "close_price": None,
        "realized_pnl": None,
        "source_signal_id": source_signal_id,
    }
    insert_demo_trade(trade)
    return trade


def _unrealized_pnl(trade: dict[str, Any], price: float) -> float:
    units = float(trade["units"])
    entry = float(trade["entry"])
    if trade["signal"] == "BUY":
        pnl = (price - entry) * units
    else:
        pnl = (entry - price) * units
    return round(pnl, 2)


def demo_account_snapshot(account_id: str) -> dict[str, Any]:
    account = get_demo_account(account_id)
    open_trades = get_open_demo_trades_for_account(account_id)
    enriched_open_trades: list[dict[str, Any]] = []
    unrealized_total = 0.0

    for trade in open_trades:
        price = get_current_price(str(trade["pair"]))
        unrealized = _unrealized_pnl(trade, price)
        unrealized_total += unrealized
        enriched_open_trades.append({**trade, "current_price": price, "unrealized_pnl": unrealized})

    balance = round(float(account["balance"]), 2)
    equity = round(balance + unrealized_total, 2)
    return {
        "account_id": account["account_id"],
        "start_balance": round(float(account["start_balance"]), 2),
        "balance": balance,
        "equity": equity,
        "open_positions": len(open_trades),
        "unrealized_pnl": round(unrealized_total, 2),
        "updated_at": account["updated_at"],
        "positions": enriched_open_trades,
    }


def demo_trade_history(account_id: str, limit: int = 200) -> list[dict[str, Any]]:
    trades = get_demo_trades_for_account(account_id, limit=limit)
    open_ids = {trade["demo_trade_id"] for trade in get_open_demo_trades_for_account(account_id)}
    history: list[dict[str, Any]] = []
    for trade in trades:
        if trade["demo_trade_id"] in open_ids:
            price = get_current_price(str(trade["pair"]))
            history.append({**trade, "current_price": price, "unrealized_pnl": _unrealized_pnl(trade, price)})
        else:
            history.append(trade)
    return history


def run_demo_trade_manager() -> dict[str, Any]:
    open_trades = get_open_demo_trades_for_account("primary")
    if open_trades:
        return _run_demo_trade_manager_for_account("primary", open_trades)
    return {"checked": 0, "updated": 0, "updates": []}


def run_demo_trade_manager_for_account(account_id: str) -> dict[str, Any]:
    return _run_demo_trade_manager_for_account(account_id, get_open_demo_trades_for_account(account_id))


def _run_demo_trade_manager_for_account(account_id: str, open_trades: list[dict[str, Any]]) -> dict[str, Any]:
    updates: list[dict[str, Any]] = []

    for trade in open_trades:
        price = get_current_price(str(trade["pair"]))
        status: str | None = None
        if trade["signal"] == "BUY":
            if price >= float(trade["tp"]):
                status = "WIN"
            elif price <= float(trade["sl"]):
                status = "LOSS"
        elif trade["signal"] == "SELL":
            if price <= float(trade["tp"]):
                status = "WIN"
            elif price >= float(trade["sl"]):
                status = "LOSS"

        if not status:
            continue

        realized = _unrealized_pnl(trade, price)
        update_demo_trade_status(str(trade["demo_trade_id"]), account_id, status, price, realized)
        updates.append(
            {
                "demo_trade_id": trade["demo_trade_id"],
                "pair": trade["pair"],
                "status": status,
                "close_price": price,
                "realized_pnl": realized,
            }
        )

    return {"checked": len(open_trades), "updated": len(updates), "updates": updates}


def auto_place_demo_trade(account_id: str) -> dict[str, Any]:
    profile = get_user_profile(account_id)
    if not bool(profile.get("demo_auto_trade_enabled", False)):
        return {"status": "disabled"}

    open_trades = get_open_demo_trades_for_account(account_id)
    if open_trades:
        return {"status": "blocked_open_trade", "trade": open_trades[0]}

    settings = get_strategy_settings()
    enabled_setups = set(settings["enabled_setups"])
    min_confidence = float(settings["min_confidence"])
    watchlist = set(profile.get("watchlist", []))

    actionable = [
        trade
        for trade in get_distinct_recent_trades(limit=50)
        if trade.get("signal") in {"BUY", "SELL"}
        and trade.get("setup_type") in enabled_setups
        and float(trade.get("confidence", 0)) >= min_confidence
        and (not watchlist or str(trade.get("pair")) in watchlist)
    ]
    if not actionable:
        return {"status": "no_signal"}

    best_signal = max(actionable, key=lambda trade: (float(trade["confidence"]), float(trade["setup_score"]), float(trade["rr"])))
    existing = get_demo_trade_by_source_signal(account_id, str(best_signal["signal_id"]))
    if existing:
        return {"status": "already_traded", "trade": existing}

    trade = place_demo_trade(
        account_id=account_id,
        pair=str(best_signal["pair"]),
        signal=str(best_signal["signal"]),
        units=float(profile.get("demo_auto_trade_units", 10000)),
        entry=float(best_signal["entry"]),
        sl=float(best_signal["sl"]),
        tp=float(best_signal["tp"]),
        rr=float(best_signal["rr"]),
        source_signal_id=str(best_signal["signal_id"]),
    )
    return {"status": "created", "trade": trade, "signal": best_signal}
