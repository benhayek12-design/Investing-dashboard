# Suggested Task Backlog

Use this file as Codex / Claude Code's task queue. The safest workflow is: choose one task, make a small change, test, commit, then move to the next task.

## Current operating model

- Computer = build/admin device:
  - edit code
  - run Codex / Claude Code
  - manage GitHub commits
  - manage Cloudflare Worker/KV
  - test desktop layout
- iPhone = viewer/quick-check device:
  - open dashboard from Home Screen
  - check prices and watchlists
  - refresh live data
  - add quick notes
- GitHub Pages is the shared public frontend.
- Cloudflare Worker is the API/backend layer.
- Cloudflare KV is the shared backend store for API cache and history snapshots.
- Browser localStorage is currently device-specific and should be treated as temporary/local preference storage.

## Highest-priority safe tasks

1. **Stabilize first**
   - Verify all tabs work: Home, Stocks, Watchlists, History, Settings.
   - Verify stock cards render all 38 stocks.
   - Verify no startup JavaScript errors.
   - Do not add new features until this passes.

2. [x] **Refactor only: split the app without changing behavior**
   - Split the single-file app into:
     - `index.html`
     - `assets/styles.css`
     - `assets/app.js`
     - `assets/stocks.js`
   - Keep GitHub Pages compatibility.
   - Do not change UI behavior during this refactor.
   - Do not rename storage keys during this refactor.
   - Do not rewrite the app in React/Vite/Next.

3. **Preserve mobile + desktop support**
   - Keep iPhone layout card-based.
   - Add/maintain a wider desktop layout for the Stocks and History pages.
   - Do not create two separate apps.
   - One app should work on both desktop and iPhone.

4. **Show quote freshness clearly**
   - Show `Price updated: <time> · Finnhub` on each stock card.
   - Add Settings fields:
     - Last dashboard refresh
     - Quote cache age
     - Next quote refresh allowed
   - Keep Refresh Now API-safe.

5. **Force Price Refresh button**
   - Add a separate button that calls `/api/quotes?force=1` only.
   - Do not force performance or fundamentals from this button.
   - Keep this separate from the normal `Refresh Now` button.

## API / Worker tasks

6. **Use the combined dashboard endpoint**
   - Prefer `/api/dashboard` for normal app refreshes.
   - Avoid calling `/api/quotes`, `/api/performance`, and `/api/fundamentals` separately unless debugging.
   - Keep the Worker responsible for deciding what is stale.

7. **Add coverage counts in Settings**
   - Show:
     - quotes filled / total
     - performance filled / total
     - fundamentals filled / total
   - Make clear when data is missing because of API limits/provider gaps.

7a. [x] **Add Home daily snapshot and market context**
   - Show top movers, watchlist focus, data freshness, and risk mix.
   - Compare existing themes without adding another mobile tab.
   - Use existing cached quote data only.

7b. [x] **Add app user guide**
   - Explain tabs, refresh behavior, backups, sync, iPhone use, and troubleshooting.

7c. [x] **Add broad market universe**
   - Add index, sector, and macro ETF groups.
   - Keep broad markets quote-only to protect performance/fundamental API usage.
   - Show broad markets inside Home instead of adding another iPhone tab.

7d. [x] **Add market asset drilldowns**
   - Show individual index, sector, and macro ETF rows inside the Home market cards.
   - Keep the drilldown inside existing Home cards so the iPhone tab bar stays compact.
   - Include price, daily percent move, and market role for each asset.

8. [x] **Improve History with KV snapshots**
   - Keep History readable on iPhone.
   - Default History view should show:
     - latest snapshot summary
     - snapshot coverage
     - best/worst 6M return
     - best/worst relative vs QQQ
     - selected stock drilldown
   - Do not show a giant raw 38-stock grid as the main view.

9. [x] **Refresh log display**
   - Make refresh activity collapsed by default.
   - Show human-readable entries:
     - time
     - provider/data type
     - symbols attempted
     - coverage result

## Cross-device sync tasks

10. [x] **Move user edits to Cloudflare KV later**
    - Future goal: make iPhone and computer share:
      - watchlists
      - analyst notes
      - manual cash runway
      - manual share dilution
      - manual notes
    - Manual private sync now shares edits/watchlists through Cloudflare KV when `USER_SYNC_TOKEN` is configured.
    - Do not remove localStorage until KV sync is implemented and tested.
    - localStorage remains the on-device cache.

11. [x] **KV-backed user data endpoint design**
    - Implemented endpoint:
      - `GET /api/user-data`
      - `POST /api/user-data`
    - Current design stores edits and watchlists together as one versioned KV blob.
    - Protected by `USER_SYNC_TOKEN` / `X-QSD-SYNC-TOKEN`.
    - Separate watchlist endpoints are deferred until there is a need for finer-grained sync.

## Medium tasks

- Add unit-like browser tests for parsing Worker responses.
- Add data migration helpers for localStorage key changes.
- Add a History chart only after snapshots exist for at least 7 to 30 days.
- Add provider labels under each metric group.
- Add a manual CSV backup reminder for local notes.

## Bigger tasks

- Add additional fundamentals provider fallback.
- Add account-level private mode/authentication.
- Add saved stock scoring system.
- Add server-side scheduled market-hours refresh.
- Add multi-provider status dashboard.

## Do not do without explicit approval

- Do not put real API keys in frontend code or docs.
- Do not remove Cloudflare Worker architecture.
- Do not remove Cloudflare KV history.
- Do not remove localStorage before a tested KV sync replacement exists.
- Do not convert to React, Next.js, Vite, or a build system unless explicitly requested.
- Do not rewrite the whole app from scratch.
- Do not change all storage keys unless a migration is included.
- Do not make Refresh Now force all provider APIs.
- Do not break iPhone layout while improving desktop layout.

## Codex instruction template

When asking Codex to work on this repo, use this instruction:

```text
Read CODEX_START_HERE.md, README.md, docs/ARCHITECTURE.md, docs/API_CONTRACT.md, docs/CODEMAP.md, and TASKS.md first.

Do one task only. Make the smallest safe change. Do not rewrite the app. Do not add API keys. Do not change Cloudflare secrets. Keep GitHub Pages compatibility. Keep iPhone layout working. After editing, summarize exactly what changed and what was not changed.
```
