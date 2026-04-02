/**
 * A normalized merchant entity.
 *
 * The same real-world merchant can appear under many raw descriptions across
 * different banks and import methods. The Merchant model provides a stable
 * canonical identity that survives normalization across sources.
 */
export interface Merchant {
  /** Deterministic id: sha256(normalizedName).slice(0,32). */
  id: string;
  /** Canonical, cleaned name — used for categorization and display. */
  normalizedName: string;
  /** Raw description strings that have been mapped to this merchant. */
  aliases: string[];
  category?: string;
  /** ISO 3166-1 alpha-2 country code, if known. */
  country?: string;
}
