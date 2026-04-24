import { Database } from "better-sqlite3";
import {
  FindTransactionsOptions,
  FindTransactionsResult,
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
  constructor(private readonly db: Database) {}

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

  async updateById(id: string, transaction: Transaction): Promise<boolean> {
    const result = this.db
      .prepare(
        `
          UPDATE transactions
          SET userId = @userId,
              assetId = @assetId,
              type = @type,
              date = @date,
              quantity = @quantity,
              price = @price,
              commission = @commission
          WHERE id = @id
        `,
      )
      .run({
        id,
        userId: transaction.userId,
        assetId: transaction.assetId,
        type: transaction.type,
        date: transaction.date.toISOString(),
        quantity: transaction.quantity,
        price: transaction.price,
        commission: transaction.commission,
      });

    return result.changes > 0;
  }

  async findAll(): Promise<Transaction[]> {
    const rows = this.db
      .prepare(
        "SELECT id, userId, assetId, type, date, quantity, price, commission FROM transactions ORDER BY date DESC",
      )
      .all() as TransactionRow[];

    return rows.map((row) => this.toTransaction(row));
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

    const safeSortBy = ["date", "price", "quantity"].includes(sortBy)
      ? sortBy
      : "date";
    const safeSortOrder = sortOrder === "asc" ? "ASC" : "DESC";
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safePageSize =
      Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 100
        ? Math.floor(pageSize)
        : 10;

    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (userId) {
      whereClauses.push("userId = ?");
      params.push(userId);
    }

    if (assetId) {
      whereClauses.push("assetId = ?");
      params.push(assetId);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM transactions ${whereSql}`)
      .get(...params) as { total: number };

    const offset = (safePage - 1) * safePageSize;

    const rows = this.db
      .prepare(
        `
          SELECT id, userId, assetId, type, date, quantity, price, commission
          FROM transactions
          ${whereSql}
          ORDER BY ${safeSortBy} ${safeSortOrder}
          LIMIT ? OFFSET ?
        `,
      )
      .all(...params, safePageSize, offset) as TransactionRow[];

    return {
      data: rows.map((row) => this.toTransaction(row)),
      total: totalRow.total,
      page: safePage,
      pageSize: safePageSize,
    };
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
