from __future__ import annotations

from contextlib import asynccontextmanager
import os

from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
from fastapi import Body, Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware

load_dotenv()

from analytics import calculate_analytics
from auth import (
    admin_key_state,
    bootstrap_admin_key,
    create_user_key,
    current_session_payload,
    login_with_key,
    logout_session,
    require_admin,
    require_session,
    rotate_admin_session,
    revoke_user_key,
)
from backtest import run_backtest
from database import (
    get_active_entry_trade,
    get_all_trades,
    get_distinct_recent_trades,
    get_latest_entry_trade,
    get_strategy_settings,
    init_db,
    is_postgres,
    reset_demo_state,
    reset_runtime_state,
    save_strategy_settings,
)
from demo_trading import auto_place_demo_trade, demo_account_snapshot, demo_trade_history, place_demo_trade, run_demo_trade_manager_for_account
from learning import learning_status, optimize_strategy, pair_performance
from scanner import force_scan
from telegram_settings import add_recipient_for_session, recipients_for_session, remove_recipient_for_session, toggle_recipient_for_session
from trade_manager import run_trade_manager
from user_preferences import read_user_preferences, write_user_preferences

scheduler = BackgroundScheduler()


def allowed_origins() -> list[str]:
    raw = os.getenv("APP_ORIGINS", "https://forex-ai-radar-web.vercel.app,http://127.0.0.1:3000,http://127.0.0.1:3001")
    return [item.strip() for item in raw.split(",") if item.strip()]


def allowed_origin_regex() -> str:
    return os.getenv(
        "APP_ORIGIN_REGEX",
        r"^https://(?:forex-ai-radar-web(?:-[a-z0-9-]+)?|forex-ai-radar-web-[a-z0-9-]+-[a-z0-9-]+)\.vercel\.app$",
    )


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cache-Control"] = "no-store"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://s3.tradingview.com; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://api-production-76b1.up.railway.app https://forex-ai-radar-web.vercel.app; "
            "frame-src https://www.tradingview.com https://s.tradingview.com https://s3.tradingview.com; "
            "object-src 'none'; base-uri 'self'; frame-ancestors 'none';"
        )
        return response


def scheduled_scan() -> None:
    force_scan()
    run_trade_manager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    bootstrap_admin_key()
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

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_origin_regex=allowed_origin_regex(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, object]:
    return {
        "service": "Forex AI Radar API",
        "status": "ok",
        "health": "/health",
        "frontend": "https://forex-ai-radar-web.vercel.app/login",
    }


@app.get("/favicon.ico")
def favicon() -> Response:
    return Response(status_code=204)


@app.get("/login")
def api_login_redirect() -> RedirectResponse:
    return RedirectResponse(url="https://forex-ai-radar-web.vercel.app/login", status_code=307)


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "market_data": "YAHOO_FINANCE_REALTIME_CHART",
        "database_engine": "postgresql" if is_postgres() else "sqlite",
        "auth_policy": "single-session-v2",
    }


@app.get("/analytics")
def analytics(session: dict[str, object] = Depends(require_session)) -> dict[str, object]:
    return calculate_analytics()


@app.post("/auth/login")
def auth_login(request: Request, payload: dict[str, object] = Body(...)) -> dict[str, object]:
    access_key = str(payload.get("access_key", ""))
    user_name = str(payload.get("user_name", ""))
    forwarded_for = request.headers.get("x-forwarded-for", "") if request else ""
    source_id = forwarded_for.split(",")[0].strip() if forwarded_for else (request.client.host if request and request.client else "unknown")
    return login_with_key(access_key=access_key, user_name=user_name, source_id=source_id)


@app.get("/auth/session")
def auth_session(session: dict[str, object] = Depends(require_session)) -> dict[str, object]:
    return rotate_admin_session(session)


@app.post("/auth/logout")
def auth_logout(session: dict[str, object] = Depends(require_session)) -> dict[str, object]:
    logout_session(str(session["session_token"]))
    return {"status": "logged_out"}


@app.get("/admin/state")
def admin_state(session: dict[str, object] = Depends(require_session)) -> dict[str, object]:
    require_admin(session)
    return admin_key_state()


@app.post("/admin/access-keys")
def admin_create_access_key(
    payload: dict[str, object] = Body(...),
    session: dict[str, object] = Depends(require_session),
) -> dict[str, object]:
    require_admin(session)
    label = str(payload.get("label", "")).strip() or "User key"
    return {"created": create_user_key(label=label), "state": admin_key_state()}


@app.post("/admin/access-keys/revoke")
def admin_revoke_access_key(
    payload: dict[str, object] = Body(...),
    session: dict[str, object] = Depends(require_session),
) -> dict[str, object]:
    require_admin(session)
    key_id = str(payload.get("key_id", "")).strip()
    return revoke_user_key(key_id)


@app.get("/learning-status")
def get_learning_status(session: dict[str, object] = Depends(require_session)) -> dict[str, object]:
    return learning_status()


@app.get("/pair-performance")
def get_pair_performance(session: dict[str, object] = Depends(require_session)) -> dict[str, object]:
    return pair_performance()


@app.get("/strategy-settings")
def strategy_settings(session: dict[str, object] = Depends(require_session)) -> dict[str, object]:
    settings = get_strategy_settings()
    settings["telegram_chat_ids"] = []
    return settings


@app.get("/me/preferences")
def me_preferences(session: dict[str, object] = Depends(require_session)) -> dict[str, object]:
    return read_user_preferences(session)


@app.post("/me/preferences")
def update_me_preferences(
    payload: dict[str, object] = Body(...),
    session: dict[str, object] = Depends(require_session),
) -> dict[str, object]:
    return write_user_preferences(session, payload)


@app.get("/telegram-recipients")
def telegram_recipients(session: dict[str, object] = Depends(require_session)) -> list[dict[str, object]]:
    return recipients_for_session(session)


@app.post("/telegram-recipients")
def add_telegram_recipient_route(
    payload: dict[str, object] = Body(...),
    session: dict[str, object] = Depends(require_session),
) -> list[dict[str, object]]:
    chat_id = str(payload.get("chat_id", ""))
    return add_recipient_for_session(session, chat_id)


@app.post("/telegram-recipients/remove")
def remove_telegram_recipient_route(
    payload: dict[str, object] = Body(...),
    session: dict[str, object] = Depends(require_session),
) -> list[dict[str, object]]:
    recipient_id = str(payload.get("recipient_id", ""))
    return remove_recipient_for_session(session, recipient_id)


@app.post("/telegram-recipients/toggle")
def toggle_telegram_recipient_route(
    payload: dict[str, object] = Body(...),
    session: dict[str, object] = Depends(require_session),
) -> list[dict[str, object]]:
    recipient_id = str(payload.get("recipient_id", ""))
    is_enabled = bool(payload.get("is_enabled", True))
    return toggle_recipient_for_session(session, recipient_id, is_enabled)


@app.post("/strategy-settings")
def update_strategy_settings(
    payload: dict[str, object] = Body(...),
    session: dict[str, object] = Depends(require_session),
) -> dict[str, object]:
    require_admin(session)
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
def optimizer(session: dict[str, object] = Depends(require_session)) -> dict[str, object]:
    return optimize_strategy()


@app.post("/optimizer/apply")
def apply_optimizer(session: dict[str, object] = Depends(require_session)) -> dict[str, object]:
    require_admin(session)
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
def signals(session: dict[str, object] = Depends(require_session)) -> list[dict[str, object]]:
    return get_distinct_recent_trades(limit=20)


@app.get("/active-telegram-trade")
def active_telegram_trade(session: dict[str, object] = Depends(require_session)) -> dict[str, object] | None:
    return get_active_entry_trade()


@app.get("/latest-telegram-trade")
def latest_telegram_trade(session: dict[str, object] = Depends(require_session)) -> dict[str, object] | None:
    return get_latest_entry_trade()


@app.get("/view-trades")
def view_trades(session: dict[str, object] = Depends(require_session)) -> list[dict[str, object]]:
    return get_distinct_recent_trades(limit=200)


@app.get("/demo-account")
def demo_account(session: dict[str, object] = Depends(require_session)) -> dict[str, object]:
    run_demo_trade_manager_for_account(str(session["key_id"]))
    return demo_account_snapshot(str(session["key_id"]))


@app.get("/demo-trades")
def demo_trades(session: dict[str, object] = Depends(require_session)) -> list[dict[str, object]]:
    run_demo_trade_manager_for_account(str(session["key_id"]))
    return demo_trade_history(str(session["key_id"]), limit=200)


@app.post("/demo-trade")
def create_demo_trade(
    payload: dict[str, object] = Body(...),
    session: dict[str, object] = Depends(require_session),
) -> dict[str, object]:
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
        account_id=str(session["key_id"]),
        pair=pair,
        signal=signal,
        units=units,
        entry=entry,
        sl=sl,
        tp=tp,
        rr=rr,
        source_signal_id=source_signal_id,
    )
    return {"status": "created", "trade": trade, "account": demo_account_snapshot(str(session["key_id"]))}


@app.post("/demo-reset")
def demo_reset(session: dict[str, object] = Depends(require_session)) -> dict[str, object]:
    reset_demo_state(str(session["key_id"]))
    return {"status": "reset", "account": demo_account_snapshot(str(session["key_id"]))}


@app.post("/demo-auto-trade")
def demo_auto_trade(session: dict[str, object] = Depends(require_session)) -> dict[str, object]:
    result = auto_place_demo_trade(str(session["key_id"]))
    return {
        **result,
        "account": demo_account_snapshot(str(session["key_id"])),
    }


@app.post("/force-scan")
def scan_now(session: dict[str, object] = Depends(require_session)) -> dict[str, object]:
    require_admin(session)
    signals = force_scan()
    return {"inserted": len(signals), "signals": signals}


@app.post("/run-trade-manager")
def manage_trades(session: dict[str, object] = Depends(require_session)) -> dict[str, object]:
    return run_trade_manager()


@app.post("/reset-state")
def reset_state(session: dict[str, object] = Depends(require_session)) -> dict[str, object]:
    require_admin(session)
    reset_runtime_state()
    return {
        "status": "reset",
        "message": "Trade history, feature logs, telegram notification history, and demo account state cleared.",
        "demo_account": demo_account_snapshot(str(session["key_id"])),
    }


@app.get("/backtest")
def backtest(session: dict[str, object] = Depends(require_session)) -> dict[str, object]:
    return run_backtest()
