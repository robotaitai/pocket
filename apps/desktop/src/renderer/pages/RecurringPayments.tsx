import React, { useEffect, useState } from 'react';
import type { RecurringPayment } from '../pocket.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { CATEGORY_LABELS } from '../constants.js';
import { PageHeader, QuietCard, WorkspacePage } from '../components/Workspace.js';
import { theme } from '../theme.js';

interface Props {
  embedded?: boolean;
}

export function RecurringPayments({ embedded = false }: Props): React.ReactElement {
  const [recurring, setRecurring] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void window.pocket.insights.getRecurring().then((value) => {
      setRecurring(value);
      setLoading(false);
    });
  }, []);

  const totalMonthly = recurring.filter((item) => item.period === 'monthly').reduce((sum, item) => sum + item.estimatedAmount, 0);
  const body = (
    <div style={{ display: 'grid', gap: 16 }}>
      {!embedded && (
        <PageHeader
          eyebrow="Activity"
          title="Recurring"
          description="Subscriptions and repeating payments should feel like a calm summary, not another dashboard widget wall."
        />
      )}

      <QuietCard padding={18}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: theme.colors.textSoft }}>Monthly commitment</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: theme.colors.text, marginTop: 6 }}>
              {formatCurrency(totalMonthly)}
            </div>
          </div>
          <div style={{ fontSize: 13, color: theme.colors.textMuted }}>
            {recurring.length} recurring pattern{recurring.length === 1 ? '' : 's'} detected
          </div>
        </div>
      </QuietCard>

      {loading ? (
        <QuietCard>
          <div style={{ color: theme.colors.textSoft }}>Loading recurring payments...</div>
        </QuietCard>
      ) : recurring.length === 0 ? (
        <QuietCard>
          <div style={{ textAlign: 'center', padding: '50px 0', color: theme.colors.textSoft }}>
            Accept more transactions and Pocket will identify recurring payments automatically.
          </div>
        </QuietCard>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {recurring.map((item) => (
            <QuietCard key={item.description} padding={18}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 140px 120px', gap: 16, alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: theme.colors.text }}>{item.description}</span>
                    <Tag text={item.period} />
                    {item.effectiveCategory && <Tag text={CATEGORY_LABELS[item.effectiveCategory] ?? item.effectiveCategory} />}
                  </div>
                  <div style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 8, lineHeight: 1.55 }}>
                    {item.occurrenceCount} occurrences · First {formatDate(item.firstSeen)} · Last {formatDate(item.lastSeen)}
                    {item.nextExpectedDate && ` · Next expected ${formatDate(item.nextExpectedDate)}`}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: theme.colors.textSoft, marginBottom: 6 }}>Regularity</div>
                  <div style={{ height: 8, background: theme.colors.surfaceAlt, borderRadius: theme.radius.pill, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round(item.confidence * 100)}%`, height: '100%', background: theme.colors.accent }} />
                  </div>
                  <div style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 6 }}>{Math.round(item.confidence * 100)}%</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: theme.colors.danger }}>{formatCurrency(item.estimatedAmount)}</div>
                  <div style={{ fontSize: 11, color: theme.colors.textSoft, marginTop: 4 }}>avg / occurrence</div>
                </div>
              </div>
            </QuietCard>
          ))}
        </div>
      )}
    </div>
  );

  return embedded ? body : <WorkspacePage width={1120}>{body}</WorkspacePage>;
}

function Tag({ text }: { text: string }) {
  return <span style={{ padding: '4px 8px', borderRadius: theme.radius.pill, background: theme.colors.surfaceAlt, color: theme.colors.textMuted, fontSize: 11, fontWeight: 700 }}>{text}</span>;
}
