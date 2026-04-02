import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../src/main/db/init.js';
import {
  suggestCategory,
  recordMerchantRule,
  getAllMerchantRules,
  deleteMerchantRule,
} from '../src/main/db/merchant-rules.js';
import type Database from 'better-sqlite3';

describe('merchant-rules DB layer', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = openDb(':memory:');
  });

  it('suggestCategory returns null when no rules exist', () => {
    expect(suggestCategory(db, 'Supermarket')).toBeNull();
  });

  it('recordMerchantRule creates a rule and suggestCategory returns it', () => {
    recordMerchantRule(db, 'Supermarket', 'groceries');
    expect(suggestCategory(db, 'Supermarket')).toBe('groceries');
  });

  it('pattern matching is case-insensitive', () => {
    recordMerchantRule(db, 'SUPERMARKET', 'groceries');
    expect(suggestCategory(db, 'supermarket')).toBe('groceries');
    expect(suggestCategory(db, 'Supermarket')).toBe('groceries');
  });

  it('pattern matching normalizes extra whitespace', () => {
    recordMerchantRule(db, 'Coffee  Shop', 'dining');
    expect(suggestCategory(db, 'coffee shop')).toBe('dining');
  });

  it('recordMerchantRule updates category and increments match_count on repeat', () => {
    recordMerchantRule(db, 'Pharmacy', 'health');
    recordMerchantRule(db, 'Pharmacy', 'health');

    const rules = getAllMerchantRules(db);
    expect(rules).toHaveLength(1);
    expect(rules[0]!.matchCount).toBe(2);
  });

  it('recordMerchantRule updates category when user changes mind', () => {
    recordMerchantRule(db, 'Book Store', 'shopping');
    recordMerchantRule(db, 'Book Store', 'education');
    expect(suggestCategory(db, 'Book Store')).toBe('education');
  });

  it('getAllMerchantRules returns rules ordered by match_count desc', () => {
    recordMerchantRule(db, 'Pharmacy', 'health');
    recordMerchantRule(db, 'Pharmacy', 'health');
    recordMerchantRule(db, 'Coffee', 'dining');

    const rules = getAllMerchantRules(db);
    expect(rules[0]!.pattern).toBe('pharmacy');
    expect(rules[0]!.matchCount).toBe(2);
    expect(rules[1]!.pattern).toBe('coffee');
  });

  it('deleteMerchantRule removes a rule', () => {
    recordMerchantRule(db, 'Gas Station', 'transport');
    const [rule] = getAllMerchantRules(db);
    deleteMerchantRule(db, rule!.id);
    expect(getAllMerchantRules(db)).toHaveLength(0);
    expect(suggestCategory(db, 'Gas Station')).toBeNull();
  });
});
