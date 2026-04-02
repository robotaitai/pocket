import React, { useEffect, useState } from 'react';
import type { RecurringPayment } from '../pocket.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { CATEGORY_LABELS } from '../constants.js';

export function RecurringPayments(): React.ReactElement {
  const [recurring, setRecurring] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void window.pocket.insights.getRecurring().then((data) => {
      setRecurring(data);
      setLoading(false);
    });
  }, []);

  const totalMonthly = recurring
    .filter((r) => r.period === 'monthly')
    .reduce((s, r) => s + r.estimatedAmount, 0);

  const periodColors: Record<string, string> = {
    weekly: '#2563eb',
    biweekly: '#7c3aed',
    monthly: '#059669',
    quarterly: '#d97706',
    irregular: '#9ca3af',
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Recurring Payments</h1>
        {recurring.length > 0 && (
          <div style={{ marginLeft: 20, background: '#f0fdf4', border: '1px solid #d1fae5', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: '#065f46' }}>
            ~{formatCurrency(totalMonthly)}/month in monthly subscriptions
          </div>
        )}
      </div>

      {loading ? (
        <p style={{ color: '#9ca3af' }}>Loading...</p>
      ) : recurring.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
          <div style={{ fontSize: 14 }}>No recurring payments detected.</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>Accept more transactions and they will appear here automatically.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recurring.map((r) => (
            <div
              key={r.description}
              style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 16 }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{r.description}</span>
                  <span style={{
                    padding: '1px 7px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    background: periodColors[r.period] + '22',
                    color: periodColors[r.period],
                  }}>
                    {r.period}
                  </span>
                  {r.effectiveCategory && (
                    <span style={{ padding: '1px 7px', borderRadius: 12, fontSize: 11, background: '#ede9fe', color: '#5b21b6' }}>
                      {CATEGORY_LABELS[r.effectiveCategory] ?? r.effectiveCategory}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  {r.occurrenceCount} occurrences · First: {formatDate(r.firstSeen)} · Last: {formatDate(r.lastSeen)}
                  {r.nextExpectedDate && ` · Next expected: ${formatDate(r.nextExpectedDate)}`}
                </div>
              </div>

              {/* Confidence bar */}
              <div style={{ width: 80, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Regularity</div>
                <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${r.confidence * 100}%`, height: '100%', background: '#059669', borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 11, color: '#059669', marginTop: 2, fontWeight: 600 }}>
                  {Math.round(r.confidence * 100)}%
                </div>
              </div>

              {/* Amount */}
              <div style={{ textAlign: 'right', minWidth: 90 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>
                  {formatCurrency(r.estimatedAmount)}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>avg/occurrence</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
