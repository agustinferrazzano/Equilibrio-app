import { ITransactionRepository } from "../repositories/ITransactionRepository";
import { IMarketDataService } from "../services/IMarketDataService";
import { ICurrencyService } from "../services/ICurrencyService";

export interface PortfolioAssetSummary {
  assetId: string;
  totalQuantity: number;
  averagePrice: number;
  totalInvested: number;
  currentPrice: number;
  currentValue: number;
  yieldPercentage: number;
}

export interface PortfolioSummaryResponse {
  assets: PortfolioAssetSummary[];
  totalPortfolioValueARS: number;
  totalPortfolioValueUSD: number | null;
  exchangeRateUsed: number | null;
}

interface AssetAccumulator {
  totalQuantity: number;
  totalCost: number;
}

export class GetPortfolioSummaryUseCase {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly marketDataService: IMarketDataService,
    private readonly currencyService: ICurrencyService,
  ) {}

  async execute(userId: string): Promise<PortfolioSummaryResponse> {
    const transactions = await this.transactionRepository.findByUserId(userId);
    const sortedTransactions = [...transactions].sort(
      (left, right) => left.date.getTime() - right.date.getTime(),
    );

    const byAsset = new Map<string, AssetAccumulator>();

    for (const transaction of sortedTransactions) {
      const current = byAsset.get(transaction.assetId) ?? {
        totalQuantity: 0,
        totalCost: 0,
      };

      if (transaction.type === "BUY") {
        current.totalQuantity += transaction.quantity;
        current.totalCost += transaction.quantity * transaction.price + transaction.commission;
      } else {
        if (current.totalQuantity <= 0) {
          continue;
        }

        const quantityToSell = Math.min(transaction.quantity, current.totalQuantity);
        const averagePrice = current.totalCost / current.totalQuantity;

        current.totalQuantity -= quantityToSell;
        current.totalCost -= averagePrice * quantityToSell;
      }

      if (current.totalQuantity <= 0) {
        byAsset.delete(transaction.assetId);
        continue;
      }

      byAsset.set(transaction.assetId, current);
    }

    const assets = await Promise.all(
      Array.from(byAsset.entries()).map(async ([assetId, totals]) => {
        const averagePrice = totals.totalCost / totals.totalQuantity;
        const marketPrice = await this.marketDataService.getCurrentPrice(assetId);
        const currentPrice = marketPrice ?? averagePrice;
        const currentValue = totals.totalQuantity * currentPrice;
        const yieldPercentage = averagePrice > 0
          ? ((currentPrice - averagePrice) / averagePrice) * 100
          : 0;

        return {
          assetId,
          totalQuantity: Number(totals.totalQuantity.toFixed(6)),
          averagePrice: Number(averagePrice.toFixed(6)),
          totalInvested: Number((averagePrice * totals.totalQuantity).toFixed(6)),
          currentPrice: Number(currentPrice.toFixed(6)),
          currentValue: Number(currentValue.toFixed(6)),
          yieldPercentage: Number(yieldPercentage.toFixed(6)),
        };
      }),
    );

    const exchangeRate = await this.currencyService.getExchangeRate("USDARS_MEP");
    const totalPortfolioValueARS = Number(
      assets.reduce((sum, asset) => sum + asset.currentValue, 0).toFixed(2),
    );
    const totalPortfolioValueUSD = exchangeRate
      ? Number((totalPortfolioValueARS / exchangeRate).toFixed(2))
      : null;

    return {
      assets,
      totalPortfolioValueARS,
      totalPortfolioValueUSD,
      exchangeRateUsed: exchangeRate,
    };
  }
}
