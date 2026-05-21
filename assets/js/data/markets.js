/* =========================================================
   Broad Market Universe
   Quote-only assets used for Bloomberg-style market context.
   ========================================================= */

window.DASHBOARD_MARKET_ASSETS = [
  { ticker: "SPY", name: "S&P 500 ETF", group: "Indexes", role: "Large-cap U.S. market" },
  { ticker: "QQQ", name: "Nasdaq 100 ETF", group: "Indexes", role: "Growth and mega-cap tech" },
  { ticker: "DIA", name: "Dow Industrials ETF", group: "Indexes", role: "Blue-chip industrial average" },
  { ticker: "IWM", name: "Russell 2000 ETF", group: "Indexes", role: "Small-cap U.S. market" },
  { ticker: "VTI", name: "Total U.S. Stock Market ETF", group: "Indexes", role: "Broad U.S. equity market" },

  { ticker: "XLK", name: "Technology Select Sector SPDR", group: "Sectors", role: "Technology sector" },
  { ticker: "XLF", name: "Financial Select Sector SPDR", group: "Sectors", role: "Financial sector" },
  { ticker: "XLV", name: "Health Care Select Sector SPDR", group: "Sectors", role: "Health care sector" },
  { ticker: "XLE", name: "Energy Select Sector SPDR", group: "Sectors", role: "Energy sector" },
  { ticker: "XLI", name: "Industrial Select Sector SPDR", group: "Sectors", role: "Industrial sector" },
  { ticker: "XLU", name: "Utilities Select Sector SPDR", group: "Sectors", role: "Utilities sector" },
  { ticker: "XLY", name: "Consumer Discretionary Select Sector SPDR", group: "Sectors", role: "Consumer discretionary sector" },
  { ticker: "XLP", name: "Consumer Staples Select Sector SPDR", group: "Sectors", role: "Consumer staples sector" },
  { ticker: "XLC", name: "Communication Services Select Sector SPDR", group: "Sectors", role: "Communication services sector" },
  { ticker: "XLB", name: "Materials Select Sector SPDR", group: "Sectors", role: "Materials sector" },
  { ticker: "XLRE", name: "Real Estate Select Sector SPDR", group: "Sectors", role: "Real estate sector" },

  { ticker: "GLD", name: "SPDR Gold Shares", group: "Macro", role: "Gold" },
  { ticker: "SLV", name: "iShares Silver Trust", group: "Macro", role: "Silver" },
  { ticker: "USO", name: "United States Oil Fund", group: "Macro", role: "Oil" },
  { ticker: "TLT", name: "20+ Year Treasury Bond ETF", group: "Macro", role: "Long-duration Treasuries" },
  { ticker: "SHY", name: "1-3 Year Treasury Bond ETF", group: "Macro", role: "Short-duration Treasuries" }
];
