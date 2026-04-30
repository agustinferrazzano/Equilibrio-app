export type PriceAlertCondition = "GREATER_THAN" | "LESS_THAN";

export class PriceAlert {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly assetId: string,
    readonly targetPrice: number,
    readonly condition: PriceAlertCondition,
    readonly isActive: boolean = true,
  ) {}

  /**
   * Evalúa si la alerta debe dispararse dado el precio actual
   */
  isTriggered(currentPrice: number): boolean {
    if (!this.isActive) {
      return false;
    }

    switch (this.condition) {
      case "GREATER_THAN":
        return currentPrice > this.targetPrice;
      case "LESS_THAN":
        return currentPrice < this.targetPrice;
      default:
        return false;
    }
  }
}
