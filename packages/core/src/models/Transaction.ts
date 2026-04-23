export type TransactionType = "BUY" | "SELL";

export class Transaction {
  constructor(
    public id: string,
    public userId: string,
    public assetId: string,
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
