import React, { useEffect, useState } from 'react';
import type { MerchantSummary } from '../pocket.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { CATEGORY_LABELS } from '../constants.js';

type Tab = 'all' | 'new' | 'suspicious';

export function MerchantView(): React.ReactElement {
  const [all, setAll] = useState<MerchantSummary[]>([]);
  const [newMerchants, setNewMerchants] = useState<MerchantSummary[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      window.pocket.insights.getMerchants(50),
      window.pocket.insights.getNewMerchants(),
    ]).then(([a, nm]) => {
      setAll(a);
      setNewMerchants(nm);
      setLoading(false);
    });
  }, []);

  const displayed = tab === 'all' ? all
    : tab === 'new' ? newMerchants.filter((m) => m.isNew)
    : newMerchants.filter((m) => m.isSuspicious);

  const suspicious = newMerchants.filter((m) => m.isSuspicious);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Merchants</h1>
        <div style={{ flex: 1 }} />
        {suspicious.length > 0 && (
          <div style={{ background: '#fef3c7', borderRadius: 8, padding: '4px 12px', fontSize: 13, color: '#92400e', fontWeight: 600 }}>
            {suspicious.length} suspicious charge{suspicious.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['all', 'new', 'suspicious'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: tab === t ? 700 : 400,
              background: tab === t ? '#111827' : '#f3f4f6',
              color: tab === t ? '#fff' : '#374151',
            }}
          >
            {t === 'all' ? 'All Merchants' : t === 'new' ? `New (${newMerchants.filter((m) => m.isNew).length})` : `Suspicious (${suspicious.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#9ca3af' }}>Loading...</p>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 14 }}>
          No merchants in this category.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <Th align="left">Merchant</Th>
              <Th align="left">Category</Th>
              <Th align="right">Total</Th>
              <Th>Transactions</Th>
              <Th align="left">Last Seen</Th>
              <Th>Flags</Th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((m, i) => (
              <tr
                key={m.description}
                style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}
              >
                <td style={td('left')}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{m.description}</span>
                </td>
                <td style={td('left')}>
                  {m.effectiveCategory ? (
                    <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: '#ede9fe', color: '#5b21b6' }}>
                      {CATEGORY_LABELS[m.effectiveCategory] ?? m.effectiveCategory}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>Untagged</span>
                  )}
                </td>
                <td style={td('right')}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>
                    {formatCurrency(Math.abs(m.total))}
                  </span>
                </td>
                <td style={td('center')}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>{m.transactionCount}</span>
                </td>
                <td style={td('left')}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>{formatDate(m.lastSeen)}</span>
                </td>
                <td style={td('center')}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                    {m.isNew && <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#dbeafe', padding: '1px 6px', borderRadius: 8 }}>NEW</span>}
                    {m.isSuspicious && <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '1px 6px', borderRadius: 8 }}>!</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return <th style={{ padding: '10px 14px', textAlign: align ?? 'center', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{children}</th>;
}

function td(align: 'left' | 'right' | 'center'): React.CSSProperties {
  return { padding: '12px 14px', textAlign: align };
}
