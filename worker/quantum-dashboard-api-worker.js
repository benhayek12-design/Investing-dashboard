const FINNHUB_BASE = "https://finnhub.io/api/v1";
const TIINGO_BASE = "https://api.tiingo.com/tiingo/daily";

const QUOTE_CACHE_SECONDS = 15 * 60;
const PERFORMANCE_CACHE_SECONDS = 24 * 60 * 60;
const FUNDAMENTALS_CACHE_SECONDS = 12 * 60 * 60;

// These budgets protect free API limits. Repeated Refresh Now calls backfill missing data.
const QUOTE_REFRESH_BUDGET = 38;
const PERFORMANCE_REFRESH_BUDGET = 38;
const FUNDAMENTALS_REFRESH_BUDGET = 12;
const MAX_SYMBOLS = 50;
const HISTORY_LOG_LIMIT = 100;
const USER_DATA_KEY = "user-data:v1";
const USER_DATA_MAX_BYTES = 200000;

const DASHBOARD_SYMBOLS = [
  "IONQ", "RGTI", "QBTS", "QUBT", "LAES", "HON",
  "IBM", "GOOGL", "MSFT", "AMZN", "NVDA", "INTC",
  "TSM", "ASML", "AMAT", "LRCX", "KLAC", "SKYT", "MU", "TSEM",
  "COHR", "LITE", "IPGP", "MKSI",
  "VRT", "ETN", "SMCI", "CEG", "TLN", "DHR", "SYK",
  "PANW", "CRWD", "FTNT", "ZS", "CSCO",
  "QTUM", "ARKQ"
];

const ALLOWED_SYMBOLS = new Set([...DASHBOARD_SYMBOLS, "QQQ"]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-QSD-SYNC-TOKEN"
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
    if (!["GET", "POST"].includes(request.method)) return jsonResponse({ ok: false, error: "Only GET and POST requests are supported." }, 405);

    const url = new URL(request.url);

    try {
      if (url.pathname === "/" || url.pathname === "/api/health") {
        return jsonResponse({
          ok: true,
          service: "Quantum Stock Dashboard API",
          version: "smart-cache-v1",
          quoteProvider: "Finnhub",
          performanceProvider: "Tiingo",
          fundamentalsProvider: "Finnhub",
          storage: env.QSD_KV ? "Cloudflare KV" : "No KV binding",
          hasFinnhubApiKey: Boolean(env.FINNHUB_API_KEY),
          hasTiingoApiKey: Boolean(env.TIINGO_API_KEY),
          hasKvBinding: Boolean(env.QSD_KV),
          hasUserSyncToken: Boolean(env.USER_SYNC_TOKEN),
          budgets: {
            quotes: QUOTE_REFRESH_BUDGET,
            performance: PERFORMANCE_REFRESH_BUDGET,
            fundamentals: FUNDAMENTALS_REFRESH_BUDGET
          },
          generatedAt: new Date().toISOString()
        });
      }

      if (url.pathname === "/api/user-data") {
        requireUserSyncToken(request, env);
        if (!env.QSD_KV) throw new Error("Missing Cloudflare KV binding named QSD_KV.");

        if (request.method === "GET") {
          const data = await kvGetJson(env, USER_DATA_KEY);
          return jsonResponse({ ok: true, type: "user-data", data: data || null });
        }

        const payload = await readJsonBody(request);
        const savedAt = new Date().toISOString();
        const data = sanitizeUserData(payload && payload.data ? payload.data : payload, savedAt);
        await kvPutJson(env, USER_DATA_KEY, data);
        return jsonResponse({ ok: true, type: "user-data", savedAt, data });
      }

      if (request.method !== "GET") return jsonResponse({ ok: false, error: "Only /api/user-data supports POST requests." }, 405);

      if (url.pathname === "/api/dashboard") {
        requireSecret(env.FINNHUB_API_KEY, "FINNHUB_API_KEY");
        requireSecret(env.TIINGO_API_KEY, "TIINGO_API_KEY");
        const symbols = getSymbols(url, DASHBOARD_SYMBOLS);
        const force = url.searchParams.get("force") === "1";
        const saveHistory = url.searchParams.get("saveHistory") !== "0";
        const payload = await getDashboardPayload(symbols, env, ctx, force, saveHistory);
        return jsonResponse(payload, 200, QUOTE_CACHE_SECONDS);
      }

      if (url.pathname === "/api/quotes") {
        requireSecret(env.FINNHUB_API_KEY, "FINNHUB_API_KEY");
        const symbols = getSymbols(url, DASHBOARD_SYMBOLS);
        const force = url.searchParams.get("force") === "1";
        const result = await getDatasetSmart({
          env, ctx, type: "quotes", symbols, force,
          ttlSeconds: QUOTE_CACHE_SECONDS,
          budget: QUOTE_REFRESH_BUDGET,
          producer: (batch) => getQuotes(batch, env.FINNHUB_API_KEY)
        });
        return jsonResponse(result.payload, 200, QUOTE_CACHE_SECONDS);
      }

      if (url.pathname === "/api/performance") {
        requireSecret(env.TIINGO_API_KEY, "TIINGO_API_KEY");
        const symbols = getSymbols(url, DASHBOARD_SYMBOLS);
        const force = url.searchParams.get("force") === "1";
        const result = await getDatasetSmart({
          env, ctx, type: "performance", symbols, force,
          ttlSeconds: PERFORMANCE_CACHE_SECONDS,
          budget: PERFORMANCE_REFRESH_BUDGET,
          producer: (batch) => getPerformance(batch, env.TIINGO_API_KEY)
        });
        return jsonResponse(result.payload, 200, PERFORMANCE_CACHE_SECONDS);
      }

      if (url.pathname === "/api/fundamentals") {
        requireSecret(env.FINNHUB_API_KEY, "FINNHUB_API_KEY");
        const symbols = getSymbols(url, DASHBOARD_SYMBOLS);
        const force = url.searchParams.get("force") === "1";
        const result = await getDatasetSmart({
          env, ctx, type: "fundamentals", symbols, force,
          ttlSeconds: FUNDAMENTALS_CACHE_SECONDS,
          budget: FUNDAMENTALS_REFRESH_BUDGET,
          producer: (batch) => getFundamentals(batch, env.FINNHUB_API_KEY)
        });
        return jsonResponse(result.payload, 200, FUNDAMENTALS_CACHE_SECONDS);
      }

      if (url.pathname === "/api/refresh-log") {
        const log = await readRefreshLog(env);
        return jsonResponse({ ok: true, type: "refresh-log", count: log.length, data: log });
      }

      if (url.pathname === "/api/history") {
        const days = clampInt(url.searchParams.get("days"), 1, 90, 30);
        const snapshots = await readDailyHistory(env, days);
        return jsonResponse({ ok: true, type: "history", days, count: snapshots.length, data: snapshots });
      }

      return jsonResponse({ ok: false, error: "Unknown endpoint." }, 404);
    } catch (error) {
      return jsonResponse({ ok: false, error: error.message || "Worker error." }, 500);
    }
  },

  async scheduled(controller, env, ctx) {
    if (!env.FINNHUB_API_KEY || !env.TIINGO_API_KEY) return;
    ctx.waitUntil(getDashboardPayload(DASHBOARD_SYMBOLS, env, ctx, false, true));
  }
};

async function getDashboardPayload(symbols, env, ctx, force, saveHistory) {
  const [quotesResult, performanceResult, fundamentalsResult] = await Promise.all([
    getDatasetSmart({
      env, ctx, type: "quotes", symbols, force,
      ttlSeconds: QUOTE_CACHE_SECONDS,
      budget: QUOTE_REFRESH_BUDGET,
      producer: (batch) => getQuotes(batch, env.FINNHUB_API_KEY)
    }),
    getDatasetSmart({
      env, ctx, type: "performance", symbols, force,
      ttlSeconds: PERFORMANCE_CACHE_SECONDS,
      budget: PERFORMANCE_REFRESH_BUDGET,
      producer: (batch) => getPerformance(batch, env.TIINGO_API_KEY)
    }),
    getDatasetSmart({
      env, ctx, type: "fundamentals", symbols, force,
      ttlSeconds: FUNDAMENTALS_CACHE_SECONDS,
      budget: FUNDAMENTALS_REFRESH_BUDGET,
      producer: (batch) => getFundamentals(batch, env.FINNHUB_API_KEY)
    })
  ]);

  const payload = {
    ok: true,
    type: "dashboard",
    generatedAt: new Date().toISOString(),
    symbols,
    providers: { quotes: "Finnhub", performance: "Tiingo", fundamentals: "Finnhub" },
    coverage: {
      quotes: coverageFor(symbols, quotesResult.data),
      performance: coverageFor(symbols, performanceResult.data),
      fundamentals: coverageFor(symbols, fundamentalsResult.data)
    },
    refresh: {
      quotes: quotesResult.refresh,
      performance: performanceResult.refresh,
      fundamentals: fundamentalsResult.refresh
    },
    data: {
      quotes: quotesResult.data,
      performance: performanceResult.data,
      fundamentals: fundamentalsResult.data
    }
  };

  if (saveHistory) {
    await saveRefreshLog(env, payload);
    await saveDailySnapshot(env, payload);
  }

  return payload;
}

async function getDatasetSmart({ env, ctx, type, symbols, force, ttlSeconds, budget, producer }) {
  const now = new Date().toISOString();
  const existing = await readSymbolRecords(env, type, symbols);

  const staleOrMissing = symbols.filter(symbol => {
    const record = existing[symbol];
    if (!record || !record.savedAt || !record.data) return true;
    if (hasUsefulData(record.data) && !force && !isStale(record.savedAt, ttlSeconds)) return false;
    if (hasUsefulData(record.data) && type !== "quotes" && force) return false; // avoid burning daily APIs unnecessarily
    return true;
  });

  const toRefresh = staleOrMissing.slice(0, budget);
  const skippedDueBudget = staleOrMissing.slice(budget);
  let refreshedSymbols = [];
  let failedSymbols = [];

  if (toRefresh.length) {
    const freshPayload = await producer(toRefresh);
    const freshData = freshPayload.data || {};

    for (const symbol of toRefresh) {
      const next = freshData[symbol];
      if (hasUsefulData(next)) {
        existing[symbol] = { savedAt: now, data: next };
        refreshedSymbols.push(symbol);
        await writeSymbolRecord(env, type, symbol, existing[symbol]);
      } else {
        failedSymbols.push(symbol);
        // Keep previous usable data if available. Do not overwrite good data with errors/blanks.
        if (!existing[symbol] || !hasUsefulData(existing[symbol].data)) {
          existing[symbol] = { savedAt: now, data: next || { error: "No usable data returned." } };
          await writeSymbolRecord(env, type, symbol, existing[symbol]);
        }
      }
    }
  }

  const data = {};
  for (const symbol of symbols) {
    if (existing[symbol] && existing[symbol].data) data[symbol] = existing[symbol].data;
  }

  return {
    data,
    payload: datasetPayload(type, symbols, data),
    refresh: {
      type,
      ttlSeconds,
      requested: symbols.length,
      staleOrMissing: staleOrMissing.length,
      attempted: toRefresh.length,
      refreshed: refreshedSymbols,
      failed: failedSymbols,
      skippedDueBudget,
      budget,
      generatedAt: now
    }
  };
}

function datasetPayload(type, symbols, data) {
  const providers = { quotes: "Finnhub", performance: "Tiingo", fundamentals: "Finnhub" };
  const providerKey = type === "quotes" ? "quoteProvider" : type === "performance" ? "performanceProvider" : "fundamentalsProvider";
  return { ok: true, type, [providerKey]: providers[type], generatedAt: new Date().toISOString(), symbols, coverage: coverageFor(symbols, data), data };
}

async function readSymbolRecords(env, type, symbols) {
  const out = {};
  if (!env.QSD_KV) return out;
  await Promise.all(symbols.map(async symbol => {
    const record = await kvGetJson(env, symbolKey(type, symbol));
    if (record) out[symbol] = record;
  }));
  return out;
}

async function writeSymbolRecord(env, type, symbol, record) {
  if (!env.QSD_KV) return;
  await kvPutJson(env, symbolKey(type, symbol), record);
}

function symbolKey(type, symbol) { return `symbol:v1:${type}:${symbol}`; }

function hasUsefulData(value) {
  if (!value || typeof value !== "object") return false;
  if (value.error) return false;
  return Object.entries(value).some(([key, v]) => key !== "updatedAt" && v !== null && v !== undefined && String(v).trim() !== "");
}

function isStale(savedAt, ttlSeconds) {
  const t = Date.parse(savedAt);
  if (!Number.isFinite(t)) return true;
  return (Date.now() - t) / 1000 > ttlSeconds;
}

function coverageFor(symbols, data) {
  const filled = symbols.filter(symbol => hasUsefulData(data[symbol]));
  return { total: symbols.length, filled: filled.length, missing: symbols.filter(symbol => !filled.includes(symbol)) };
}

async function saveRefreshLog(env, payload) {
  if (!env.QSD_KV) return;
  const key = "refresh-log:v3";
  const log = (await kvGetJson(env, key)) || [];
  log.unshift({
    at: payload.generatedAt,
    symbolCount: payload.symbols.length,
    coverage: payload.coverage,
    refresh: payload.refresh
  });
  await kvPutJson(env, key, log.slice(0, HISTORY_LOG_LIMIT));
}

async function readRefreshLog(env) {
  if (!env.QSD_KV) return [];
  return (await kvGetJson(env, "refresh-log:v3")) || [];
}

async function saveDailySnapshot(env, payload) {
  if (!env.QSD_KV) return;
  const date = payload.generatedAt.slice(0, 10);
  const key = "history:v3:daily:" + date;
  const existing = (await kvGetJson(env, key)) || { date, at: payload.generatedAt, symbols: [], data: {} };

  const symbols = Array.from(new Set([...(existing.symbols || []), ...payload.symbols]));
  const data = { ...(existing.data || {}) };

  for (const symbol of payload.symbols) {
    const q = payload.data.quotes[symbol] || {};
    const p = payload.data.performance[symbol] || {};
    const f = payload.data.fundamentals[symbol] || {};
    const prev = data[symbol] || {};
    data[symbol] = {
      ...prev,
      livePrice: q.livePrice || prev.livePrice || "",
      priceRaw: q.priceRaw ?? prev.priceRaw ?? null,
      dayChange: q.dayChange || prev.dayChange || "",
      marketCap: f.marketCap || prev.marketCap || "",
      marketCapRaw: f.marketCapRaw ?? prev.marketCapRaw ?? null,
      volume: f.volume || prev.volume || "",
      psRatio: f.psRatio || prev.psRatio || "",
      psRatioRaw: f.psRatioRaw ?? prev.psRatioRaw ?? null,
      revenueGrowth: f.revenueGrowth || prev.revenueGrowth || "",
      revenueGrowthRaw: f.revenueGrowthRaw ?? prev.revenueGrowthRaw ?? null,
      sixMonthReturn: p.sixMonthReturn || prev.sixMonthReturn || "",
      priceVsSixMonthAvg: p.priceVsSixMonthAvg || prev.priceVsSixMonthAvg || "",
      priceVs200DaySma: p.priceVs200DaySma || prev.priceVs200DaySma || "",
      sixMonthVolatility: p.sixMonthVolatility || prev.sixMonthVolatility || "",
      sixMonthMaxDrawdown: p.sixMonthMaxDrawdown || prev.sixMonthMaxDrawdown || "",
      relativeStrengthVsQqq: p.relativeStrengthVsQqq || prev.relativeStrengthVsQqq || ""
    };
  }

  await kvPutJson(env, key, { date, at: payload.generatedAt, symbols, data });
}

async function readDailyHistory(env, days) {
  if (!env.QSD_KV) return [];
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = formatDate(daysAgo(i));
    const snapshot = await kvGetJson(env, "history:v3:daily:" + date);
    if (snapshot) out.push(snapshot);
  }
  return out;
}

async function kvGetJson(env, key) {
  if (!env.QSD_KV) return null;
  try { return await env.QSD_KV.get(key, { type: "json" }); } catch { return null; }
}

async function kvPutJson(env, key, value) {
  if (!env.QSD_KV) return;
  await env.QSD_KV.put(key, JSON.stringify(value));
}

function requireSecret(value, name) { if (!value) throw new Error("Missing Cloudflare secret named " + name + "."); }

function requireUserSyncToken(request, env) {
  requireSecret(env.USER_SYNC_TOKEN, "USER_SYNC_TOKEN");
  const token = request.headers.get("X-QSD-SYNC-TOKEN") || "";
  if (!token || token !== env.USER_SYNC_TOKEN) throw new Error("Invalid private sync token.");
}

async function readJsonBody(request) {
  const text = await request.text();
  if (!text) return {};
  if (text.length > USER_DATA_MAX_BYTES) throw new Error("User data payload is too large.");
  try { return JSON.parse(text); } catch { throw new Error("Request body must be valid JSON."); }
}

function sanitizeUserData(data, savedAt) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("User data must be an object.");
  const encoded = JSON.stringify(data);
  if (encoded.length > USER_DATA_MAX_BYTES) throw new Error("User data payload is too large.");
  return {
    version: 1,
    savedAt,
    edits: data.edits && typeof data.edits === "object" && !Array.isArray(data.edits) ? data.edits : {},
    watchlists: Array.isArray(data.watchlists) ? data.watchlists : []
  };
}

function getSymbols(url, fallback = []) {
  const raw = url.searchParams.get("symbols") || fallback.join(",");
  const symbols = raw.split(/[,:;\s]+/).map(s => s.trim().toUpperCase()).filter(s => /^[A-Z0-9.]{1,8}$/.test(s)).filter(s => ALLOWED_SYMBOLS.has(s));
  const unique = Array.from(new Set(symbols)).slice(0, MAX_SYMBOLS);
  if (!unique.length) throw new Error("No valid symbols requested.");
  return unique;
}

async function getQuotes(symbols, apiKey) {
  const data = {};
  await mapWithConcurrency(symbols, 6, async symbol => {
    try {
      const q = await fetchFinnhubQuote(symbol, apiKey);
      data[symbol] = mapFinnhubQuote(q);
    } catch (error) {
      data[symbol] = { error: error.message || "Could not load quote.", updatedAt: new Date().toISOString() };
    }
  });
  return { ok: true, type: "quotes", quoteProvider: "Finnhub", generatedAt: new Date().toISOString(), symbols, data };
}

async function fetchFinnhubQuote(symbol, apiKey) {
  const endpoint = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`;
  const payload = await fetchJson(endpoint, "Finnhub");
  if (!payload || typeof payload !== "object") throw new Error("Finnhub quote response was invalid.");
  if (!isFiniteNumber(toNumber(payload.c)) || toNumber(payload.c) <= 0) throw new Error("Finnhub returned no live price for " + symbol + ".");
  return payload;
}

function mapFinnhubQuote(row) {
  const price = toNumber(row.c), change = toNumber(row.d), changePercent = toNumber(row.dp);
  const previousClose = toNumber(row.pc), open = toNumber(row.o), high = toNumber(row.h), low = toNumber(row.l);
  return {
    livePrice: formatCurrency(price), dayChange: formatSignedCurrency(change, changePercent), previousClose: formatCurrency(previousClose), open: formatCurrency(open), dayHigh: formatCurrency(high), dayLow: formatCurrency(low),
    priceRaw: isFiniteNumber(price) ? price : null, changeRaw: isFiniteNumber(change) ? change : null, changesPercentageRaw: isFiniteNumber(changePercent) ? changePercent : null,
    previousCloseRaw: isFiniteNumber(previousClose) ? previousClose : null, openRaw: isFiniteNumber(open) ? open : null, dayHighRaw: isFiniteNumber(high) ? high : null, dayLowRaw: isFiniteNumber(low) ? low : null,
    updatedAt: new Date().toISOString()
  };
}

async function getPerformance(symbols, apiKey) {
  let qqqReturn = NaN;
  try { qqqReturn = sixMonthReturn(await fetchTiingoCloses("QQQ", apiKey)); } catch {}
  const data = {};
  await mapWithConcurrency(symbols, 4, async symbol => {
    try { data[symbol] = performanceMetrics(await fetchTiingoCloses(symbol, apiKey), qqqReturn); }
    catch (error) { data[symbol] = { error: error.message || "Could not calculate performance metrics.", updatedAt: new Date().toISOString() }; }
  });
  return { ok: true, type: "performance", performanceProvider: "Tiingo", generatedAt: new Date().toISOString(), benchmark: "QQQ", symbols, data };
}

async function fetchTiingoCloses(symbol, apiKey) {
  const endDate = formatDate(new Date()), startDate = formatDate(daysAgo(420));
  const endpoint = `${TIINGO_BASE}/${encodeURIComponent(symbol)}/prices?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&resampleFreq=daily&token=${encodeURIComponent(apiKey)}`;
  const rows = await fetchJson(endpoint, "Tiingo");
  if (!Array.isArray(rows)) throw new Error("Tiingo price response was not an array for " + symbol + ".");
  const closes = rows.filter(r => r && r.date).sort((a,b) => new Date(a.date) - new Date(b.date)).map(r => firstNumber(r.adjClose, r.close)).filter(v => isFiniteNumber(v) && v > 0);
  if (closes.length < 20) throw new Error("Not enough Tiingo data for " + symbol + ".");
  return closes.slice().reverse();
}

function performanceMetrics(closesNewestFirst, qqqReturn) {
  const six = closesNewestFirst.slice(0, 126), twoHundred = closesNewestFirst.slice(0, 200);
  const latest = closesNewestFirst[0], sixAvg = average(six), sma200 = average(twoHundred), sixReturn = sixMonthReturn(closesNewestFirst);
  const priceVsSix = isFiniteNumber(latest) && isFiniteNumber(sixAvg) && sixAvg > 0 ? (latest / sixAvg - 1) * 100 : NaN;
  const priceVs200 = isFiniteNumber(latest) && isFiniteNumber(sma200) && sma200 > 0 ? (latest / sma200 - 1) * 100 : NaN;
  const relative = isFiniteNumber(sixReturn) && isFiniteNumber(qqqReturn) ? sixReturn - qqqReturn : NaN;
  return { sixMonthAvgPrice: formatCurrency(sixAvg), sixMonthReturn: formatPercent(sixReturn), priceVsSixMonthAvg: formatPercent(priceVsSix), priceVs200DaySma: formatPercent(priceVs200), sixMonthVolatility: formatPercent(annualizedVolatility(six)), sixMonthMaxDrawdown: formatPercent(maxDrawdown(six.slice().reverse())), relativeStrengthVsQqq: formatPercent(relative), updatedAt: new Date().toISOString() };
}

async function getFundamentals(symbols, apiKey) {
  const data = {};
  await mapWithConcurrency(symbols, 3, async symbol => {
    try {
      const payload = await fetchFinnhubMetric(symbol, apiKey);
      data[symbol] = mapFundamentals((payload && payload.metric) || {});
    } catch (error) {
      data[symbol] = { error: error.message || "Could not load fundamentals.", updatedAt: new Date().toISOString() };
    }
  });
  return { ok: true, type: "fundamentals", fundamentalsProvider: "Finnhub", generatedAt: new Date().toISOString(), symbols, data };
}

async function fetchFinnhubMetric(symbol, apiKey) {
  const endpoint = `${FINNHUB_BASE}/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${encodeURIComponent(apiKey)}`;
  const payload = await fetchJson(endpoint, "Finnhub fundamentals");
  if (!payload || typeof payload !== "object") throw new Error("Finnhub metric response was invalid for " + symbol + ".");
  return payload;
}

function mapFundamentals(metric) {
  const marketCapRaw = firstNumber(metric.marketCapitalization, metric.marketCap, metric.mktCap);
  const psRaw = firstNumber(metric.psTTM, metric.psAnnual, metric.priceToSalesTTM, metric.priceToSalesAnnual, metric.priceToSalesRatio);
  const revenueGrowthRaw = firstNumber(metric.revenueGrowthTTMYoy, metric.revenueGrowthQuarterlyYoy, metric.revenueGrowth3Y, metric.revenueGrowth5Y);
  const averageVolumeRaw = firstNumber(metric["10DayAverageTradingVolume"], metric["30DayAverageTradingVolume"], metric["3MonthAverageTradingVolume"]);
  const normalizedMarketCap = normalizeFinnhubMarketCap(marketCapRaw), normalizedVolume = normalizeAverageVolume(averageVolumeRaw);
  return { marketCap: formatMarketCap(normalizedMarketCap), volume: isFiniteNumber(normalizedVolume) ? "10D avg " + formatCompactNumber(normalizedVolume) : "", psRatio: formatRatio(psRaw), revenueGrowth: formatPercent(revenueGrowthRaw), marketCapRaw: isFiniteNumber(normalizedMarketCap) ? normalizedMarketCap : null, averageVolumeRaw: isFiniteNumber(normalizedVolume) ? normalizedVolume : null, psRatioRaw: isFiniteNumber(psRaw) ? psRaw : null, revenueGrowthRaw: isFiniteNumber(revenueGrowthRaw) ? revenueGrowthRaw : null, updatedAt: new Date().toISOString() };
}

async function fetchJson(endpoint, providerName) {
  const response = await fetch(endpoint);
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); } catch { throw new Error(`${providerName} returned non-JSON data. HTTP ${response.status}. Preview: ${text.replace(/\s+/g," ").trim().slice(0,180) || "[empty response]"}`); }
  if (!response.ok) throw new Error(payload.error || payload.message || payload.detail || providerName + " request failed with status " + response.status + ".");
  return payload;
}

async function mapWithConcurrency(items, limit, mapper) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await mapper(queue.shift());
  });
  await Promise.all(workers);
}

function sixMonthReturn(closesNewestFirst) { const closes = closesNewestFirst.slice(0,126), latest = closes[0], oldest = closes[closes.length - 1]; return isFiniteNumber(latest) && isFiniteNumber(oldest) && oldest > 0 ? (latest / oldest - 1) * 100 : NaN; }
function annualizedVolatility(closesNewestFirst) { const returns=[]; for(let i=0;i<closesNewestFirst.length-1;i++){ const c=closesNewestFirst[i], p=closesNewestFirst[i+1]; if(isFiniteNumber(c)&&isFiniteNumber(p)&&p>0) returns.push(c/p-1); } if(returns.length<2) return NaN; const mean=average(returns), variance=average(returns.map(v=>Math.pow(v-mean,2))); return Math.sqrt(variance)*Math.sqrt(252)*100; }
function maxDrawdown(closesOldestFirst) { let peak=-Infinity,worst=0; closesOldestFirst.forEach(close=>{ if(!isFiniteNumber(close)||close<=0)return; peak=Math.max(peak,close); if(peak>0) worst=Math.min(worst,(close/peak-1)*100); }); return worst; }
function jsonResponse(payload, status = 200, cacheSeconds = 0) { const headers = { ...CORS_HEADERS, "Content-Type":"application/json" }; if(cacheSeconds>0) headers["Cache-Control"] = "public, max-age=" + cacheSeconds; return new Response(JSON.stringify(payload,null,2), { status, headers }); }
function firstNumber(...values) { for (const value of values) { const n = toNumber(value); if (isFiniteNumber(n)) return n; } return NaN; }
function toNumber(value) { const n = Number(value); return isFiniteNumber(n) ? n : NaN; }
function isFiniteNumber(value) { return Number.isFinite(value); }
function average(values) { const valid = values.filter(isFiniteNumber); return valid.length ? valid.reduce((s,v)=>s+v,0)/valid.length : NaN; }
function normalizeFinnhubMarketCap(value) { const n=toNumber(value); if(!isFiniteNumber(n)||n<=0)return NaN; return n < 10000000 ? n * 1000000 : n; }
function normalizeAverageVolume(value) { const n=toNumber(value); if(!isFiniteNumber(n)||n<=0)return NaN; return n < 1000000 ? n * 1000000 : n; }
function formatCurrency(value) { if(!isFiniteNumber(value)) return ""; return new Intl.NumberFormat("en-US", { style:"currency", currency:"USD", maximumFractionDigits:value>=100?2:3 }).format(value); }
function formatSignedCurrency(change, percent) { if(!isFiniteNumber(change)&&!isFiniteNumber(percent)) return ""; const source=isFiniteNumber(change)?change:percent, sign=source>=0?"+":"-", amount=isFiniteNumber(change)?formatCurrency(Math.abs(change)):"", pct=isFiniteNumber(percent)?formatPercent(Math.abs(percent), false):""; if(amount&&pct) return sign+amount+" ("+sign+pct+")"; if(amount) return sign+amount; return sign+pct; }
function formatPercent(value, includeSign = true) { if(!isFiniteNumber(value)) return ""; return (includeSign&&value>0?"+":"") + value.toFixed(2) + "%"; }
function formatRatio(value) { return isFiniteNumber(value) ? value.toFixed(2) + "x" : ""; }
function formatMarketCap(value) { if(!isFiniteNumber(value)) return ""; if(Math.abs(value)>=1e12) return "$"+(value/1e12).toFixed(2)+"T"; if(Math.abs(value)>=1e9) return "$"+(value/1e9).toFixed(2)+"B"; if(Math.abs(value)>=1e6) return "$"+(value/1e6).toFixed(2)+"M"; return formatCurrency(value); }
function formatCompactNumber(value) { if(!isFiniteNumber(value)) return ""; return new Intl.NumberFormat("en-US", { notation:"compact", maximumFractionDigits:2 }).format(value); }
function clampInt(value, min, max, fallback) { const n=Number.parseInt(value,10); if(!Number.isFinite(n)) return fallback; return Math.max(min, Math.min(max, n)); }
function daysAgo(days) { const d=new Date(); d.setDate(d.getDate()-days); return d; }
function formatDate(date) { return date.getUTCFullYear()+"-"+String(date.getUTCMonth()+1).padStart(2,"0")+"-"+String(date.getUTCDate()).padStart(2,"0"); }
