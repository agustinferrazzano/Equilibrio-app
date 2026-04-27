import { AssetType, TransactionType } from "@equilibrio/core";

export interface TransactionRecord {
  id: string;
  userId: string;
  assetId: string;
  assetType: AssetType;
  type: TransactionType;
  date: string;
  quantity: number;
  price: number;
  commission: number;
}

export interface PaginatedTransactionsResponse {
  data: TransactionRecord[];
  total: number;
  page: number;
  pageSize: number;
}
