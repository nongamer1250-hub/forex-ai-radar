from __future__ import annotations

from statistics import mean
from typing import Any

from market_data import Candle, fetch_candles
from scanner import FOREX_PAIRS, evaluate_signal


def resolve_outcome(signal: dict[str, Any], future_candles: list[Candle]) -> tuple[str, float | None]:
    if signal["signal"] == "WAIT":
        return "WAIT", None

    for candle in future_candles:
        if signal["signal"] == "BUY":
            if candle.low <= signal["sl"]:
                return "LOSS", signal["sl"]
            if candle.high >= signal["tp"]:
                return "WIN", signal["tp"]
        else:
            if candle.high >= signal["sl"]:
                return "LOSS", signal["sl"]
            if candle.low <= signal["tp"]:
                return "WIN", signal["tp"]

    return "OPEN", future_candles[-1].close if future_candles else None


def backtest_pair(pair: str, lookahead_bars: int = 48, max_samples: int = 40) -> dict[str, Any]:
    candles_5m = fetch_candles(pair, interval="5m", range_="1mo")
    candles_15m = fetch_candles(pair, interval="15m", range_="1mo")
    results: list[dict[str, Any]] = []

    step = 3
    start_index = max(200, len(candles_5m) - (max_samples * step + lookahead_bars + 2))
    for index in range(start_index, len(candles_5m) - lookahead_bars, step):
        history_5m = candles_5m[: index + 1]
        history_15m = [candle for candle in candles_15m if candle.timestamp <= history_5m[-1].timestamp]
        if len(history_5m) < 200 or len(history_15m) < 120:
            continue

        signal = evaluate_signal(
            pair=pair,
            candles=history_5m,
            trend_candles=history_15m,
            timestamp=str(history_5m[-1].timestamp),
            source="BACKTEST",
            apply_learning=False,
        )
        outcome, exit_price = resolve_outcome(signal, candles_5m[index + 1 : index + 1 + lookahead_bars])
        if signal["signal"] in {"BUY", "SELL"}:
            results.append(
                {
                    "signal": signal["signal"],
                    "setup_type": signal.get("setup_type", "NONE"),
                    "setup_score": float(signal["setup_score"]),
                    "confidence": float(signal["confidence"]),
                    "outcome": outcome,
                    "exit_price": exit_price,
                }
            )

    wins = [row for row in results if row["outcome"] == "WIN"]
    losses = [row for row in results if row["outcome"] == "LOSS"]
    finished = wins + losses

    return {
        "pair": pair,
        "samples": len(results),
        "finished_trades": len(finished),
        "wins": len(wins),
        "losses": len(losses),
        "win_rate": round(len(wins) / len(finished) * 100, 2) if finished else 0,
        "avg_score": round(mean(row["setup_score"] for row in results), 2) if results else 0,
        "avg_confidence": round(mean(row["confidence"] for row in results), 2) if results else 0,
    }


def run_backtest() -> dict[str, Any]:
    pair_results = [backtest_pair(pair) for pair in FOREX_PAIRS]
    finished = sum(item["finished_trades"] for item in pair_results)
    wins = sum(item["wins"] for item in pair_results)
    losses = sum(item["losses"] for item in pair_results)
    best_pair = max(pair_results, key=lambda item: (item["win_rate"], item["finished_trades"]), default={"pair": "N/A"})["pair"]

    return {
        "pairs": pair_results,
        "summary": {
            "finished_trades": finished,
            "wins": wins,
            "losses": losses,
            "win_rate": round(wins / (wins + losses) * 100, 2) if wins + losses else 0,
            "best_pair": best_pair,
        },
    }
