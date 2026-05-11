from __future__ import annotations

from collections import defaultdict
from statistics import mean
from typing import Any

from database import get_closed_trades


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
