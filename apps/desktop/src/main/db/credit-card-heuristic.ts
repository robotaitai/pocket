import type Database from 'better-sqlite3';
import { isCreditCardPayment } from '@pocket/core-model';

/**
 * Re-tags accepted bank debits that look like credit-card balance settlements.
 * Only touches rows with no user_category and category null or "other", so
 * merchant rules and manual tags are never overwritten.
 *
 * Call after DB open so older imports pick up widened Hebrew patterns (e.g. "לאומי ויזה").
 */
export function backfillCreditCardPaymentCategories(db: Database.Database): number {
  const rows = db.prepare<[], { id: string; description: string }>(`
    SELECT id, description
    FROM transactions
    WHERE review_status = 'accepted'
      AND amount < 0
      AND user_category IS NULL
      AND (category IS NULL OR category = 'other')
  `).all();

  const stmt = db.prepare('UPDATE transactions SET category = ? WHERE id = ?');
  let updated = 0;
  for (const row of rows) {
    if (isCreditCardPayment(row.description)) {
      stmt.run('credit_card_payment', row.id);
      updated += 1;
    }
  }
  return updated;
}
