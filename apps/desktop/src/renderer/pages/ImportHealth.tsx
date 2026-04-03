import React, { useEffect, useState } from 'react';
import type { ImportHealthReport } from '../pocket.js';
import { QuietCard, WorkspacePage } from '../components/Workspace.js';
import { formatDate, freshnessColor } from '../utils/format.js';
import { SOURCE_TYPE_LABELS } from '../constants.js';
import { theme } from '../theme.js';

interface Props {
  embedded?: boolean;
}

export function ImportHealth({ embedded = false }: Props): React.ReactElement {
  const [report, setReport] = useState<ImportHealthReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void window.pocket.insights.getImportHealth().then((value) => {
      setReport(value);
      setLoading(false);
    });
  }, []);

  const content = loading ? (
    <QuietCard title="Import health">
      <div style={{ color: theme.colors.textSoft }}>Loading import health...</div>
    </QuietCard>
  ) : !report ? (
    <QuietCard title="Import health">
      <div style={{ color: theme.colors.textSoft }}>No import data yet.</div>
    </QuietCard>
  ) : (
    <QuietCard title="Import health" subtitle="Recent ingestion should be easy to inspect without feeling like operations tooling.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
        <MiniStat label="Accepted" value={String(report.acceptedCount)} />
        <MiniStat label="Pending" value={String(report.pendingReviewCount)} />
        <MiniStat label="Rejected" value={String(report.rejectedCount)} />
        <MiniStat label="Batches" value={String(report.batches.length)} />
      </div>

      {Object.keys(report.sourceTypeSummary).length > 0 && (
        <div style={{ marginBottom: 16, display: 'grid', gap: 8 }}>
          {Object.entries(report.sourceTypeSummary).map(([type, info]) => (
            <div key={type} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '10px 12px', borderRadius: theme.radius.md, background: theme.colors.surfaceAlt }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.colors.text }}>{SOURCE_TYPE_LABELS[type] ?? type}</div>
                <div style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 2 }}>
                  {info.batchCount} batch{info.batchCount === 1 ? '' : 'es'} · {info.transactionCount} transactions
                </div>
              </div>
              <div style={{ fontSize: 12, color: theme.colors.textSoft }}>
                {info.lastImport ? formatDate(info.lastImport) : 'No imports yet'}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, overflow: 'hidden' }}>
        {report.batches.length === 0 ? (
          <div style={{ padding: 18, color: theme.colors.textSoft }}>No import batches yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: theme.colors.surfaceAlt }}>
                <Th align="left">Date</Th>
                <Th align="left">Source</Th>
                <Th align="left">Method</Th>
                <Th align="center">Freshness</Th>
                <Th align="center">Pending</Th>
                <Th align="center">Accepted</Th>
              </tr>
            </thead>
            <tbody>
              {report.batches.slice(0, embedded ? 8 : report.batches.length).map((batch, index) => (
                <tr key={batch.batchId} style={{ borderTop: index === 0 ? 'none' : `1px solid ${theme.colors.border}` }}>
                  <Td align="left">{formatDate(batch.createdAt)}</Td>
                  <Td align="left">{SOURCE_TYPE_LABELS[batch.sourceType] ?? batch.sourceType}</Td>
                  <Td align="left">{batch.extractionMethod}</Td>
                  <Td align="center">
                    <span style={{ color: freshnessColor(batch.freshnessLabel), fontWeight: 700, fontSize: 12 }}>
                      {batch.freshnessLabel}
                    </span>
                  </Td>
                  <Td align="center">{String(batch.pending)}</Td>
                  <Td align="center">{String(batch.accepted)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </QuietCard>
  );

  return embedded ? content : <WorkspacePage>{content}</WorkspacePage>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: theme.radius.md, background: theme.colors.surfaceAlt }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: theme.colors.textSoft }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: theme.colors.text, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align: 'left' | 'center' }) {
  return <th style={{ padding: '10px 12px', textAlign: align, fontSize: 11, color: theme.colors.textSoft, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</th>;
}

function Td({ children, align }: { children: React.ReactNode; align: 'left' | 'center' }) {
  return <td style={{ padding: '12px', textAlign: align, fontSize: 13, color: theme.colors.textMuted }}>{children}</td>;
}
