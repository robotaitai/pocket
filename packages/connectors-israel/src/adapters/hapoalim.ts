import type { ConnectorDescriptor, ImportOptions } from '../connector.js';
import type { ScraperResult, ScraperCompanyId } from '../scraper-types.js';
import { loadScraper } from '../scraper-loader.js';
import { BaseAdapter } from './base.js';

/**
 * Connector for Bank Hapoalim.
 * Credential fields: userCode, password.
 */
export class HapoalimConnector extends BaseAdapter {
  readonly descriptor: ConnectorDescriptor = {
    id: 'hapoalim',
    name: 'Bank Hapoalim',
    institutionType: 'bank',
    credentialFields: ['userCode', 'password'],
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
