import { PrismaClient } from "@prisma/client";
import {
  ITransactionRepository,
  Transaction,
  TransactionType,
  FindTransactionsResult,
} from "@equilibrio/core";

export class PrismaTransactionRepository implements ITransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(transaction: Transaction): Promise<void> {
    await this.prisma.transaction.create({
      data: {
        id: transaction.id,
        userId: transaction.userId,
        assetId: transaction.assetId,
        assetType: transaction.assetType,
        type: transaction.type,
        date: transaction.date,
        quantity: transaction.quantity,
        price: transaction.price,
        commission: transaction.commission,
      },
    });
  }

  async findAll(): Promise<Transaction[]> {
    const records = await this.prisma.transaction.findMany();
    return records.map((r) => new Transaction(r.id, r.userId, r.assetId, r.assetType as any, r.type as TransactionType, r.date, r.quantity, r.price, r.commission));
  }

  async findByUserIdAndAssetId(userId: string, assetId: string): Promise<Transaction[]> {
    const records = await this.prisma.transaction.findMany({ where: { userId, assetId } });
    return records.map((r) => new Transaction(r.id, r.userId, r.assetId, r.assetType as any, r.type as TransactionType, r.date, r.quantity, r.price, r.commission));
  }

  async findMany(filters: {
    userId?: string;
    assetId?: string;
    page?: number;
    pageSize?: number;
    sortBy?: "date" | "price" | "quantity";
    sortOrder?: "asc" | "desc";
  }): Promise<FindTransactionsResult> {
    const { userId, assetId, page = 1, pageSize = 10, sortBy = "date", sortOrder = "desc" } = filters;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: any = {};
    if (userId) where.userId = userId;
    if (assetId) where.assetId = assetId;

    const [total, records] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
    ]);

    const data = records.map(
      (r) =>
        new Transaction(
          r.id,
          r.userId,
          r.assetId,
          r.assetType as any,
          r.type as TransactionType,
          r.date,
          r.quantity,
          r.price,
          r.commission,
        ),
    );

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string): Promise<Transaction | null> {
    const r = await this.prisma.transaction.findUnique({ where: { id } });
    if (!r) return null;

    return new Transaction(
      r.id,
      r.userId,
      r.assetId,
      r.assetType as any,
      r.type as TransactionType,
      r.date,
      r.quantity,
      r.price,
      r.commission,
    );
  }

  async deleteById(id: string): Promise<boolean> {
    try {
      await this.prisma.transaction.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async updateById(id: string, transaction: Transaction): Promise<boolean> {
    try {
      await this.prisma.transaction.update({
        where: { id },
        data: {
          userId: transaction.userId,
          assetId: transaction.assetId,
          assetType: transaction.assetType,
          type: transaction.type,
          date: transaction.date,
          quantity: transaction.quantity,
          price: transaction.price,
          commission: transaction.commission,
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  async findByUserId(userId: string): Promise<Transaction[]> {
    const records = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    });

    return records.map(
      (r) =>
        new Transaction(
          r.id,
          r.userId,
          r.assetId,
          r.assetType as any,
          r.type as TransactionType,
          r.date,
          r.quantity,
          r.price,
          r.commission,
        ),
    );
  }
}
