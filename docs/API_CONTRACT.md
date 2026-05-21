# API Contract

Base Worker URL:

```text
https://quantum-dashboard-api.benhayek12.workers.dev
```

## GET /api/health

Purpose: verify Worker, secrets, KV binding, and version.

Expected useful fields:

```json
{
  "ok": true,
  "version": "smart-cache-v2-auto-backfill",
  "hasFinnhubApiKey": true,
  "hasTiingoApiKey": true,
  "hasKvBinding": true
}
```

## GET /api/dashboard

Purpose: combined app data endpoint.

Query params:

```text
symbols=IONQ,NVDA,IBM
force=1 optional; avoid repeated use
saveHistory=0 optional
```

Returns:

```json
{
  "ok": true,
  "type": "dashboard",
  "symbols": [],
  "coverage": {
    "quotes": { "total": 38, "filled": 38, "missing": [] },
    "performance": { "total": 38, "filled": 38, "missing": [] },
    "fundamentals": { "total": 38, "filled": 12, "missing": [] }
  },
  "data": {
    "quotes": {},
    "performance": {},
    "fundamentals": {}
  }
}
```

## GET /api/quotes

Purpose: quote-only refresh.

Used by **Force Price Refresh**.

Query params:

```text
symbols=IONQ,NVDA,IBM
force=1 optional
```

Returns quote data keyed by ticker.

Quote fields can include:

```text
livePrice
dayChange
previousClose
open
dayHigh
dayLow
priceRaw
updatedAt
```

## GET /api/performance

Purpose: 6-month performance metrics from Tiingo.

Fields can include:

```text
sixMonthAvgPrice
sixMonthReturn
priceVsSixMonthAvg
priceVs200DaySma
sixMonthVolatility
sixMonthMaxDrawdown
relativeStrengthVsQqq
updatedAt
```

## GET /api/fundamentals

Purpose: market/fundamental metrics from Finnhub.

Fields can include:

```text
marketCap
volume
psRatio
revenueGrowth
marketCapRaw
averageVolumeRaw
psRatioRaw
revenueGrowthRaw
updatedAt
```

## GET /api/backfill-status

Purpose: see how much of each dataset is filled in KV.

Returns:

```json
{
  "coverage": {
    "quotes": { "total": 38, "filled": 0, "missing": [] },
    "performance": { "total": 38, "filled": 0, "missing": [] },
    "fundamentals": { "total": 38, "filled": 0, "missing": [] }
  }
}
```

## GET /api/history

Purpose: daily snapshots.

Query params:

```text
days=30
```

Important: Some Worker versions return snapshots in `items`, newer smart-cache versions may return `data`. Frontend must handle both.

## GET /api/refresh-log

Purpose: recent refresh/backfill activity.

Important: Some Worker versions return logs in `items`, newer smart-cache versions may return `data`. Frontend must handle both.

## GET /api/user-data

Purpose: private manual sync for user watchlists and manual stock edits.

Requires header:

```text
X-QSD-SYNC-TOKEN: <USER_SYNC_TOKEN>
```

Returns:

```json
{
  "ok": true,
  "type": "user-data",
  "data": {
    "version": 1,
    "savedAt": "2026-05-21T00:00:00.000Z",
    "edits": {},
    "watchlists": []
  }
}
```

## POST /api/user-data

Purpose: save private manual sync data to Cloudflare KV.

Requires header:

```text
X-QSD-SYNC-TOKEN: <USER_SYNC_TOKEN>
```

Body:

```json
{
  "data": {
    "edits": {},
    "watchlists": []
  }
}
```
