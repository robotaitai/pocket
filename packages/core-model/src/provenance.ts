/** How the record arrived in the system. */
export type SourceType = 'scraper' | 'pdf' | 'xlsx' | 'csv' | 'api' | 'manual';

/** How the data was extracted from the source. */
export type ExtractionMethod =
  | 'scraper'           // automated browser scraper
  | 'structured-parse'  // machine-readable file (CSV, XLSX with known schema)
  | 'ocr'               // optical character recognition from PDF/image
  | 'agent'             // LLM-assisted extraction from unstructured input
  | 'manual';           // human data entry

export interface Warning {
  /** The field path this warning applies to, e.g. 'amount', 'date'. */
  field: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

/**
 * Provenance — the full chain of custody for an imported record.
 * Every canonical record must carry this. It must never be dropped.
 */
export interface Provenance {
  /** ID of the ImportBatch this record belongs to. */
  importBatchId: string;
  sourceType: SourceType;
  /** Original filename, if the source was a file. Never uploaded. */
  sourceFile?: string;
  /** ISO 8601 timestamp of when the record was imported. */
  importTimestamp: string;
  extractionMethod: ExtractionMethod;
  /** The connector id, parser name, or agent model used. */
  providerUsed?: string;
  /** Version string of the extractor/scraper. */
  extractorVersion?: string;
  /**
   * Opaque local reference to the raw source data.
   * Stored on-device for traceability; never uploaded.
   */
  rawReference?: string;
}
