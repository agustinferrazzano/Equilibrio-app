import { ITransactionRepository } from "../repositories/ITransactionRepository";
import { IMarketDataService } from "../services/IMarketDataService";

export interface PortfolioEvolutionPoint {
  date: string;
  totalValueARS: number;
}

interface AssetHolding {
  totalQuantity: number;
}

export class GetPortfolioEvolutionUseCase {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly marketDataService: IMarketDataService,
  ) {}

  async execute(userId: string): Promise<PortfolioEvolutionPoint[]> {
    const transactions = await this.transactionRepository.findByUserId(userId);
    const sortedTransactions = [...transactions].sort(
      (left, right) => left.date.getTime() - right.date.getTime(),
    );

    if (sortedTransactions.length === 0) {
      return [];
    }

    // Find the first transaction date
    const firstTransactionDate = sortedTransactions[0].date;

    // Get current holdings (calculate final state)
    const holdingsByAsset = new Map<string, AssetHolding>();
    for (const transaction of sortedTransactions) {
      const current = holdingsByAsset.get(transaction.assetId) ?? {
        totalQuantity: 0,
      };

      if (transaction.type === "BUY") {
        current.totalQuantity += transaction.quantity;
      } else {
        current.totalQuantity -= Math.min(transaction.quantity, current.totalQuantity);
      }

      if (current.totalQuantity <= 0) {
        holdingsByAsset.delete(transaction.assetId);
        continue;
      }

      holdingsByAsset.set(transaction.assetId, current);
    }

    const activeHoldings = Array.from(holdingsByAsset.entries()).filter(([, holding]) => holding.totalQuantity > 0);

    if (activeHoldings.length === 0) {
      return [];
    }

    // Get historical prices for all active assets
    const historicalSeries = await Promise.all(
      activeHoldings.map(async ([assetId]) => {
        try {
          const prices = await this.marketDataService.getHistoricalPrices(assetId, 30);
          return {
            assetId,
            prices,
          };
        } catch {
          return {
            assetId,
            prices: [] as Array<{ date: string; closePrice: number }>,
          };
        }
      }),
    );

    // Build timeline by calculating holdings at each historical date
    const timelineMap = new Map<string, number>();

    for (const series of historicalSeries) {
      for (const pricePoint of series.prices) {
        const priceDate = new Date(pricePoint.date);

        // Calculate holdings AS THEY WERE on this date (transactions up to this date)
        const holdingsOnDate = new Map<string, number>();
        for (const transaction of sortedTransactions) {
          if (transaction.date > priceDate) {
            // Skip transactions that happened after this date
            continue;
          }

          const current = holdingsOnDate.get(transaction.assetId) ?? 0;
          if (transaction.type === "BUY") {
            holdingsOnDate.set(transaction.assetId, current + transaction.quantity);
          } else {
            const toSell = Math.min(transaction.quantity, current);
            holdingsOnDate.set(transaction.assetId, current - toSell);
          }
        }

        // Get quantity held on this date
        const quantityOnDate = holdingsOnDate.get(series.assetId) ?? 0;

        if (quantityOnDate > 0) {
          const currentTotal = timelineMap.get(pricePoint.date) ?? 0;
          timelineMap.set(
            pricePoint.date,
            currentTotal + quantityOnDate * pricePoint.closePrice,
          );
        }
      }
    }

    return Array.from(timelineMap.entries())
      .map(([date, totalValueARS]) => ({
        date,
        totalValueARS: Number(totalValueARS.toFixed(2)),
      }))
      .sort((left, right) => left.date.localeCompare(right.date));
  }
}
