import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type SortKey = 'date' | 'description' | 'amount' | 'category' | 'source' | 'confidence';
type SortDirection = 'asc' | 'desc';

export function Timeline({ embedded = false }: Props): React.ReactElement {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<SearchFilter>({ reviewStatus: 'accepted' });
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
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

  const sortedTransactions = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...transactions].sort((left, right) => {
      switch (sortKey) {
        case 'description':
          return direction * left.description.localeCompare(right.description);
        case 'amount':
          return direction * (left.amount - right.amount || left.date.localeCompare(right.date));
        case 'category':
          return direction * ((CATEGORY_LABELS[left.category ?? ''] ?? 'Untagged').localeCompare(CATEGORY_LABELS[right.category ?? ''] ?? 'Untagged'));
        case 'source':
          return direction * left.sourceType.localeCompare(right.sourceType);
        case 'confidence':
          return direction * ((left.confidenceScore ?? -1) - (right.confidenceScore ?? -1) || left.date.localeCompare(right.date));
        case 'date':
        default:
          return direction * (left.date.localeCompare(right.date) || left.description.localeCompare(right.description));
      }
    });
  }, [sortDirection, sortKey, transactions]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection(key === 'description' || key === 'category' || key === 'source' ? 'asc' : 'desc');
  };

  const totalExpense = sortedTransactions.filter((txn) => txn.amount < 0).reduce((sum, txn) => sum + txn.amount, 0);
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
                  <SortableTh align="left" active={sortKey === 'date'} direction={sortDirection} onClick={() => toggleSort('date')}>Date</SortableTh>
                  <SortableTh align="left" active={sortKey === 'description'} direction={sortDirection} onClick={() => toggleSort('description')}>Description</SortableTh>
                  <SortableTh align="right" active={sortKey === 'amount'} direction={sortDirection} onClick={() => toggleSort('amount')}>Amount</SortableTh>
                  <SortableTh align="left" active={sortKey === 'category'} direction={sortDirection} onClick={() => toggleSort('category')}>Category</SortableTh>
                  <SortableTh align="center" active={sortKey === 'source'} direction={sortDirection} onClick={() => toggleSort('source')}>Source</SortableTh>
                  <SortableTh align="center" active={sortKey === 'confidence'} direction={sortDirection} onClick={() => toggleSort('confidence')}>Confidence</SortableTh>
                </tr>
              </thead>
              <tbody>
                {sortedTransactions.map((txn, index) => (
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

function SortableTh({
  children,
  align,
  active,
  direction,
  onClick,
}: {
  children: React.ReactNode;
  align: 'left' | 'right' | 'center';
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <th style={{ padding: '12px 14px', textAlign: align }}>
      <button
        onClick={onClick}
        style={{
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 700,
          color: active ? theme.colors.text : theme.colors.textSoft,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {children} {active ? (direction === 'asc' ? '↑' : '↓') : '↕'}
      </button>
    </th>
  );
}

function Td({ children, align }: { children: React.ReactNode; align: 'left' | 'right' | 'center' }) {
  return <td style={{ padding: '14px', textAlign: align, fontSize: 13, color: theme.colors.textMuted }}>{children}</td>;
}
