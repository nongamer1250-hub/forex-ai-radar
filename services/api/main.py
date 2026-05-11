from __future__ import annotations

from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
from fastapi import Body, FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from analytics import calculate_analytics
from backtest import run_backtest
from database import (
    get_demo_account,
    get_demo_trades,
    get_active_entry_trade,
    get_all_trades,
    get_latest_entry_trade,
    get_strategy_settings,
    init_db,
    is_postgres,
    reset_demo_state,
    reset_runtime_state,
    save_strategy_settings,
)
from demo_trading import demo_account_snapshot, demo_trade_history, place_demo_trade
from learning import learning_status, optimize_strategy, pair_performance
from scanner import force_scan
from telegram import telegram_configured
from trade_manager import run_trade_manager

scheduler = BackgroundScheduler()


def scheduled_scan() -> None:
    force_scan()
    run_trade_manager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if not get_all_trades(limit=1):
        force_scan()
    scheduler.add_job(scheduled_scan, "interval", minutes=5, id="forex_scan", replace_existing=True)
    scheduler.add_job(run_trade_manager, "interval", seconds=30, id="trade_manager", replace_existing=True)
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(
    title="Forex AI Radar API",
    version="0.1.0",
    description="AI-assisted forex signal scanner, trade lifecycle manager, and analytics API.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "market_data": "YAHOO_FINANCE_REALTIME_CHART",
        "telegram_configured": telegram_configured(),
        "database_engine": "postgresql" if is_postgres() else "sqlite",
    }


@app.get("/analytics")
def analytics() -> dict[str, object]:
    return calculate_analytics()


@app.get("/learning-status")
def get_learning_status() -> dict[str, object]:
    return learning_status()


@app.get("/pair-performance")
def get_pair_performance() -> dict[str, object]:
    return pair_performance()


@app.get("/strategy-settings")
def strategy_settings() -> dict[str, object]:
    return get_strategy_settings()


@app.post("/strategy-settings")
def update_strategy_settings(payload: dict[str, object] = Body(...)) -> dict[str, object]:
    enabled_pairs = payload.get("enabled_pairs", [])
    enabled_setups = payload.get("enabled_setups", ["BUY_PULLBACK", "SELL_PULLBACK"])
    min_confidence = float(payload.get("min_confidence", 0.60))
    auto_block_enabled = bool(payload.get("auto_block_enabled", True))
    telegram_chat_ids = payload.get("telegram_chat_ids", [])
    return save_strategy_settings(
        enabled_pairs=[str(item) for item in enabled_pairs] if isinstance(enabled_pairs, list) else [],
        enabled_setups=[str(item) for item in enabled_setups] if isinstance(enabled_setups, list) else ["BUY_PULLBACK", "SELL_PULLBACK"],
        min_confidence=min(0.95, max(0.3, min_confidence)),
        auto_block_enabled=auto_block_enabled,
        telegram_chat_ids=[str(item) for item in telegram_chat_ids] if isinstance(telegram_chat_ids, list) else [],
    )


@app.get("/optimizer")
def optimizer() -> dict[str, object]:
    return optimize_strategy()


@app.post("/optimizer/apply")
def apply_optimizer() -> dict[str, object]:
    optimization = optimize_strategy()
    return {
        "optimizer": optimization,
        "settings": save_strategy_settings(
            enabled_pairs=optimization["recommended_enabled_pairs"],
            enabled_setups=get_strategy_settings()["enabled_setups"],
            min_confidence=float(get_strategy_settings()["min_confidence"]),
            auto_block_enabled=bool(get_strategy_settings().get("auto_block_enabled", True)),
            telegram_chat_ids=[str(item) for item in get_strategy_settings().get("telegram_chat_ids", [])],
        ),
    }


@app.get("/signals")
def signals() -> list[dict[str, object]]:
    return get_all_trades(limit=20)


@app.get("/active-telegram-trade")
def active_telegram_trade() -> dict[str, object] | None:
    return get_active_entry_trade()


@app.get("/latest-telegram-trade")
def latest_telegram_trade() -> dict[str, object] | None:
    return get_latest_entry_trade()


@app.get("/view-trades")
def view_trades() -> list[dict[str, object]]:
    return get_all_trades(limit=200)


@app.get("/demo-account")
def demo_account() -> dict[str, object]:
    return demo_account_snapshot()


@app.get("/demo-trades")
def demo_trades() -> list[dict[str, object]]:
    return demo_trade_history(limit=200)


@app.post("/demo-trade")
def create_demo_trade(payload: dict[str, object] = Body(...)) -> dict[str, object]:
    pair = str(payload.get("pair", "")).upper()
    signal = str(payload.get("signal", "WAIT")).upper()
    units = max(100.0, float(payload.get("units", 10000)))
    entry = float(payload.get("entry", 0))
    sl = float(payload.get("sl", 0))
    tp = float(payload.get("tp", 0))
    rr = float(payload.get("rr", 1.5))
    source_signal_id = str(payload["source_signal_id"]) if payload.get("source_signal_id") else None
    if signal not in {"BUY", "SELL"}:
        return {"status": "rejected", "message": "Demo trades require BUY or SELL signals."}
    if min(entry, sl, tp) <= 0:
        return {"status": "rejected", "message": "Entry, SL, and TP must be positive."}
    trade = place_demo_trade(
        pair=pair,
        signal=signal,
        units=units,
        entry=entry,
        sl=sl,
        tp=tp,
        rr=rr,
        source_signal_id=source_signal_id,
    )
    return {"status": "created", "trade": trade, "account": demo_account_snapshot()}


@app.post("/demo-reset")
def demo_reset() -> dict[str, object]:
    reset_demo_state()
    return {"status": "reset", "account": demo_account_snapshot()}


@app.post("/force-scan")
def scan_now() -> dict[str, object]:
    signals = force_scan()
    return {"inserted": len(signals), "signals": signals}


@app.post("/run-trade-manager")
def manage_trades() -> dict[str, object]:
    return run_trade_manager()


@app.post("/reset-state")
def reset_state() -> dict[str, object]:
    reset_runtime_state()
    return {
        "status": "reset",
        "message": "Trade history, feature logs, telegram notification history, and demo account state cleared.",
        "demo_account": demo_account_snapshot(),
    }


@app.get("/backtest")
def backtest() -> dict[str, object]:
    return run_backtest()
