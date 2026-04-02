import type Database from 'better-sqlite3';
import {
  parseChatQuestion,
  periodRangeFromToken,
  summarizePeriod,
  comparePeriods,
  detectRecurring,
  buildMerchantSummaries,
  findNewAndSuspiciousMerchants,
  currentMonth,
  SUGGESTED_QUESTIONS,
} from '@pocket/insights';
import type { ChatAnswer, ChatSource } from '@pocket/insights';
import { getAcceptedTransactions } from './db/insights.js';

export async function executeChat(db: Database.Database, question: string): Promise<ChatAnswer> {
  const plan = parseChatQuestion(question);
  const sources: ChatSource[] = [];
  let text = '';
  let uncertainty: string | null = null;

  const toSources = (txns: Array<{ id: string; description: string; date: string; amount: number; originalCurrency: string; importBatchId: string }>) =>
    txns.slice(0, 10).map((t) => ({
      transactionId: t.id,
      description: t.description,
      date: t.date.slice(0, 10),
      amount: t.amount,
      currency: t.originalCurrency,
      importBatchId: t.importBatchId,
    }));

  const fmt = (n: number, currency = 'ILS') =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency }).format(n);

  switch (plan.intent) {
    case 'period_summary': {
      const period = periodRangeFromToken(String(plan.params['period'] ?? 'this month'));
      const txns = getAcceptedTransactions(db, period);
      if (txns.length === 0) {
        text = `No accepted transactions found for ${period.start} – ${period.end}.`;
        uncertainty = 'Data may still be pending review.';
        break;
      }
      const summary = summarizePeriod(txns, period);
      text = `For ${period.start} – ${period.end}:\n• Income: ${fmt(summary.income)}\n• Expenses: ${fmt(summary.expenses)}\n• Net: ${fmt(summary.net)}\n• ${summary.transactionCount} transactions`;
      if (summary.hasLowConfidenceData) uncertainty = 'Some transactions in this period have low extraction confidence.';
      sources.push(...toSources(txns.filter((t) => t.amount < 0)));
      break;
    }

    case 'category_spend': {
      const cat = String(plan.params['category'] ?? '');
      const period = periodRangeFromToken(String(plan.params['period'] ?? 'this month'));
      const txns = getAcceptedTransactions(db, period, { category: cat });
      if (txns.length === 0) {
        text = `No accepted transactions for category "${cat}" in ${period.start} – ${period.end}.`;
        break;
      }
      const total = txns.reduce((s, t) => s + t.amount, 0);
      text = `Spent ${fmt(Math.abs(total))} on ${cat} in ${period.start} – ${period.end} across ${txns.length} transactions.`;
      if (txns.some((t) => t.confidenceScore != null && t.confidenceScore < 0.7)) {
        uncertainty = 'Some transactions may have been misclassified (low confidence).';
      }
      sources.push(...toSources(txns));
      break;
    }

    case 'period_comparison': {
      const p1 = periodRangeFromToken(String(plan.params['period1'] ?? 'this month'));
      const p2 = periodRangeFromToken(String(plan.params['period2'] ?? 'last month'));
      const [t1, t2] = [getAcceptedTransactions(db, p1), getAcceptedTransactions(db, p2)];
      const [s1, s2] = [summarizePeriod(t1, p1), summarizePeriod(t2, p2)];
      const cmp = comparePeriods(s1, s2);
      const changeStr = (v: number | null) => v == null ? 'N/A' : `${v > 0 ? '+' : ''}${v}%`;
      text = `${p1.start} vs ${p2.start}:\n• Expenses: ${fmt(s1.expenses)} vs ${fmt(s2.expenses)} (${changeStr(cmp.expenseChange)})\n• Income: ${fmt(s1.income)} vs ${fmt(s2.income)} (${changeStr(cmp.incomeChange)})\n• Net: ${fmt(s1.net)} vs ${fmt(s2.net)} (${changeStr(cmp.netChange)})`;
      break;
    }

    case 'recurring_list': {
      const allTxns = getAcceptedTransactions(db);
      const recurring = detectRecurring(allTxns).slice(0, 15);
      if (recurring.length === 0) {
        text = 'No recurring payments detected yet. Accept more transactions and try again.';
        break;
      }
      const lines = recurring.map(
        (r) => `• ${r.description} — ${fmt(r.estimatedAmount)} (${r.period}, confidence ${Math.round(r.confidence * 100)}%)`,
      );
      text = `Found ${recurring.length} recurring payment patterns:\n${lines.join('\n')}`;
      sources.push(...toSources(allTxns.filter((t) => recurring.some((r) => r.description === t.description))));
      break;
    }

    case 'new_merchants': {
      const allTxns = getAcceptedTransactions(db);
      const newMerchants = findNewAndSuspiciousMerchants(allTxns);
      if (newMerchants.length === 0) {
        text = 'No new or suspicious merchants found in recent accepted transactions.';
        break;
      }
      const lines = newMerchants.slice(0, 10).map(
        (m) => `• ${m.description} — ${fmt(Math.abs(m.total))}${m.isSuspicious ? ' (untagged, high amount)' : ' (new)'}`,
      );
      text = `Found ${newMerchants.length} new or suspicious merchants:\n${lines.join('\n')}`;
      break;
    }

    case 'merchant_history': {
      const merchant = String(plan.params['merchant'] ?? '');
      const period = periodRangeFromToken(String(plan.params['period'] ?? 'last 3 months'));
      const txns = getAcceptedTransactions(db, period, { merchant });
      if (txns.length === 0) {
        text = `No accepted transactions found for "${merchant}" in ${period.start} – ${period.end}.`;
        break;
      }
      const total = txns.reduce((s, t) => s + t.amount, 0);
      text = `Spent ${fmt(Math.abs(total))} at "${merchant}" in ${period.start} – ${period.end} (${txns.length} transactions).`;
      sources.push(...toSources(txns));
      break;
    }

    case 'largest_expenses': {
      const txns = getAcceptedTransactions(db)
        .filter((t) => t.amount < 0)
        .sort((a, b) => a.amount - b.amount)
        .slice(0, 10);
      if (txns.length === 0) {
        text = 'No accepted expense transactions found.';
        break;
      }
      const lines = txns.map((t) => `• ${t.date.slice(0, 10)} ${t.description} — ${fmt(Math.abs(t.amount))}`);
      text = `Largest expenses:\n${lines.join('\n')}`;
      sources.push(...toSources(txns));
      break;
    }

    case 'top_merchants': {
      const allTxns = getAcceptedTransactions(db);
      const merchants = buildMerchantSummaries(allTxns).slice(0, 10);
      if (merchants.length === 0) {
        text = 'No accepted transactions found.';
        break;
      }
      const lines = merchants.map((m) => `• ${m.description} — ${fmt(Math.abs(m.total))} (${m.transactionCount} txns)`);
      text = `Top merchants by spend:\n${lines.join('\n')}`;
      break;
    }

    case 'income_summary': {
      const period = periodRangeFromToken(String(plan.params['period'] ?? 'this month'));
      const txns = getAcceptedTransactions(db, period).filter((t) => t.amount > 0);
      if (txns.length === 0) {
        text = `No income transactions found for ${period.start} – ${period.end}.`;
        break;
      }
      const total = txns.reduce((s, t) => s + t.amount, 0);
      text = `Total income for ${period.start} – ${period.end}: ${fmt(total)} across ${txns.length} transactions.`;
      sources.push(...toSources(txns));
      break;
    }

    default: {
      text = `I couldn't understand that question. Here are some things I can answer:\n\n${SUGGESTED_QUESTIONS.map((q) => `• ${q}`).join('\n')}`;
      uncertainty = 'Question pattern not recognized.';
    }
  }

  return { text, sources, uncertainty, queryPlan: plan };
}
