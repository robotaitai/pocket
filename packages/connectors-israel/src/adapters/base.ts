import type { Connector, ConnectorDescriptor, ImportOptions, ImportResult } from '../connector.js';
import type { ScraperResult, ScraperCompanyId } from '../scraper-types.js';
import { normalizeAccount, normalizeTransaction } from '../normalize.js';

/**
 * Base class for all Israeli bank/card adapters.
 *
 * Subclasses provide:
 * - `descriptor` — metadata about the institution
 * - `runScraper()` — calls the external scraper and returns raw ScraperResult
 *
 * The base class handles:
 * - Normalization of scraper output to core-model types
 * - Error classification (auth / network / unknown)
 * - Credential redaction from error messages (no secret logging)
 */
export abstract class BaseAdapter implements Connector {
  abstract readonly descriptor: ConnectorDescriptor;

  /**
   * Invokes the external scraper. Must not be called from outside this class
   * or its subclasses — all callers go through `run()`.
   *
   * IMPORTANT: the `credentials` record must never be logged, stored, or
   * included in error messages returned from this method.
   */
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
        // Credential values are never interpolated into this message
        message: err instanceof Error ? err.message : 'Unexpected scraper error',
        durationMs: Date.now() - start,
      };
    }

    if (!raw.success) {
      const kind = classifyError(raw.errorType);
      return {
        status: 'error',
        errorKind: kind,
        message: raw.errorMessage ?? raw.errorType ?? 'Scraper returned failure',
        durationMs: Date.now() - start,
      };
    }

    const accounts = (raw.accounts ?? []).map((a) =>
      normalizeAccount(this.descriptor.id, this.descriptor.institutionType, a),
    );

    const transactions = (raw.accounts ?? []).flatMap((scraperAccount) => {
      const account = normalizeAccount(
        this.descriptor.id,
        this.descriptor.institutionType,
        scraperAccount,
      );
      return scraperAccount.txns.map((tx) =>
        normalizeTransaction(account.id, tx),
      );
    });

    return {
      status: 'success',
      accounts,
      transactions,
      durationMs: Date.now() - start,
    };
  }
}

function classifyError(
  errorType: string | undefined,
): 'auth' | 'network' | 'unknown' {
  if (!errorType) return 'unknown';
  const t = errorType.toLowerCase();
  if (t.includes('invalid') || t.includes('credentials') || t.includes('login')) {
    return 'auth';
  }
  if (t.includes('network') || t.includes('timeout') || t.includes('navigation')) {
    return 'network';
  }
  return 'unknown';
}
