import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { SearchFilter, TransactionRow } from '../pocket.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { CATEGORIES, CATEGORY_LABELS } from '../constants.js';
import { ConfidenceIndicator } from '../components/ConfidenceIndicator.js';
import {
  FieldInput,
  FieldSelect,
  FilterRow,
  PageHeader,
  PrimaryButton,
  QuietCard,
  SecondaryButton,
  WorkspacePage,
} from '../components/Workspace.js';
import { theme } from '../theme.js';

interface Props {
  embedded?: boolean;
}

export function Timeline({ embedded = false }: Props): React.ReactElement {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<SearchFilter>({ reviewStatus: 'accepted' });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const runSearch = useCallback(async (nextFilter: SearchFilter) => {
    setLoading(true);
    const results = await window.pocket.insights.search({ ...nextFilter, limit: 200 } as SearchFilter);
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

  const totalExpense = transactions.filter((txn) => txn.amount < 0).reduce((sum, txn) => sum + txn.amount, 0);
  const body = (
    <div style={{ display: 'grid', gap: 16 }}>
      {!embedded && (
        <PageHeader
          eyebrow="Activity"
          title="Timeline"
          description="Search accepted activity with lightweight filters and export only what you are looking at."
        />
      )}

      <QuietCard padding={18}>
        <FilterRow>
          <FieldInput
            value={filter.query ?? ''}
            onChange={(event) => setFilter((value) => ({ ...value, query: event.target.value || undefined }))}
            placeholder="Search descriptions"
            aria-label="Search transactions"
            style={{ minWidth: 220, flex: 1 }}
          />
          <FieldSelect
            value={filter.category ?? ''}
            onChange={(event) => setFilter((value) => ({ ...value, category: event.target.value || undefined }))}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}
          </FieldSelect>
          <FieldSelect
            value={filter.reviewStatus ?? 'accepted'}
            onChange={(event) => setFilter((value) => ({ ...value, reviewStatus: event.target.value }))}
            aria-label="Filter by review status"
          >
            <option value="accepted">Accepted</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </FieldSelect>
          <FieldInput type="date" value={filter.startDate ?? ''} onChange={(event) => setFilter((value) => ({ ...value, startDate: event.target.value || undefined }))} aria-label="Start date" />
          <FieldInput type="date" value={filter.endDate ?? ''} onChange={(event) => setFilter((value) => ({ ...value, endDate: event.target.value || undefined }))} aria-label="End date" />
          <SecondaryButton onClick={() => void handleExport()}>Export CSV</SecondaryButton>
        </FilterRow>
      </QuietCard>

      <QuietCard padding={0}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${theme.colors.border}` }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: theme.colors.textMuted, fontSize: 13 }}>
            <span>{transactions.length} transactions</span>
            {totalExpense < 0 && <span>Total expenses {formatCurrency(Math.abs(totalExpense))}</span>}
            {loading && <span>Refreshing...</span>}
          </div>
          <PrimaryButton onClick={() => setFilter({ reviewStatus: 'accepted' })}>Reset filters</PrimaryButton>
        </div>

        {transactions.length === 0 && !loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: theme.colors.textSoft, fontSize: 14 }}>
            No transactions match the current filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: theme.colors.surfaceAlt }}>
                  <Th align="left">Date</Th>
                  <Th align="left">Description</Th>
                  <Th align="right">Amount</Th>
                  <Th align="left">Category</Th>
                  <Th align="center">Source</Th>
                  <Th align="center">Confidence</Th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn, index) => (
                  <tr key={txn.id} style={{ borderTop: index === 0 ? 'none' : `1px solid ${theme.colors.border}` }}>
                    <Td align="left"><span style={{ fontFamily: 'monospace' }}>{formatDate(txn.date)}</span></Td>
                    <Td align="left"><span style={{ color: theme.colors.text }}>{txn.description}</span></Td>
                    <Td align="right">
                      <span style={{ fontWeight: 700, color: txn.amount < 0 ? theme.colors.danger : theme.colors.success }}>
                        {formatCurrency(txn.amount, txn.originalCurrency)}
                      </span>
                    </Td>
                    <Td align="left">
                      {txn.category
                        ? <span style={{ fontSize: 12, color: theme.colors.text }}>{CATEGORY_LABELS[txn.category] ?? txn.category}</span>
                        : <span style={{ color: theme.colors.textSoft }}>Untagged</span>}
                    </Td>
                    <Td align="center">{txn.sourceType}</Td>
                    <Td align="center"><ConfidenceIndicator score={txn.confidenceScore ?? null} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QuietCard>
    </div>
  );

  return embedded ? body : <WorkspacePage width={1220}>{body}</WorkspacePage>;
}

function Th({ children, align }: { children: React.ReactNode; align: 'left' | 'right' | 'center' }) {
  return <th style={{ padding: '12px 14px', textAlign: align, fontSize: 11, fontWeight: 700, color: theme.colors.textSoft, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</th>;
}

function Td({ children, align }: { children: React.ReactNode; align: 'left' | 'right' | 'center' }) {
  return <td style={{ padding: '14px', textAlign: align, fontSize: 13, color: theme.colors.textMuted }}>{children}</td>;
}
