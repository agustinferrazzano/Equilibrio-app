export type TransactionType = "BUY" | "SELL";
export type AssetType = "CEDEAR" | "ACCION_LOCAL";

export class Transaction {
  constructor(
    public id: string,
    public userId: string,
    public assetId: string,
    public assetType: AssetType,
    public type: TransactionType,
    public date: Date,
    public quantity: number,
    public price: number,
    public commission: number,
  ) {}

  getTotalValue(): number {
    return this.quantity * this.price + this.commission;
  }
}
