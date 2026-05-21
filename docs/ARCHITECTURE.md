# Architecture

## Overview

The app has two parts:

```text
GitHub Pages static frontend
        ↓
Cloudflare Worker proxy/cache
        ↓
Finnhub + Tiingo APIs
        ↓
Cloudflare KV for cache/history
```

## Why this architecture exists

The frontend is public, so API keys cannot be stored in `index.html`.
The Cloudflare Worker keeps API keys private and controls API usage.
Cloudflare KV stores cache and daily snapshots so the app can track performance over time.
Private sync also uses Cloudflare KV, but only behind the `USER_SYNC_TOKEN` Worker secret.

## Frontend responsibilities

The frontend should:

- Render tabs and stock cards.
- Store manual edits in `localStorage`.
- Optionally sync manual edits and watchlists through `/api/user-data`.
- Call Worker endpoints.
- Show cached/live data returned by Worker.
- Export/import CSV.
- Keep phone layout clean.

The frontend should **not**:

- Store API keys.
- Call Finnhub or Tiingo directly.
- Make too many provider-specific assumptions.

## Worker responsibilities

The Worker should:

- Hide API keys.
- Fetch Finnhub live quotes.
- Fetch Finnhub fundamentals.
- Fetch Tiingo historical prices.
- Cache data in KV.
- Save daily snapshots.
- Store the private user-data sync blob when `USER_SYNC_TOKEN` is configured.
- Expose simple endpoints to the frontend.
- Rate-limit/backfill missing data gradually.

## Data flow

### Normal dashboard refresh

```text
Frontend Refresh Now
  → /api/dashboard
  → Worker checks KV
  → Worker fetches stale/missing data only
  → Worker returns combined quotes/performance/fundamentals
```

### Force price refresh

```text
Frontend Force Price Refresh
  → /api/quotes?force=1
  → Worker refreshes quote fields only
```

### History

```text
Frontend Load History
  → /api/history?days=30
  → Worker returns KV daily snapshots
```

### Private sync

```text
Frontend Save to Cloud / Load from Cloud
  -> /api/user-data with X-QSD-SYNC-TOKEN
  -> Worker validates USER_SYNC_TOKEN
  -> Worker reads or writes one KV blob:
     user-data:v1
```

The synced blob currently contains manual stock edits and watchlists. Browser `localStorage` remains the on-device cache.

## Current frontend files

```text
index.html
assets/css/styles.css
assets/js/data/stocks.js
assets/js/app.js
```

The app remains static and GitHub Pages-compatible. `index.html` is the shell, CSS is in `assets/css/styles.css`, the stock universe is in `assets/js/data/stocks.js`, and behavior is in `assets/js/app.js`.

## Future code splitting plan

Only split further after the current multi-file app is stable:

```text
index.html
assets/css/styles.css
assets/js/app.js
assets/js/data/stocks.js
worker/quantum-dashboard-api-worker.js
docs/
```
