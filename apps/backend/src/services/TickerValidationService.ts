import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

// Tickers populares y conocidos que típicamente funcionan
const KNOWN_VALID_TICKERS = [
  // Tech
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "NVDA",
  "META",
  "TSLA",
  "NFLX",
  // Financiero
  "JPM",
  "BAC",
  "WFC",
  "GS",
  // Consumidor
  "WMT",
  "KO",
  "MCD",
  "PG",
  "COST",
  // Industrial
  "BA",
  "CAT",
  "MMM",
  // Healthcare
  "JNJ",
  "UNH",
  "PFE",
  // CEDEARs (Argentina)
  "AAPL.BA",
  "MSFT.BA",
  "AMZN.BA",
  "GOOGL.BA",
  "TSLA.BA",
  "MELI.BA",
  "MELI",
  "SAP",
  "MSI",
];

export class TickerValidationService {
  private tickerCache = new Map<string, boolean>();
  private lastCacheTime = 0;
  private CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  /**
   * Valida si un ticker existe en Yahoo Finance
   */
  async validateTicker(ticker: string): Promise<boolean> {
    if (!ticker || typeof ticker !== "string") {
      return false;
    }

    const upperTicker = ticker.toUpperCase().trim();

    // Check cache first
    if (this.tickerCache.has(upperTicker)) {
      const cached = this.tickerCache.get(upperTicker);
      const now = Date.now();
      if (now - this.lastCacheTime < this.CACHE_DURATION) {
        return cached ?? false;
      }
    }

    try {
      const quote = await yahooFinance.quote(upperTicker);
      const isValid = Boolean(
        quote && (quote as { regularMarketPrice?: unknown }).regularMarketPrice,
      );
      this.tickerCache.set(upperTicker, isValid);
      return isValid;
    } catch {
      this.tickerCache.set(upperTicker, false);
      return false;
    }
  }

  /**
   * Obtiene lista de tickers sugeridos (del cache de conocidos)
   */
  getSuggestedTickers(): string[] {
    return KNOWN_VALID_TICKERS;
  }

  /**
   * Valida múltiples tickers
   */
  async validateTickers(tickers: string[]): Promise<{ [key: string]: boolean }> {
    const results = await Promise.all(tickers.map((t) => this.validateTicker(t)));
    return Object.fromEntries(tickers.map((t, i) => [t, results[i]]));
  }
}

export const tickerValidationService = new TickerValidationService();
