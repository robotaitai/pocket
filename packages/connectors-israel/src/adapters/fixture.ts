import type { ConnectorDescriptor, ImportOptions, ImportResult } from '../connector.js';
import type { Connector } from '../connector.js';
import type { ScraperAccount } from '../scraper-types.js';
import { normalizeAccount, normalizeTransaction } from '../normalize.js';

/**
 * Fixture-based connector for tests.
 * Bypasses the real scraper entirely — returns sanitized data on demand.
 * Never installs puppeteer or makes network calls.
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

    const accounts = this.accounts.map((a) =>
      normalizeAccount(this.descriptor.id, this.descriptor.institutionType, a),
    );
    const transactions = this.accounts.flatMap((scraperAccount) => {
      const account = normalizeAccount(
        this.descriptor.id,
        this.descriptor.institutionType,
        scraperAccount,
      );
      return scraperAccount.txns.map((tx) => normalizeTransaction(account.id, tx));
    });

    return { status: 'success', accounts, transactions, durationMs: Date.now() - start };
  }
}
