import React, { useCallback, useEffect, useState } from 'react';
import type { PeriodSummary, RecurringPayment, MerchantSummary } from '../pocket.js';
import { formatCurrency } from '../utils/format.js';

type PeriodKey = 'this-month' | 'last-month' | 'last-3-months';

export function DashboardHome(): React.ReactElement {
  const [periodKey, setPeriodKey] = useState<PeriodKey>('this-month');
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [recurring, setRecurring] = useState<RecurringPayment[]>([]);
  const [merchants, setMerchants] = useState<MerchantSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, r, m] = await Promise.all([
      window.pocket.insights.getSummary(periodKey),
      window.pocket.insights.getRecurring(),
      window.pocket.insights.getMerchants(5),
    ]);
    setSummary(s);
    setRecurring(r.slice(0, 5));
    setMerchants(m);
    setLoading(false);
  }, [periodKey]);

  useEffect(() => { void load(); }, [load]);

  const periodLabels: Record<PeriodKey, string> = {
    'this-month': 'This Month',
    'last-month': 'Last Month',
    'last-3-months': 'Last 3 Months',
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Dashboard</h1>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {(['this-month', 'last-month', 'last-3-months'] as PeriodKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setPeriodKey(k)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: periodKey === k ? 700 : 400,
                background: periodKey === k ? '#1d4ed8' : '#f3f4f6',
                color: periodKey === k ? '#fff' : '#374151',
              }}
            >
              {periodLabels[k]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#9ca3af' }}>Loading...</p>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
            <SummaryCard label="Income" value={summary?.income ?? 0} color="#16a34a" />
            <SummaryCard label="Expenses" value={summary?.expenses ?? 0} color="#dc2626" />
            <SummaryCard label="Net" value={summary?.net ?? 0} color={(summary?.net ?? 0) >= 0 ? '#1d4ed8' : '#dc2626'} />
          </div>

          {summary?.hasLowConfidenceData && (
            <div style={{ background: '#fef3c7', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#92400e' }}>
              Some transactions in this period have low extraction confidence. Review your import batches.
            </div>
          )}

          {summary?.transactionCount === 0 && (
            <div style={{ background: '#f3f4f6', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#6b7280' }}>
              No accepted transactions for this period. Accept transactions in the Review tab to see data here.
            </div>
          )}

          {/* Two-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Top merchants */}
            <SectionCard title="Top Merchants">
              {merchants.length === 0
                ? <Empty text="No expense data yet." />
                : merchants.map((m) => (
                  <div key={m.description} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: 13, color: '#111827' }}>{m.description}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>{formatCurrency(Math.abs(m.total))}</span>
                  </div>
                ))
              }
            </SectionCard>

            {/* Recurring */}
            <SectionCard title="Recurring Payments">
              {recurring.length === 0
                ? <Empty text="No recurring payments detected." />
                : recurring.map((r) => (
                  <div key={r.description} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#111827' }}>{r.description}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{r.period} · {r.occurrenceCount}×</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{formatCurrency(r.estimatedAmount)}</span>
                  </div>
                ))
              }
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{formatCurrency(value)}</div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#374151' }}>{title}</h3>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>{text}</p>;
}
