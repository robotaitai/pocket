import type { Account, RawImportRecord } from '@pocket/core-model';

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
  /**
   * Pre-canonical records ready for the normalization pipeline.
   * Callers must pass these through `normalizeImport()` in @pocket/core-model
   * before storing in the DB — raw records have no importBatchId yet.
   */
  rawRecords: RawImportRecord[];
  /** Connector id — use as `providerUsed` when creating the ImportBatch. */
  connectorId: string;
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
 * A Connector wraps one Israeli bank or card scraper and produces
 * pre-canonical RawImportRecord[] ready for the normalization pipeline.
 * It is the only layer allowed to know about the external scraper implementation.
 */
export interface Connector {
  readonly descriptor: ConnectorDescriptor;
  run(
    credentials: Record<string, string>,
    options: ImportOptions,
  ): Promise<ImportResult>;
}
