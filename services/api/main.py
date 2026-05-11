from __future__ import annotations

from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from analytics import calculate_analytics
from backtest import run_backtest
from database import get_active_entry_trade, get_all_trades, get_latest_entry_trade, init_db, is_postgres
from learning import learning_status
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


@app.post("/force-scan")
def scan_now() -> dict[str, object]:
    signals = force_scan()
    return {"inserted": len(signals), "signals": signals}


@app.post("/run-trade-manager")
def manage_trades() -> dict[str, object]:
    return run_trade_manager()


@app.get("/backtest")
def backtest() -> dict[str, object]:
    return run_backtest()
