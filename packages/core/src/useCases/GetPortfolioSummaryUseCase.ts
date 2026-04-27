import { ITransactionRepository } from "../repositories/ITransactionRepository";
import { IMarketDataService } from "../services/IMarketDataService";
import { ICurrencyService } from "../services/ICurrencyService";
import { ASSET_DICTIONARY } from "../services/AssetDictionary";

export interface PortfolioAssetSummary {
  assetId: string;
  type: "CEDEAR" | "ACCION_LOCAL";
  totalQuantity: number;
  averagePrice: number;
  totalInvested: number;
  currentPrice: number;
  currentValue: number;
  yieldPercentage: number;
  theoreticalPriceARS?: number;
  spreadPercentage?: number;
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

    const exchangeRate = await this.currencyService.getExchangeRate("USDARS_MEP");

    const assets = await Promise.all(
      Array.from(byAsset.entries()).map(async ([assetId, totals]) => {
        const definition = ASSET_DICTIONARY[assetId];
        const type = definition?.type ?? "ACCION_LOCAL";
        const averagePrice = totals.totalCost / totals.totalQuantity;
        const marketPrice = await this.marketDataService.getCurrentPrice(assetId);
        const currentPrice = marketPrice ?? averagePrice;
        const currentValue = totals.totalQuantity * currentPrice;
        const yieldPercentage = averagePrice > 0
          ? ((currentPrice - averagePrice) / averagePrice) * 100
          : 0;

        let theoreticalPriceARS: number | undefined;
        let spreadPercentage: number | undefined;

        if (definition?.type === "CEDEAR" && exchangeRate && definition.ratio > 0) {
          const underlyingPriceUSD = await this.marketDataService.getCurrentPrice(
            definition.underlyingTicker,
          );

          if (typeof underlyingPriceUSD === "number" && Number.isFinite(underlyingPriceUSD)) {
            theoreticalPriceARS = (underlyingPriceUSD * exchangeRate) / definition.ratio;

            if (theoreticalPriceARS > 0) {
              spreadPercentage = ((currentPrice / theoreticalPriceARS) - 1) * 100;
            }
          }
        }

        return {
          assetId,
          type,
          totalQuantity: Number(totals.totalQuantity.toFixed(6)),
          averagePrice: Number(averagePrice.toFixed(6)),
          totalInvested: Number((averagePrice * totals.totalQuantity).toFixed(6)),
          currentPrice: Number(currentPrice.toFixed(6)),
          currentValue: Number(currentValue.toFixed(6)),
          yieldPercentage: Number(yieldPercentage.toFixed(6)),
          theoreticalPriceARS: theoreticalPriceARS !== undefined
            ? Number(theoreticalPriceARS.toFixed(6))
            : undefined,
          spreadPercentage: spreadPercentage !== undefined
            ? Number(spreadPercentage.toFixed(6))
            : undefined,
        };
      }),
    );

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
