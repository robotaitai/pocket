import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { TransactionRow, SearchFilter } from '../pocket.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { CATEGORIES, CATEGORY_LABELS } from '../constants.js';
import { ConfidenceIndicator } from '../components/ConfidenceIndicator.js';

export function Timeline(): React.ReactElement {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<SearchFilter>({ reviewStatus: 'accepted' });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const runSearch = useCallback(async (f: SearchFilter) => {
    setLoading(true);
    const results = await window.pocket.insights.search({ ...f, limit: 200 } as SearchFilter);
    setTransactions(results as TransactionRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void runSearch(filter); }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [filter, runSearch]);

  const handleExport = async () => {
    await window.pocket.insights.export(filter);
  };

  const totalExpense = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f9fafb' }}>
      {/* Filters */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 24px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={filter.query ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value || undefined }))}
          placeholder="Search description..."
          aria-label="Search transactions"
          style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: 200 }}
        />
        <select
          value={filter.category ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value || undefined }))}
          aria-label="Filter by category"
          style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 8px', fontSize: 13 }}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        <select
          value={filter.reviewStatus ?? 'accepted'}
          onChange={(e) => setFilter((f) => ({ ...f, reviewStatus: e.target.value }))}
          aria-label="Filter by review status"
          style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 8px', fontSize: 13 }}
        >
          <option value="accepted">Accepted</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
        <input
          type="date"
          value={filter.startDate ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, startDate: e.target.value || undefined }))}
          aria-label="Start date"
          style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 8px', fontSize: 13 }}
        />
        <input
          type="date"
          value={filter.endDate ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, endDate: e.target.value || undefined }))}
          aria-label="End date"
          style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 8px', fontSize: 13 }}
        />
        <div style={{ flex: 1 }} />
        <button
          onClick={() => void handleExport()}
          title="Export filtered transactions to CSV"
          style={{ padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '8px 24px', display: 'flex', gap: 20, fontSize: 13, color: '#6b7280' }}>
        <span>{transactions.length} transactions</span>
        {totalExpense < 0 && <span>Total expenses: {formatCurrency(Math.abs(totalExpense))}</span>}
        {loading && <span style={{ color: '#9ca3af' }}>Searching...</span>}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {transactions.length === 0 && !loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No transactions match the current filter.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f3f4f6', borderBottom: '2px solid #e5e7eb', zIndex: 1 }}>
              <tr>
                <Th align="left">Date</Th>
                <Th align="left">Description</Th>
                <Th align="right">Amount</Th>
                <Th align="left">Category</Th>
                <Th>Source</Th>
                <Th>Confidence</Th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={td('left')}><span style={{ fontSize: 13, color: '#6b7280', fontFamily: 'monospace' }}>{formatDate(t.date)}</span></td>
                  <td style={td('left')}><span style={{ fontSize: 13, color: '#111827' }}>{t.description}</span></td>
                  <td style={td('right')}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.amount < 0 ? '#dc2626' : '#16a34a' }}>
                      {formatCurrency(t.amount, t.originalCurrency)}
                    </span>
                  </td>
                  <td style={td('left')}>
                    {t.category
                      ? <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: '#ede9fe', color: '#5b21b6' }}>{CATEGORY_LABELS[t.category] ?? t.category}</span>
                      : <span style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>—</span>
                    }
                  </td>
                  <td style={td('center')}>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>{t.sourceType}</span>
                  </td>
                  <td style={td('center')}>
                    <ConfidenceIndicator score={t.confidenceScore ?? null} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return <th style={{ padding: '10px 14px', textAlign: align ?? 'center', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{children}</th>;
}

function td(align: 'left' | 'right' | 'center'): React.CSSProperties {
  return { padding: '10px 14px', textAlign: align };
}
