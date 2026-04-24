import { Transaction } from "../models/Transaction";

export interface ITransactionRepository {
  save(transaction: Transaction): Promise<void>;
  findAll(): Promise<Transaction[]>;
  findById(id: string): Promise<Transaction | null>;
  deleteById(id: string): Promise<boolean>;
  findByUserId(userId: string): Promise<Transaction[]>;
  findByUserIdAndAssetId(
    userId: string,
    assetId: string,
  ): Promise<Transaction[]>;
}
