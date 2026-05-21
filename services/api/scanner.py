from __future__ import annotations

from datetime import UTC, datetime
from statistics import mean
from typing import Any

from database import get_latest_trade_for_pair, get_strategy_settings, insert_trade, now_iso
from learning import calibrate_confidence, compute_learning_bias, get_auto_blocked_pairs
from market_data import Candle, fetch_candles, get_market_state, price_decimals
from telegram import send_signal_notification

FOREX_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURJPY", "XAUUSD"]


def ema(values: list[float], period: int) -> float:
    multiplier = 2 / (period + 1)
    current = values[0]
    for value in values[1:]:
        current = (value - current) * multiplier + current
    return current


def ema_series(values: list[float], period: int) -> list[float]:
    if not values:
        return []
    multiplier = 2 / (period + 1)
    output = [values[0]]
    for value in values[1:]:
        output.append(output[-1] + (value - output[-1]) * multiplier)
    return output


def ema_slope(values: list[float], period: int, lookback: int = 4) -> float:
    series = ema_series(values, period)
    if len(series) <= lookback:
        return 0.0
    return round(series[-1] - series[-1 - lookback], 6)


def rsi(values: list[float], period: int = 14) -> float:
    changes = [values[index] - values[index - 1] for index in range(1, len(values))]
    gains = [max(change, 0.0) for change in changes]
    losses = [abs(min(change, 0.0)) for change in changes]
    if len(gains) < period:
        return 50.0

    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    for gain, loss in zip(gains[period:], losses[period:]):
        avg_gain = ((avg_gain * (period - 1)) + gain) / period
        avg_loss = ((avg_loss * (period - 1)) + loss) / period

    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


def atr(candles: list[Candle], period: int = 14) -> float:
    if len(candles) <= period:
        return 0.0

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

    current_atr = sum(true_ranges[:period]) / period
    for value in true_ranges[period:]:
        current_atr = ((current_atr * (period - 1)) + value) / period
    return round(current_atr, 5)


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


def macd(values: list[float]) -> tuple[float, float, float]:
    fast_series = ema_series(values[-220:], 12)
    slow_series = ema_series(values[-220:], 26)
    size = min(len(fast_series), len(slow_series))
    macd_series = [fast_series[index] - slow_series[index] for index in range(size)]
    signal_series = ema_series(macd_series, 9)
    macd_line = macd_series[-1]
    signal_line = signal_series[-1]
    histogram = macd_line - signal_line
    return round(macd_line, 6), round(signal_line, 6), round(histogram, 6)


def adx(candles: list[Candle], period: int = 14) -> float:
    if len(candles) <= period * 2:
        return 0.0

    plus_dm_raw: list[float] = []
    minus_dm_raw: list[float] = []
    true_ranges: list[float] = []
    for index in range(1, len(candles)):
        current = candles[index]
        previous = candles[index - 1]
        up_move = current.high - previous.high
        down_move = previous.low - current.low
        plus_dm_raw.append(up_move if up_move > down_move and up_move > 0 else 0.0)
        minus_dm_raw.append(down_move if down_move > up_move and down_move > 0 else 0.0)
        true_ranges.append(
            max(
                current.high - current.low,
                abs(current.high - previous.close),
                abs(current.low - previous.close),
            )
        )

    smoothed_tr = sum(true_ranges[:period])
    smoothed_plus_dm = sum(plus_dm_raw[:period])
    smoothed_minus_dm = sum(minus_dm_raw[:period])
    dx_values: list[float] = []

    for index in range(period, len(true_ranges)):
        smoothed_tr = smoothed_tr - (smoothed_tr / period) + true_ranges[index]
        smoothed_plus_dm = smoothed_plus_dm - (smoothed_plus_dm / period) + plus_dm_raw[index]
        smoothed_minus_dm = smoothed_minus_dm - (smoothed_minus_dm / period) + minus_dm_raw[index]

        plus_di = 100 * smoothed_plus_dm / max(smoothed_tr, 0.00001)
        minus_di = 100 * smoothed_minus_dm / max(smoothed_tr, 0.00001)
        dx = 100 * abs(plus_di - minus_di) / max(plus_di + minus_di, 0.00001)
        dx_values.append(dx)

    if len(dx_values) < period:
        return round(mean(dx_values), 2) if dx_values else 0.0

    adx_value = sum(dx_values[:period]) / period
    for dx in dx_values[period:]:
        adx_value = ((adx_value * (period - 1)) + dx) / period
    return round(adx_value, 2)


def trend_for(candles: list[Candle]) -> str:
    candles = completed_candles(candles)
    closes = [candle.close for candle in candles]
    ema_50 = ema(closes[-120:], 50)
    ema_200 = ema(closes, 200 if len(closes) >= 200 else max(80, len(closes) // 2))
    return "BULLISH" if ema_50 > ema_200 else "BEARISH"


def session_allows_pair(session: str, pair: str) -> bool:
    if session in {"London", "New York"}:
        return True
    if session == "Asia":
        return pair in {"USDJPY", "AUDUSD", "NZDUSD", "EURJPY"}
    return False


def same_bar_conflict(candle: Candle, signal: dict[str, Any]) -> bool:
    if signal["signal"] == "BUY":
        return candle.low <= signal["sl"] and candle.high >= signal["tp"]
    if signal["signal"] == "SELL":
        return candle.high >= signal["sl"] and candle.low <= signal["tp"]
    return False


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
    macd_line, macd_signal, macd_hist = macd(closes)
    current_adx = adx(candles)
    trend_bias = "BULLISH" if fast > slow and ema_50 > ema_200 else "BEARISH"
    higher_timeframe_bias = trend_for(trend_candles)
    recent_high = max(candle.high for candle in candles[-21:-1])
    recent_low = min(candle.low for candle in candles[-21:-1])
    atr_ratio = current_atr / max(latest.close, 0.00001)
    trend_strength = abs(ema_50 - ema_200) / max(current_atr, 0.00001)
    state = get_market_state()
    session_ok = session_allows_pair(state["session"], pair)

    upside_room = max(recent_high - latest.close, 0.0)
    downside_room = max(latest.close - recent_low, 0.0)
    near_fast = abs(latest.close - fast) <= current_atr * 1.1
    shallow_pullback_buy = latest.low <= fast + current_atr * 0.35
    shallow_pullback_sell = latest.high >= fast - current_atr * 0.35
    reclaimed_buy = latest.close >= fast - current_atr * 0.08
    reclaimed_sell = latest.close <= fast + current_atr * 0.08
    bullish_structure = previous.low >= recent_low - current_atr * 0.3 and upside_room >= current_atr * 1.1
    bearish_structure = previous.high <= recent_high + current_atr * 0.3 and downside_room >= current_atr * 1.1

    bullish_pullback = (
        latest.close > ema_50
        and near_fast
        and shallow_pullback_buy
        and reclaimed_buy
        and 45 <= current_rsi <= 63
        and strength >= -0.18
        and macd_hist >= -0.00008
        and bullish_structure
    )
    bearish_pullback = (
        latest.close < ema_50
        and near_fast
        and shallow_pullback_sell
        and reclaimed_sell
        and 37 <= current_rsi <= 55
        and strength <= 0.18
        and macd_hist <= 0.00008
        and bearish_structure
    )

    buy_score = 0
    sell_score = 0
    buy_score += 24 if trend_bias == "BULLISH" else 0
    sell_score += 24 if trend_bias == "BEARISH" else 0
    buy_score += 18 if higher_timeframe_bias == "BULLISH" else 0
    sell_score += 18 if higher_timeframe_bias == "BEARISH" else 0
    buy_score += 12 if fast > slow and fast_slope > 0 and slow_slope >= 0 and ema_50_slope > 0 else 0
    sell_score += 12 if fast < slow and fast_slope < 0 and slow_slope <= 0 and ema_50_slope < 0 else 0
    buy_score += 10 if macd_hist >= 0 else 0
    sell_score += 10 if macd_hist <= 0 else 0
    buy_score += 18 if bullish_pullback else 0
    sell_score += 18 if bearish_pullback else 0
    buy_score += 8 if 48 <= current_rsi <= 58 else 0
    sell_score += 8 if 42 <= current_rsi <= 52 else 0
    buy_score += 6 if strength >= 0 else 0
    sell_score += 6 if strength <= 0 else 0
    buy_score += 8 if current_adx >= 18 else 0
    sell_score += 8 if current_adx >= 18 else 0

    market_ok = 0.00005 <= atr_ratio <= 0.003
    structural_ok = trend_strength >= 0.55
    buy_valid = (
        trend_bias == higher_timeframe_bias == "BULLISH"
        and current_rsi <= 63
        and current_adx >= 16
        and fast_slope >= -current_atr * 0.08
        and ema_50_slope >= -current_atr * 0.03
        and structural_ok
        and session_ok
        and bullish_pullback
    )
    sell_valid = (
        trend_bias == higher_timeframe_bias == "BEARISH"
        and current_rsi >= 37
        and current_adx >= 16
        and fast_slope <= current_atr * 0.08
        and ema_50_slope <= current_atr * 0.03
        and structural_ok
        and session_ok
        and bearish_pullback
    )

    threshold = 76
    if max(buy_score, sell_score) < threshold or not market_ok or not structural_ok or not session_ok:
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
        bullish_breakout=False,
        bearish_pullback=bearish_pullback,
        bearish_breakout=False,
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
        if feedback["block_trade"] or score < 76 or learning_bias <= -4:
            signal = "WAIT"
            setup_type = "NONE"

    entry = latest.close
    rr = 2.0 if score >= 90 else 1.8 if score >= 82 else 1.6
    if signal == "BUY":
        sl = min(entry - current_atr * 1.15, recent_low - current_atr * 0.1)
        tp = entry + (entry - sl) * rr
    elif signal == "SELL":
        sl = max(entry + current_atr * 1.15, recent_high + current_atr * 0.1)
        tp = entry - (sl - entry) * rr
    else:
        sl = entry - current_atr
        tp = entry + current_atr

    raw_confidence = min(max(0.2, 0.26 + max(score - 76, 0) * 0.016 + max(learning_bias, 0) * 0.006), 0.9)
    calibrated = calibrate_confidence(
        pair=pair,
        signal=signal,
        setup_type=setup_type,
        trend_bias=trend_bias,
        session=state["session"],
        current_rsi=current_rsi,
        current_adx=current_adx,
        atr_ratio=atr_ratio,
        raw_confidence=raw_confidence,
    )
    confidence = calibrated["confidence"] if signal in {"BUY", "SELL"} else min(raw_confidence, 0.22)

    quality = "A+" if score >= 94 else "A" if score >= 86 else "B" if score >= 76 and signal != "WAIT" else "WAIT"
    effective_timestamp = timestamp or now_iso()
    effective_source = source or state["source"]
    signal_id = f"{pair}-{int(datetime.now(UTC).timestamp() // 300)}"

    decimals = price_decimals(pair)

    return {
        "signal_id": signal_id,
        "pair": pair,
        "signal": signal,
        "setup_quality": quality,
        "setup_score": round(score, 2),
        "confidence": round(confidence, 2),
        "confidence_samples": calibrated.get("samples", 0),
        "rr": rr,
        "entry": round(entry, decimals),
        "sl": round(sl, decimals),
        "tp": round(tp, decimals),
        "timestamp": effective_timestamp,
        "trade_status": "OPEN" if signal in {"BUY", "SELL"} else "WAIT",
        "session": state["session"],
        "trend_bias": f"{trend_bias} / HTF {higher_timeframe_bias}",
        "higher_timeframe_bias": higher_timeframe_bias,
        "candle_strength": strength,
        "rsi": current_rsi,
        "atr": current_atr,
        "atr_ratio": round(atr_ratio, 6),
        "adx": current_adx,
        "macd_hist": macd_hist,
        "trend_strength": round(trend_strength, 4),
        "fast_slope": fast_slope,
        "ema_50_slope": ema_50_slope,
        "market_ok": market_ok and session_ok,
        "structural_ok": structural_ok,
        "session_ok": session_ok,
        "ema_fast": round(fast, 5),
        "ema_slow": round(slow, 5),
        "setup_type": setup_type,
        "learning_bias": learning_bias,
        "source": effective_source,
    }


def scan_pair(pair: str) -> dict[str, object]:
    candles = completed_candles(fetch_candles(pair, interval="5m", range_="60d"))
    trend_candles = completed_candles(fetch_candles(pair, interval="15m", range_="60d"))
    return evaluate_signal(pair=pair, candles=candles, trend_candles=trend_candles, timestamp=now_iso())


def force_scan() -> list[dict[str, object]]:
    settings = get_strategy_settings()
    enabled_pairs = set(settings["enabled_pairs"])
    enabled_setups = set(settings["enabled_setups"])
    min_confidence = float(settings["min_confidence"])
    auto_block_enabled = bool(settings.get("auto_block_enabled", True))
    auto_blocked_pairs = get_auto_blocked_pairs() if auto_block_enabled else set()

    pairs_to_scan = [pair for pair in FOREX_PAIRS if (not enabled_pairs or pair in enabled_pairs) and pair not in auto_blocked_pairs]
    signals = [scan_pair(pair) for pair in pairs_to_scan]
    for signal in signals:
        if signal["setup_type"] not in enabled_setups and signal["signal"] in {"BUY", "SELL"}:
            signal["signal"] = "WAIT"
            signal["trade_status"] = "WAIT"
            signal["setup_quality"] = "WAIT"
            signal["setup_type"] = "NONE"
            signal["confidence"] = min(float(signal["confidence"]), 0.2)
        previous = get_latest_trade_for_pair(str(signal["pair"]))
        if previous and not signal_changed(previous, signal):
            continue
        insert_trade(signal)

    actionable = [
        signal
        for signal in signals
        if signal["signal"] in {"BUY", "SELL"}
        and signal["setup_type"] in enabled_setups
        and float(signal["confidence"]) >= min_confidence
    ]
    if actionable:
        best_signal = max(actionable, key=lambda item: (float(item["confidence"]), float(item["setup_score"]), float(item["rr"])))
        send_signal_notification(best_signal)
    return signals


def signal_changed(previous: dict[str, object], current: dict[str, object]) -> bool:
    tracked_fields = [
        "signal",
        "trade_status",
        "setup_type",
        "setup_quality",
        "rr",
        "entry",
        "sl",
        "tp",
    ]
    if any(previous.get(field) != current.get(field) for field in tracked_fields):
        return True

    previous_confidence = round(float(previous.get("confidence", 0)), 2)
    current_confidence = round(float(current.get("confidence", 0)), 2)
    previous_score = round(float(previous.get("setup_score", 0)), 2)
    current_score = round(float(current.get("setup_score", 0)), 2)
    return previous_confidence != current_confidence or previous_score != current_score
