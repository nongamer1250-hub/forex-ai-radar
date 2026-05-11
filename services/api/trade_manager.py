from __future__ import annotations

from database import get_open_trades, update_trade_status
from market_data import get_current_price
from telegram import send_trade_result_notification


def run_trade_manager() -> dict[str, object]:
    open_trades = get_open_trades()
    updates: list[dict[str, object]] = []

    for trade in open_trades:
        price = get_current_price(trade["pair"])
        status: str | None = None
        if trade["signal"] == "BUY":
            if price >= trade["tp"]:
                status = "WIN"
            elif price <= trade["sl"]:
                status = "LOSS"
        elif trade["signal"] == "SELL":
            if price <= trade["tp"]:
                status = "WIN"
            elif price >= trade["sl"]:
                status = "LOSS"

        if status:
            update_trade_status(trade["signal_id"], status, price)
            send_trade_result_notification(trade, status, price)
            updates.append({"signal_id": trade["signal_id"], "pair": trade["pair"], "status": status, "close_price": price})

    return {"checked": len(open_trades), "updated": len(updates), "updates": updates}
