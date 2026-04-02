/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openDb } from '../src/main/db/init.js';
import { extractFile, ingestExtractedRecords } from '../src/main/file-extractor.js';
import { LocalOnlyProvider } from '@pocket/agent-client';
import type Database from 'better-sqlite3';

let tmpDir: string;
let db: Database.Database;

const SAMPLE_CSV = `Date,Description,Amount,Currency
2026-03-01,Supermarket,-250,ILS
2026-03-05,Salary,5000,ILS
2026-03-10,Coffee Shop,-45,ILS
`;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), 'pocket-extractor-test-'));
  db = openDb(':memory:');
  // Insert a test account for ingestion
  db.prepare(`
    INSERT INTO accounts (id, institution, institution_type, account_number, type, currency)
    VALUES ('acc-test', 'test-bank', 'bank', '000-001', 'checking', 'ILS')
  `).run();
});

afterEach(async () => {
  db.close();
  await rm(tmpDir, { recursive: true, force: true });
});

describe('extractFile — CSV', () => {
  it('extracts transactions from a valid CSV', async () => {
    const csvPath = path.join(tmpDir, 'test.csv');
    await writeFile(csvPath, SAMPLE_CSV);

    const result = await extractFile({
      filePath: csvPath,
      accountId: 'acc-test',
      provider: new LocalOnlyProvider(),
    });

    expect(result.error).toBeUndefined();
    expect(result.sourceType).toBe('csv');
    expect(result.records).toHaveLength(3);
    expect(result.overallConfidence).toBe(1.0);
  });

  it('parses amounts and descriptions correctly', async () => {
    const csvPath = path.join(tmpDir, 'amounts.csv');
    await writeFile(csvPath, SAMPLE_CSV);

    const result = await extractFile({
      filePath: csvPath,
      accountId: 'acc-test',
      provider: new LocalOnlyProvider(),
    });

    const supermarket = result.records.find((r) => r.description === 'Supermarket');
    expect(supermarket?.amount).toBe(-250);

    const salary = result.records.find((r) => r.description === 'Salary');
    expect(salary?.amount).toBe(5000);
  });

  it('returns error for file with missing required columns', async () => {
    const badCsv = 'Name,Value\nfoo,bar\n';
    const csvPath = path.join(tmpDir, 'bad.csv');
    await writeFile(csvPath, badCsv);

    const result = await extractFile({
      filePath: csvPath,
      accountId: 'acc-test',
      provider: new LocalOnlyProvider(),
    });

    expect(result.error).toBeTruthy();
    expect(result.records).toHaveLength(0);
  });

  it('returns error for unsupported file type', async () => {
    const result = await extractFile({
      filePath: '/some/file.txt',
      accountId: 'acc-test',
      provider: new LocalOnlyProvider(),
    });

    expect(result.error).toContain('Unsupported file type');
  });
});

describe('extractFile — PDF in local mode', () => {
  it('returns error when provider is local (PDF requires connected provider)', async () => {
    const pdfPath = path.join(tmpDir, 'test.pdf');
    await writeFile(pdfPath, '%PDF-1.4 fake pdf content');

    const result = await extractFile({
      filePath: pdfPath,
      accountId: 'acc-test',
      provider: new LocalOnlyProvider(),
    });

    expect(result.error).toContain('connected AI provider');
    expect(result.records).toHaveLength(0);
  });
});

describe('ingestExtractedRecords', () => {
  it('inserts records as pending review', async () => {
    const csvPath = path.join(tmpDir, 'ingest.csv');
    await writeFile(csvPath, SAMPLE_CSV);

    const extractResult = await extractFile({
      filePath: csvPath,
      accountId: 'acc-test',
      provider: new LocalOnlyProvider(),
    });

    const ingestion = ingestExtractedRecords(db, extractResult.records, {
      sourceType: 'csv',
      extractionMethod: 'structured-parse',
      sourceFile: csvPath,
      accountId: 'acc-test',
      providerType: 'local',
      overallConfidence: 1.0,
    });

    expect(ingestion.batchId).toBeTruthy();
    expect(ingestion.inserted).toBeGreaterThan(0);
    expect(ingestion.errors).toHaveLength(0);

    // All inserted records should be pending
    const pending = db.prepare("SELECT COUNT(*) as n FROM transactions WHERE review_status = 'pending'").get() as { n: number };
    expect(pending.n).toBe(ingestion.inserted);
  });

  it('deduplicates identical records on re-import', async () => {
    const csvPath = path.join(tmpDir, 'dedup.csv');
    await writeFile(csvPath, SAMPLE_CSV);

    const extractResult = await extractFile({
      filePath: csvPath,
      accountId: 'acc-test',
      provider: new LocalOnlyProvider(),
    });

    const opts = { sourceType: 'csv' as const, extractionMethod: 'structured-parse', sourceFile: csvPath, accountId: 'acc-test', providerType: 'local', overallConfidence: 1.0 };

    const first = ingestExtractedRecords(db, extractResult.records, opts);
    const second = ingestExtractedRecords(db, extractResult.records, opts);

    expect(first.inserted).toBeGreaterThan(0);
    expect(second.inserted).toBe(0);
    expect(second.duplicates).toBe(first.inserted);
  });
});
