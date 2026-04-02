import Database from 'better-sqlite3';

const SCHEMA_VERSION = 2;

/**
 * Opens (or creates) the pocket SQLite database at the given path.
 * Applies all pending migrations automatically.
 * WAL mode is enabled for better read/write concurrency.
 */
export function openDb(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  applyMigrations(db);
  return db;
}

function getCurrentVersion(db: Database.Database): number {
  // schema_version may not exist yet on a completely fresh DB
  try {
    const row = db
      .prepare<[], { version: number }>('SELECT version FROM schema_version')
      .get();
    return row?.version ?? 0;
  } catch {
    return 0;
  }
}

function applyMigrations(db: Database.Database): void {
  const current = getCurrentVersion(db);

  if (current < 1) {
    migrateV1(db);
    setVersion(db, 1);
  }

  if (current < 2) {
    migrateV2(db);
    setVersion(db, 2);
  }
}

function setVersion(db: Database.Database, version: number): void {
  const exists = db
    .prepare<[], { version: number }>('SELECT version FROM schema_version')
    .get();
  if (exists) {
    db.prepare('UPDATE schema_version SET version = ?').run(version);
  } else {
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(version);
  }
}

// ── Migration V1 — initial schema ─────────────────────────────────────────────

function migrateV1(db: Database.Database): void {
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
}

// ── Migration V2 — canonical provenance model ─────────────────────────────────

function migrateV2(db: Database.Database): void {
  // Add provenance columns to existing transactions (nullable — legacy rows default to 'scraper')
  const txCols = db
    .prepare<[], { name: string }>("PRAGMA table_info('transactions')")
    .all()
    .map((r) => r.name);

  const addIfMissing = (col: string, def: string) => {
    if (!txCols.includes(col)) {
      db.exec(`ALTER TABLE transactions ADD COLUMN ${col} ${def}`);
    }
  };

  addIfMissing('schema_version',     'INTEGER NOT NULL DEFAULT 1');
  addIfMissing('import_batch_id',    "TEXT NOT NULL DEFAULT 'legacy'");
  addIfMissing('source_type',        "TEXT NOT NULL DEFAULT 'scraper'");
  addIfMissing('source_file',        'TEXT');
  addIfMissing('import_timestamp',   "TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'");
  addIfMissing('extraction_method',  "TEXT NOT NULL DEFAULT 'scraper'");
  addIfMissing('provider_used',      'TEXT');
  addIfMissing('extractor_version',  'TEXT');
  addIfMissing('raw_reference',      'TEXT');
  addIfMissing('confidence_score',   'REAL');
  addIfMissing('warnings',           "TEXT NOT NULL DEFAULT '[]'");
  addIfMissing('merchant_id',        'TEXT');

  db.exec(`
    CREATE TABLE IF NOT EXISTS import_batches (
      id                TEXT PRIMARY KEY,
      created_at        TEXT NOT NULL,
      source_type       TEXT NOT NULL,
      source_file       TEXT,
      connector_id      TEXT,
      account_ids       TEXT NOT NULL DEFAULT '[]',
      transaction_count INTEGER NOT NULL DEFAULT 0,
      status            TEXT NOT NULL,
      error_message     TEXT,
      extraction_method TEXT NOT NULL,
      provider_used     TEXT,
      extractor_version TEXT
    );

    CREATE TABLE IF NOT EXISTS merchants (
      id              TEXT PRIMARY KEY,
      normalized_name TEXT NOT NULL,
      aliases         TEXT NOT NULL DEFAULT '[]',
      category        TEXT,
      country         TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_import_batches_created ON import_batches(created_at);
    CREATE INDEX IF NOT EXISTS idx_txns_batch            ON transactions(import_batch_id);
  `);
}
