import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../src/main/db/init.js';
import { getSetting, setSetting, deleteSetting } from '../src/main/db/settings.js';
import type Database from 'better-sqlite3';

describe('settings persistence', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = openDb(':memory:');
  });

  it('returns undefined for an unknown key', () => {
    expect(getSetting(db, 'nonexistent')).toBeUndefined();
  });

  it('stores and retrieves a value', () => {
    setSetting(db, 'theme', 'dark');
    expect(getSetting(db, 'theme')).toBe('dark');
  });

  it('overwrites an existing value', () => {
    setSetting(db, 'theme', 'light');
    setSetting(db, 'theme', 'dark');
    expect(getSetting(db, 'theme')).toBe('dark');
  });

  it('stores multiple keys independently', () => {
    setSetting(db, 'firstRunComplete', 'true');
    setSetting(db, 'locale', 'he-IL');
    expect(getSetting(db, 'firstRunComplete')).toBe('true');
    expect(getSetting(db, 'locale')).toBe('he-IL');
  });

  it('deletes a setting', () => {
    setSetting(db, 'theme', 'dark');
    deleteSetting(db, 'theme');
    expect(getSetting(db, 'theme')).toBeUndefined();
  });

  it('firstRunComplete flow — starts undefined, completes, persists', () => {
    expect(getSetting(db, 'firstRunComplete')).toBeUndefined();
    setSetting(db, 'firstRunComplete', 'true');
    expect(getSetting(db, 'firstRunComplete')).toBe('true');
  });
});
