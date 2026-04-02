import type Database from 'better-sqlite3';

export interface MerchantRule {
  id: string;
  pattern: string;
  category: string;
  matchCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Normalize a transaction description into a stable pattern key. */
function toPattern(description: string): string {
  return description.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function suggestCategory(db: Database.Database, description: string): string | null {
  const pattern = toPattern(description);
  const row = db.prepare<[string], { category: string }>(
    'SELECT category FROM merchant_rules WHERE pattern = ? LIMIT 1',
  ).get(pattern);
  return row?.category ?? null;
}

export function recordMerchantRule(
  db: Database.Database,
  description: string,
  category: string,
): void {
  const pattern = toPattern(description);
  const now = new Date().toISOString();
  const existing = db.prepare<[string], { id: string }>(
    'SELECT id FROM merchant_rules WHERE pattern = ?',
  ).get(pattern);

  if (existing) {
    db.prepare(`
      UPDATE merchant_rules SET category = ?, match_count = match_count + 1, updated_at = ?
      WHERE id = ?
    `).run(category, now, existing.id);
  } else {
    const id = `mr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    db.prepare(`
      INSERT INTO merchant_rules (id, pattern, category, match_count, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
    `).run(id, pattern, category, now, now);
  }
}

export function getAllMerchantRules(db: Database.Database): MerchantRule[] {
  return db.prepare<[], {
    id: string; pattern: string; category: string; match_count: number; created_at: string; updated_at: string;
  }>('SELECT id, pattern, category, match_count, created_at, updated_at FROM merchant_rules ORDER BY match_count DESC')
    .all()
    .map((r) => ({
      id: r.id,
      pattern: r.pattern,
      category: r.category,
      matchCount: r.match_count,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
}

export function deleteMerchantRule(db: Database.Database, id: string): void {
  db.prepare('DELETE FROM merchant_rules WHERE id = ?').run(id);
}
