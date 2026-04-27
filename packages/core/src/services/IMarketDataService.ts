export interface IMarketDataService {
  getCurrentPrice(ticker: string): Promise<number | null>;
  getHistoricalPrices(
    ticker: string,
    periodDays: number,
  ): Promise<Array<{ date: string; closePrice: number }>>;
}
