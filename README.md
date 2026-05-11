# Forex AI Radar

Premium AI-powered forex analytics and signal dashboard.

## Structure

- `services/api`: FastAPI, APScheduler, SQLite signal engine and trade lifecycle manager
- `apps/web`: Next.js 16, TypeScript, TailwindCSS dashboard with TradingView widget

## Backend

```powershell
cd services/api
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Routes:

- `GET /analytics`
- `GET /signals`
- `GET /view-trades`
- `POST /force-scan`
- `POST /run-trade-manager`

Market data is fetched from Yahoo Finance chart endpoints for real OHLC candles. The scanner does not synthesize fallback candles.

Telegram signal notifications are optional:

```powershell
$env:TELEGRAM_BOT_TOKEN="your_bot_token"
$env:TELEGRAM_CHAT_ID="your_chat_id"
uvicorn main:app --reload
```

Only the single best actionable `BUY` / `SELL` signal with confidence above 70% is sent per scan. When that notified trade later hits TP or SL, Telegram sends a `PASSED` or `FAILED` result message.

## Frontend

```powershell
cd apps/web
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL` in Vercel to your Railway API URL.
