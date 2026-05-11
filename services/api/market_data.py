from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

import httpx

YAHOO_SYMBOLS = {
    "EURUSD": "EURUSD=X",
    "GBPUSD": "GBPUSD=X",
    "USDJPY": "JPY=X",
    "AUDUSD": "AUDUSD=X",
    "USDCAD": "CAD=X",
    "USDCHF": "CHF=X",
    "NZDUSD": "NZDUSD=X",
    "EURJPY": "EURJPY=X",
}


@dataclass(frozen=True)
class Candle:
    open: float
    high: float
    low: float
    close: float
    timestamp: int


class MarketDataError(RuntimeError):
    pass


def _normalise_yahoo_quote(pair: str, close: float) -> float:
    # Yahoo quotes JPY=X, CAD=X, and CHF=X as USD/quote already.
    return close


def fetch_candles(pair: str, interval: str = "5m", range_: str = "5d") -> list[Candle]:
    symbol = YAHOO_SYMBOLS[pair]
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    params = {"range": range_, "interval": interval, "includePrePost": "false"}
    with httpx.Client(timeout=12, headers={"User-Agent": "ForexAIRadar/0.1"}) as client:
        response = client.get(url, params=params)
        response.raise_for_status()
        payload = response.json()

    result = payload.get("chart", {}).get("result", [None])[0]
    if not result:
        raise MarketDataError(f"No chart data returned for {pair}.")

    timestamps = result.get("timestamp") or []
    quote = result.get("indicators", {}).get("quote", [None])[0] or {}
    opens = quote.get("open") or []
    highs = quote.get("high") or []
    lows = quote.get("low") or []
    closes = quote.get("close") or []

    candles: list[Candle] = []
    for timestamp, open_, high, low, close in zip(timestamps, opens, highs, lows, closes):
        if None in (open_, high, low, close):
            continue
        candles.append(
            Candle(
                open=float(open_),
                high=float(high),
                low=float(low),
                close=_normalise_yahoo_quote(pair, float(close)),
                timestamp=int(timestamp),
            )
        )

    if len(candles) < 80:
        raise MarketDataError(f"Insufficient real candles for {pair}: {len(candles)}.")
    return candles


def get_current_price(pair: str) -> float:
    candles = fetch_candles(pair, interval="1m", range_="1d")
    close = candles[-1].close
    return round(close, 3 if pair.endswith("JPY") else 5)


def get_market_state() -> dict[str, str]:
    hour = datetime.now(UTC).hour
    if 7 <= hour < 16:
        session = "London"
    elif 12 <= hour < 21:
        session = "New York"
    elif 0 <= hour < 9:
        session = "Asia"
    else:
        session = "Transition"
    return {"session": session, "source": "YAHOO_FINANCE_REALTIME_CHART"}
