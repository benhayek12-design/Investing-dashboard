# Investment Dashboard User Guide

This guide explains how to use the dashboard day to day, how the data refreshes, and what to do when something looks stale or incomplete.

## 1. What This App Is

The dashboard is a mobile-friendly investment terminal for broad market context, sector ETFs, macro assets, stock research, quantum themes, AI infrastructure, semiconductor, power, photonics, cybersecurity, and ETF watchlists.

It is not a brokerage account and does not place trades. It is a research and monitoring dashboard.

## 2. Main Screens

### Home

Use Home for the daily overview.

- Market Pulse shows the strongest and weakest daily movers from cached quote data.
- Watchlist Focus shows watched ticker coverage and the strongest watched mover when quote data exists.
- Data Status shows quote freshness, quote coverage, and whether a snapshot has been saved.
- Risk Mix summarizes high-risk exposure, infrastructure exposure, and fundamentals coverage.
- Market context compares broad market groups such as indexes, sectors, and macro ETFs when market quotes are loaded.

If a stock field says `Refresh data`, use Settings -> Refresh Now. If a market-context field says `Refresh data`, use Settings -> Refresh Markets.

### Markets

Markets are shown inside Home so the iPhone tab bar stays compact.

- Indexes include SPY, QQQ, DIA, IWM, and VTI.
- Sectors include XLK, XLF, XLV, XLE, XLI, XLU, XLY, XLP, XLC, XLB, and XLRE.
- Macro assets include GLD, SLV, USO, TLT, and SHY.
- Each market group shows average day move, the strongest asset, the weakest asset, and the number of assets in that group.
- Market assets are quote-only. They are not part of the stock research card universe.

### Stocks

Use Stocks for individual company review.

- Search by ticker, company, category, thesis, or notes.
- Filter by category or risk level.
- Each card shows the static thesis, AI/data-center relevance, live fields, quote timestamp, and pro metrics.
- Tap Edit to add manual notes or override editable fields.
- Yahoo and TradingView buttons open external research pages.

### Watchlists

Use Watchlists for curated groups.

- Tap a ticker chip to jump to the Stocks tab filtered to that ticker.
- Add, edit, delete, or reset watchlists.
- Watchlists are saved in browser storage and can sync through the Cloudflare private sync flow when configured.

### History

Use History to inspect Cloudflare KV snapshots.

- Load History fetches recent saved snapshots.
- Snapshot Coverage shows which of the 38 stocks are present in the latest snapshot.
- Stock Drilldown lets you inspect saved price, return, relative strength, P/S, and revenue growth for one ticker.
- Refresh Activity is diagnostic and collapsed by default.

History may be sparse until snapshots have accumulated.

### Settings

Use Settings for preferences, data refresh, backup, and sync.

- Dark mode and compact cards are local preferences.
- Export CSV creates local backups of stocks or watchlists.
- Import CSV restores editable stock fields.
- Worker URL controls the Cloudflare backend endpoint.
- Refresh Now calls the smart `/api/dashboard` endpoint.
- Force Price Refresh calls `/api/quotes?force=1` and should be used sparingly.
- Refresh Markets calls `/api/quotes` for broad market assets only.
- Coverage diagnostics show what data is missing.
- Cloud Sync uses a private token and stores manual edits/watchlists through the Worker.

## 3. Refresh Rules

Use Refresh Now for normal daily use. It lets the Worker decide what is stale and protects free API limits.

Use Force Price Refresh only when prices look stale or differ meaningfully from another quote source. It bypasses quote cache for quote data only.

Use Refresh Markets when the Home market groups need broad index, sector, or macro ETF quote data. It does not request performance or fundamentals.

Expected freshness:

- Quotes: about 15 minutes
- Market quotes: quote cache controlled by the Worker
- Performance: about 24 hours
- Fundamentals: about 12 hours
- History: saved when the Worker records snapshots

## 4. Data Sources

The frontend calls only the Cloudflare Worker.

- Finnhub provides quotes and fundamentals.
- Tiingo provides historical performance metrics.
- Cloudflare KV stores cached data, snapshots, refresh logs, and optional private sync data.

The broad market universe lives in `assets/js/data/markets.js`. It is intentionally separate from the stock research universe in `assets/js/data/stocks.js`.

API keys must never be placed in frontend files.

## 5. Backup And Sync

### Local Backup

Use CSV export before major manual edits.

- Export Stocks CSV backs up editable stock fields.
- Export Watchlists CSV backs up watchlist structure.

### Cloud Sync

Cloud sync is optional and private.

1. Enter the sync token in Settings.
2. Save the token.
3. Use Save to Cloud after editing on one device.
4. Use Load from Cloud on another device.

If the API fails, local browser data remains the fallback.

## 6. iPhone Use

The app is designed to stay usable on iPhone.

- Use Home for quick daily checks.
- Use Refresh Markets when you want broad market context without refreshing every stock metric.
- Use Watchlists for fast ticker jumps.
- Use Settings for refreshes.
- Avoid repeated Force Price Refresh taps because it can consume quote limits.
- Add the GitHub Pages site to the Home Screen for app-like access.

## 7. Troubleshooting

### A price looks stale

Check the stock card quote timestamp. If needed, go to Settings and tap Force Price Refresh once.

### A metric is blank

Some fundamentals are unavailable for ETFs or small caps. Check Settings coverage diagnostics for missing tickers.

### History is empty

Run Refresh Now, wait for the Worker to save snapshots, then tap Load History.

### iPhone and desktop differ

Browser localStorage is device-specific. Use Cloud Sync if configured, or export/import CSV as a backup path.

### The app cannot connect

Check the Worker URL in Settings. The default should be:

```text
https://quantum-dashboard-api.benhayek12.workers.dev
```

## 8. Safe Operating Rules

- Do not put API keys in frontend files.
- Do not force refresh repeatedly.
- Export CSV before large manual edits.
- Treat portfolio data as sensitive when that feature is added.
- Use the dashboard as research support, not as financial advice.
