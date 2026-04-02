import type { Transaction, Account } from '@pocket/core-model';

export type InstitutionType = 'bank' | 'card';

export interface ConnectorDescriptor {
  /** Matches the scraper CompanyTypes key, e.g. 'hapoalim', 'max'. */
  id: string;
  name: string;
  institutionType: InstitutionType;
  /** Credential field names required by this institution. */
  credentialFields: string[];
}

export interface ImportOptions {
  /** Inclusive start date for the import window. */
  startDate: Date;
  /** Inclusive end date. Defaults to today when omitted. */
  endDate?: Date;
}

export interface ImportSuccess {
  status: 'success';
  accounts: Account[];
  transactions: Transaction[];
  durationMs: number;
}

export interface ImportError {
  status: 'error';
  /** 'auth' — wrong credentials; do not retry automatically. */
  errorKind: 'auth' | 'network' | 'unknown';
  message: string;
  durationMs: number;
}

export type ImportResult = ImportSuccess | ImportError;

/**
 * A Connector wraps one Israeli bank or card scraper and normalizes its output
 * to `@pocket/core-model` types. It is the only layer allowed to know about
 * the external scraper implementation.
 */
export interface Connector {
  readonly descriptor: ConnectorDescriptor;
  /**
   * Runs the scraper with the given credentials and normalizes output.
   * Credentials are passed in as a plain record; the connector must not log
   * any credential values.
   */
  run(
    credentials: Record<string, string>,
    options: ImportOptions,
  ): Promise<ImportResult>;
}
