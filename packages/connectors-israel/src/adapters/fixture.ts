import type { Account, RawImportRecord } from '@pocket/core-model';
import type { Connector, ConnectorDescriptor, ImportOptions, ImportResult } from '../connector.js';
import type { ScraperAccount } from '../scraper-types.js';
import { normalizeAccount, normalizeRawRecord } from '../normalize.js';

/**
 * Fixture-based connector for tests.
 * Bypasses the real scraper — returns sanitized pre-canonical RawImportRecord[]
 * for use in unit and integration tests. Never installs puppeteer.
 */
export class FixtureConnector implements Connector {
  readonly descriptor: ConnectorDescriptor;
  private readonly accounts: ScraperAccount[];
  private readonly shouldFail: false | { errorKind: 'auth' | 'network' | 'unknown'; message: string };

  constructor(opts: {
    descriptor: ConnectorDescriptor;
    accounts?: ScraperAccount[];
    fail?: { errorKind: 'auth' | 'network' | 'unknown'; message: string };
  }) {
    this.descriptor = opts.descriptor;
    this.accounts = opts.accounts ?? [];
    this.shouldFail = opts.fail ?? false;
  }

  async run(_credentials: Record<string, string>, _options: ImportOptions): Promise<ImportResult> {
    const start = Date.now();

    if (this.shouldFail) {
      return {
        status: 'error',
        errorKind: this.shouldFail.errorKind,
        message: this.shouldFail.message,
        durationMs: Date.now() - start,
      };
    }

    const canonicalAccounts: Account[] = this.accounts.map((a) =>
      normalizeAccount(this.descriptor.id, this.descriptor.institutionType, a),
    );

    const rawRecords: RawImportRecord[] = this.accounts.flatMap((scraperAccount) => {
      const account = normalizeAccount(
        this.descriptor.id,
        this.descriptor.institutionType,
        scraperAccount,
      );
      return scraperAccount.txns.map((tx) =>
        normalizeRawRecord(account.id, this.descriptor.id, tx),
      );
    });

    return {
      status: 'success',
      accounts: canonicalAccounts,
      rawRecords,
      connectorId: this.descriptor.id,
      durationMs: Date.now() - start,
    };
  }
}
