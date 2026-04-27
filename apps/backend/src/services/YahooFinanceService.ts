import YahooFinance from "yahoo-finance2";
import { IMarketDataService } from "@equilibrio/core";

const yahooFinance = new YahooFinance();

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

  async getHistoricalPrices(
    ticker: string,
    periodDays: number,
  ): Promise<Array<{ date: string; closePrice: number }>> {
    if (periodDays <= 0) {
      return [];
    }

    try {
      const period2 = new Date();
      const period1 = new Date(period2.getTime() - periodDays * 24 * 60 * 60 * 1000);

      const historical = (await yahooFinance.historical(ticker, {
        period1,
        period2,
        interval: "1d",
      })) as Array<{
        date?: string | Date;
        close?: unknown;
        adjClose?: unknown;
      }>;

      return historical
        .map((row) => {
          const closePrice = (row as { close?: unknown; adjClose?: unknown }).close;
          const fallbackClose = (row as { close?: unknown; adjClose?: unknown }).adjClose;
          const numericClose = typeof closePrice === "number" ? closePrice : fallbackClose;
          const dateValue = (row as { date?: unknown }).date;

          return {
            date: new Date(dateValue as string | number | Date).toISOString().slice(0, 10),
            closePrice: typeof numericClose === "number" && Number.isFinite(numericClose)
              ? numericClose
              : Number.NaN,
          };
        })
        .filter((row) => Number.isFinite(row.closePrice));
    } catch {
      return [];
    }
  }
}
