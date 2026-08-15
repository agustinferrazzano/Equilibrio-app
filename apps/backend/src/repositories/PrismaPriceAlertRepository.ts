import { PrismaClient } from "@prisma/client";
import { IPriceAlertRepository, PriceAlert } from "@equilibrio/core";

export class PrismaPriceAlertRepository implements IPriceAlertRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(alert: PriceAlert): Promise<void> {
    await this.prisma.priceAlert.create({
      data: {
        id: alert.id,
        userId: alert.userId,
        assetId: alert.assetId,
        targetPrice: alert.targetPrice,
        condition: alert.condition,
        isActive: alert.isActive,
        createdAt: new Date(),
      },
    });
  }

  async markAsTriggered(id: string): Promise<void> {
    await this.prisma.priceAlert.update({
      where: { id },
      data: {
        isActive: false,
        triggeredAt: new Date(),
      },
    });
  }

  async findById(id: string): Promise<PriceAlert | null> {
    const r = await this.prisma.priceAlert.findUnique({ where: { id } });
    if (!r) return null;
    return new PriceAlert(r.id, r.userId, r.assetId, r.targetPrice, r.condition as any, r.isActive);
  }

  async findByUserId(userId: string): Promise<PriceAlert[]> {
    const records = await this.prisma.priceAlert.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return records.map(
      (r) =>
        new PriceAlert(
          r.id,
          r.userId,
          r.assetId,
          r.targetPrice,
          r.condition as any,
          r.isActive,
        ),
    );
  }

  async findActiveAlerts(): Promise<PriceAlert[]> {
    const records = await this.prisma.priceAlert.findMany({
      where: { isActive: true },
    });

    return records.map(
      (r) =>
        new PriceAlert(
          r.id,
          r.userId,
          r.assetId,
          r.targetPrice,
          r.condition as any,
          r.isActive,
        ),
    );
  }

  async update(alert: PriceAlert): Promise<void> {
    await this.prisma.priceAlert.update({
      where: { id: alert.id },
      data: {
        isActive: alert.isActive,
      },
    });
  }

  async deleteById(id: string): Promise<boolean> {
    try {
      await this.prisma.priceAlert.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
