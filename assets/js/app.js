/* =========================================================
   1. Data Bootstrap
   Stock data lives in assets/js/data/stocks.js.
   ========================================================= */
const stocks = window.DASHBOARD_STOCKS || [];
const marketAssets = window.DASHBOARD_MARKET_ASSETS || [];

const DEFAULT_WORKER_URL = "https://quantum-dashboard-api.benhayek12.workers.dev";
const CORE_FIELDS = ["livePrice", "dayChange", "marketCap", "volume", "psRatio", "revenueGrowth", "cashRunway", "analystNotes"];
const PRO_FIELDS = ["sixMonthAvgPrice", "sixMonthReturn", "priceVsSixMonthAvg", "priceVs200DaySma", "sixMonthVolatility", "sixMonthMaxDrawdown", "relativeStrengthVsQqq", "shareDilution"];
const EDITABLE_FIELDS = [...CORE_FIELDS, ...PRO_FIELDS];
const FIELD_LABELS = {
  livePrice: "Live Price", dayChange: "Day Change", marketCap: "Market Cap", volume: "Volume", psRatio: "P/S Ratio", revenueGrowth: "Revenue Growth", cashRunway: "Cash Runway", analystNotes: "Analyst Notes",
  sixMonthAvgPrice: "6M Avg Price", sixMonthReturn: "6M Return", priceVsSixMonthAvg: "Price vs 6M Avg", priceVs200DaySma: "Price vs 200D SMA", sixMonthVolatility: "6M Volatility", sixMonthMaxDrawdown: "6M Max Drawdown", relativeStrengthVsQqq: "Relative vs QQQ", shareDilution: "Share Dilution"
};
const DEFAULT_WATCHLISTS = [
  { title: "Safest Infrastructure Plays", tickers: ["NVDA", "TSM", "ASML", "AMAT", "VRT", "ETN", "CEG"], note: "Large or established infrastructure beneficiaries." },
  { title: "Highest-Risk Quantum Pure Plays", tickers: ["IONQ", "RGTI", "QBTS", "QUBT"], note: "More direct quantum upside, but more volatility and funding risk." },
  { title: "Big Tech Quantum Leaders", tickers: ["IBM", "GOOGL", "MSFT", "AMZN"], note: "Diversified companies with quantum research and cloud platforms." },
  { title: "Underappreciated Photonics Plays", tickers: ["COHR", "LITE", "MKSI", "IPGP"], note: "Optics, lasers, and photonics exposure for advanced compute." }
];
const MARKET_GROUPS = [
  { title: "Big Tech", categories: ["Big Tech quantum"] },
  { title: "Semiconductors", categories: ["Semiconductor infrastructure"] },
  { title: "Power/Cooling", categories: ["Power/cooling/infrastructure"] },
  { title: "Cybersecurity", categories: ["Cybersecurity/post-quantum encryption"] },
  { title: "ETFs", categories: ["ETFs"] }
];
const STORAGE = {
  edits: "qsd.edits.v4",
  prefs: "qsd.prefs.v4",
  watchlists: "qsd.watchlists.v4",
  live: "qsd.live.finnhub.tiingo.fundamentals.v5",
  liveSettings: "qsd.liveSettings.v4",
  syncSettings: "qsd.syncSettings.v1"
};

let manualEdits = loadJson(STORAGE.edits, {});
let prefs = loadJson(STORAGE.prefs, { darkMode: true, compactCards: false });
let watchlists = loadJson(STORAGE.watchlists, DEFAULT_WATCHLISTS);
let liveData = loadJson(STORAGE.live, { quotes: {}, performance: {}, fundamentals: {}, lastQuoteRefresh: null, lastPerformanceRefresh: null, lastFundamentalsRefresh: null });
let liveSettings = loadJson(STORAGE.liveSettings, { workerUrl: DEFAULT_WORKER_URL, autoRefresh: false });
let syncSettings = loadJson(STORAGE.syncSettings, { token: "", lastSyncAt: null });
let historyState = { snapshots: [], refreshLog: [], selectedTicker: "IONQ" };
let filters = { search: "", category: "all", risk: "all" };
let activeEditTicker = null;
let activeWatchlistIndex = null;
let autoRefreshTimer = null;
const els = {};

/* =========================================================
   3. App Startup
   ========================================================= */
document.addEventListener("DOMContentLoaded", init);

function init() {
  try {
    cacheElements();
    buildEditFields();
    bindEvents();
    applyPrefs();
    populateFilters();
    renderAll();
    updateLiveStatus();
    configureAutoRefresh();
  } catch (error) {
    showStartupError(error);
  }
}

function cacheElements() {
  els.tabButtons = document.querySelectorAll(".tab-button");
  els.panels = document.querySelectorAll(".tab-panel");
  els.startupError = document.getElementById("startupError");
  els.homeSnapshot = document.getElementById("homeSnapshot");
  els.marketSnapshot = document.getElementById("marketSnapshot");
  els.summaryCards = document.getElementById("summaryCards");
  els.categoryCards = document.getElementById("categoryCards");
  els.searchInput = document.getElementById("searchInput");
  els.categoryFilter = document.getElementById("categoryFilter");
  els.riskFilter = document.getElementById("riskFilter");
  els.resetFilters = document.getElementById("resetFilters");
  els.stockList = document.getElementById("stockList");
  els.emptyState = document.getElementById("emptyState");
  els.watchlistGrid = document.getElementById("watchlistGrid");
  els.addWatchlist = document.getElementById("addWatchlist");
  els.resetWatchlists = document.getElementById("resetWatchlists");
  els.darkToggle = document.getElementById("darkToggle");
  els.compactToggle = document.getElementById("compactToggle");
  els.exportStocksCsv = document.getElementById("exportStocksCsv");
  els.exportWatchlistsCsv = document.getElementById("exportWatchlistsCsv");
  els.importCsvButton = document.getElementById("importCsvButton");
  els.importCsv = document.getElementById("importCsv");
  els.resetData = document.getElementById("resetData");
  els.syncTokenInput = document.getElementById("syncTokenInput");
  els.saveSyncToken = document.getElementById("saveSyncToken");
  els.loadCloudData = document.getElementById("loadCloudData");
  els.saveCloudData = document.getElementById("saveCloudData");
  els.syncStatus = document.getElementById("syncStatus");
  els.lastCloudSync = document.getElementById("lastCloudSync");
  els.workerUrlInput = document.getElementById("workerUrlInput");
  els.autoRefreshToggle = document.getElementById("autoRefreshToggle");
  els.refreshNow = document.getElementById("refreshNow");
  els.forcePriceRefresh = document.getElementById("forcePriceRefresh");
  els.refreshMarkets = document.getElementById("refreshMarkets");
  els.saveWorkerUrl = document.getElementById("saveWorkerUrl");
  els.clearLiveCache = document.getElementById("clearLiveCache");
  els.liveStatus = document.getElementById("liveStatus");
  els.lastDashboardRefresh = document.getElementById("lastDashboardRefresh");
  els.lastQuoteRefresh = document.getElementById("lastQuoteRefresh");
  els.quoteCacheAge = document.getElementById("quoteCacheAge");
  els.nextQuoteRefresh = document.getElementById("nextQuoteRefresh");
  els.marketCoverage = document.getElementById("marketCoverage");
  els.lastPerformanceRefresh = document.getElementById("lastPerformanceRefresh");
  els.lastFundamentalsRefresh = document.getElementById("lastFundamentalsRefresh");
  els.quotesCoverage = document.getElementById("quotesCoverage");
  els.quotesMissing = document.getElementById("quotesMissing");
  els.performanceCoverage = document.getElementById("performanceCoverage");
  els.performanceMissing = document.getElementById("performanceMissing");
  els.fundamentalsCoverage = document.getElementById("fundamentalsCoverage");
  els.fundamentalsMissing = document.getElementById("fundamentalsMissing");
  els.cacheStatus = document.getElementById("cacheStatus");
  els.snapshotStatus = document.getElementById("snapshotStatus");
  els.loadHistory = document.getElementById("loadHistory");
  els.loadRefreshLog = document.getElementById("loadRefreshLog");
  els.historySnapshotDate = document.getElementById("historySnapshotDate");
  els.historySymbolCount = document.getElementById("historySymbolCount");
  els.historySavedAt = document.getElementById("historySavedAt");
  els.historyInsights = document.getElementById("historyInsights");
  els.historyCoverageCount = document.getElementById("historyCoverageCount");
  els.historyMissingCount = document.getElementById("historyMissingCount");
  els.historySymbolCoverage = document.getElementById("historySymbolCoverage");
  els.historyCoverageNote = document.getElementById("historyCoverageNote");
  els.historyTickerSelect = document.getElementById("historyTickerSelect");
  els.selectedHistorySummary = document.getElementById("selectedHistorySummary");
  els.selectedHistoryRows = document.getElementById("selectedHistoryRows");
  els.refreshLogList = document.getElementById("refreshLogList");
  els.editModal = document.getElementById("editModal");
  els.editTitle = document.getElementById("editTitle");
  els.editSubtitle = document.getElementById("editSubtitle");
  els.editForm = document.getElementById("editForm");
  els.coreEditFields = document.getElementById("coreEditFields");
  els.proEditFields = document.getElementById("proEditFields");
  els.watchlistCheckboxes = document.getElementById("watchlistCheckboxes");
  els.closeModal = document.getElementById("closeModal");
  els.cancelEdit = document.getElementById("cancelEdit");
  els.watchlistModal = document.getElementById("watchlistModal");
  els.watchlistTitle = document.getElementById("watchlistTitle");
  els.watchlistForm = document.getElementById("watchlistForm");
  els.closeWatchlistModal = document.getElementById("closeWatchlistModal");
  els.cancelWatchlistEdit = document.getElementById("cancelWatchlistEdit");
  els.deleteWatchlist = document.getElementById("deleteWatchlist");
}

function bindEvents() {
  els.tabButtons.forEach(button => button.addEventListener("click", () => setActiveTab(button.dataset.tab)));
  els.searchInput.addEventListener("input", () => { filters.search = els.searchInput.value; renderStocks(); });
  els.categoryFilter.addEventListener("change", () => { filters.category = els.categoryFilter.value || "all"; renderStocks(); });
  els.riskFilter.addEventListener("change", () => { filters.risk = els.riskFilter.value || "all"; renderStocks(); });
  els.resetFilters.addEventListener("click", resetFilters);
  els.stockList.addEventListener("click", handleStockListClick);
  els.watchlistGrid.addEventListener("click", handleWatchlistClick);
  els.addWatchlist.addEventListener("click", () => openWatchlistEditor(null));
  els.resetWatchlists.addEventListener("click", resetWatchlists);
  els.darkToggle.addEventListener("change", () => { prefs.darkMode = els.darkToggle.checked; savePrefs(); applyPrefs(); });
  els.compactToggle.addEventListener("change", () => { prefs.compactCards = els.compactToggle.checked; savePrefs(); applyPrefs(); });
  els.exportStocksCsv.addEventListener("click", exportStocksCsv);
  els.exportWatchlistsCsv.addEventListener("click", exportWatchlistsCsv);
  els.importCsvButton.addEventListener("click", () => els.importCsv.click());
  els.importCsv.addEventListener("change", importStocksCsv);
  els.resetData.addEventListener("click", resetLocalData);
  els.saveSyncToken.addEventListener("click", saveSyncToken);
  els.loadCloudData.addEventListener("click", loadCloudUserData);
  els.saveCloudData.addEventListener("click", saveCloudUserData);
  els.saveWorkerUrl.addEventListener("click", saveWorkerUrl);
  els.refreshNow.addEventListener("click", () => refreshLiveData(false));
  if (els.forcePriceRefresh) els.forcePriceRefresh.addEventListener("click", forcePriceRefresh);
  if (els.refreshMarkets) els.refreshMarkets.addEventListener("click", refreshMarketData);
  els.clearLiveCache.addEventListener("click", clearLiveCache);
  els.autoRefreshToggle.addEventListener("change", () => { liveSettings.autoRefresh = els.autoRefreshToggle.checked; saveLiveSettings(); configureAutoRefresh(); });
  els.loadHistory.addEventListener("click", () => loadHistoryData());
  els.loadRefreshLog.addEventListener("click", () => loadRefreshLogData());
  els.historyTickerSelect.addEventListener("change", () => { historyState.selectedTicker = els.historyTickerSelect.value; renderHistory(); });
  els.historySymbolCoverage.addEventListener("click", event => {
    const button = event.target.closest("[data-history-ticker]");
    if (!button) return;
    historyState.selectedTicker = button.dataset.historyTicker;
    renderHistory();
  });
  els.closeModal.addEventListener("click", closeEditor);
  els.cancelEdit.addEventListener("click", closeEditor);
  els.editModal.addEventListener("click", event => { if (event.target === els.editModal) closeEditor(); });
  els.editForm.addEventListener("submit", saveEditor);
  els.closeWatchlistModal.addEventListener("click", closeWatchlistEditor);
  els.cancelWatchlistEdit.addEventListener("click", closeWatchlistEditor);
  els.watchlistModal.addEventListener("click", event => { if (event.target === els.watchlistModal) closeWatchlistEditor(); });
  els.watchlistForm.addEventListener("submit", saveWatchlistEditor);
  els.deleteWatchlist.addEventListener("click", deleteWatchlist);
}

/* =========================================================
   4. Render Functions
   ========================================================= */
function renderAll() { renderHome(); renderStocks(); renderWatchlists(); updateLiveStatus(); }

function renderHome() {
  const totalStocks = stocks.length;
  const totalCategories = unique(stocks.map(stock => stock.category)).length;
  const highRiskStocks = stocks.filter(stock => ["High", "Very High"].includes(stock.risk)).length;
  const infrastructureStocks = stocks.filter(stock => stock.category === "Semiconductor infrastructure" || stock.category === "Power/cooling/infrastructure").length;
  renderHomeSnapshot({ totalStocks, highRiskStocks, infrastructureStocks });
  renderMarketSnapshot();
  const summary = [["Total stocks", totalStocks], ["Categories", totalCategories], ["High-risk stocks", highRiskStocks], ["Infrastructure", infrastructureStocks]];
  els.summaryCards.innerHTML = summary.map(([label, value]) => `<article class="card metric-card"><span class="label">${escapeHtml(label)}</span><span class="number">${escapeHtml(value)}</span></article>`).join("");
  const categories = unique(stocks.map(stock => stock.category)).map(category => ({ category, count: stocks.filter(stock => stock.category === category).length }));
  els.categoryCards.innerHTML = categories.map(item => `<article class="card category-card"><div class="category-row"><span class="category-name">${escapeHtml(item.category)}</span><span class="category-count">${item.count}</span></div></article>`).join("");
}

function renderHomeSnapshot({ totalStocks, highRiskStocks, infrastructureStocks }) {
  if (!els.homeSnapshot) return;
  const mergedStocks = stocks.map(stock => getMergedStock(stock.ticker));
  const dayMovers = mergedStocks.filter(stock => Number.isFinite(parsePercentValue(stock.dayChange)));
  const sixMonthMovers = mergedStocks.filter(stock => Number.isFinite(parsePercentValue(stock.sixMonthReturn)));
  const watchedTickers = unique(watchlists.flatMap(list => parseTickerList((list.tickers || []).join(","))));
  const watchedStocks = mergedStocks.filter(stock => watchedTickers.includes(stock.ticker) && Number.isFinite(parsePercentValue(stock.dayChange)));
  const bestDay = bestBy(dayMovers, stock => parsePercentValue(stock.dayChange));
  const worstDay = worstBy(dayMovers, stock => parsePercentValue(stock.dayChange));
  const bestSixMonth = bestBy(sixMonthMovers, stock => parsePercentValue(stock.sixMonthReturn));
  const topWatchlistMover = bestBy(watchedStocks, stock => parsePercentValue(stock.dayChange));
  const coverage = liveData.cache || {};

  els.homeSnapshot.innerHTML = [
    snapshotCardHtml("Market Pulse", [
      ["Top mover", stockMoveText(bestDay, "dayChange")],
      ["Weakest", stockMoveText(worstDay, "dayChange")],
      ["Best 6M", stockMoveText(bestSixMonth, "sixMonthReturn")]
    ]),
    snapshotCardHtml("Watchlist Focus", [
      ["Top watched", stockMoveText(topWatchlistMover, "dayChange")],
      ["Lists", String(watchlists.length)],
      ["Tickers watched", String(watchedTickers.length)]
    ]),
    snapshotCardHtml("Data Status", [
      ["Quotes", quoteCacheAgeText()],
      ["Coverage", coverageText(coverage.quotes)],
      ["Markets", marketCoverageText()],
      ["History", liveData.snapshotSaved ? "Snapshot saved" : "No snapshot yet"]
    ]),
    snapshotCardHtml("Risk Mix", [
      ["High risk", `${highRiskStocks}/${totalStocks}`],
      ["Infrastructure", String(infrastructureStocks)],
      ["Fundamentals", coverageText(coverage.fundamentals)]
    ])
  ].join("");
}

function renderMarketSnapshot() {
  if (!els.marketSnapshot) return;
  const cards = marketAssets.length ? broadMarketCards() : thematicMarketCards();
  els.marketSnapshot.innerHTML = cards.join("");
}

function broadMarketCards() {
  return marketAssetGroups().map(group => {
    const groupAssets = marketAssets.filter(asset => asset.group === group);
    const movers = groupAssets.map(asset => ({ ...asset, ...(liveData.quotes[asset.ticker] || {}) })).filter(asset => Number.isFinite(parsePercentValue(asset.dayChange)));
    const leader = bestBy(movers, asset => parsePercentValue(asset.dayChange));
    const laggard = worstBy(movers, asset => parsePercentValue(asset.dayChange));
    return snapshotCardHtml(group, [
      ["Avg day", averagePercentText(movers.map(asset => parsePercentValue(asset.dayChange)))],
      ["Leader", stockMoveText(leader, "dayChange")],
      ["Weakest", stockMoveText(laggard, "dayChange")],
      ["Quotes", `${quotedMarketAssets(groupAssets).length}/${groupAssets.length}`]
    ]);
  });
}

function thematicMarketCards() {
  return MARKET_GROUPS.map(group => {
    const groupStocks = stocks.filter(stock => group.categories.includes(stock.category)).map(stock => getMergedStock(stock.ticker));
    const movers = groupStocks.filter(stock => Number.isFinite(parsePercentValue(stock.dayChange)));
    const leader = bestBy(movers, stock => parsePercentValue(stock.dayChange));
    const laggard = worstBy(movers, stock => parsePercentValue(stock.dayChange));
    return snapshotCardHtml(group.title, [
      ["Avg day", averagePercentText(movers.map(stock => parsePercentValue(stock.dayChange)))],
      ["Leader", stockMoveText(leader, "dayChange")],
      ["Weakest", stockMoveText(laggard, "dayChange")]
    ]);
  });
}

function snapshotCardHtml(title, rows) {
  return `<article class="card snapshot-card"><h3>${escapeHtml(title)}</h3>${rows.map(([label, value]) => `<div class="snapshot-row"><span>${escapeHtml(label)}</span><span>${escapeHtml(value || "—")}</span></div>`).join("")}</article>`;
}

function stockMoveText(stock, field) {
  return stock ? `${stock.ticker} ${stock[field] || "—"}` : "Refresh data";
}

function marketAssetGroups() {
  return unique(marketAssets.map(asset => asset.group));
}

function currentMarketQuotes() {
  return Object.fromEntries(marketAssets.filter(asset => liveData.quotes && liveData.quotes[asset.ticker]).map(asset => [asset.ticker, liveData.quotes[asset.ticker]]));
}

function quotedMarketAssets(assets = marketAssets) {
  return assets.filter(asset => hasQuoteData(liveData.quotes && liveData.quotes[asset.ticker]));
}

function renderStocks() {
  const rows = getFilteredStocks();
  els.emptyState.style.display = rows.length ? "none" : "block";
  els.stockList.innerHTML = rows.map(stock => stockCardHtml(getMergedStock(stock.ticker))).join("");
}

function renderWatchlists() {
  els.watchlistGrid.innerHTML = watchlists.map((list, index) => {
    const tickers = parseTickerList(list.tickers.join(","));
    const chips = tickers.length ? tickers.map(ticker => `<button class="chip" type="button" data-ticker="${escapeAttr(ticker)}">${escapeHtml(ticker)}</button>`).join("") : `<span class="meta">No stocks assigned yet.</span>`;
    return `<article class="watch-card"><div class="watch-card-header"><div><h3>${escapeHtml(list.title)}</h3><p class="meta">${tickers.length} ticker${tickers.length === 1 ? "" : "s"}</p></div><button class="button secondary small" type="button" data-edit-watchlist="${index}">Edit</button></div>${list.note ? `<p class="watch-note">${escapeHtml(list.note)}</p>` : ""}<div class="chips">${chips}</div></article>`;
  }).join("");
}

function stockCardHtml(stock) {
  const coreValues = CORE_FIELDS.map(field => metricItemHtml(field, stock[field], field === "analystNotes")).join("");
  const proValues = PRO_FIELDS.map(field => metricItemHtml(field, stock[field], false)).join("");
  const quoteTime = getQuoteUpdatedAt(stock.ticker);
  const quoteMeta = quoteTime ? `<p class="quote-timestamp"><strong>Price updated:</strong> ${escapeHtml(formatDateTime(quoteTime))} · Finnhub</p>` : `<p class="quote-timestamp"><strong>Price updated:</strong> Not refreshed yet</p>`;
  return `<article class="stock-card" id="stock-${escapeAttr(stock.ticker)}"><div class="stock-header"><div><div class="ticker">${escapeHtml(stock.ticker)}</div><h3 class="company">${escapeHtml(stock.company)}</h3><p class="meta">${escapeHtml(stock.exchange)} · ${escapeHtml(stock.category)}</p></div><div class="tags"><span class="tag risk-${className(stock.risk)}">${escapeHtml(stock.risk)}</span><span class="tag val-${className(stock.valuation)}">${escapeHtml(stock.valuation)}</span></div></div><div class="text-block"><span class="small-label">Quantum thesis</span><p>${escapeHtml(stock.thesis)}</p></div><div class="text-block"><span class="small-label">AI / Data Center Relevance</span><p>${escapeHtml(stock.aiData)}</p></div><div class="manual-grid">${coreValues}</div>${quoteMeta}<details class="pro-metrics"><summary>Pro Metrics</summary><div class="manual-grid">${proValues}</div></details><div class="actions"><a class="link-button secondary" href="${yahooUrl(stock.ticker)}" target="_blank" rel="noopener">Yahoo</a><a class="link-button secondary" href="${tradingViewUrl(stock.ticker)}" target="_blank" rel="noopener">TradingView</a><button class="button" type="button" data-edit="${escapeAttr(stock.ticker)}">Edit</button></div></article>`;
}

function metricItemHtml(field, value, isNotes) {
  const display = value && String(value).trim() ? value : "—";
  return `<div class="manual-item ${isNotes ? "notes-item" : ""}"><span class="mini-label">${escapeHtml(FIELD_LABELS[field])}</span><span class="mini-value">${escapeHtml(display)}</span></div>`;
}

function populateFilters() {
  const categories = ["all", ...unique(stocks.map(stock => stock.category))];
  const risks = ["all", "Low", "Moderate", "High", "Very High"];
  els.categoryFilter.innerHTML = categories.map(value => `<option value="${escapeAttr(value)}">${escapeHtml(value === "all" ? "All categories" : value)}</option>`).join("");
  els.riskFilter.innerHTML = risks.map(value => `<option value="${escapeAttr(value)}">${escapeHtml(value === "all" ? "All risks" : value)}</option>`).join("");
  els.categoryFilter.value = filters.category;
  els.riskFilter.value = filters.risk;
}

function getFilteredStocks() {
  const query = String(filters.search || "").trim().toLowerCase();
  return stocks.filter(stock => {
    const merged = getMergedStock(stock.ticker);
    const text = [merged.ticker, merged.company, merged.exchange, merged.category, merged.risk, merged.valuation, merged.thesis, merged.aiData, merged.analystNotes].join(" ").toLowerCase();
    return (!query || text.includes(query)) && (filters.category === "all" || merged.category === filters.category) && (filters.risk === "all" || merged.risk === filters.risk);
  });
}

function getMergedStock(ticker) {
  const base = stocks.find(stock => stock.ticker === ticker);
  const empty = Object.fromEntries(EDITABLE_FIELDS.map(field => [field, ""]));
  return { ...empty, ...base, ...(manualEdits[ticker] || {}), ...(liveData.quotes[ticker] || {}), ...(liveData.performance[ticker] || {}), ...((liveData.fundamentals && liveData.fundamentals[ticker]) || {}) };
}

/* =========================================================
   5. User Actions
   ========================================================= */
function setActiveTab(tabName) {
  els.tabButtons.forEach(button => button.classList.toggle("active", button.dataset.tab === tabName));
  els.panels.forEach(panel => panel.classList.toggle("active", panel.dataset.panel === tabName));
  if (tabName === "history") { loadHistoryData(false); loadRefreshLogData(false); }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetFilters() {
  filters = { search: "", category: "all", risk: "all" };
  els.searchInput.value = "";
  els.categoryFilter.value = "all";
  els.riskFilter.value = "all";
  renderStocks();
}

function handleStockListClick(event) {
  const button = event.target.closest("[data-edit]");
  if (button) openEditor(button.dataset.edit);
}

function handleWatchlistClick(event) {
  const editButton = event.target.closest("[data-edit-watchlist]");
  if (editButton) { openWatchlistEditor(Number(editButton.dataset.editWatchlist)); return; }
  const chip = event.target.closest("[data-ticker]");
  if (chip) {
    setActiveTab("stocks");
    filters.search = chip.dataset.ticker;
    filters.category = "all";
    filters.risk = "all";
    els.searchInput.value = filters.search;
    els.categoryFilter.value = "all";
    els.riskFilter.value = "all";
    renderStocks();
  }
}

function buildEditFields() {
  els.coreEditFields.innerHTML = CORE_FIELDS.map(field => editInputHtml(field, field === "analystNotes")).join("");
  els.proEditFields.innerHTML = PRO_FIELDS.map(field => editInputHtml(field, false)).join("");
}

function editInputHtml(field, textarea) {
  const id = `edit-${field}`;
  return `<div class="field"><label for="${id}">${escapeHtml(FIELD_LABELS[field])}</label>${textarea ? `<textarea id="${id}" name="${field}" placeholder="Your notes..."></textarea>` : `<input id="${id}" name="${field}" type="text" />`}</div>`;
}

function openEditor(ticker) {
  const stock = getMergedStock(ticker);
  activeEditTicker = ticker;
  els.editTitle.textContent = stock.ticker;
  els.editSubtitle.textContent = `${stock.company} · ${stock.exchange}`;
  EDITABLE_FIELDS.forEach(field => { if (els.editForm.elements[field]) els.editForm.elements[field].value = (manualEdits[ticker] && manualEdits[ticker][field]) || stock[field] || ""; });
  els.watchlistCheckboxes.innerHTML = watchlists.map((list, index) => `<label class="checkbox-row"><input type="checkbox" data-watchlist-box="${index}" ${list.tickers.includes(ticker) ? "checked" : ""} /> ${escapeHtml(list.title)}</label>`).join("");
  openModal(els.editModal);
}

function closeEditor() { activeEditTicker = null; closeModal(els.editModal); els.editForm.reset(); }

function saveEditor(event) {
  event.preventDefault();
  if (!activeEditTicker) return;
  const next = {};
  EDITABLE_FIELDS.forEach(field => { const input = els.editForm.elements[field]; next[field] = input ? input.value.trim() : ""; });
  manualEdits[activeEditTicker] = next;
  saveJson(STORAGE.edits, manualEdits);
  document.querySelectorAll("[data-watchlist-box]").forEach(box => {
    const list = watchlists[Number(box.dataset.watchlistBox)];
    if (!list) return;
    list.tickers = parseTickerList(list.tickers.join(","));
    const hasTicker = list.tickers.includes(activeEditTicker);
    if (box.checked && !hasTicker) list.tickers.push(activeEditTicker);
    if (!box.checked && hasTicker) list.tickers = list.tickers.filter(t => t !== activeEditTicker);
  });
  saveJson(STORAGE.watchlists, watchlists);
  closeEditor(); renderAll();
}

function openWatchlistEditor(index) {
  activeWatchlistIndex = index;
  const list = index === null ? { title: "", tickers: [], note: "" } : watchlists[index];
  els.watchlistTitle.textContent = index === null ? "New Watchlist" : list.title;
  els.watchlistForm.elements.watchlistName.value = list.title || "";
  els.watchlistForm.elements.watchlistTickers.value = (list.tickers || []).join(", ");
  els.watchlistForm.elements.watchlistNote.value = list.note || "";
  els.deleteWatchlist.style.visibility = index === null ? "hidden" : "visible";
  openModal(els.watchlistModal);
}

function closeWatchlistEditor() { activeWatchlistIndex = null; closeModal(els.watchlistModal); els.watchlistForm.reset(); }

function saveWatchlistEditor(event) {
  event.preventDefault();
  const title = els.watchlistForm.elements.watchlistName.value.trim();
  const tickers = parseTickerList(els.watchlistForm.elements.watchlistTickers.value);
  const note = els.watchlistForm.elements.watchlistNote.value.trim();
  if (!title || !tickers.length) { alert("Please enter a name and at least one ticker."); return; }
  const next = { title, tickers, note };
  if (activeWatchlistIndex === null) watchlists.push(next); else watchlists[activeWatchlistIndex] = next;
  saveJson(STORAGE.watchlists, watchlists);
  closeWatchlistEditor(); renderHome(); renderWatchlists();
}

function deleteWatchlist() {
  if (activeWatchlistIndex === null) return;
  if (!confirm("Delete this watchlist?")) return;
  watchlists.splice(activeWatchlistIndex, 1);
  saveJson(STORAGE.watchlists, watchlists);
  closeWatchlistEditor(); renderHome(); renderWatchlists();
}

function resetWatchlists() {
  if (!confirm("Reset watchlists to defaults?")) return;
  watchlists = JSON.parse(JSON.stringify(DEFAULT_WATCHLISTS));
  saveJson(STORAGE.watchlists, watchlists);
  renderHome(); renderWatchlists();
}

function resetLocalData() {
  if (!confirm("Clear saved manual stock fields, watchlists, and live cache from this device?")) return;
  manualEdits = {}; watchlists = JSON.parse(JSON.stringify(DEFAULT_WATCHLISTS)); liveData = { quotes: {}, performance: {}, fundamentals: {}, cache: {}, lastDashboardRefresh: null, lastQuoteRefresh: null, lastPerformanceRefresh: null, lastFundamentalsRefresh: null, snapshotSaved: false };
  saveJson(STORAGE.edits, manualEdits); saveJson(STORAGE.watchlists, watchlists); saveJson(STORAGE.live, liveData);
  renderAll();
}

function saveSyncToken() {
  syncSettings.token = (els.syncTokenInput.value || "").trim();
  saveJson(STORAGE.syncSettings, syncSettings);
  updateSyncStatus(syncSettings.token ? "Sync token saved" : "Not configured");
}

async function loadCloudUserData() {
  if (!syncSettings.token && els.syncTokenInput.value) saveSyncToken();
  if (!syncSettings.token) { updateSyncStatus("Enter sync token first"); return; }
  if (!confirm("Load cloud watchlists and notes onto this device? This will replace local manual edits and watchlists.")) return;
  setSyncBusy(true, "Loading cloud data...");
  try {
    const payload = await fetchUserData("GET");
    const data = payload.data || {};
    manualEdits = data.edits && typeof data.edits === "object" ? data.edits : {};
    watchlists = Array.isArray(data.watchlists) ? data.watchlists : JSON.parse(JSON.stringify(DEFAULT_WATCHLISTS));
    syncSettings.lastSyncAt = payload.savedAt || data.savedAt || new Date().toISOString();
    saveJson(STORAGE.edits, manualEdits);
    saveJson(STORAGE.watchlists, watchlists);
    saveJson(STORAGE.syncSettings, syncSettings);
    renderAll();
    updateSyncStatus("Cloud data loaded");
  } catch (error) {
    updateSyncStatus("Sync error: " + (error.message || "Load failed"));
  } finally {
    setSyncBusy(false);
  }
}

async function saveCloudUserData() {
  if (!syncSettings.token && els.syncTokenInput.value) saveSyncToken();
  if (!syncSettings.token) { updateSyncStatus("Enter sync token first"); return; }
  if (!confirm("Save this device's watchlists and notes to cloud sync? Other devices can load this version.")) return;
  setSyncBusy(true, "Saving cloud data...");
  try {
    const payload = await fetchUserData("POST", { edits: manualEdits, watchlists });
    syncSettings.lastSyncAt = payload.savedAt || (payload.data && payload.data.savedAt) || new Date().toISOString();
    saveJson(STORAGE.syncSettings, syncSettings);
    updateSyncStatus("Cloud data saved");
  } catch (error) {
    updateSyncStatus("Sync error: " + (error.message || "Save failed"));
  } finally {
    setSyncBusy(false);
  }
}

async function fetchUserData(method, data) {
  const workerUrl = sanitizeWorkerUrl(liveSettings.workerUrl || DEFAULT_WORKER_URL);
  if (!workerUrl) throw new Error("Missing Worker URL");
  const options = {
    method,
    headers: { "X-QSD-SYNC-TOKEN": syncSettings.token }
  };
  if (method === "POST") {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify({ data });
  }
  return fetchJsonFromUrl(`${workerUrl}/api/user-data`, options);
}

function setSyncBusy(isBusy, message) {
  if (els.loadCloudData) els.loadCloudData.disabled = isBusy;
  if (els.saveCloudData) els.saveCloudData.disabled = isBusy;
  if (message) updateSyncStatus(message);
}

function updateSyncStatus(message) {
  if (els.syncStatus) els.syncStatus.textContent = message || (syncSettings.token ? "Ready" : "Not configured");
  if (els.lastCloudSync) els.lastCloudSync.textContent = formatDateTime(syncSettings.lastSyncAt);
}

function applyPrefs() {
  document.body.classList.toggle("light", !prefs.darkMode);
  document.body.classList.toggle("compact", Boolean(prefs.compactCards));
  els.darkToggle.checked = Boolean(prefs.darkMode);
  els.compactToggle.checked = Boolean(prefs.compactCards);
  els.workerUrlInput.value = liveSettings.workerUrl || DEFAULT_WORKER_URL;
  els.autoRefreshToggle.checked = Boolean(liveSettings.autoRefresh);
  if (els.syncTokenInput) els.syncTokenInput.value = syncSettings.token || "";
  updateSyncStatus();
}
function savePrefs() { saveJson(STORAGE.prefs, prefs); }

/* =========================================================
   6. Live Data
   ========================================================= */
async function refreshLiveData(force = false) {
  const workerUrl = sanitizeWorkerUrl(liveSettings.workerUrl || DEFAULT_WORKER_URL);
  if (!workerUrl) { setLiveStatus("Missing Worker URL"); return; }
  if (els.refreshNow) { els.refreshNow.disabled = true; els.refreshNow.textContent = "Refreshing..."; }
  setLiveStatus("Refreshing...");
  try {
    const symbols = stocks.map(stock => stock.ticker).join(",");
    const url = `${workerUrl}/api/dashboard?symbols=${encodeURIComponent(symbols)}${force ? "&force=1" : ""}`;
    const payload = await fetchJsonFromUrl(url);
    if (!payload.ok) throw new Error(payload.error || "Dashboard refresh failed.");

    liveData.quotes = { ...currentMarketQuotes(), ...((payload.data && payload.data.quotes) || {}) };
    liveData.performance = (payload.data && payload.data.performance) || {};
    liveData.fundamentals = (payload.data && payload.data.fundamentals) || {};
    liveData.cache = payload.cache || payload.coverage || {};
    liveData.lastDashboardRefresh = payload.generatedAt || new Date().toISOString();
    liveData.lastQuoteRefresh = (payload.cache && payload.cache.quotes && payload.cache.quotes.savedAt) || liveData.lastDashboardRefresh;
    liveData.lastPerformanceRefresh = (payload.cache && payload.cache.performance && payload.cache.performance.savedAt) || liveData.lastDashboardRefresh;
    liveData.lastFundamentalsRefresh = (payload.cache && payload.cache.fundamentals && payload.cache.fundamentals.savedAt) || liveData.lastDashboardRefresh;
    liveData.snapshotSaved = true;

    saveJson(STORAGE.live, liveData);
    setLiveStatus("Connected");
    renderHome();
    renderStocks();
    updateLiveStatus();
    if (document.querySelector('[data-panel="history"]').classList.contains("active")) {
      loadHistoryData(false);
      loadRefreshLogData(false);
    }
  } catch (error) {
    setLiveStatus("Error: " + (error.message || "Refresh failed"));
  } finally {
    if (els.refreshNow) { els.refreshNow.disabled = false; els.refreshNow.textContent = "Refresh Now"; }
  }
}

async function forcePriceRefresh() {
  const workerUrl = sanitizeWorkerUrl(liveSettings.workerUrl || DEFAULT_WORKER_URL);
  if (!workerUrl) { setLiveStatus("Missing Worker URL"); return; }
  if (els.forcePriceRefresh) { els.forcePriceRefresh.disabled = true; els.forcePriceRefresh.textContent = "Forcing..."; }
  setLiveStatus("Forcing latest prices...");
  try {
    const symbols = stocks.map(stock => stock.ticker).join(",");
    const url = `${workerUrl}/api/quotes?symbols=${encodeURIComponent(symbols)}&force=1`;
    const payload = await fetchJsonFromUrl(url);
    if (!payload.ok) throw new Error(payload.error || "Price refresh failed.");
    liveData.quotes = { ...currentMarketQuotes(), ...(payload.data || {}) };
    liveData.lastQuoteRefresh = payload.generatedAt || new Date().toISOString();
    if (!liveData.cache || typeof liveData.cache !== "object") liveData.cache = {};
    liveData.cache.quotes = payload.coverage || { filled: Object.keys(liveData.quotes).length, total: stocks.length };
    saveJson(STORAGE.live, liveData);
    setLiveStatus("Prices refreshed");
    renderHome();
    renderStocks();
    updateLiveStatus();
  } catch (error) {
    setLiveStatus("Price error: " + (error.message || "Refresh failed"));
  } finally {
    if (els.forcePriceRefresh) { els.forcePriceRefresh.disabled = false; els.forcePriceRefresh.textContent = "Force Price Refresh"; }
  }
}

async function refreshMarketData() {
  const workerUrl = sanitizeWorkerUrl(liveSettings.workerUrl || DEFAULT_WORKER_URL);
  if (!workerUrl) { setLiveStatus("Missing Worker URL"); return; }
  if (!marketAssets.length) { setLiveStatus("No market assets configured"); return; }
  if (els.refreshMarkets) { els.refreshMarkets.disabled = true; els.refreshMarkets.textContent = "Refreshing markets..."; }
  setLiveStatus("Refreshing broad markets...");
  try {
    const symbols = marketAssets.map(asset => asset.ticker).join(",");
    const url = `${workerUrl}/api/quotes?symbols=${encodeURIComponent(symbols)}`;
    const payload = await fetchJsonFromUrl(url);
    if (!payload.ok) throw new Error(payload.error || "Market refresh failed.");
    liveData.quotes = { ...(liveData.quotes || {}), ...((payload.data && typeof payload.data === "object") ? payload.data : {}) };
    liveData.lastQuoteRefresh = payload.generatedAt || new Date().toISOString();
    if (!liveData.cache || typeof liveData.cache !== "object") liveData.cache = {};
    liveData.cache.marketQuotes = marketQuoteCoverage(liveData.quotes);
    liveData.cache.marketQuotes.workerLimited = Array.isArray(payload.symbols) && payload.symbols.length < marketAssets.length;
    saveJson(STORAGE.live, liveData);
    const coverage = liveData.cache.marketQuotes;
    setLiveStatus(coverage.workerLimited ? `Deploy Worker for markets ${coverage.filled}/${coverage.total}` : coverage.filled === coverage.total ? "Markets refreshed" : `Markets partial ${coverage.filled}/${coverage.total}`);
    renderHome();
    updateLiveStatus();
  } catch (error) {
    setLiveStatus("Market error: " + (error.message || "Refresh failed"));
  } finally {
    if (els.refreshMarkets) { els.refreshMarkets.disabled = false; els.refreshMarkets.textContent = "Refresh Markets"; }
  }
}

function saveWorkerUrl() {
  liveSettings.workerUrl = sanitizeWorkerUrl(els.workerUrlInput.value) || DEFAULT_WORKER_URL;
  els.workerUrlInput.value = liveSettings.workerUrl;
  saveLiveSettings(); updateLiveStatus();
}

function clearLiveCache() {
  liveData = { quotes: {}, performance: {}, fundamentals: {}, cache: {}, lastDashboardRefresh: null, lastQuoteRefresh: null, lastPerformanceRefresh: null, lastFundamentalsRefresh: null, snapshotSaved: false };
  saveJson(STORAGE.live, liveData);
  renderHome(); renderStocks(); updateLiveStatus(); setLiveStatus("Live cache cleared");
}

function configureAutoRefresh() {
  window.clearInterval(autoRefreshTimer);
  if (liveSettings.autoRefresh) {
    autoRefreshTimer = window.setInterval(() => refreshLiveData(false), 15 * 60 * 1000);
  }
}

function saveLiveSettings() { saveJson(STORAGE.liveSettings, liveSettings); configureAutoRefresh(); }
function setLiveStatus(message) { els.liveStatus.textContent = message; }
function updateLiveStatus() {
  els.workerUrlInput.value = liveSettings.workerUrl || DEFAULT_WORKER_URL;
  els.autoRefreshToggle.checked = Boolean(liveSettings.autoRefresh);
  if (els.lastDashboardRefresh) els.lastDashboardRefresh.textContent = formatDateTime(liveData.lastDashboardRefresh);
  els.lastQuoteRefresh.textContent = formatDateTime(liveData.lastQuoteRefresh);
  if (els.quoteCacheAge) els.quoteCacheAge.textContent = quoteCacheAgeText();
  if (els.nextQuoteRefresh) els.nextQuoteRefresh.textContent = nextQuoteRefreshText();
  if (els.marketCoverage) els.marketCoverage.textContent = marketCoverageText();
  els.lastPerformanceRefresh.textContent = formatDateTime(liveData.lastPerformanceRefresh);
  if (els.lastFundamentalsRefresh) els.lastFundamentalsRefresh.textContent = formatDateTime(liveData.lastFundamentalsRefresh);
  if (els.quotesCoverage) els.quotesCoverage.textContent = coverageText(liveData.cache && liveData.cache.quotes);
  if (els.quotesMissing) els.quotesMissing.textContent = coverageMissingText(liveData.cache && liveData.cache.quotes);
  if (els.performanceCoverage) els.performanceCoverage.textContent = coverageText(liveData.cache && liveData.cache.performance);
  if (els.performanceMissing) els.performanceMissing.textContent = coverageMissingText(liveData.cache && liveData.cache.performance);
  if (els.fundamentalsCoverage) els.fundamentalsCoverage.textContent = coverageText(liveData.cache && liveData.cache.fundamentals);
  if (els.fundamentalsMissing) els.fundamentalsMissing.textContent = coverageMissingText(liveData.cache && liveData.cache.fundamentals);
  if (els.cacheStatus) els.cacheStatus.textContent = cacheStatusText(liveData.cache);
  if (els.snapshotStatus) els.snapshotStatus.textContent = liveData.snapshotSaved ? "Saved to KV" : "—";
  if (!els.liveStatus.textContent || els.liveStatus.textContent === "Not connected") els.liveStatus.textContent = liveData.lastQuoteRefresh ? "Connected" : "Not connected";
}

async function loadHistoryData(showStatus = true) {
  const workerUrl = sanitizeWorkerUrl(liveSettings.workerUrl || DEFAULT_WORKER_URL);
  if (!workerUrl) return;
  try {
    if (showStatus) setLiveStatus("Loading history...");
    const payload = await fetchJsonFromUrl(`${workerUrl}/api/history?days=30`);
    historyState.snapshots = Array.isArray(payload.items) ? payload.items : (Array.isArray(payload.data) ? payload.data : []);
    renderHistory();
    if (showStatus) setLiveStatus("History loaded");
  } catch (error) {
    if (showStatus) setLiveStatus("History error: " + (error.message || "Could not load history"));
  }
}

async function loadRefreshLogData(showStatus = true) {
  const workerUrl = sanitizeWorkerUrl(liveSettings.workerUrl || DEFAULT_WORKER_URL);
  if (!workerUrl) return;
  try {
    if (showStatus) setLiveStatus("Loading refresh log...");
    const payload = await fetchJsonFromUrl(`${workerUrl}/api/refresh-log?limit=60`);
    historyState.refreshLog = Array.isArray(payload.items) ? payload.items : (Array.isArray(payload.data) ? payload.data : []);
    renderRefreshLog();
    if (showStatus) setLiveStatus("Refresh log loaded");
  } catch (error) {
    if (showStatus) setLiveStatus("Log error: " + (error.message || "Could not load refresh log"));
  }
}

function renderHistory() {
  const latest = historyState.snapshots[0];
  populateHistoryTickerSelect();
  if (!latest) {
    els.historySnapshotDate.textContent = "No snapshot";
    els.historySymbolCount.textContent = "—";
    els.historySavedAt.textContent = "Never";
    els.historyInsights.innerHTML = insightCardHtml("No history yet", "Refresh Now", "Then tap Load History");
    renderHistoryCoverage(null);
    els.selectedHistorySummary.innerHTML = insightCardHtml("Select a stock", "—", "No snapshots yet");
    els.selectedHistoryRows.innerHTML = `<tr><td colspan="6">No history loaded yet.</td></tr>`;
    return;
  }
  const data = latest.data || {};
  const entries = Object.entries(data).map(([ticker, row]) => ({ ticker, ...row }));
  els.historySnapshotDate.textContent = latest.date || "—";
  els.historySymbolCount.textContent = `${entries.length} symbols`;
  els.historySavedAt.textContent = formatDateTime(latest.generatedAt);
  renderHistoryCoverage(latest);

  const topReturn = bestBy(entries, row => parsePercentValue(row.sixMonthReturn));
  const worstReturn = worstBy(entries, row => parsePercentValue(row.sixMonthReturn));
  const topRel = bestBy(entries, row => parsePercentValue(row.relativeStrengthVsQqq));
  const worstRel = worstBy(entries, row => parsePercentValue(row.relativeStrengthVsQqq));
  const topRevenue = bestBy(entries, row => parsePercentValue(row.revenueGrowth));
  const highestPs = bestBy(entries, row => Number(row.psRatioRaw));
  els.historyInsights.innerHTML = [
    insightCardHtml("Best 6M return", topReturn ? topReturn.sixMonthReturn : "—", topReturn ? topReturn.ticker : "—"),
    insightCardHtml("Weakest 6M return", worstReturn ? worstReturn.sixMonthReturn : "—", worstReturn ? worstReturn.ticker : "—"),
    insightCardHtml("Best vs QQQ", topRel ? topRel.relativeStrengthVsQqq : "—", topRel ? topRel.ticker : "—"),
    insightCardHtml("Weakest vs QQQ", worstRel ? worstRel.relativeStrengthVsQqq : "—", worstRel ? worstRel.ticker : "—"),
    insightCardHtml("Top revenue growth", topRevenue ? topRevenue.revenueGrowth : "—", topRevenue ? topRevenue.ticker : "—"),
    insightCardHtml("Highest P/S", highestPs ? highestPs.psRatio : "—", highestPs ? highestPs.ticker : "—")
  ].join("");

  renderSelectedStockHistory();
}

function populateHistoryTickerSelect() {
  if (!els.historyTickerSelect) return;
  const current = historyState.selectedTicker || "IONQ";
  els.historyTickerSelect.innerHTML = stocks.map(stock => `<option value="${escapeAttr(stock.ticker)}">${escapeHtml(stock.ticker)} · ${escapeHtml(stock.company)}</option>`).join("");
  els.historyTickerSelect.value = stocks.some(stock => stock.ticker === current) ? current : stocks[0].ticker;
  historyState.selectedTicker = els.historyTickerSelect.value;
}

function renderHistoryCoverage(latest) {
  if (!els.historySymbolCoverage) return;

  const latestData = latest && latest.data ? latest.data : {};
  const savedTickers = new Set(Object.keys(latestData));
  const savedCount = stocks.filter(stock => savedTickers.has(stock.ticker)).length;
  const missingCount = stocks.length - savedCount;

  if (els.historyCoverageCount) els.historyCoverageCount.textContent = `${savedCount}/${stocks.length}`;
  if (els.historyMissingCount) els.historyMissingCount.textContent = String(missingCount);

  els.historySymbolCoverage.innerHTML = stocks.map(stock => {
    const saved = savedTickers.has(stock.ticker);
    const active = stock.ticker === historyState.selectedTicker;
    return `<button class="history-symbol-button ${saved ? "" : "missing"} ${active ? "active" : ""}" type="button" data-history-ticker="${escapeAttr(stock.ticker)}">${escapeHtml(stock.ticker)}</button>`;
  }).join("");

  if (!latest) {
    els.historyCoverageNote.textContent = "No snapshot loaded yet.";
  } else if (missingCount === 0) {
    els.historyCoverageNote.textContent = "All 38 stocks are saved in the latest snapshot.";
  } else {
    els.historyCoverageNote.textContent = `${missingCount} stocks are missing from the latest snapshot. Go to Settings → Live Data → Refresh Now to save a full 38-stock snapshot, then tap Load History.`;
  }
}

function renderSelectedStockHistory() {
  const ticker = historyState.selectedTicker || "IONQ";
  const rows = historyState.snapshots.map(snapshot => ({ date: snapshot.date, generatedAt: snapshot.generatedAt, ...(snapshot.data && snapshot.data[ticker] ? snapshot.data[ticker] : {}) })).filter(row => row.priceRaw || row.sixMonthReturn || row.psRatio);
  const latestSnapshot = historyState.snapshots[0];
  const isInLatestSnapshot = Boolean(latestSnapshot && latestSnapshot.data && latestSnapshot.data[ticker]);
  const latest = rows[0] || {};
  els.selectedHistorySummary.innerHTML = [
    insightCardHtml(`${ticker} latest price`, latest.livePrice || "—", latest.dayChange || (isInLatestSnapshot ? "Saved" : "Missing from latest snapshot")),
    insightCardHtml("6M return", latest.sixMonthReturn || "—", latest.relativeStrengthVsQqq ? `Rel QQQ ${latest.relativeStrengthVsQqq}` : "Relative strength"),
    insightCardHtml("P/S ratio", latest.psRatio || "—", latest.revenueGrowth ? `Revenue ${latest.revenueGrowth}` : "Fundamentals"),
    insightCardHtml("Market cap", latest.marketCap || "—", latest.volume || "Volume")
  ].join("");
  els.selectedHistoryRows.innerHTML = rows.length ? rows.map(row => `<tr><td>${escapeHtml(row.date || "—")}</td><td>${escapeHtml(row.livePrice || "—")}</td><td>${escapeHtml(row.sixMonthReturn || "—")}</td><td>${escapeHtml(row.relativeStrengthVsQqq || "—")}</td><td>${escapeHtml(row.psRatio || "—")}</td><td>${escapeHtml(row.revenueGrowth || "—")}</td></tr>`).join("") : `<tr><td colspan="6">No saved snapshots for ${escapeHtml(ticker)} yet. Refresh all 38 stocks in Settings, then load History again.</td></tr>`;
}

function renderRefreshLog() {
  if (historyState.refreshLog.length) {
    els.refreshLogList.innerHTML = historyState.refreshLog.map(refreshLogItemHtml).join("");
    return;
  }
  if (!historyState.refreshLog.length) {
    els.refreshLogList.innerHTML = `<div class="meta">No refresh activity loaded yet.</div>`;
    return;
  }
  els.refreshLogList.innerHTML = historyState.refreshLog.map(item => `<div class="refresh-log-item"><strong>${escapeHtml(item.type || "refresh")} · ${escapeHtml(item.provider || "provider")}</strong><span>${escapeHtml(formatDateTime(item.refreshedAt))} · ${escapeHtml(String(item.symbolCount || 0))} symbols · ${item.force ? "forced refresh" : "scheduled/cache refresh"}</span><span>${escapeHtml((item.symbols || []).slice(0, 12).join(", "))}${(item.symbols || []).length > 12 ? "…" : ""}</span></div>`).join("");
}

function refreshLogItemHtml(item) {
  const time = item.at || item.refreshedAt || item.generatedAt;
  const symbolText = refreshSymbolsText(item);
  const rows = ["quotes", "performance", "fundamentals"].map(type => {
    const refresh = item.refresh && item.refresh[type] ? item.refresh[type] : null;
    const coverage = item.coverage && item.coverage[type] ? item.coverage[type] : null;
    if (!refresh && !coverage && item.type && item.type !== type) return "";
    return `<span>${escapeHtml(refreshProviderLabel(type))}: ${escapeHtml(refreshTypeSummary(refresh, item))} - ${escapeHtml(coverageSummary(coverage))}</span>`;
  }).filter(Boolean).join("");
  const fallbackRows = rows || `<span>${escapeHtml(item.type || "refresh")}: ${escapeHtml(item.provider || "provider")} - ${escapeHtml(item.force ? "forced refresh" : "scheduled/cache refresh")}</span>`;
  return `<div class="refresh-log-item"><strong>${escapeHtml(formatDateTime(time))} - ${escapeHtml(symbolText)}</strong>${fallbackRows}</div>`;
}

function refreshProviderLabel(type) {
  const labels = { quotes: "Quotes / Finnhub", performance: "Performance / Tiingo", fundamentals: "Fundamentals / Finnhub" };
  return labels[type] || type;
}

function refreshTypeSummary(refresh, item) {
  if (refresh && Number.isFinite(Number(refresh.refreshed))) return `${refresh.refreshed} refreshed`;
  if (refresh && Number.isFinite(Number(refresh.fromKv))) return `${refresh.fromKv} from cache`;
  if (item.force) return "forced refresh";
  return "smart cache";
}

function coverageSummary(coverage) {
  if (!coverage || !Number.isFinite(Number(coverage.total))) return "coverage not reported";
  const filled = Number.isFinite(Number(coverage.filled)) ? Number(coverage.filled) : 0;
  const total = Number(coverage.total);
  const missing = Array.isArray(coverage.missing) ? coverage.missing.length : Math.max(0, total - filled);
  return missing ? `${filled}/${total} filled, ${missing} missing` : `${filled}/${total} filled`;
}

function refreshSymbolsText(item) {
  if (Array.isArray(item.symbols) && item.symbols.length) {
    const preview = item.symbols.slice(0, 12).join(", ");
    return item.symbols.length > 12 ? `${preview} +${item.symbols.length - 12} more` : preview;
  }
  const count = Number(item.symbolCount);
  return Number.isFinite(count) && count > 0 ? `${count} symbols attempted` : "symbols not reported";
}

function insightCardHtml(label, value, sub) {
  return `<div class="insight-card"><span class="mini-label">${escapeHtml(label)}</span><span class="big-value">${escapeHtml(value || "—")}</span><span class="sub-value">${escapeHtml(sub || "")}</span></div>`;
}

function cacheStatusText(cache) {
  if (!cache) return "—";
  const parts = ["quotes", "performance", "fundamentals"].map(key => {
    const item = cache[key] || {};
    if (item.refreshed) return `${key}: refreshed`;
    if (item.fromKv) return `${key}: KV`;
    return `${key}: —`;
  });
  return parts.join(" · ");
}

function coverageText(item) {
  if (!item || !Number.isFinite(Number(item.total))) return "Not loaded";
  const filled = Number.isFinite(Number(item.filled)) ? Number(item.filled) : 0;
  const total = Number(item.total);
  const missing = Array.isArray(item.missing) ? item.missing.length : Math.max(0, total - filled);
  return missing ? `${filled}/${total} (${missing} missing)` : `${filled}/${total}`;
}

function coverageMissingText(item) {
  if (!item || !Number.isFinite(Number(item.total))) return "Not loaded";
  const missing = Array.isArray(item.missing) ? item.missing.filter(Boolean) : [];
  if (missing.length) return missing.join(", ");
  const filled = Number.isFinite(Number(item.filled)) ? Number(item.filled) : 0;
  const total = Number(item.total);
  const missingCount = Math.max(0, total - filled);
  return missingCount ? `${missingCount} missing, tickers not reported` : "None";
}

function marketCoverageText() {
  if (!marketAssets.length) return "Not configured";
  const cached = liveData.cache && liveData.cache.marketQuotes;
  if (cached && Number(cached.total) === marketAssets.length) return cached.workerLimited ? `${coverageText(cached)} - deploy Worker` : coverageText(cached);
  const derived = marketQuoteCoverage(liveData.quotes);
  return derived.filled ? coverageText(derived) : "Refresh markets";
}


/* =========================================================
   7. CSV
   ========================================================= */
function exportStocksCsv() {
  const headers = ["ticker", "company", "exchange", "category", "risk", "valuation", "watchlists", "quantumThesis", "aiDataCenterRelevance", ...EDITABLE_FIELDS, "yahoo", "tradingView"];
  const rows = stocks.map(base => {
    const stock = getMergedStock(base.ticker);
    return [stock.ticker, stock.company, stock.exchange, stock.category, stock.risk, stock.valuation, getStockWatchlists(stock.ticker).join("; "), stock.thesis, stock.aiData, ...EDITABLE_FIELDS.map(field => stock[field] || ""), yahooUrl(stock.ticker), tradingViewUrl(stock.ticker)];
  });
  downloadCsv("quantum-dashboard-stocks.csv", [headers, ...rows]);
}

function exportWatchlistsCsv() {
  const headers = ["watchlist", "note", "position", "ticker", "company", "category", "risk", "valuation"];
  const rows = [];
  watchlists.forEach(list => parseTickerList(list.tickers.join(",")).forEach((ticker, index) => {
    const stock = stocks.find(s => s.ticker === ticker) || {};
    rows.push([list.title, list.note || "", index + 1, ticker, stock.company || "", stock.category || "", stock.risk || "", stock.valuation || ""]);
  }));
  downloadCsv("quantum-dashboard-watchlists.csv", [headers, ...rows]);
}

function importStocksCsv(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rows = parseCsv(String(reader.result || ""));
      const headers = rows[0].map(normalizeHeader);
      const tickerIndex = headers.indexOf("ticker");
      if (tickerIndex === -1) throw new Error("CSV must include ticker column.");
      const fieldIndexes = {};
      EDITABLE_FIELDS.forEach(field => { const index = headers.indexOf(normalizeHeader(field)); if (index !== -1) fieldIndexes[field] = index; });
      rows.slice(1).forEach(row => {
        const ticker = String(row[tickerIndex] || "").trim().toUpperCase();
        if (!stocks.some(stock => stock.ticker === ticker)) return;
        const next = manualEdits[ticker] || {};
        Object.entries(fieldIndexes).forEach(([field, index]) => { next[field] = String(row[index] || "").trim(); });
        manualEdits[ticker] = next;
      });
      saveJson(STORAGE.edits, manualEdits); renderStocks();
    } catch (error) { alert(error.message || "Could not import CSV."); }
    finally { els.importCsv.value = ""; }
  };
  reader.readAsText(file);
}

/* =========================================================
   8. Helpers
   ========================================================= */
function openModal(modal) { modal.classList.add("active"); modal.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; }
function closeModal(modal) { modal.classList.remove("active"); modal.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }
function showStartupError(error) { if (els.startupError) { els.startupError.style.display = "block"; els.startupError.textContent = "Dashboard startup error: " + (error.message || error); } }
function loadJson(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(fallback)); } catch { return JSON.parse(JSON.stringify(fallback)); } }
function saveJson(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { alert("Could not save locally. Browser storage may be full or blocked."); } }
function unique(values) { return [...new Set(values)]; }
function className(value) { return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function parseTickerList(value) { return unique(String(value || "").split(/[,:;\s]+/).map(t => t.trim().toUpperCase()).filter(t => /^[A-Z0-9.]{1,8}$/.test(t) && stocks.some(s => s.ticker === t))); }
function getStockWatchlists(ticker) { return watchlists.filter(list => parseTickerList(list.tickers.join(",")).includes(ticker)).map(list => list.title); }
function yahooUrl(ticker) { return `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`; }
function tradingViewUrl(ticker) { return `https://www.tradingview.com/search/?query=${encodeURIComponent(ticker)}`; }
function sanitizeWorkerUrl(value) { return String(value || "").trim().replace(/\/+$/, ""); }
async function fetchJsonFromUrl(url, options = {}) { const response = await fetch(url, options); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`); return payload; }
function formatDateTime(value) { if (!value) return "Never"; const date = new Date(value); if (Number.isNaN(date.getTime())) return "Never"; return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
function getQuoteUpdatedAt(ticker) { return liveData && liveData.quotes && liveData.quotes[ticker] ? liveData.quotes[ticker].updatedAt : null; }
function quoteCacheAgeText() { const time = latestQuoteTime(); if (!time) return "—"; const minutes = Math.max(0, Math.floor((Date.now() - new Date(time).getTime()) / 60000)); return minutes < 1 ? "Just now" : `${minutes} min old`; }
function nextQuoteRefreshText() { const time = latestQuoteTime(); if (!time) return "Now"; const next = new Date(new Date(time).getTime() + 15 * 60 * 1000); const remaining = Math.ceil((next.getTime() - Date.now()) / 60000); return remaining <= 0 ? "Now" : `${formatDateTime(next.toISOString())} (${remaining} min)`; }
function latestQuoteTime() {
  const times = Object.values((liveData && liveData.quotes) || {}).map(row => row && row.updatedAt).filter(Boolean);
  if (times.length) return times.sort((a, b) => new Date(b) - new Date(a))[0];
  return liveData.lastQuoteRefresh;
}
function hasQuoteData(row) {
  if (!row || typeof row !== "object") return false;
  return ["livePrice", "dayChange", "updatedAt"].some(key => hasDisplayValue(row[key]));
}
function hasDisplayValue(value) {
  const text = String(value ?? "").trim().toLowerCase();
  return Boolean(text) && !["—", "-", "n/a", "na", "not loaded", "refresh data", "never"].includes(text);
}
function marketQuoteCoverage(quotes = liveData.quotes) {
  const missing = marketAssets.filter(asset => !hasQuoteData(quotes && quotes[asset.ticker])).map(asset => asset.ticker);
  return { total: marketAssets.length, filled: marketAssets.length - missing.length, missing };
}
function parsePercentValue(value) {
  if (!hasDisplayValue(value)) return NaN;
  const text = String(value).trim();
  const percentMatch = text.match(/([-+]?\d+(?:\.\d+)?)\s*%/);
  const n = percentMatch ? Number(percentMatch[1]) : Number(text.replace(/[%+,]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}
function averagePercentText(values) { const valid = values.filter(Number.isFinite); if (!valid.length) return "Refresh data"; const average = valid.reduce((sum, value) => sum + value, 0) / valid.length; return `${average >= 0 ? "+" : ""}${average.toFixed(1)}%`; }
function bestBy(items, getter) { return items.filter(item => Number.isFinite(getter(item))).sort((a,b) => getter(b) - getter(a))[0] || null; }
function worstBy(items, getter) { return items.filter(item => Number.isFinite(getter(item))).sort((a,b) => getter(a) - getter(b))[0] || null; }
function downloadCsv(filename, rows) { const csv = rows.map(row => row.map(csvEscape).join(",")).join("\n"); const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function csvEscape(value) { const text = String(value ?? ""); return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
function parseCsv(text) { const rows = []; let row = [], field = "", inQuotes = false; for (let i = 0; i < text.length; i++) { const char = text[i], next = text[i + 1]; if (char === '"') { if (inQuotes && next === '"') { field += '"'; i++; } else inQuotes = !inQuotes; } else if (char === "," && !inQuotes) { row.push(field); field = ""; } else if ((char === "\n" || char === "\r") && !inQuotes) { if (char === "\r" && next === "\n") i++; row.push(field); rows.push(row); row = []; field = ""; } else field += char; } if (field !== "" || row.length) { row.push(field); rows.push(row); } return rows.filter(r => r.some(cell => String(cell).trim() !== "")); }
function normalizeHeader(value) { return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, ""); }
function escapeHtml(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;"); }
function escapeAttr(value) { return escapeHtml(value); }
