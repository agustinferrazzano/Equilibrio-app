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
  {
    version: 5,
    name: "create_users_table_and_seed_admin",
    up: (db) => {
      db.prepare(
        `
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            passwordHash TEXT NOT NULL,
            displayName TEXT NOT NULL,
            createdAt TEXT NOT NULL
          )
        `,
      ).run();
      db.prepare(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)",
      ).run();

      // Seed the main user using bcryptjs synchronous hash
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bcrypt = require("bcryptjs") as typeof import("bcryptjs");
      const passwordHash = bcrypt.hashSync("FerrazzanoGoogle", 10);

      db.prepare(
        `INSERT OR IGNORE INTO users (id, username, passwordHash, displayName, createdAt)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(
        "agustin-ferrazzano",
        "Agustin Ferrazzano",
        passwordHash,
        "Agustín Ferrazzano",
        new Date().toISOString(),
      );
    },
  },
  {
    version: 6,
    name: "migrate_all_transactions_to_agustin",
    up: (db) => {
      // Reassign every existing transaction to the canonical user id
      db.prepare(
        "UPDATE transactions SET userId = 'agustin-ferrazzano'",
      ).run();
      // Same for price alerts
      db.prepare(
        "UPDATE price_alerts SET userId = 'agustin-ferrazzano'",
      ).run();
    },
  },
  {
    version: 7,
    name: "add_oauth_columns_to_users",
    up: (db) => {
      db.prepare(
        "ALTER TABLE users ADD COLUMN email TEXT",
      ).run();
      db.prepare(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)",
      ).run();
      db.prepare(
        "ALTER TABLE users ADD COLUMN googleId TEXT",
      ).run();
    },
  },
  {
    version: 8,
    name: "create_refresh_tokens_table",
    up: (db) => {
      db.prepare(
        `
          CREATE TABLE IF NOT EXISTS refresh_tokens (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            hashedToken TEXT NOT NULL,
            expiresAt TEXT NOT NULL,
            revoked INTEGER NOT NULL DEFAULT 0,
            createdAt TEXT NOT NULL
          )
        `,
      ).run();
      db.prepare(
        "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_userId ON refresh_tokens(userId)",
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
    console.log(`[Migration] Applied: v${migration.version} - ${migration.name}`);
  }

  return migrations.length;
}
