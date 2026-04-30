import { Database } from "better-sqlite3";

interface Migration {
  version: number;
  name: string;
  up: (db: Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: "create_transactions_table",
    up: (db) => {
      db.prepare(
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
      ).run();
    },
  },
  {
    version: 2,
    name: "create_transactions_indexes",
    up: (db) => {
      db.prepare(
        "CREATE INDEX IF NOT EXISTS idx_transactions_userId ON transactions(userId)",
      ).run();
      db.prepare(
        "CREATE INDEX IF NOT EXISTS idx_transactions_assetId ON transactions(assetId)",
      ).run();
      db.prepare(
        "CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)",
      ).run();
    },
  },
  {
    version: 3,
    name: "add_asset_type_to_transactions",
    up: (db) => {
      db.prepare(
        "ALTER TABLE transactions ADD COLUMN assetType TEXT NOT NULL DEFAULT 'ACCION_LOCAL'",
      ).run();
    },
  },
  {
    version: 4,
    name: "create_price_alerts_table",
    up: (db) => {
      db.prepare(
        `
          CREATE TABLE IF NOT EXISTS price_alerts (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            assetId TEXT NOT NULL,
            targetPrice REAL NOT NULL,
            condition TEXT NOT NULL,
            isActive INTEGER NOT NULL DEFAULT 1,
            createdAt TEXT NOT NULL,
            triggeredAt TEXT
          )
        `,
      ).run();
      db.prepare(
        "CREATE INDEX IF NOT EXISTS idx_price_alerts_userId ON price_alerts(userId)",
      ).run();
      db.prepare(
        "CREATE INDEX IF NOT EXISTS idx_price_alerts_assetId ON price_alerts(assetId)",
      ).run();
      db.prepare(
        "CREATE INDEX IF NOT EXISTS idx_price_alerts_isActive ON price_alerts(isActive)",
      ).run();
    },
  },
];

export function runMigrations(db: Database): number {
  db.prepare(
    `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at TEXT NOT NULL
      )
    `,
  ).run();

  const executed = db
    .prepare("SELECT version FROM schema_migrations")
    .all() as Array<{ version: number }>;

  const executedVersions = new Set(executed.map((row) => row.version));

  for (const migration of migrations) {
    if (executedVersions.has(migration.version)) {
      continue;
    }

    const transaction = db.transaction(() => {
      migration.up(db);
      db.prepare(
        "INSERT INTO schema_migrations (version, name, executed_at) VALUES (?, ?, ?)",
      ).run(migration.version, migration.name, new Date().toISOString());
    });

    transaction();
  }

  return migrations.length;
}
