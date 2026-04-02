import type { Transaction } from './index.js';

export interface PotentialDuplicate {
  incoming: Transaction;
  /** The existing transaction that shares the same date + amount + accountId. */
  conflictingId: string;
  reason: string;
}

export interface DedupeResult {
  /** Records whose id is not in existingIds — safe to insert. */
  newRecords: Transaction[];
  /**
   * Records whose id exactly matches an existing record.
   * These should be treated as upserts — update provenance/category only.
   */
  exactDuplicates: Transaction[];
  /**
   * Records that don't match by id but share (accountId, date, amount).
   * Flag for user review — may be the same transaction from a different source.
   */
  potentialDuplicates: PotentialDuplicate[];
}

/**
 * Separates incoming transactions into new records, exact duplicates, and
 * potential (fuzzy) duplicates.
 *
 * Exact deduplication uses the deterministic SHA-256 id — source-agnostic.
 * Fuzzy deduplication flags same (accountId + date + amount) for user review.
 *
 * @param incoming - Normalized transactions from the current import batch.
 * @param existingIds - Set of ids already in the local DB.
 * @param existingRecords - Existing transactions used for fuzzy matching (optional).
 */
export function deduplicateById(
  incoming: Transaction[],
  existingIds: ReadonlySet<string>,
  existingRecords: Transaction[] = [],
): DedupeResult {
  const newRecords: Transaction[] = [];
  const exactDuplicates: Transaction[] = [];
  const potentialDuplicates: PotentialDuplicate[] = [];

  // Build a lookup for fuzzy matching: "accountId|date|amount" → id
  const fuzzyKey = (t: { accountId: string; date: string; amount: number }) =>
    `${t.accountId}|${t.date}|${t.amount.toFixed(4)}`;

  const existingByFuzzyKey = new Map<string, string>();
  for (const ex of existingRecords) {
    existingByFuzzyKey.set(fuzzyKey(ex), ex.id);
  }

  for (const tx of incoming) {
    if (existingIds.has(tx.id)) {
      exactDuplicates.push(tx);
      continue;
    }

    const fk = fuzzyKey(tx);
    const conflictingId = existingByFuzzyKey.get(fk);
    if (conflictingId !== undefined && conflictingId !== tx.id) {
      potentialDuplicates.push({
        incoming: tx,
        conflictingId,
        reason: `Same accountId, date (${tx.date}), and amount (${tx.amount}) as existing record ${conflictingId}`,
      });
    }

    // Still add to newRecords — the caller decides whether to insert after reviewing potentialDuplicates
    newRecords.push(tx);
  }

  return { newRecords, exactDuplicates, potentialDuplicates };
}

/**
 * Finds potential duplicates within a single batch — catches duplicates
 * introduced by the extractor itself (e.g. a CSV with duplicate rows).
 */
export function findPotentialDuplicates(records: Transaction[]): PotentialDuplicate[] {
  const seen = new Map<string, string>(); // fuzzyKey → id
  const result: PotentialDuplicate[] = [];

  const fuzzyKey = (t: Transaction) =>
    `${t.accountId}|${t.date}|${t.amount.toFixed(4)}`;

  for (const tx of records) {
    const fk = fuzzyKey(tx);
    const existingId = seen.get(fk);
    if (existingId !== undefined && existingId !== tx.id) {
      result.push({
        incoming: tx,
        conflictingId: existingId,
        reason: `Intra-batch duplicate: same accountId, date (${tx.date}), amount (${tx.amount})`,
      });
    } else {
      seen.set(fk, tx.id);
    }
  }

  return result;
}
