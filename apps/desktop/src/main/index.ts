import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { openDb } from './db/init.js';
import { backfillCreditCardPaymentCategories } from './db/credit-card-heuristic.js';
import { getSetting, setSetting } from './db/settings.js';
import { createSecretStore } from './secrets/index.js';
import { getProviderConfig, setProviderConfig } from './db/providers.js';
import { POCKET_SERVICE, providerKeyAccount, connectorCredentialAccount } from './secrets/keys.js';
import { createProvider } from '@pocket/agent-client';
import type { ProviderConfig, ProviderType } from '@pocket/agent-client';
import { HapoalimConnector, LeumiConnector, MaxConnector, VisaCalConnector, IsracardConnector, AmexConnector } from '@pocket/connectors-israel';
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
  applyMerchantRulesToBatch,
} from './db/merchant-rules.js';
import {
  getAcceptedTransactions,
  getBatchHealthRows,
  searchTransactions,
  getTransactionsForExport,
  getCategoryBreakdown,
  getCashFlowSeries,
  getAcceptedSourcesCount,
  getLatestImportAt,
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
  onlyMonth,
  sinceMonth,
} from '@pocket/insights';
import { dialog } from 'electron';
import { writeFile } from 'node:fs/promises';

// __dirname is available because this file compiles to CJS (no "type":"module" in package.json)

async function createWindow(): Promise<void> {
  const userDataPath = app.getPath('userData');
  const db = openDb(path.join(userDataPath, 'pocket.db'));
  backfillCreditCardPaymentCategories(db);
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
  ipcMain.handle('merchantRules:setForMerchant', (_e, description: string, category: string) => {
    // Save the merchant rule so future imports auto-categorize.
    recordMerchantRule(db, description, category);
    // Apply to all existing accepted transactions with this exact description.
    db.prepare(
      `UPDATE transactions SET category = ? WHERE description = ? AND review_status = 'accepted'`,
    ).run(category, description);
  });

  // Insights — period summaries
  function resolvePeriodRange(input: string | { start: string; end: string }) {
    if (typeof input !== 'string') {
      return input;
    }
    const key = input;
    const onlyMatch = key.match(/^only-(\d{4}-\d{2})$/);
    if (onlyMatch?.[1]) {
      return onlyMonth(onlyMatch[1]);
    }
    const sinceMatch = key.match(/^since-(\d{4}-\d{2})$/);
    if (sinceMatch?.[1]) {
      return sinceMonth(sinceMatch[1]);
    }
    const trailingMatch = key.match(/^last-(\d+)-months$/);
    if (trailingMatch?.[1]) {
      return lastNMonths(Math.max(1, Number(trailingMatch[1])));
    }
    return key === 'last-month' ? lastMonth()
      : key === 'last-3-months' ? lastNMonths(3)
      : currentMonth();
  }

  ipcMain.handle('insights:getSummary', (_e, period: string | { start: string; end: string }) => {
    const range = resolvePeriodRange(period);
    const txns = getAcceptedTransactions(db, range);
    return summarizePeriod(txns, range);
  });

  ipcMain.handle('insights:getCategoryBreakdown', (_e, period: string | { start: string; end: string }) => {
    const range = resolvePeriodRange(period);
    return getCategoryBreakdown(db, range.start, range.end);
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

  ipcMain.handle('insights:getOverviewSnapshot', (_e, period: string | { start: string; end: string }) => {
    const range = resolvePeriodRange(period);
    const txns = getAcceptedTransactions(db, range);
    const summary = summarizePeriod(txns, range);

    const startDate = new Date(`${range.start}T00:00:00Z`);
    const endDate = new Date(`${range.end}T00:00:00Z`);
    const spanDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000));
    const previousEnd = new Date(startDate);
    const previousStart = new Date(startDate);
    previousStart.setUTCDate(previousStart.getUTCDate() - spanDays);
    const previousRange = {
      start: previousStart.toISOString().slice(0, 10),
      end: previousEnd.toISOString().slice(0, 10),
    };
    const previousSummary = summarizePeriod(getAcceptedTransactions(db, previousRange), previousRange);

    const allAccepted = getAcceptedTransactions(db);
    const recurring = detectRecurring(allAccepted);
    const newMerchants = findNewAndSuspiciousMerchants(allAccepted);
    const batches = getBatchHealthRows(db);
    const updatedAt = getLatestImportAt(db);

    const events: Array<{
      id: string;
      date: string;
      title: string;
      detail: string;
      tone: 'accent' | 'success' | 'warning' | 'danger';
    }> = [];

    const inRange = (iso: string): boolean => iso.slice(0, 10) >= range.start && iso.slice(0, 10) < range.end;

    for (const batch of batches.filter((item) => inRange(item.createdAt)).slice(0, 3)) {
      events.push({
        id: `batch-${batch.batchId}`,
        date: batch.createdAt.slice(0, 10),
        title: 'Import completed',
        detail: `${batch.total} transactions processed from ${batch.sourceType}.`,
        tone: 'accent',
      });
      if (batch.pending === 0 && batch.accepted > 0) {
        events.push({
          id: `review-${batch.batchId}`,
          date: batch.createdAt.slice(0, 10),
          title: 'Review batch accepted',
          detail: `${batch.accepted} transactions were accepted from this import batch.`,
          tone: 'success',
        });
      }
    }

    for (const merchant of newMerchants.filter((item) => item.isSuspicious && inRange(item.lastSeen)).slice(0, 2)) {
      events.push({
        id: `suspicious-${merchant.description}`,
        date: merchant.lastSeen.slice(0, 10),
        title: 'Suspicious merchant detected',
        detail: `${merchant.description} looks unusual relative to prior activity.`,
        tone: 'danger',
      });
    }

    for (const recurringItem of recurring.filter((item) => inRange(item.firstSeen)).slice(0, 2)) {
      events.push({
        id: `recurring-${recurringItem.description}`,
        date: recurringItem.firstSeen.slice(0, 10),
        title: 'New recurring payment',
        detail: `${recurringItem.description} now appears to recur on a ${recurringItem.period} cadence.`,
        tone: 'warning',
      });
    }

    if (updatedAt) {
      const ageDays = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000);
      if (ageDays >= 7) {
        events.push({
          id: 'stale-import',
          date: updatedAt.slice(0, 10),
          title: 'Import freshness is slipping',
          detail: `No new import has landed for ${ageDays} day${ageDays === 1 ? '' : 's'}.`,
          tone: 'warning',
        });
      }
    }

    events.sort((a, b) => b.date.localeCompare(a.date));

    return {
      period: range,
      updatedAt,
      acceptedTransactionCount: summary.transactionCount,
      sourcesIncluded: getAcceptedSourcesCount(db, range.start, range.end),
      trend: getCashFlowSeries(db, range.start, range.end),
      comparison: {
        incomeChange: previousSummary.income === 0 ? null : Math.round((((summary.income - previousSummary.income) / Math.abs(previousSummary.income)) * 100) * 10) / 10,
        expenseChange: previousSummary.expenses === 0 ? null : Math.round((((summary.expenses - previousSummary.expenses) / Math.abs(previousSummary.expenses)) * 100) * 10) / 10,
        netChange: previousSummary.net === 0 ? null : Math.round((((summary.net - previousSummary.net) / Math.abs(previousSummary.net)) * 100) * 10) / 10,
      },
      events: events.slice(0, 6),
      upcoming: recurring
        .filter((item) => item.nextExpectedDate)
        .sort((a, b) => (a.nextExpectedDate ?? '').localeCompare(b.nextExpectedDate ?? ''))
        .slice(0, 8)
        .map((item) => ({
          description: item.description,
          nextExpectedDate: item.nextExpectedDate!,
          amount: item.estimatedAmount,
          period: item.period,
          confidence: item.confidence,
        })),
    };
  });

  ipcMain.handle('insights:chat', async (_e, question: string) => {
    const config = getProviderConfig(db);
    let provider;
    if (config.mode === 'connected' && config.chatEnhancementEnabled) {
      const apiKey = await secrets.get(POCKET_SERVICE, providerKeyAccount(config.providerType));
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
    const account = providerKeyAccount(providerType);
    await secrets.set(POCKET_SERVICE, account, apiKey);
  });

  ipcMain.handle('provider:clearKey', async (_e, providerType: ProviderType) => {
    const account = providerKeyAccount(providerType);
    await secrets.delete(POCKET_SERVICE, account);
  });

  ipcMain.handle('provider:testConnection', async () => {
    const config = getProviderConfig(db);
    if (config.mode === 'local') return { ok: true, local: true };
    const apiKey = await secrets.get(POCKET_SERVICE, providerKeyAccount(config.providerType));
    if (!apiKey) return { ok: false, error: 'No API key stored for this provider' };
    const provider = createProvider({ providerType: config.providerType, apiKey });
    return provider.testConnection();
  });

  // Connector credential management
  // Credentials are stored per connector per field: pocket:connector:<id>:<field>
  const CONNECTORS = [
    new HapoalimConnector(),
    new LeumiConnector(),
    new MaxConnector(),
    new VisaCalConnector(),
    new IsracardConnector(),
    new AmexConnector(),
  ];

  ipcMain.handle('credentials:listConnectors', () =>
    CONNECTORS.map((c) => c.descriptor),
  );

  ipcMain.handle('credentials:setField', async (_e, connectorId: string, field: string, value: string) => {
    const account = connectorCredentialAccount(connectorId, field);
    await secrets.set(POCKET_SERVICE, account, value);
  });

  ipcMain.handle('credentials:getFieldStatus', async (_e, connectorId: string, field: string) => {
    const account = connectorCredentialAccount(connectorId, field);
    const val = await secrets.get(POCKET_SERVICE, account);
    return { set: val !== null };
  });

  ipcMain.handle('credentials:clearField', async (_e, connectorId: string, field: string) => {
    const account = connectorCredentialAccount(connectorId, field);
    await secrets.delete(POCKET_SERVICE, account);
  });

  ipcMain.handle('credentials:testConnection', async (_e, connectorId: string) => {
    const connector = CONNECTORS.find((c) => c.descriptor.id === connectorId);
    if (!connector) return { ok: false, error: `Unknown connector: ${connectorId}` };

    // Retrieve all credential fields from keychain
    const creds: Record<string, string> = {};
    for (const field of connector.descriptor.credentialFields) {
      const account = connectorCredentialAccount(connectorId, field);
      const value = await secrets.get(POCKET_SERVICE, account);
      if (!value) return { ok: false, error: `Missing credential: ${field}` };
      creds[field] = value;
    }

    // Test with a minimal date range (today only) to minimize scraper load
    const now = new Date();
    try {
      const result = await connector.run(creds, { startDate: now, endDate: now });
      if (result.status === 'success') {
        return { ok: true, accountsFound: result.accounts.length };
      }
      // Auth errors must not be retried and must not expose credential values
      return { ok: false, error: result.errorKind === 'auth' ? 'Authentication failed — check your credentials' : result.message };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Connection test failed' };
    }
  });

  // Connector (scraper) import run
  ipcMain.handle('connector:run', async (_e, connectorId: string, startDate: string) => {
    const connector = CONNECTORS.find((c) => c.descriptor.id === connectorId);
    if (!connector) return { error: `Unknown connector: ${connectorId}` };

    const creds: Record<string, string> = {};
    for (const field of connector.descriptor.credentialFields) {
      const val = await secrets.get(POCKET_SERVICE, connectorCredentialAccount(connectorId, field));
      if (!val) return { error: `Missing credential: ${field}. Set it in Settings → Bank and Card Credentials.` };
      creds[field] = val;
    }

    const lookbackDays = parseInt(getSetting(db, 'import_lookback_days') ?? '365', 10);
    const start = startDate ? new Date(startDate) : new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    let result;
    try {
      result = await connector.run(creds, { startDate: start });
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Import failed' };
    }

    if (result.status === 'error') {
      return { error: result.errorKind === 'auth' ? 'Authentication failed — check your credentials in Settings.' : result.message };
    }

    // Ensure accounts exist in DB
    for (const account of result.accounts) {
      const exists = db.prepare('SELECT id FROM accounts WHERE id = ?').get(account.id);
      if (!exists) {
        db.prepare(`
          INSERT INTO accounts (id, institution, institution_type, account_number, type, currency, label)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(account.id, account.institution, account.institutionType, account.accountNumber, 'checking', account.currency, account.label ?? null);
      }
    }

    // Ingest records
    const { createImportBatch, normalizeImport, transactionId } = await import('@pocket/core-model');
    const batch = createImportBatch({
      sourceType: 'scraper',
      connectorId,
      extractionMethod: 'scraper',
      providerUsed: connectorId,
      extractorVersion: '1.0',
    });

    db.prepare(`
      INSERT INTO import_batches (id, created_at, source_type, connector_id, account_ids, transaction_count, status, extraction_method, provider_used, extractor_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(batch.id, batch.createdAt, batch.sourceType, batch.connectorId, JSON.stringify(result.accounts.map(a => a.id)), result.rawRecords.length, 'completed', batch.extractionMethod, batch.providerUsed ?? null, batch.extractorVersion ?? null);

    let inserted = 0;
    let duplicates = 0;
    const errors: string[] = [];

    for (const record of result.rawRecords) {
      try {
        const normalized = normalizeImport([record], batch);
        for (const txn of normalized.records) {
          const id = transactionId(txn.accountId, txn.date, txn.processedDate, txn.originalAmount, txn.originalCurrency, txn.description);
          const exists = db.prepare('SELECT id FROM transactions WHERE id = ?').get(id);
          if (exists) { duplicates++; continue; }
          db.prepare(`
            INSERT INTO transactions (
              id, account_id, date, processed_date, amount, original_amount, original_currency,
              charged_currency, description, memo, status, category, source_type, source_file,
              import_batch_id, import_timestamp, extraction_method, provider_used, extractor_version,
              raw_reference, confidence_score, warnings, merchant_id, schema_version, reference_id,
              installment_number, installment_total, review_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
          `).run(
            id, txn.accountId, txn.date, txn.processedDate, txn.amount, txn.originalAmount,
            txn.originalCurrency, txn.chargedCurrency, txn.description, txn.memo ?? null,
            txn.status, txn.category ?? null, txn.sourceType, txn.sourceFile ?? null,
            txn.importBatchId, txn.importTimestamp, txn.extractionMethod,
            txn.providerUsed ?? null, txn.extractorVersion ?? null, txn.rawReference ?? null,
            txn.confidenceScore ?? null, JSON.stringify(txn.warnings),
            txn.merchantId ?? null, txn.schemaVersion,
            txn.referenceId ?? null, txn.installmentNumber ?? null, txn.installmentTotal ?? null,
          );
          inserted++;
        }
        errors.push(...normalized.failures.map(f => `${f.raw.description}: ${f.errors.map(e => e.message).join(', ')}`));
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    // Apply known merchant rules to pending transactions in this batch so they
    // arrive pre-tagged in the review queue, ready for bulk accept.
    applyMerchantRulesToBatch(db, batch.id);

    return { batchId: batch.id, inserted, duplicates, errors, accounts: result.accounts.length };
  });

  // File import
  ipcMain.handle('fileImport:pickAndExtract', async () => {
    const config = getProviderConfig(db);
    // Always try to use the stored API key for file import — the mode toggle controls
    // chat enhancement and suggestions, but having a key should always enable PDF extraction.
    const apiKey = await secrets.get(POCKET_SERVICE, providerKeyAccount(config.providerType));
    const provider = createProvider({
      providerType: apiKey ? config.providerType : 'local',
      apiKey: apiKey ?? undefined,
    });

    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Import financial files',
      filters: [
        { name: 'Financial files', extensions: ['csv', 'xlsx', 'xls', 'pdf'] },
        { name: 'CSV', extensions: ['csv'] },
        { name: 'Excel', extensions: ['xlsx', 'xls'] },
        { name: 'PDF', extensions: ['pdf'] },
      ],
      properties: ['openFile', 'multiSelections'],
    });
    if (canceled || filePaths.length === 0) return { canceled: true };

    const firstAccount = db.prepare<[], { id: string }>('SELECT id FROM accounts LIMIT 1').get();
    if (!firstAccount) return { error: 'No accounts configured. Add an account before importing files.' };

    let totalInserted = 0;
    let totalDuplicates = 0;
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const fileResults: Array<{ file: string; inserted: number; duplicates: number; errors: string[]; error?: string }> = [];

    for (const filePath of filePaths) {
      const fileName = path.basename(filePath);
      const extractionResult = await extractFile({
        filePath,
        accountId: firstAccount.id,
        provider,
        db,
        defaultCurrency: 'ILS',
      });

      if (extractionResult.error) {
        fileResults.push({ file: fileName, inserted: 0, duplicates: 0, errors: [], error: extractionResult.error });
        allErrors.push(`${fileName}: ${extractionResult.error}`);
        continue;
      }
      if (extractionResult.records.length === 0) {
        fileResults.push({ file: fileName, inserted: 0, duplicates: 0, errors: [], error: 'No transactions found' });
        allErrors.push(`${fileName}: No transactions found`);
        continue;
      }

      const ingestion = ingestExtractedRecords(db, extractionResult.records, {
        sourceType: extractionResult.sourceType,
        extractionMethod: extractionResult.sourceType === 'pdf' ? 'agent' : 'structured-parse',
        sourceFile: filePath,
        accountId: firstAccount.id,
        providerType: config.mode === 'connected' ? config.providerType : 'local',
        overallConfidence: extractionResult.overallConfidence,
      });

      // Apply known merchant rules so this batch arrives pre-tagged.
      applyMerchantRulesToBatch(db, ingestion.batchId);

      totalInserted += ingestion.inserted;
      totalDuplicates += ingestion.duplicates;
      allErrors.push(...ingestion.errors.map((e) => `${fileName}: ${e}`));
      allWarnings.push(...extractionResult.documentWarnings.map((w) => `${fileName}: ${w}`));
      fileResults.push({ file: fileName, inserted: ingestion.inserted, duplicates: ingestion.duplicates, errors: ingestion.errors });
    }

    return {
      inserted: totalInserted,
      duplicates: totalDuplicates,
      errors: allErrors,
      documentWarnings: allWarnings,
      fileResults,
      fileCount: filePaths.length,
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
