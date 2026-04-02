import { describe, it, expect } from 'vitest';
import { FixtureConnector } from '../src/adapters/fixture.js';
import { normalizeImport, createImportBatch } from '@pocket/core-model';
import type { ConnectorDescriptor } from '../src/connector.js';
import { fixtureBank, fixtureCard } from './fixtures/scraper-accounts.js';

const bankDescriptor: ConnectorDescriptor = {
  id: 'hapoalim',
  name: 'Bank Hapoalim',
  institutionType: 'bank',
  credentialFields: ['userCode', 'password'],
};

const cardDescriptor: ConnectorDescriptor = {
  id: 'max',
  name: 'Max',
  institutionType: 'card',
  credentialFields: ['username', 'password'],
};

const options = { startDate: new Date('2026-03-01') };

describe('Connector contract — FixtureConnector (bank)', () => {
  it('returns success with normalized accounts and rawRecords', async () => {
    const connector = new FixtureConnector({ descriptor: bankDescriptor, accounts: fixtureBank });
    const result = await connector.run({ userCode: 'u', password: 'p' }, options);

    expect(result.status).toBe('success');
    if (result.status !== 'success') return;

    expect(result.accounts).toHaveLength(1);
    expect(result.rawRecords).toHaveLength(2);
    expect(result.accounts[0]?.institution).toBe('hapoalim');
    expect(result.accounts[0]?.institutionType).toBe('bank');
    expect(result.connectorId).toBe('hapoalim');
  });

  it('rawRecords carry scraper source metadata', async () => {
    const connector = new FixtureConnector({ descriptor: bankDescriptor, accounts: fixtureBank });
    const result = await connector.run({}, options);
    expect(result.status).toBe('success');
    if (result.status !== 'success') return;

    for (const r of result.rawRecords) {
      expect(r.sourceType).toBe('scraper');
      expect(r.extractionMethod).toBe('scraper');
      expect(r.providerUsed).toBe('hapoalim');
    }
  });

  it('normalization pipeline converts rawRecords to canonical Transactions', async () => {
    const connector = new FixtureConnector({ descriptor: bankDescriptor, accounts: fixtureBank });
    const result = await connector.run({}, options);
    expect(result.status).toBe('success');
    if (result.status !== 'success') return;

    const batch = createImportBatch({
      sourceType: 'scraper',
      connectorId: result.connectorId,
      extractionMethod: 'scraper',
      providerUsed: result.connectorId,
    });

    const { records, failures } = normalizeImport(result.rawRecords, batch);
    expect(failures).toHaveLength(0);
    expect(records).toHaveLength(2);

    const tx = records[0]!;
    expect(tx.importBatchId).toBe(batch.id);
    expect(tx.sourceType).toBe('scraper');
    expect(tx.extractionMethod).toBe('scraper');
    expect(tx.schemaVersion).toBe(2);
    expect(tx.warnings).toEqual([]);
  });

  it('canonical transaction ids are deterministic across two runs (idempotency)', async () => {
    const connector = new FixtureConnector({ descriptor: bankDescriptor, accounts: fixtureBank });
    const batch = createImportBatch({ sourceType: 'scraper', extractionMethod: 'scraper' });

    const r1 = await connector.run({}, options);
    const r2 = await connector.run({}, options);
    expect(r1.status).toBe('success');
    expect(r2.status).toBe('success');
    if (r1.status !== 'success' || r2.status !== 'success') return;

    const { records: t1 } = normalizeImport(r1.rawRecords, batch);
    const { records: t2 } = normalizeImport(r2.rawRecords, batch);

    const ids1 = t1.map((t) => t.id).sort();
    const ids2 = t2.map((t) => t.id).sort();
    expect(ids1).toEqual(ids2);
  });

  it('all canonical transactions reference a valid account id', async () => {
    const connector = new FixtureConnector({ descriptor: bankDescriptor, accounts: fixtureBank });
    const result = await connector.run({}, options);
    expect(result.status).toBe('success');
    if (result.status !== 'success') return;

    const batch = createImportBatch({ sourceType: 'scraper', extractionMethod: 'scraper' });
    const { records } = normalizeImport(result.rawRecords, batch);
    const accountIds = new Set(result.accounts.map((a) => a.id));
    for (const tx of records) {
      expect(accountIds.has(tx.accountId)).toBe(true);
    }
  });
});

describe('Connector contract — FixtureConnector (card)', () => {
  it('normalizes card transactions with installment provenance', async () => {
    const connector = new FixtureConnector({ descriptor: cardDescriptor, accounts: fixtureCard });
    const result = await connector.run({ username: 'u', password: 'p' }, options);
    expect(result.status).toBe('success');
    if (result.status !== 'success') return;

    const batch = createImportBatch({ sourceType: 'scraper', extractionMethod: 'scraper' });
    const { records } = normalizeImport(result.rawRecords, batch);

    const tx = records[0]!;
    expect(tx.installmentNumber).toBe(1);
    expect(tx.installmentTotal).toBe(3);
    expect(tx.sourceType).toBe('scraper');
  });
});

describe('Connector error handling', () => {
  it('auth error is returned with errorKind: auth', async () => {
    const connector = new FixtureConnector({
      descriptor: bankDescriptor,
      fail: { errorKind: 'auth', message: 'Invalid credentials' },
    });
    const result = await connector.run({ userCode: 'wrong', password: 'wrong' }, options);
    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.errorKind).toBe('auth');
    expect(result.message).not.toContain('wrong');
  });

  it('network error is returned with errorKind: network', async () => {
    const connector = new FixtureConnector({
      descriptor: bankDescriptor,
      fail: { errorKind: 'network', message: 'Navigation timeout' },
    });
    const result = await connector.run({}, options);
    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.errorKind).toBe('network');
  });
});
