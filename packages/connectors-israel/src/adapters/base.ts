import type { Connector, ConnectorDescriptor, ImportOptions, ImportResult } from '../connector.js';
import type { ScraperResult, ScraperCompanyId } from '../scraper-types.js';
import { normalizeAccount, normalizeRawRecord } from '../normalize.js';

/**
 * Base class for all Israeli bank/card adapters.
 *
 * Subclasses provide:
 * - `descriptor` — metadata about the institution
 * - `runScraper()` — calls the external scraper and returns raw ScraperResult
 *
 * The base class handles:
 * - Conversion of scraper output to RawImportRecord[] (pre-canonical)
 * - Error classification (auth / network / unknown)
 * - Credential redaction from error messages (no secret logging)
 *
 * Callers must pass the returned rawRecords through @pocket/core-model's
 * `normalizeImport()` pipeline before storing in the DB.
 */
export abstract class BaseAdapter implements Connector {
  abstract readonly descriptor: ConnectorDescriptor;

  protected abstract runScraper(
    companyId: ScraperCompanyId,
    credentials: Record<string, string>,
    options: ImportOptions,
  ): Promise<ScraperResult>;

  async run(
    credentials: Record<string, string>,
    options: ImportOptions,
  ): Promise<ImportResult> {
    const start = Date.now();

    let raw: ScraperResult;
    try {
      raw = await this.runScraper(
        this.descriptor.id as ScraperCompanyId,
        credentials,
        options,
      );
    } catch (err: unknown) {
      return {
        status: 'error',
        errorKind: 'unknown',
        message: err instanceof Error ? err.message : 'Unexpected scraper error',
        durationMs: Date.now() - start,
      };
    }

    if (!raw.success) {
      return {
        status: 'error',
        errorKind: classifyError(raw.errorType),
        message: raw.errorMessage ?? raw.errorType ?? 'Scraper returned failure',
        durationMs: Date.now() - start,
      };
    }

    const accounts = (raw.accounts ?? []).map((a) =>
      normalizeAccount(this.descriptor.id, this.descriptor.institutionType, a),
    );

    const rawRecords = (raw.accounts ?? []).flatMap((scraperAccount) => {
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
      accounts,
      rawRecords,
      connectorId: this.descriptor.id,
      durationMs: Date.now() - start,
    };
  }
}

function classifyError(errorType: string | undefined): 'auth' | 'network' | 'unknown' {
  if (!errorType) return 'unknown';
  const t = errorType.toLowerCase();
  if (t.includes('invalid') || t.includes('credentials') || t.includes('login')) return 'auth';
  if (t.includes('network') || t.includes('timeout') || t.includes('navigation')) return 'network';
  return 'unknown';
}
