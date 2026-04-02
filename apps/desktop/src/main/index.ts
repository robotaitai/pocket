import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { openDb } from './db/init.js';
import { getSetting, setSetting } from './db/settings.js';
import { createSecretStore } from './secrets/index.js';
import { getProviderConfig, setProviderConfig, providerKeychainAccount } from './db/providers.js';
import { createProvider } from '@pocket/agent-client';
import type { ProviderConfig, ProviderType } from '@pocket/agent-client';
import { extractFile, ingestExtractedRecords } from './file-extractor.js';
import {
  getBatchSummaries,
  getTransactionsForReview,
  setReviewStatus,
  setTransactionCategory,
  undoLastAction,
  type ReviewStatus,
} from './db/review.js';
import {
  suggestCategory,
  recordMerchantRule,
  getAllMerchantRules,
  deleteMerchantRule,
} from './db/merchant-rules.js';
import {
  getAcceptedTransactions,
  getBatchHealthRows,
  searchTransactions,
  getTransactionsForExport,
  type SearchFilter,
} from './db/insights.js';
import { executeChat } from './chat-executor.js';
import {
  summarizePeriod,
  detectRecurring,
  buildMerchantSummaries,
  findNewAndSuspiciousMerchants,
  buildImportHealthReport,
  exportToCsv,
  currentMonth,
  lastMonth,
  lastNMonths,
} from '@pocket/insights';
import { dialog } from 'electron';
import { writeFile } from 'node:fs/promises';

// __dirname is available because this file compiles to CJS (no "type":"module" in package.json)
const POCKET_SERVICE = 'pocket';

async function createWindow(): Promise<void> {
  const userDataPath = app.getPath('userData');
  const db = openDb(path.join(userDataPath, 'pocket.db'));
  const secrets = await createSecretStore();

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Pocket',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  ipcMain.handle('settings:get', (_e, key: string) => getSetting(db, key));
  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    setSetting(db, key, value);
  });
  ipcMain.handle('secrets:get', (_e, account: string) =>
    secrets.get(POCKET_SERVICE, account),
  );
  ipcMain.handle('secrets:set', (_e, account: string, secret: string) =>
    secrets.set(POCKET_SERVICE, account, secret),
  );
  ipcMain.handle('secrets:delete', (_e, account: string) =>
    secrets.delete(POCKET_SERVICE, account),
  );

  // Review queue
  ipcMain.handle('review:getBatches', () => getBatchSummaries(db));
  ipcMain.handle('review:getTransactions', (_e, opts: { batchId?: string; reviewStatus?: ReviewStatus | 'all' }) =>
    getTransactionsForReview(db, opts),
  );
  ipcMain.handle('review:accept', (_e, ids: string[]) => {
    setReviewStatus(db, ids, 'accepted', ids.length > 1 ? 'bulk_accept' : 'accept');
  });
  ipcMain.handle('review:reject', (_e, ids: string[]) => {
    setReviewStatus(db, ids, 'rejected', ids.length > 1 ? 'bulk_reject' : 'reject');
  });
  ipcMain.handle('review:setCategory', (_e, id: string, category: string, saveMerchantRule: boolean) => {
    setTransactionCategory(db, id, category);
    if (saveMerchantRule) {
      const txn = getTransactionsForReview(db, {}).find((t) => t.id === id);
      if (txn) recordMerchantRule(db, txn.description, category);
    }
  });
  ipcMain.handle('review:undo', () => undoLastAction(db));

  // Merchant rules
  ipcMain.handle('merchantRules:getAll', () => getAllMerchantRules(db));
  ipcMain.handle('merchantRules:suggest', (_e, description: string) => suggestCategory(db, description));
  ipcMain.handle('merchantRules:delete', (_e, id: string) => deleteMerchantRule(db, id));

  // Insights — period summaries
  ipcMain.handle('insights:getSummary', (_e, periodKey: string) => {
    const range = periodKey === 'last-month' ? lastMonth()
      : periodKey === 'last-3-months' ? lastNMonths(3)
      : currentMonth();
    const txns = getAcceptedTransactions(db, range);
    return summarizePeriod(txns, range);
  });

  ipcMain.handle('insights:getRecurring', () => {
    const txns = getAcceptedTransactions(db);
    return detectRecurring(txns);
  });

  ipcMain.handle('insights:getMerchants', (_e, limit: number) => {
    const txns = getAcceptedTransactions(db);
    return buildMerchantSummaries(txns).slice(0, limit ?? 20);
  });

  ipcMain.handle('insights:getNewMerchants', () => {
    const txns = getAcceptedTransactions(db);
    return findNewAndSuspiciousMerchants(txns);
  });

  ipcMain.handle('insights:search', (_e, filter: SearchFilter) =>
    searchTransactions(db, filter),
  );

  ipcMain.handle('insights:getImportHealth', () => {
    const rows = getBatchHealthRows(db);
    return buildImportHealthReport(rows);
  });

  ipcMain.handle('insights:chat', async (_e, question: string) => {
    const config = getProviderConfig(db);
    let provider;
    if (config.mode === 'connected' && config.chatEnhancementEnabled) {
      const apiKey = await secrets.get(POCKET_SERVICE, providerKeychainAccount(config.providerType));
      provider = createProvider({ providerType: config.providerType, apiKey: apiKey ?? undefined });
    }
    return executeChat(db, question, provider, config.chatEnhancementEnabled);
  });

  ipcMain.handle('insights:export', async (_e, filter: SearchFilter) => {
    const txns = getTransactionsForExport(db, filter);
    const reviewStatuses: Record<string, string> = {};
    for (const t of txns) reviewStatuses[t.id] = t.reviewStatus;
    const csv = exportToCsv(txns, reviewStatuses);

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export transactions',
      defaultPath: `pocket-export-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (canceled || !filePath) return { success: false, reason: 'canceled' };
    await writeFile(filePath, csv, 'utf-8');
    return { success: true, filePath };
  });

  // Provider / connected-agent mode
  ipcMain.handle('provider:getConfig', () => getProviderConfig(db));

  ipcMain.handle('provider:setConfig', (_e, config: Partial<ProviderConfig>) => {
    setProviderConfig(db, config);
  });

  ipcMain.handle('provider:setKey', async (_e, providerType: ProviderType, apiKey: string) => {
    const account = providerKeychainAccount(providerType);
    await secrets.set(POCKET_SERVICE, account, apiKey);
  });

  ipcMain.handle('provider:clearKey', async (_e, providerType: ProviderType) => {
    const account = providerKeychainAccount(providerType);
    await secrets.delete(POCKET_SERVICE, account);
  });

  ipcMain.handle('provider:testConnection', async () => {
    const config = getProviderConfig(db);
    if (config.mode === 'local') return { ok: true, local: true };
    const apiKey = await secrets.get(POCKET_SERVICE, providerKeychainAccount(config.providerType));
    if (!apiKey) return { ok: false, error: 'No API key stored for this provider' };
    const provider = createProvider({ providerType: config.providerType, apiKey });
    return provider.testConnection();
  });

  // File import
  ipcMain.handle('fileImport:pickAndExtract', async () => {
    const config = getProviderConfig(db);
    const apiKey = config.mode === 'connected'
      ? await secrets.get(POCKET_SERVICE, providerKeychainAccount(config.providerType))
      : undefined;
    const provider = createProvider({ providerType: config.mode === 'connected' ? config.providerType : 'local', apiKey: apiKey ?? undefined });

    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Import financial file',
      filters: [
        { name: 'Financial files', extensions: ['csv', 'xlsx', 'xls', 'pdf'] },
        { name: 'CSV', extensions: ['csv'] },
        { name: 'Excel', extensions: ['xlsx', 'xls'] },
        { name: 'PDF', extensions: ['pdf'] },
      ],
      properties: ['openFile'],
    });
    if (canceled || filePaths.length === 0) return { canceled: true };

    const filePath = filePaths[0]!;

    // Use a fallback account — user can choose in Settings; default to first account
    const firstAccount = db.prepare<[], { id: string }>('SELECT id FROM accounts LIMIT 1').get();
    if (!firstAccount) return { error: 'No accounts configured. Add an account before importing files.' };

    const extractionResult = await extractFile({
      filePath,
      accountId: firstAccount.id,
      provider,
      defaultCurrency: 'ILS',
    });

    if (extractionResult.error) return { error: extractionResult.error };
    if (extractionResult.records.length === 0) return { error: 'No transactions found in the file.' };

    const ingestion = ingestExtractedRecords(db, extractionResult.records, {
      sourceType: extractionResult.sourceType,
      extractionMethod: extractionResult.sourceType === 'pdf' ? 'agent' : 'structured-parse',
      sourceFile: filePath,
      accountId: firstAccount.id,
      providerType: config.mode === 'connected' ? config.providerType : 'local',
      overallConfidence: extractionResult.overallConfidence,
    });

    return {
      batchId: ingestion.batchId,
      inserted: ingestion.inserted,
      duplicates: ingestion.duplicates,
      errors: ingestion.errors,
      documentWarnings: extractionResult.documentWarnings,
      sourceType: extractionResult.sourceType,
    };
  });

  const firstRun = getSetting(db, 'firstRunComplete') !== 'true';

  if (app.isPackaged) {
    void win.loadFile(path.join(__dirname, '../../renderer/index.html'), {
      hash: firstRun ? '/first-run' : '/',
    });
  } else {
    void win.loadURL(`http://localhost:5173${firstRun ? '/#/first-run' : ''}`);
  }
}

app.whenReady().then(() => {
  void createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
