import { Transaction } from "../../models/Transaction";
import { ITransactionRepository } from "../ITransactionRepository";

export class MockTransactionRepository implements ITransactionRepository {
  private transactions: Transaction[] = [];

  async save(transaction: Transaction): Promise<void> {
    this.transactions.push(transaction);
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.transactions.find((transaction) => transaction.id === id) ?? null;
  }

  async findByUserId(userId: string): Promise<Transaction[]> {
    return this.transactions.filter((transaction) => transaction.userId === userId);
  }

  async findByUserIdAndAssetId(
    userId: string,
    assetId: string,
  ): Promise<Transaction[]> {
    return this.transactions.filter(
      (transaction) => transaction.userId === userId && transaction.assetId === assetId,
    );
  }
}