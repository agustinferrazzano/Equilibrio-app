import { Transaction } from "../../models/Transaction";
import { ITransactionRepository } from "../ITransactionRepository";

export class MockTransactionRepository implements ITransactionRepository {
  private transactions: Transaction[] = [];

  async save(transaction: Transaction): Promise<void> {
    this.transactions.push(transaction);
  }

  async findAll(): Promise<Transaction[]> {
    return this.transactions;
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.transactions.find((transaction) => transaction.id === id) ?? null;
  }

  async deleteById(id: string): Promise<boolean> {
    const index = this.transactions.findIndex((transaction) => transaction.id === id);

    if (index < 0) {
      return false;
    }

    this.transactions.splice(index, 1);
    return true;
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