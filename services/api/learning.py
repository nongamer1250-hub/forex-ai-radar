from __future__ import annotations

from collections import defaultdict
from statistics import mean
from typing import Any

from database import get_closed_trades, get_feature_logs, get_strategy_settings

FOREX_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURJPY"]


def outcome_value(trade: dict[str, Any]) -> int:
    return 1 if trade["trade_status"] == "WIN" else -1


def rsi_bucket(rsi: float) -> str:
    if rsi < 40:
        return "LOW"
    if rsi > 60:
        return "HIGH"
    return "MID"


def bounded_bias(values: list[int], min_samples: int, max_weight: float) -> float:
    if len(values) < min_samples:
        return 0.0
    return round(max(-max_weight, min(max_weight, mean(values) * max_weight)), 2)


def compute_learning_bias(
    *,
    pair: str,
    signal: str,
    setup_type: str,
    trend_bias: str,
    current_rsi: float,
) -> dict[str, float | int | bool]:
    closed = get_closed_trades(limit=250)
    same_direction = [trade for trade in closed if trade["signal"] == signal]

    pair_values = [outcome_value(trade) for trade in same_direction if trade["pair"] == pair]
    setup_values = [outcome_value(trade) for trade in same_direction if trade.get("setup_type") == setup_type]
    regime_values = [outcome_value(trade) for trade in same_direction if str(trade["trend_bias"]).startswith(trend_bias)]
    rsi_values = [
        outcome_value(trade)
        for trade in same_direction
        if rsi_bucket(float(trade["rsi"])) == rsi_bucket(current_rsi)
    ]
    recent_values = [outcome_value(trade) for trade in same_direction[:25]]

    pair_bias = bounded_bias(pair_values, min_samples=3, max_weight=4.0)
    setup_bias = bounded_bias(setup_values, min_samples=4, max_weight=6.0)
    regime_bias = bounded_bias(regime_values, min_samples=5, max_weight=3.5)
    rsi_bias = bounded_bias(rsi_values, min_samples=5, max_weight=2.5)
    recent_bias = bounded_bias(recent_values, min_samples=6, max_weight=3.0)

    pair_block = len(pair_values) >= 4 and mean(pair_values) <= -0.75
    setup_block = len(setup_values) >= 5 and mean(setup_values) <= -0.7
    recent_block = len(recent_values) >= 8 and mean(recent_values) <= -0.65

    total = round(pair_bias + setup_bias + regime_bias + rsi_bias + recent_bias, 2)
    total = max(-10.0, min(10.0, total))

    return {
        "pair_bias": pair_bias,
        "setup_bias": setup_bias,
        "regime_bias": regime_bias,
        "rsi_bias": rsi_bias,
        "recent_bias": recent_bias,
        "total_bias": total,
        "pair_samples": len(pair_values),
        "setup_samples": len(setup_values),
        "recent_samples": len(recent_values),
        "block_trade": pair_block or setup_block or recent_block,
    }


def learning_status() -> dict[str, Any]:
    closed = get_closed_trades(limit=250)
    wins = sum(1 for trade in closed if trade["trade_status"] == "WIN")
    losses = sum(1 for trade in closed if trade["trade_status"] == "LOSS")

    pair_scores: dict[str, list[int]] = defaultdict(list)
    setup_scores: dict[str, list[int]] = defaultdict(list)

    for trade in closed:
        pair_scores[trade["pair"]].append(outcome_value(trade))
        setup_scores[str(trade.get("setup_type", "NONE"))].append(outcome_value(trade))

    strongest_pair = max(
        pair_scores.items(),
        key=lambda item: (mean(item[1]), len(item[1])),
        default=("N/A", []),
    )[0]
    strongest_setup = max(
        setup_scores.items(),
        key=lambda item: (mean(item[1]), len(item[1])),
        default=("N/A", []),
    )[0]

    return {
        "closed_trades_used": len(closed),
        "wins": wins,
        "losses": losses,
        "net_outcome_score": wins - losses,
        "strongest_pair": strongest_pair,
        "strongest_setup": strongest_setup,
    }


def pair_performance() -> dict[str, Any]:
    logs = get_feature_logs(limit=1000)
    settings = get_strategy_settings()
    by_pair: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for row in logs:
        by_pair[row["pair"]].append(row)

    pairs: list[dict[str, Any]] = []
    for pair, rows in sorted(by_pair.items()):
        finished = [row for row in rows if row["trade_status"] in {"WIN", "LOSS"}]
        wins = sum(1 for row in finished if row["trade_status"] == "WIN")
        losses = sum(1 for row in finished if row["trade_status"] == "LOSS")
        buy_rows = [row for row in rows if row["signal"] == "BUY"]
        sell_rows = [row for row in rows if row["signal"] == "SELL"]
        waits = [row for row in rows if row["signal"] == "WAIT"]
        avg_bias = round(mean(float(row.get("learning_bias", 0)) for row in rows), 2) if rows else 0.0
        avg_confidence = round(mean(float(row.get("confidence", 0)) for row in rows), 2) if rows else 0.0
        pairs.append(
            {
                "pair": pair,
                "enabled": not settings["enabled_pairs"] or pair in settings["enabled_pairs"],
                "total_logs": len(rows),
                "finished_trades": len(finished),
                "wins": wins,
                "losses": losses,
                "win_rate": round(wins / len(finished) * 100, 2) if finished else 0.0,
                "buy_signals": len(buy_rows),
                "sell_signals": len(sell_rows),
                "waits": len(waits),
                "avg_learning_bias": avg_bias,
                "avg_confidence": avg_confidence,
            }
        )

    setup_rows: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in logs:
        setup_rows[str(row.get("setup_type", "NONE"))].append(row)

    setups: list[dict[str, Any]] = []
    for setup_type, rows in sorted(setup_rows.items()):
        finished = [row for row in rows if row["trade_status"] in {"WIN", "LOSS"}]
        wins = sum(1 for row in finished if row["trade_status"] == "WIN")
        setups.append(
            {
                "setup_type": setup_type,
                "enabled": setup_type in settings["enabled_setups"],
                "samples": len(rows),
                "finished_trades": len(finished),
                "wins": wins,
                "losses": len(finished) - wins,
                "win_rate": round(wins / len(finished) * 100, 2) if finished else 0.0,
            }
        )

    return {
        "pairs": pairs,
        "setups": setups,
        "settings": settings,
    }


def get_auto_blocked_pairs() -> set[str]:
    logs = get_feature_logs(limit=1000)
    by_pair: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in logs:
        by_pair[row["pair"]].append(row)

    blocked: set[str] = set()
    for pair, rows in by_pair.items():
        finished = [row for row in rows if row["trade_status"] in {"WIN", "LOSS"}][:8]
        if len(finished) < 4:
            continue
        wins = sum(1 for row in finished if row["trade_status"] == "WIN")
        losses = sum(1 for row in finished if row["trade_status"] == "LOSS")
        win_rate = wins / max(len(finished), 1)
        if losses >= 3 and win_rate < 0.25:
            blocked.add(pair)
    return blocked


def optimize_strategy() -> dict[str, Any]:
    performance = pair_performance()
    auto_blocked = get_auto_blocked_pairs()

    recommendations: list[dict[str, Any]] = []
    enabled_pairs: list[str] = []
    disabled_pairs: list[str] = []

    pair_index = {row["pair"]: row for row in performance["pairs"]}
    for pair in FOREX_PAIRS:
        row = pair_index.get(pair)
        if row is None:
            recommendations.append(
                {
                    "pair": pair,
                    "action": "keep",
                    "reason": "insufficient_live_data",
                }
            )
            enabled_pairs.append(pair)
            continue

        if pair in auto_blocked:
            recommendations.append(
                {
                    "pair": pair,
                    "action": "disable",
                    "reason": "rolling_live_losses",
                    "finished_trades": row["finished_trades"],
                    "win_rate": row["win_rate"],
                }
            )
            disabled_pairs.append(pair)
        elif row["finished_trades"] >= 4 and row["win_rate"] >= 40:
            recommendations.append(
                {
                    "pair": pair,
                    "action": "keep",
                    "reason": "live_pair_strength",
                    "finished_trades": row["finished_trades"],
                    "win_rate": row["win_rate"],
                }
            )
            enabled_pairs.append(pair)
        else:
            recommendations.append(
                {
                    "pair": pair,
                    "action": "keep",
                    "reason": "needs_more_samples",
                    "finished_trades": row["finished_trades"],
                    "win_rate": row["win_rate"],
                }
            )
            enabled_pairs.append(pair)

    settings = performance["settings"]
    return {
        "settings": settings,
        "auto_blocked_pairs": sorted(auto_blocked),
        "recommended_enabled_pairs": sorted(enabled_pairs),
        "recommended_disabled_pairs": sorted(disabled_pairs),
        "recommendations": recommendations,
    }
