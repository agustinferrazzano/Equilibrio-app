import { Transaction } from "../models/Transaction";

export interface FindTransactionsOptions {
  userId?: string;
  assetId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "date" | "price" | "quantity";
  sortOrder?: "asc" | "desc";
}

export interface FindTransactionsResult {
  data: Transaction[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ITransactionRepository {
  save(transaction: Transaction): Promise<void>;
  updateById(id: string, transaction: Transaction): Promise<boolean>;
  findAll(): Promise<Transaction[]>;
  findMany(options?: FindTransactionsOptions): Promise<FindTransactionsResult>;
  findById(id: string): Promise<Transaction | null>;
  deleteById(id: string): Promise<boolean>;
  findByUserId(userId: string): Promise<Transaction[]>;
  findByUserIdAndAssetId(
    userId: string,
    assetId: string,
  ): Promise<Transaction[]>;
}
