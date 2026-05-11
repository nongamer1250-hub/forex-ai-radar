from __future__ import annotations

from collections import Counter

from database import get_all_trades


def calculate_analytics() -> dict[str, object]:
    trades = get_all_trades(limit=10_000)
    executable = [trade for trade in trades if trade["signal"] in {"BUY", "SELL"}]
    closed = [trade for trade in executable if trade["trade_status"] in {"WIN", "LOSS"}]
    wins = [trade for trade in closed if trade["trade_status"] == "WIN"]
    losses = [trade for trade in closed if trade["trade_status"] == "LOSS"]
    active = [trade for trade in executable if trade["trade_status"] == "OPEN"]

    pair_counter = Counter(trade["pair"] for trade in wins)
    best_pair = pair_counter.most_common(1)[0][0] if pair_counter else None
    avg_rr = round(sum(float(trade["rr"]) for trade in executable) / len(executable), 2) if executable else 0
    gross_win_rr = sum(float(trade["rr"]) for trade in wins)
    gross_loss_risk = max(len(losses), 1)

    return {
        "total_trades": len(executable),
        "wins": len(wins),
        "losses": len(losses),
        "win_rate": round((len(wins) / len(closed)) * 100, 2) if closed else 0,
        "active_trades": len(active),
        "avg_rr": avg_rr,
        "best_pair": best_pair or "N/A",
        "profit_factor": round(gross_win_rr / gross_loss_risk, 2) if closed else 0,
    }
