import { Database } from "better-sqlite3";
import { IPriceAlertRepository, PriceAlert } from "@equilibrio/core";

interface PriceAlertRow {
  id: string;
  userId: string;
  assetId: string;
  targetPrice: number;
  condition: "GREATER_THAN" | "LESS_THAN";
  isActive: number;
  createdAt: string;
  triggeredAt: string | null;
}

export class SqlitePriceAlertRepository implements IPriceAlertRepository {
  constructor(private readonly db: Database) {}

  async save(alert: PriceAlert): Promise<void> {
    this.db
      .prepare(
        `
          INSERT INTO price_alerts (id, userId, assetId, targetPrice, condition, isActive, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        alert.id,
        alert.userId,
        alert.assetId,
        alert.targetPrice,
        alert.condition,
        alert.isActive ? 1 : 0,
        new Date().toISOString(),
      );
  }

  async findActiveAlerts(): Promise<PriceAlert[]> {
    const rows = this.db
      .prepare("SELECT * FROM price_alerts WHERE isActive = 1")
      .all() as PriceAlertRow[];

    return rows.map((row) =>
      this.rowToPriceAlert(row),
    );
  }

  async markAsTriggered(id: string): Promise<void> {
    this.db
      .prepare(
        `
          UPDATE price_alerts 
          SET isActive = 0, triggeredAt = ?
          WHERE id = ?
        `,
      )
      .run(new Date().toISOString(), id);
  }

  async findById(id: string): Promise<PriceAlert | null> {
    const row = this.db
      .prepare("SELECT * FROM price_alerts WHERE id = ?")
      .get(id) as PriceAlertRow | undefined;

    return row ? this.rowToPriceAlert(row) : null;
  }

  async findByUserId(userId: string): Promise<PriceAlert[]> {
    const rows = this.db
      .prepare("SELECT * FROM price_alerts WHERE userId = ? ORDER BY createdAt DESC")
      .all(userId) as PriceAlertRow[];

    return rows.map((row) => this.rowToPriceAlert(row));
  }

  async deleteById(id: string): Promise<boolean> {
    const result = this.db
      .prepare("DELETE FROM price_alerts WHERE id = ?")
      .run(id);

    return (result.changes ?? 0) > 0;
  }

  private rowToPriceAlert(row: PriceAlertRow): PriceAlert {
    return new PriceAlert(
      row.id,
      row.userId,
      row.assetId,
      row.targetPrice,
      row.condition,
      row.isActive === 1,
    );
  }
}
