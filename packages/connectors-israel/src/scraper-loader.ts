import type { ScraperResult, ScraperCompanyId } from './scraper-types.js';

/**
 * Loads the external scraper at runtime and returns a thin callable.
 *
 * The import path is stored in a typed variable rather than a string literal
 * so TypeScript does not statically resolve the scraper's module graph.
 * (TypeScript only typechecks `import()` when the specifier is a compile-time
 * constant; a `string`-typed variable results in `Promise<any>`.)
 *
 * The scraper must be built before the connector runs:
 *   cd external/israeli-bank-scrapers && npm run build
 * The compiled output lives at external/israeli-bank-scrapers/lib/index.js.
 */

interface ScraperModule {
  createScraper: (opts: {
    companyId: ScraperCompanyId;
    startDate: Date;
    showBrowser: boolean;
  }) => {
    scrape: (credentials: Record<string, string>) => Promise<ScraperResult>;
  };
}

// Relative path from packages/connectors-israel/src/ to the compiled scraper.
// Stored as a plain `string` variable — TypeScript treats import(stringVar)
// as `Promise<any>`, preventing static resolution of the scraper tree.
const SCRAPER_PATH: string =
  '../../../external/israeli-bank-scrapers/lib/index.js';

let cachedModule: ScraperModule | null = null;

export async function loadScraper(): Promise<ScraperModule> {
  if (cachedModule) return cachedModule;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const mod = await import(SCRAPER_PATH);
  cachedModule = mod as ScraperModule;
  return cachedModule;
}
