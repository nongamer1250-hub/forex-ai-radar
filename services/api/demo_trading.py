from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from database import get_demo_account, get_demo_trades, get_open_demo_trades, insert_demo_trade, update_demo_trade_status
from market_data import get_current_price


def place_demo_trade(
    *,
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


def demo_account_snapshot() -> dict[str, Any]:
    account = get_demo_account()
    open_trades = get_open_demo_trades()
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


def demo_trade_history(limit: int = 200) -> list[dict[str, Any]]:
    trades = get_demo_trades(limit=limit)
    open_ids = {trade["demo_trade_id"] for trade in get_open_demo_trades()}
    history: list[dict[str, Any]] = []
    for trade in trades:
        if trade["demo_trade_id"] in open_ids:
            price = get_current_price(str(trade["pair"]))
            history.append({**trade, "current_price": price, "unrealized_pnl": _unrealized_pnl(trade, price)})
        else:
            history.append(trade)
    return history


def run_demo_trade_manager() -> dict[str, Any]:
    open_trades = get_open_demo_trades()
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
        update_demo_trade_status(str(trade["demo_trade_id"]), status, price, realized)
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
