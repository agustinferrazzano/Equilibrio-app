import YahooFinance from "yahoo-finance2";
import { IMarketDataService } from "@equilibrio/core";
import { getRedisClient } from "../cache/redis";

const yahooFinance = new YahooFinance();
const CACHE_TTL_SECONDS = 5 * 60; // 5 minutes

export class YahooFinanceService implements IMarketDataService {
  async getCurrentPrice(ticker: string): Promise<number | null> {
    const redis = getRedisClient();
    const cacheKey = `market-price:${ticker}`;

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return parseFloat(cached);
        }
      } catch (error) {
        console.warn(`Redis get error for ${cacheKey}:`, error);
      }
    }

    try {
      const quote = await yahooFinance.quote(ticker);
      const marketPrice = (quote as { regularMarketPrice?: unknown } | null)?.regularMarketPrice;

      if (typeof marketPrice !== "number" || !Number.isFinite(marketPrice)) {
        return null;
      }

      if (redis) {
        try {
          await redis.setex(cacheKey, CACHE_TTL_SECONDS, marketPrice.toString());
        } catch (error) {
          console.warn(`Redis set error for ${cacheKey}:`, error);
        }
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

    const redis = getRedisClient();
    const cacheKey = `historical-prices:${ticker}:${periodDays}`;

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.warn(`Redis get error for ${cacheKey}:`, error);
      }
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

      const results = historical
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

      if (redis && results.length > 0) {
        try {
          await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(results));
        } catch (error) {
          console.warn(`Redis set error for ${cacheKey}:`, error);
        }
      }

      return results;
    } catch {
      return [];
    }
  }
}
