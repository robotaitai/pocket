import Database from 'better-sqlite3';

const SCHEMA_VERSION = 1;

/**
 * Opens (or creates) the pocket SQLite database at the given path.
 * Runs schema migrations automatically on first open.
 * WAL mode is enabled for better read/write concurrency.
 */
export function openDb(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  applyMigrations(db);
  return db;
}

function applyMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id               TEXT PRIMARY KEY,
      institution      TEXT NOT NULL,
      institution_type TEXT NOT NULL,
      account_number   TEXT NOT NULL,
      type             TEXT NOT NULL,
      currency         TEXT NOT NULL,
      label            TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id                   TEXT PRIMARY KEY,
      account_id           TEXT NOT NULL REFERENCES accounts(id),
      date                 TEXT NOT NULL,
      processed_date       TEXT NOT NULL,
      amount               REAL NOT NULL,
      original_amount      REAL NOT NULL,
      original_currency    TEXT NOT NULL,
      charged_currency     TEXT NOT NULL,
      description          TEXT NOT NULL,
      memo                 TEXT,
      status               TEXT NOT NULL,
      category             TEXT,
      installment_number   INTEGER,
      installment_total    INTEGER,
      reference_id         TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_txns_date     ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_txns_account  ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_txns_category ON transactions(category);
  `);

  const row = db
    .prepare<[], { version: number }>('SELECT version FROM schema_version')
    .get();
  if (!row) {
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION);
  }
}
