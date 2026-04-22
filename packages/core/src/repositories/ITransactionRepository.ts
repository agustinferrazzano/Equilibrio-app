import { Transaction } from "../models/Transaction";

export interface ITransactionRepository {
  save(transaction: Transaction): Promise<void>;
  findById(id: string): Promise<Transaction | null>;
  findByUserId(userId: string): Promise<Transaction[]>;
  findByUserIdAndAssetId(
    userId: string,
    assetId: string,
  ): Promise<Transaction[]>;
}
