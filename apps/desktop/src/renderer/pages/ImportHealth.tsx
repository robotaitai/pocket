import React, { useEffect, useState } from 'react';
import type { ImportHealthReport } from '../pocket.js';
import { formatDate, freshnessColor } from '../utils/format.js';
import { SOURCE_TYPE_LABELS } from '../constants.js';

export function ImportHealth(): React.ReactElement {
  const [report, setReport] = useState<ImportHealthReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void window.pocket.insights.getImportHealth().then((r) => {
      setReport(r);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ padding: 40, color: '#9ca3af' }}>Loading...</div>;
  if (!report) return <div style={{ padding: 40, color: '#9ca3af' }}>No data.</div>;

  const totalTxns = report.acceptedCount + report.pendingReviewCount + report.rejectedCount;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
      <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700 }}>Import Health</h1>

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Transactions" value={String(totalTxns)} />
        <StatCard label="Accepted" value={String(report.acceptedCount)} color="#065f46" bg="#d1fae5" />
        <StatCard label="Pending Review" value={String(report.pendingReviewCount)} color="#92400e" bg="#fef3c7" />
        <StatCard label="Rejected" value={String(report.rejectedCount)} color="#7f1d1d" bg="#fee2e2" />
      </div>

      {/* Source type summary */}
      {Object.keys(report.sourceTypeSummary).length > 0 && (
        <div style={{ background: '#fff', borderRadius: 10, padding: '20px', border: '1px solid #e5e7eb', marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#374151' }}>By Source Type</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(report.sourceTypeSummary).map(([type, info]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 70, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  {SOURCE_TYPE_LABELS[type] ?? type}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  {info.batchCount} batch{info.batchCount !== 1 ? 'es' : ''} · {info.transactionCount} transactions
                </div>
                <div style={{ flex: 1 }} />
                {info.lastImport && (
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>
                    Last: {formatDate(info.lastImport)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Batch list */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '2px solid #e5e7eb', display: 'flex', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#374151' }}>Import Batches</h3>
        </div>

        {report.batches.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No import batches yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <Th align="left">Date</Th>
                <Th align="left">Source</Th>
                <Th align="left">Method</Th>
                <Th>Status</Th>
                <Th>Freshness</Th>
                <Th>Pending</Th>
                <Th>Accepted</Th>
                <Th>Rejected</Th>
              </tr>
            </thead>
            <tbody>
              {report.batches.map((b, i) => (
                <tr key={b.batchId} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={td('left')}><span style={{ fontSize: 13, color: '#6b7280', fontFamily: 'monospace' }}>{formatDate(b.createdAt)}</span></td>
                  <td style={td('left')}><span style={{ fontSize: 13, fontWeight: 500 }}>{SOURCE_TYPE_LABELS[b.sourceType] ?? b.sourceType}</span></td>
                  <td style={td('left')}><span style={{ fontSize: 13, color: '#6b7280' }}>{b.extractionMethod}</span></td>
                  <td style={td('center')}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      background: b.status === 'success' ? '#d1fae5' : '#fee2e2',
                      color: b.status === 'success' ? '#065f46' : '#7f1d1d',
                    }}>
                      {b.status}
                    </span>
                  </td>
                  <td style={td('center')}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: freshnessColor(b.freshnessLabel) }}>
                      {b.freshnessLabel}
                    </span>
                  </td>
                  <td style={td('center')}>
                    {b.pending > 0
                      ? <span style={{ fontWeight: 700, color: '#92400e' }}>{b.pending}</span>
                      : <span style={{ color: '#9ca3af' }}>0</span>
                    }
                  </td>
                  <td style={td('center')}><span style={{ color: '#065f46' }}>{b.accepted}</span></td>
                  <td style={td('center')}><span style={{ color: '#7f1d1d' }}>{b.rejected}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: string; color?: string; bg?: string }) {
  return (
    <div style={{ background: bg ?? '#f9fafb', borderRadius: 10, padding: '16px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: color ?? '#111827' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return <th style={{ padding: '10px 14px', textAlign: align ?? 'center', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{children}</th>;
}

function td(align: 'left' | 'right' | 'center'): React.CSSProperties {
  return { padding: '10px 14px', textAlign: align };
}
