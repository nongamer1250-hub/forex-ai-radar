from __future__ import annotations

from datetime import UTC, datetime
from statistics import mean

from database import insert_trade, now_iso
from market_data import Candle, fetch_candles, get_market_state
from telegram import send_signal_notification

FOREX_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURJPY"]


def ema(values: list[float], period: int) -> float:
    multiplier = 2 / (period + 1)
    current = values[0]
    for value in values[1:]:
        current = (value - current) * multiplier + current
    return current


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


def scan_pair(pair: str) -> dict[str, object]:
    candles = completed_candles(fetch_candles(pair, interval="5m", range_="5d"))
    trend_candles = completed_candles(fetch_candles(pair, interval="15m", range_="10d"))
    closes = [candle.close for candle in candles]
    latest = candles[-1]
    fast = ema(closes[-80:], 12)
    slow = ema(closes[-120:], 26)
    ema_50 = ema(closes[-180:], 50)
    ema_200 = ema(closes, 200)
    current_rsi = rsi(closes)
    current_atr = atr(candles)
    strength = candle_strength(latest)
    macd_line, macd_signal = macd(closes)
    current_adx = adx(candles)
    trend_bias = "BULLISH" if fast > slow and ema_50 > ema_200 else "BEARISH"
    higher_timeframe_bias = trend_for(trend_candles)
    recent_high = max(candle.high for candle in candles[-21:-1])
    recent_low = min(candle.low for candle in candles[-21:-1])
    atr_ratio = current_atr / max(latest.close, 0.00001)
    near_fast = abs(latest.close - fast) <= current_atr * 0.9
    bullish_breakout = latest.close > recent_high and current_rsi <= 72
    bearish_breakout = latest.close < recent_low and current_rsi >= 28
    bullish_pullback = latest.close > ema_50 and near_fast and 42 <= current_rsi <= 58
    bearish_pullback = latest.close < ema_50 and near_fast and 42 <= current_rsi <= 58

    buy_score = 0
    sell_score = 0
    buy_score += 22 if trend_bias == "BULLISH" else 0
    sell_score += 22 if trend_bias == "BEARISH" else 0
    buy_score += 18 if higher_timeframe_bias == "BULLISH" else 0
    sell_score += 18 if higher_timeframe_bias == "BEARISH" else 0
    buy_score += 12 if macd_line > macd_signal else 0
    sell_score += 12 if macd_line < macd_signal else 0
    buy_score += 10 if fast > slow and latest.close > ema_50 else 0
    sell_score += 10 if fast < slow and latest.close < ema_50 else 0
    buy_score += 12 if bullish_pullback else 14 if bullish_breakout else 0
    sell_score += 12 if bearish_pullback else 14 if bearish_breakout else 0
    buy_score += 10 if 45 <= current_rsi <= 62 else 4 if 38 <= current_rsi < 45 else 0
    sell_score += 10 if 38 <= current_rsi <= 55 else 4 if 55 < current_rsi <= 62 else 0
    buy_score += 8 if strength > 0.18 else 0
    sell_score += 8 if strength < -0.18 else 0
    buy_score += 8 if current_adx >= 16 else 0
    sell_score += 8 if current_adx >= 16 else 0

    market_ok = 0.00004 <= atr_ratio <= 0.0045
    buy_valid = trend_bias == higher_timeframe_bias == "BULLISH" and current_rsi <= 72 and (bullish_pullback or bullish_breakout)
    sell_valid = trend_bias == higher_timeframe_bias == "BEARISH" and current_rsi >= 28 and (bearish_pullback or bearish_breakout)

    if max(buy_score, sell_score) < 76 or not market_ok:
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

    entry = latest.close
    rr = 2.2 if score >= 86 else 1.8
    if signal == "BUY":
        sl = min(entry - current_atr * 1.25, recent_low - current_atr * 0.15)
        tp = entry + (entry - sl) * rr
    elif signal == "SELL":
        sl = max(entry + current_atr * 1.25, recent_high + current_atr * 0.15)
        tp = entry - (sl - entry) * rr
    else:
        sl = entry - current_atr
        tp = entry + current_atr

    quality = "A+" if score >= 90 else "A" if score >= 82 else "B" if score >= 76 and signal != "WAIT" else "WAIT"
    state = get_market_state()
    timestamp = now_iso()
    signal_id = f"{pair}-{int(datetime.now(UTC).timestamp() // 300)}"

    return {
        "signal_id": signal_id,
        "pair": pair,
        "signal": signal,
        "setup_quality": quality,
        "setup_score": round(score, 2),
        "confidence": round(min(0.28 + (score / 100 * 0.68), 0.96), 2),
        "rr": rr,
        "entry": round(entry, 3 if pair.endswith("JPY") else 5),
        "sl": round(sl, 3 if pair.endswith("JPY") else 5),
        "tp": round(tp, 3 if pair.endswith("JPY") else 5),
        "timestamp": timestamp,
        "trade_status": "OPEN" if signal in {"BUY", "SELL"} else "WAIT",
        "session": state["session"],
        "trend_bias": f"{trend_bias} / HTF {higher_timeframe_bias}",
        "candle_strength": strength,
        "rsi": current_rsi,
        "atr": current_atr,
        "ema_fast": round(fast, 5),
        "ema_slow": round(slow, 5),
        "source": state["source"],
    }


def force_scan() -> list[dict[str, object]]:
    signals = [scan_pair(pair) for pair in FOREX_PAIRS]
    for signal in signals:
        insert_trade(signal)
    actionable = [signal for signal in signals if signal["signal"] in {"BUY", "SELL"} and float(signal["confidence"]) >= 0.7]
    if actionable:
        best_signal = max(actionable, key=lambda signal: (float(signal["confidence"]), float(signal["setup_score"]), float(signal["rr"])))
        send_signal_notification(best_signal)
    return signals
