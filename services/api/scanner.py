from __future__ import annotations

from datetime import UTC, datetime
from statistics import mean
from typing import Any

from database import get_strategy_settings, insert_trade, now_iso
from learning import compute_learning_bias
from market_data import Candle, fetch_candles, get_market_state
from telegram import send_signal_notification

FOREX_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURJPY"]


def ema(values: list[float], period: int) -> float:
    multiplier = 2 / (period + 1)
    current = values[0]
    for value in values[1:]:
        current = (value - current) * multiplier + current
    return current


def ema_slope(values: list[float], period: int, lookback: int = 4) -> float:
    recent = ema(values[-(period + lookback + 5) :], period)
    prior = ema(values[-(period + lookback + 10) : -lookback], period)
    return round(recent - prior, 6)


def rsi(values: list[float], period: int = 14) -> float:
    changes = [values[i] - values[i - 1] for i in range(1, len(values))]
    recent = changes[-period:]
    gains = [change for change in recent if change > 0]
    losses = [abs(change) for change in recent if change < 0]
    avg_gain = mean(gains) if gains else 0.00001
    avg_loss = mean(losses) if losses else 0.00001
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


def atr(candles: list[Candle], period: int = 14) -> float:
    true_ranges: list[float] = []
    for index in range(1, len(candles)):
        current = candles[index]
        previous = candles[index - 1]
        true_ranges.append(
            max(
                current.high - current.low,
                abs(current.high - previous.close),
                abs(current.low - previous.close),
            )
        )
    return round(mean(true_ranges[-period:]), 5)


def candle_strength(candle: Candle) -> float:
    full_range = max(candle.high - candle.low, 0.00001)
    body = abs(candle.close - candle.open)
    direction = 1 if candle.close >= candle.open else -1
    return round(direction * min(body / full_range, 1), 3)


def completed_candles(candles: list[Candle]) -> list[Candle]:
    usable = candles[:-1] if len(candles) > 90 else candles
    while len(usable) > 80 and usable[-1].high == usable[-1].low:
        usable = usable[:-1]
    return usable


def macd(values: list[float]) -> tuple[float, float]:
    macd_line = ema(values[-80:], 12) - ema(values[-80:], 26)
    macd_history = []
    for index in range(35, len(values)):
        window = values[: index + 1]
        macd_history.append(ema(window[-80:], 12) - ema(window[-80:], 26))
    signal = ema(macd_history, 9)
    return macd_line, signal


def adx(candles: list[Candle], period: int = 14) -> float:
    plus_dm: list[float] = []
    minus_dm: list[float] = []
    true_ranges: list[float] = []
    for index in range(1, len(candles)):
        current = candles[index]
        previous = candles[index - 1]
        up_move = current.high - previous.high
        down_move = previous.low - current.low
        plus_dm.append(up_move if up_move > down_move and up_move > 0 else 0)
        minus_dm.append(down_move if down_move > up_move and down_move > 0 else 0)
        true_ranges.append(
            max(
                current.high - current.low,
                abs(current.high - previous.close),
                abs(current.low - previous.close),
            )
        )
    recent_tr = max(sum(true_ranges[-period:]), 0.00001)
    plus_di = 100 * sum(plus_dm[-period:]) / recent_tr
    minus_di = 100 * sum(minus_dm[-period:]) / recent_tr
    dx = 100 * abs(plus_di - minus_di) / max(plus_di + minus_di, 0.00001)
    return round(dx, 2)


def trend_for(candles: list[Candle]) -> str:
    candles = completed_candles(candles)
    closes = [candle.close for candle in candles]
    ema_50 = ema(closes[-120:], 50)
    ema_200 = ema(closes, 200 if len(closes) >= 200 else max(60, len(closes) // 2))
    return "BULLISH" if ema_50 > ema_200 else "BEARISH"


def evaluate_signal(
    *,
    pair: str,
    candles: list[Candle],
    trend_candles: list[Candle],
    timestamp: str | None = None,
    source: str | None = None,
    apply_learning: bool = True,
) -> dict[str, Any]:
    candles = completed_candles(candles)
    trend_candles = completed_candles(trend_candles)
    closes = [candle.close for candle in candles]
    latest = candles[-1]
    previous = candles[-2]
    fast = ema(closes[-80:], 12)
    slow = ema(closes[-120:], 26)
    ema_50 = ema(closes[-180:], 50)
    ema_200 = ema(closes, 200)
    fast_slope = ema_slope(closes, 12)
    slow_slope = ema_slope(closes, 26)
    ema_50_slope = ema_slope(closes, 50)
    current_rsi = rsi(closes)
    current_atr = atr(candles)
    strength = candle_strength(latest)
    macd_line, macd_signal = macd(closes)
    macd_hist = macd_line - macd_signal
    current_adx = adx(candles)
    trend_bias = "BULLISH" if fast > slow and ema_50 > ema_200 else "BEARISH"
    higher_timeframe_bias = trend_for(trend_candles)
    recent_high = max(candle.high for candle in candles[-21:-1])
    recent_low = min(candle.low for candle in candles[-21:-1])
    atr_ratio = current_atr / max(latest.close, 0.00001)
    trend_strength = abs(ema_50 - ema_200) / max(current_atr, 0.00001)
    near_fast = abs(latest.close - fast) <= current_atr * 0.65
    touched_pullback_buy = latest.low <= fast + current_atr * 0.15
    touched_pullback_sell = latest.high >= fast - current_atr * 0.15
    breakout_buffer = current_atr * 0.12
    bullish_breakout = (
        latest.close > recent_high + breakout_buffer
        and previous.close <= recent_high
        and latest.close > fast > ema_50
        and current_rsi <= 66
        and strength >= 0.45
        and macd_hist > 0
    )
    bearish_breakout = (
        latest.close < recent_low - breakout_buffer
        and previous.close >= recent_low
        and latest.close < fast < ema_50
        and current_rsi >= 34
        and strength <= -0.45
        and macd_hist < 0
    )
    bullish_pullback = (
        latest.close > ema_50
        and near_fast
        and touched_pullback_buy
        and latest.close >= fast
        and 47 <= current_rsi <= 58
        and strength >= 0.22
        and macd_hist > 0
    )
    bearish_pullback = (
        latest.close < ema_50
        and near_fast
        and touched_pullback_sell
        and latest.close <= fast
        and 42 <= current_rsi <= 53
        and strength <= -0.22
        and macd_hist < 0
    )

    buy_score = 0
    sell_score = 0
    buy_score += 24 if trend_bias == "BULLISH" else 0
    sell_score += 24 if trend_bias == "BEARISH" else 0
    buy_score += 20 if higher_timeframe_bias == "BULLISH" else 0
    sell_score += 20 if higher_timeframe_bias == "BEARISH" else 0
    buy_score += 12 if fast > slow and fast_slope > 0 and slow_slope >= 0 and ema_50_slope > 0 else 0
    sell_score += 12 if fast < slow and fast_slope < 0 and slow_slope <= 0 and ema_50_slope < 0 else 0
    buy_score += 10 if macd_hist > 0 else 0
    sell_score += 10 if macd_hist < 0 else 0
    buy_score += 12 if bullish_pullback else 16 if bullish_breakout else 0
    sell_score += 12 if bearish_pullback else 16 if bearish_breakout else 0
    buy_score += 8 if 48 <= current_rsi <= 60 else 0
    sell_score += 8 if 40 <= current_rsi <= 52 else 0
    buy_score += 6 if strength >= 0.3 else 0
    sell_score += 6 if strength <= -0.3 else 0
    buy_score += 8 if current_adx >= 18 else 0
    sell_score += 8 if current_adx >= 18 else 0

    market_ok = 0.00006 <= atr_ratio <= 0.0035
    structural_ok = trend_strength >= 1.2
    buy_valid = (
        trend_bias == higher_timeframe_bias == "BULLISH"
        and current_rsi <= 66
        and current_adx >= 18
        and fast_slope > 0
        and ema_50_slope > 0
        and structural_ok
        and bullish_pullback
    )
    sell_valid = (
        trend_bias == higher_timeframe_bias == "BEARISH"
        and current_rsi >= 34
        and current_adx >= 18
        and fast_slope < 0
        and ema_50_slope < 0
        and structural_ok
        and bearish_pullback
    )

    if max(buy_score, sell_score) < 80 or not market_ok or not structural_ok:
        signal = "WAIT"
        score = max(buy_score, sell_score)
    elif buy_score >= sell_score and buy_valid:
        signal = "BUY"
        score = buy_score
    elif sell_valid:
        signal = "SELL"
        score = sell_score
    else:
        signal = "WAIT"
        score = max(buy_score, sell_score)

    setup_type = resolve_setup_type(
        bullish_pullback=bullish_pullback,
        bullish_breakout=bullish_breakout,
        bearish_pullback=bearish_pullback,
        bearish_breakout=bearish_breakout,
        signal=signal,
    )

    learning_bias = 0.0
    if apply_learning and signal in {"BUY", "SELL"} and setup_type != "NONE":
        feedback = compute_learning_bias(
            pair=pair,
            signal=signal,
            setup_type=setup_type,
            trend_bias=trend_bias,
            current_rsi=current_rsi,
        )
        learning_bias = feedback["total_bias"]
        score = round(score + learning_bias, 2)

        if feedback["block_trade"] or (signal == "BUY" and (score < 82 or learning_bias <= -4)):
            signal = "WAIT"
            setup_type = "NONE"
        elif signal == "SELL" and (score < 82 or learning_bias <= -4):
            signal = "WAIT"
            setup_type = "NONE"

    entry = latest.close
    rr = 1.9 if score >= 92 else 1.6
    if signal == "BUY":
        sl = min(entry - current_atr * 1.1, recent_low - current_atr * 0.08)
        tp = entry + (entry - sl) * rr
    elif signal == "SELL":
        sl = max(entry + current_atr * 1.1, recent_high + current_atr * 0.08)
        tp = entry - (sl - entry) * rr
    else:
        sl = entry - current_atr
        tp = entry + current_atr

    quality = "A+" if score >= 92 else "A" if score >= 86 else "B" if score >= 82 and signal != "WAIT" else "WAIT"
    state = get_market_state()
    effective_timestamp = timestamp or now_iso()
    effective_source = source or state["source"]
    signal_id = f"{pair}-{int(datetime.now(UTC).timestamp() // 300)}"

    return {
        "signal_id": signal_id,
        "pair": pair,
        "signal": signal,
        "setup_quality": quality,
        "setup_score": round(score, 2),
        "confidence": round(min(max(0.18, 0.18 + max(score - 78, 0) * 0.02 + max(learning_bias, 0) * 0.008), 0.91), 2),
        "rr": rr,
        "entry": round(entry, 3 if pair.endswith("JPY") else 5),
        "sl": round(sl, 3 if pair.endswith("JPY") else 5),
        "tp": round(tp, 3 if pair.endswith("JPY") else 5),
        "timestamp": effective_timestamp,
        "trade_status": "OPEN" if signal in {"BUY", "SELL"} else "WAIT",
        "session": state["session"],
        "trend_bias": f"{trend_bias} / HTF {higher_timeframe_bias}",
        "candle_strength": strength,
        "rsi": current_rsi,
        "atr": current_atr,
        "ema_fast": round(fast, 5),
        "ema_slow": round(slow, 5),
        "setup_type": setup_type,
        "learning_bias": learning_bias,
        "source": effective_source,
    }


def resolve_setup_type(
    *,
    bullish_pullback: bool,
    bullish_breakout: bool,
    bearish_pullback: bool,
    bearish_breakout: bool,
    signal: str,
) -> str:
    if signal == "BUY" and bullish_pullback:
        return "BUY_PULLBACK"
    if signal == "BUY" and bullish_breakout:
        return "BUY_BREAKOUT"
    if signal == "SELL" and bearish_pullback:
        return "SELL_PULLBACK"
    if signal == "SELL" and bearish_breakout:
        return "SELL_BREAKOUT"
    return "NONE"


def scan_pair(pair: str) -> dict[str, object]:
    candles = completed_candles(fetch_candles(pair, interval="5m", range_="5d"))
    trend_candles = completed_candles(fetch_candles(pair, interval="15m", range_="10d"))
    return evaluate_signal(pair=pair, candles=candles, trend_candles=trend_candles, timestamp=now_iso())


def force_scan() -> list[dict[str, object]]:
    settings = get_strategy_settings()
    enabled_pairs = set(settings["enabled_pairs"])
    enabled_setups = set(settings["enabled_setups"])
    min_confidence = float(settings["min_confidence"])

    pairs_to_scan = [pair for pair in FOREX_PAIRS if not enabled_pairs or pair in enabled_pairs]
    signals = [scan_pair(pair) for pair in pairs_to_scan]
    for signal in signals:
        if signal["setup_type"] not in enabled_setups and signal["signal"] in {"BUY", "SELL"}:
            signal["signal"] = "WAIT"
            signal["trade_status"] = "WAIT"
            signal["setup_quality"] = "WAIT"
            signal["setup_type"] = "NONE"
            signal["confidence"] = min(float(signal["confidence"]), 0.2)
        insert_trade(signal)
    actionable = [
        signal
        for signal in signals
        if signal["signal"] in {"BUY", "SELL"}
        and signal["setup_type"] in enabled_setups
        and float(signal["confidence"]) >= min_confidence
    ]
    if actionable:
        best_signal = max(actionable, key=lambda signal: (float(signal["confidence"]), float(signal["setup_score"]), float(signal["rr"])))
        send_signal_notification(best_signal)
    return signals
