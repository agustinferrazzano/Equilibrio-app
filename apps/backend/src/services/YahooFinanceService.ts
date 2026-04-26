import yahooFinance from "yahoo-finance2";
import { IMarketDataService } from "@equilibrio/core";

export class YahooFinanceService implements IMarketDataService {
  async getCurrentPrice(ticker: string): Promise<number | null> {
    try {
      const quote = await yahooFinance.quote(ticker);
      const marketPrice = (quote as { regularMarketPrice?: unknown } | null)?.regularMarketPrice;

      if (typeof marketPrice !== "number" || !Number.isFinite(marketPrice)) {
        return null;
      }

      return marketPrice;
    } catch {
      return null;
    }
  }
}
