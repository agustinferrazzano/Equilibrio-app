export interface ICurrencyService {
  getExchangeRate(currencyPair: string): Promise<number | null>;
}
