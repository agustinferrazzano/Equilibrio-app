import { ITransactionRepository } from "../repositories/ITransactionRepository";

export interface PortfolioSummaryItem {
  assetId: string;
  totalQuantity: number;
  averagePrice: number;
  totalInvested: number;
}

interface AssetAccumulator {
  totalQuantity: number;
  totalCost: number;
}

export class GetPortfolioSummaryUseCase {
  constructor(private readonly transactionRepository: ITransactionRepository) {}

  async execute(userId: string): Promise<PortfolioSummaryItem[]> {
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

    return Array.from(byAsset.entries()).map(([assetId, totals]) => {
      const averagePrice = totals.totalCost / totals.totalQuantity;

      return {
        assetId,
        totalQuantity: Number(totals.totalQuantity.toFixed(6)),
        averagePrice: Number(averagePrice.toFixed(6)),
        totalInvested: Number((averagePrice * totals.totalQuantity).toFixed(6)),
      };
    });
  }
}
