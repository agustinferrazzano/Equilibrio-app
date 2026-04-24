import { Transaction } from "../../models/Transaction";
import {
  FindTransactionsOptions,
  FindTransactionsResult,
  ITransactionRepository,
} from "../ITransactionRepository";

export class MockTransactionRepository implements ITransactionRepository {
  private transactions: Transaction[] = [];

  async save(transaction: Transaction): Promise<void> {
    this.transactions.push(transaction);
  }

  async updateById(id: string, transaction: Transaction): Promise<boolean> {
    const index = this.transactions.findIndex((item) => item.id === id);

    if (index < 0) {
      return false;
    }

    this.transactions[index] = transaction;
    return true;
  }

  async findAll(): Promise<Transaction[]> {
    return this.transactions;
  }

  async findMany(
    options: FindTransactionsOptions = {},
  ): Promise<FindTransactionsResult> {
    const {
      userId,
      assetId,
      page = 1,
      pageSize = 10,
      sortBy = "date",
      sortOrder = "desc",
    } = options;

    const filtered = this.transactions.filter((transaction) => {
      if (userId && transaction.userId !== userId) {
        return false;
      }

      if (assetId && transaction.assetId !== assetId) {
        return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      const aValue = sortBy === "date" ? a.date.getTime() : a[sortBy];
      const bValue = sortBy === "date" ? b.date.getTime() : b[sortBy];

      if (aValue === bValue) {
        return 0;
      }

      const comparison = aValue > bValue ? 1 : -1;
      return sortOrder === "asc" ? comparison : -comparison;
    });

    const offset = (page - 1) * pageSize;

    return {
      data: sorted.slice(offset, offset + pageSize),
      total: sorted.length,
      page,
      pageSize,
    };
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