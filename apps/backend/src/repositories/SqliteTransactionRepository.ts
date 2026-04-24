import { Database } from "better-sqlite3";
import {
  ITransactionRepository,
  Transaction,
  TransactionType,
} from "@equilibrio/core";

interface TransactionRow {
  id: string;
  userId: string;
  assetId: string;
  type: TransactionType;
  date: string;
  quantity: number;
  price: number;
  commission: number;
}

export class SqliteTransactionRepository implements ITransactionRepository {
  constructor(private readonly db: Database) {
    this.db
      .prepare(
        `
          CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            assetId TEXT NOT NULL,
            type TEXT NOT NULL,
            date TEXT NOT NULL,
            quantity REAL NOT NULL,
            price REAL NOT NULL,
            commission REAL NOT NULL
          )
        `,
      )
      .run();
  }

  async save(transaction: Transaction): Promise<void> {
    this.db
      .prepare(
        `
          INSERT INTO transactions (id, userId, assetId, type, date, quantity, price, commission)
          VALUES (@id, @userId, @assetId, @type, @date, @quantity, @price, @commission)
        `,
      )
      .run({
        id: transaction.id,
        userId: transaction.userId,
        assetId: transaction.assetId,
        type: transaction.type,
        date: transaction.date.toISOString(),
        quantity: transaction.quantity,
        price: transaction.price,
        commission: transaction.commission,
      });
  }

  async findAll(): Promise<Transaction[]> {
    const rows = this.db
      .prepare(
        "SELECT id, userId, assetId, type, date, quantity, price, commission FROM transactions ORDER BY date DESC",
      )
      .all() as TransactionRow[];

    return rows.map((row) => this.toTransaction(row));
  }

  async findById(id: string): Promise<Transaction | null> {
    const row = this.db
      .prepare(
        "SELECT id, userId, assetId, type, date, quantity, price, commission FROM transactions WHERE id = ?",
      )
      .get(id) as TransactionRow | undefined;

    return row ? this.toTransaction(row) : null;
  }

  async deleteById(id: string): Promise<boolean> {
    const result = this.db
      .prepare("DELETE FROM transactions WHERE id = ?")
      .run(id);

    return result.changes > 0;
  }

  async findByUserId(userId: string): Promise<Transaction[]> {
    const rows = this.db
      .prepare(
        "SELECT id, userId, assetId, type, date, quantity, price, commission FROM transactions WHERE userId = ? ORDER BY date DESC",
      )
      .all(userId) as TransactionRow[];

    return rows.map((row) => this.toTransaction(row));
  }

  async findByUserIdAndAssetId(
    userId: string,
    assetId: string,
  ): Promise<Transaction[]> {
    const rows = this.db
      .prepare(
        "SELECT id, userId, assetId, type, date, quantity, price, commission FROM transactions WHERE userId = ? AND assetId = ? ORDER BY date DESC",
      )
      .all(userId, assetId) as TransactionRow[];

    return rows.map((row) => this.toTransaction(row));
  }

  private toTransaction(row: TransactionRow): Transaction {
    return new Transaction(
      row.id,
      row.userId,
      row.assetId,
      row.type,
      new Date(row.date),
      row.quantity,
      row.price,
      row.commission,
    );
  }
}
