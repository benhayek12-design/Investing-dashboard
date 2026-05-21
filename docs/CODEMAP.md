# Code Map

## Frontend: index.html

Main sections:

```text
<style>      CSS/theme/layout/components
<body>       app shell, tabs, modals
<script>     static data, render logic, actions, live data, CSV, helpers
```

## Major JavaScript sections

### Static stock data

```js
const stocks = [ ... ]
```

This is the main static stock universe. Current count should be 38.

### Config

```js
const DEFAULT_WORKER_URL
const CORE_FIELDS
const PRO_FIELDS
const EDITABLE_FIELDS
const FIELD_LABELS
const DEFAULT_WATCHLISTS
const STORAGE
```

### State

```js
let manualEdits
let prefs
let watchlists
let liveData
let liveSettings
let syncSettings
let filters
let historyState
```

### Startup

```js
document.addEventListener("DOMContentLoaded", init)
function init()
function cacheElements()
function bindEvents()
```

Avoid breaking these. If `init()` fails, tabs stop working.

### Render functions

```js
renderAll()
renderHome()
renderStocks()
renderWatchlists()
stockCardHtml()
renderHistory()
```

### Live data

```js
refreshLiveData(force = false)
clearLiveCache()
loadHistoryData()
loadRefreshLogData()
updateLiveStatus()
loadCloudUserData()
saveCloudUserData()
```

### CSV

```js
exportStocksCsv()
exportWatchlistsCsv()
importStocksCsv()
```

### Helpers

```js
fetchJsonFromUrl()
formatDateTime()
escapeHtml()
parseCsv()
```

## Common patch locations

### Add a new displayed metric

1. Add field to `CORE_FIELDS` or `PRO_FIELDS`.
2. Add label to `FIELD_LABELS`.
3. Ensure Worker returns field under matching name.
4. Confirm `getMergedStock()` merges that source.

### Add a new API field

1. Update Worker mapper.
2. Update API contract docs.
3. Add frontend display field.
4. Add CSV export if useful.

### Add a Settings control

1. Add HTML under Settings card.
2. Add element in `cacheElements()`.
3. Add listener in `bindEvents()`.
4. Add state to `liveSettings` or `prefs`.

## Critical warnings

- Do not remove `data-tab` or `data-panel` attributes.
- Do not remove `startupError`; it helps debug failures.
- Do not rename localStorage keys without migration.
- Do not assume `/api/history` only returns `items`.
- Do not force all APIs on every button press.
