# Quantum Stock Investment Dashboard

Mobile-first static investment dashboard for quantum-computing-related stocks.

This repository is designed so a coding agent such as **Codex**, **Claude Code**, or another AI model can safely make upgrades without breaking the app.

## Current production setup

- **Frontend hosting:** GitHub Pages
- **Frontend repo:** `benhayek12-design/Investing-dashboard`
- **Live site:** `https://benhayek12-design.github.io/Investing-dashboard/`
- **Frontend entry file:** `index.html`
- **Backend proxy:** Cloudflare Worker
- **Worker URL:** `https://quantum-dashboard-api.benhayek12.workers.dev`
- **Worker file in this folder:** `worker/quantum-dashboard-api-worker.js`

## Important rule

Do **not** put API keys in `index.html`.

API keys belong only in Cloudflare Worker secrets:

```text
FINNHUB_API_KEY
TIINGO_API_KEY
```

The Worker also needs a Cloudflare KV binding:

```text
QSD_KV
```

Private sync needs one additional Cloudflare Worker secret:

```text
USER_SYNC_TOKEN
```

## App tabs

The frontend has five tabs:

```text
Home
Stocks
Watchlists
History
Settings
```

## What the app does

### Home
Shows category and stock-count summary.

### Stocks
Shows all stock cards with:

- Company name
- Ticker
- Exchange
- Category
- Risk
- Valuation
- Quantum thesis
- AI / Data Center relevance
- Live data fields
- Pro metrics
- Yahoo Finance / TradingView buttons
- Edit button

### Watchlists
Shows curated lists and lets user edit/add/reset lists.

### History
Reads Cloudflare KV-backed snapshots from the Worker.

### Settings
Controls:

- Dark mode
- Compact cards
- CSV import/export
- Worker URL
- Refresh Now
- Force Price Refresh
- Clear Live Cache
- Auto-refresh

## Current data providers

```text
Finnhub = live quotes + quote/fundamental metrics
Tiingo = historical price data for 6-month performance metrics
Cloudflare KV = cache + daily snapshots + refresh logs
```

## Frontend endpoints used

```text
/api/dashboard
/api/quotes?force=1
/api/history?days=30
/api/refresh-log
```

## Worker endpoints

```text
/api/health
/api/dashboard
/api/quotes
/api/performance
/api/fundamentals
/api/backfill-status
/api/history
/api/refresh-log
```

## Cache behavior

The Worker is designed to save free API usage:

```text
Quotes: fresh for 15 minutes
Performance: fresh for 24 hours
Fundamentals: fresh for 12 hours
Cron: every 5 minutes
```

`Refresh Now` should use smart cache.

`Force Price Refresh` should only force quotes, not performance or fundamentals.

## Deployment instructions

### Frontend

Upload/commit root `index.html` to GitHub Pages repo.

Then open with a fresh cache-busting URL:

```text
https://benhayek12-design.github.io/Investing-dashboard/?v=YYYYMMDDHHMM
```

### Worker

Paste `worker/quantum-dashboard-api-worker.js` into Cloudflare Worker:

```text
Cloudflare → Workers & Pages → quantum-dashboard-api → Edit code
```

Required Cloudflare secrets:

```text
FINNHUB_API_KEY
TIINGO_API_KEY
```

Optional private sync secret:

```text
USER_SYNC_TOKEN
```

Required KV binding:

```text
QSD_KV
```

Recommended Cron Trigger:

```text
*/5 * * * *
```

## Safe upgrade workflow for AI agents

1. Read this README.
2. Read `docs/ARCHITECTURE.md`.
3. Read `docs/API_CONTRACT.md`.
4. Read `docs/CODEMAP.md`.
5. Make the smallest possible change.
6. Do not rewrite unrelated code.
7. Preserve all five tabs.
8. Preserve localStorage keys unless intentionally migrating.
9. Preserve Cloudflare Worker secrets and KV binding names.
10. Test navigation before changing live-data logic.

## Most important warning

This project has broken before from overly large rewrites. Prefer **small, isolated patches** over full rebuilds.
