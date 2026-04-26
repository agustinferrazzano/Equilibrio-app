export interface IMarketDataService {
  getCurrentPrice(ticker: string): Promise<number | null>;
}
