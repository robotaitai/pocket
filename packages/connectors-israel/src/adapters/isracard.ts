import type { ConnectorDescriptor, ImportOptions } from '../connector.js';
import type { ScraperResult, ScraperCompanyId } from '../scraper-types.js';
import { loadScraper } from '../scraper-loader.js';
import { BaseAdapter } from './base.js';

/**
 * Connector for Isracard credit cards.
 * Used by Bank Hapoalim card holders and direct Isracard cardholders.
 * Credential fields: id (Israeli ID number), password, card6Digits (last 6 digits of card).
 */
export class IsracardConnector extends BaseAdapter {
  readonly descriptor: ConnectorDescriptor = {
    id: 'isracard',
    name: 'Isracard',
    institutionType: 'card',
    credentialFields: ['id', 'password', 'card6Digits'],
  };

  protected async runScraper(
    companyId: ScraperCompanyId,
    credentials: Record<string, string>,
    options: ImportOptions,
  ): Promise<ScraperResult> {
    const { createScraper } = await loadScraper();
    const scraper = createScraper({
      companyId,
      startDate: options.startDate,
      showBrowser: false,
    });
    return scraper.scrape(credentials);
  }
}
