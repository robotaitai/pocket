import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CategoryBreakdown,
  DateRangeInput,
  ImportHealthReport,
  MerchantSummary,
  OverviewSnapshot,
  PeriodSummary,
} from '../pocket.js';
import {
  formatCurrency,
  formatDateRange,
  formatLongDate,
  formatPctChange,
  formatRelativeTime,
} from '../utils/format.js';
import {
  Chip,
  PageHeader,
  PrimaryButton,
  QuietCard,
  SegmentedControl,
  SecondaryButton,
  WorkspacePage,
} from '../components/Workspace.js';
import { CATEGORY_BG_COLORS, CATEGORY_COLORS, CATEGORY_LABELS } from '../constants.js';
import { theme } from '../theme.js';

type PeriodMode = 'only' | 'since';
type ActivityMode = 'review' | 'timeline' | 'merchants' | 'recurring' | 'flagged';

interface Props {
  onAskPocket: (question: string) => void;
  onOpenActivity: (mode?: ActivityMode) => void;
  onOpenConnect: () => void;
}

export function DashboardHome({
  onAskPocket,
  onOpenActivity,
  onOpenConnect,
}: Props): React.ReactElement {
  const [periodMode, setPeriodMode] = useState<PeriodMode>('only');
  const [selectedMonth, setSelectedMonth] = useState(() => monthKeyFromDate(new Date()));
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown>({ expenses: [], income: [] });
  const [merchants, setMerchants] = useState<MerchantSummary[]>([]);
  const [newMerchants, setNewMerchants] = useState<MerchantSummary[]>([]);
  const [health, setHealth] = useState<ImportHealthReport | null>(null);
  const [snapshot, setSnapshot] = useState<OverviewSnapshot | null>(null);
  const [askDraft, setAskDraft] = useState('');
  const [upcomingDays, setUpcomingDays] = useState<7 | 14 | 30>(14);
  const [loading, setLoading] = useState(true);

  const selectedRange = useMemo<DateRangeInput>(() => {
    const [yearText, monthText] = selectedMonth.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      const fallback = new Date();
      const start = new Date(Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), 1));
      const end = new Date(Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth() + 1, 1));
      return {
        start: isoDate(start),
        end: isoDate(end),
      };
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    if (periodMode === 'only') {
      const end = new Date(Date.UTC(year, month, 1));
      return { start: isoDate(start), end: isoDate(end) };
    }

    const now = new Date();
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return { start: isoDate(start), end: isoDate(end) };
  }, [periodMode, selectedMonth]);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, b, m, nm, h, o] = await Promise.all([
      window.pocket.insights.getSummary(selectedRange),
      window.pocket.insights.getCategoryBreakdown(selectedRange),
      window.pocket.insights.getMerchants(6),
      window.pocket.insights.getNewMerchants(),
      window.pocket.insights.getImportHealth(),
      window.pocket.insights.getOverviewSnapshot(selectedRange),
    ]);

    setSummary(s);
    setBreakdown(b);
    setMerchants(m.slice(0, 5));
    setNewMerchants(nm);
    setHealth(h);
    setSnapshot(o);
    setLoading(false);
  }, [selectedRange]);

  useEffect(() => { void load(); }, [load]);

  const monthOptions = useMemo(() => {
    const months: Array<{ value: string; label: string }> = [];
    const cursor = new Date();
    cursor.setUTCDate(1);
    for (let index = 0; index < 24; index += 1) {
      const date = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - index, 1));
      const value = monthKeyFromDate(date);
      months.push({
        value,
        label: new Intl.DateTimeFormat('en-US', { month: 'long', year: '2-digit' }).format(date),
      });
    }
    return months;
  }, []);

  const expenseMix = useMemo(() => {
    const total = breakdown.expenses.reduce((sum, item) => sum + item.total, 0);
    return {
      total,
      items: breakdown.expenses.slice(0, 6).map((item) => ({
        ...item,
        share: total > 0 ? (item.total / total) * 100 : 0,
      })),
    };
  }, [breakdown.expenses]);

  const whatChanged = useMemo(() => {
    if (!summary || !snapshot) return [];
    const items: Array<{ label: string; value: number; delta: number | null; tone: 'success' | 'danger' | 'accent' }> = [
      { label: 'Income', value: summary.income, delta: snapshot.comparison.incomeChange, tone: 'success' },
      { label: 'Spend', value: summary.expenses, delta: snapshot.comparison.expenseChange, tone: 'danger' },
      { label: 'Net', value: summary.net, delta: snapshot.comparison.netChange, tone: (summary.net ?? 0) >= 0 ? 'accent' : 'danger' },
    ];
    return items;
  }, [snapshot, summary]);

  const narrativeChanges = useMemo(() => {
    if (!summary || !snapshot) return [];
    const items: string[] = [];
    if (snapshot.comparison.expenseChange != null) {
      const delta = snapshot.comparison.expenseChange;
      items.push(delta === 0
        ? 'Spending is broadly flat versus the previous period.'
        : `Spending ${delta > 0 ? 'rose' : 'fell'} ${formatPctChange(Math.abs(delta)).replace('+', '')} versus the previous period.`);
    }
    if (breakdown.expenses[0]) {
      items.push(`The largest expense category is ${CATEGORY_LABELS[breakdown.expenses[0].category] ?? breakdown.expenses[0].category} at ${formatCurrency(breakdown.expenses[0].total)}.`);
    }
    if (newMerchants.filter((merchant) => merchant.isSuspicious).length > 0) {
      items.push(`${newMerchants.filter((merchant) => merchant.isSuspicious).length} merchant${newMerchants.filter((merchant) => merchant.isSuspicious).length > 1 ? 's look' : ' looks'} unusual enough to review.`);
    }
    if (health && health.pendingReviewCount > 0) {
      items.push(`${health.pendingReviewCount} imported transaction${health.pendingReviewCount === 1 ? ' is' : 's are'} still waiting for review.`);
    }
    return items.slice(0, 4);
  }, [breakdown.expenses, health, newMerchants, snapshot, summary]);

  const upcoming = useMemo(() => {
    if (!snapshot?.upcoming) return [];
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() + upcomingDays);
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    return snapshot.upcoming
      .filter((item) => item.nextExpectedDate <= cutoffIso)
      .slice(0, 6);
  }, [snapshot?.upcoming, upcomingDays]);

  const sendAsk = () => {
    const question = askDraft.trim();
    if (!question) return;
    onAskPocket(question);
    setAskDraft('');
  };

  return (
    <WorkspacePage>
      <PageHeader
        eyebrow="Overview"
        title="Your financial pulse"
        description="One place to see what changed, how money moved through the period, and what is likely coming next."
        actions={
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: 8,
              borderRadius: theme.radius.xl,
              border: `1px solid ${theme.colors.border}`,
              background: theme.colors.surface,
              boxShadow: theme.shadow.card,
            }}
          >
            <select
              value={periodMode}
              onChange={(event) => setPeriodMode(event.target.value as PeriodMode)}
              aria-label="Overview period mode"
              style={pickerStyle()}
            >
              <option value="only">Only</option>
              <option value="since">Since</option>
            </select>
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              aria-label="Overview selected month"
              style={pickerStyle()}
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {loading ? (
        <QuietCard>
          <div style={{ color: theme.colors.textSoft }}>Loading your latest picture...</div>
        </QuietCard>
      ) : (
        <>
          {snapshot && summary && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
              <Chip tone="neutral">{formatDateRange(snapshot.period.start, snapshot.period.end)}</Chip>
              <Chip tone="accent">updated {formatRelativeTime(snapshot.updatedAt)}</Chip>
              <Chip tone="neutral">based on {snapshot.acceptedTransactionCount} accepted transactions</Chip>
              <Chip tone="neutral">{snapshot.sourcesIncluded} connected source{snapshot.sourcesIncluded === 1 ? '' : 's'} included</Chip>
              {summary.hasLowConfidenceData && <Chip tone="warning">low-confidence imports present</Chip>}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.45fr) minmax(320px, 0.95fr)',
              gap: 18,
              marginBottom: 18,
            }}
          >
            <QuietCard padding={24}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ ...theme.type.eyebrow, color: theme.colors.textSoft, textTransform: 'uppercase', marginBottom: 10 }}>
                    Current pulse
                  </div>
                  <h2 style={{ margin: 0, fontSize: 30, lineHeight: 1.1, letterSpacing: '-0.04em', color: theme.colors.text }}>
                    {(summary?.net ?? 0) >= 0 ? 'You are net positive this period.' : 'This period is net negative.'}
                  </h2>
                  <p style={{ ...theme.type.body, color: theme.colors.textMuted, margin: '10px 0 0', maxWidth: 520 }}>
                    {(summary?.transactionCount ?? 0) > 0
                      ? `Accepted activity across ${snapshot?.sourcesIncluded ?? 0} source${(snapshot?.sourcesIncluded ?? 0) === 1 ? '' : 's'} is shaping this view.`
                      : 'No accepted transactions yet for this period. Review your latest imports to start building the picture.'}
                  </p>
                </div>
              </div>
              <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
                <PulseMetricCard
                  label="Income"
                  value={formatCurrency(summary?.income ?? 0)}
                  tone="success"
                  delta={snapshot?.comparison.incomeChange ?? null}
                  points={(snapshot?.trend ?? []).map((item) => item.income)}
                />
                <PulseMetricCard
                  label="Spend"
                  value={formatCurrency(summary?.expenses ?? 0)}
                  tone="danger"
                  delta={snapshot?.comparison.expenseChange ?? null}
                  points={(snapshot?.trend ?? []).map((item) => item.spend)}
                />
                <PulseMetricCard
                  label="Net"
                  value={formatCurrency(summary?.net ?? 0)}
                  tone={(summary?.net ?? 0) >= 0 ? 'accent' : 'danger'}
                  delta={snapshot?.comparison.netChange ?? null}
                  points={(snapshot?.trend ?? []).map((item) => item.net)}
                />
              </div>
            </QuietCard>

            <QuietCard
              title="Ask Pocket"
              subtitle="Start from a question, not a tool."
              padding={22}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  value={askDraft}
                  onChange={(event) => setAskDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      sendAsk();
                    }
                  }}
                  placeholder="What changed this month?"
                  aria-label="Ask Pocket from overview"
                  style={{
                    border: `1px solid ${theme.colors.borderStrong}`,
                    borderRadius: theme.radius.md,
                    padding: '12px 14px',
                    fontSize: 14,
                    color: theme.colors.text,
                    background: theme.colors.surface,
                  }}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <PrimaryButton onClick={sendAsk} disabled={!askDraft.trim()}>
                    Ask Pocket
                  </PrimaryButton>
                  <SecondaryButton onClick={() => onAskPocket('Summarize this period in plain language.')}>
                    Summarize this period
                  </SecondaryButton>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  {[
                    'What changed versus the previous period?',
                    'What important things happened during this range?',
                    'What is likely coming up next?',
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => onAskPocket(prompt)}
                      style={{
                        border: `1px solid ${theme.colors.border}`,
                        background: theme.colors.surfaceAlt,
                        color: theme.colors.textMuted,
                        borderRadius: theme.radius.pill,
                        padding: '8px 12px',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </QuietCard>
          </div>

          <QuietCard
            title="Cash flow over time"
            subtitle="Spending, income, and net across the selected period."
            padding={22}
          >
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
              <LegendDot label="Spend" color={theme.colors.danger} />
              <LegendDot label="Income" color={theme.colors.success} />
              <LegendDot label="Net" color={theme.colors.accent} />
            </div>
            <TimeSeriesChart points={snapshot?.trend ?? []} />
          </QuietCard>

          <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 18, marginTop: 18, marginBottom: 18 }}>
            <QuietCard title="What changed" subtitle="Small deltas first, narrative second.">
              <div style={{ display: 'grid', gap: 12 }}>
                {whatChanged.map((item) => (
                  <ComparisonRow
                    key={item.label}
                    label={item.label}
                    value={formatCurrency(item.value)}
                    delta={item.delta}
                    tone={item.tone}
                  />
                ))}
                <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                  {narrativeChanges.map((item) => (
                    <div
                      key={item}
                      style={{
                        padding: '12px 14px',
                        borderRadius: theme.radius.md,
                        background: theme.colors.surfaceAlt,
                        color: theme.colors.text,
                        fontSize: 14,
                        lineHeight: 1.5,
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </QuietCard>

            <QuietCard title="Event timeline" subtitle="Important things that happened across the selected range.">
              <div style={{ display: 'grid', gap: 12 }}>
                {(snapshot?.events ?? []).length === 0 ? (
                  <Empty text="No notable events yet for this range." />
                ) : (
                  snapshot?.events.map((event) => (
                    <div key={event.id} style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 12, alignItems: 'start' }}>
                      <div style={{ fontSize: 12, color: theme.colors.textSoft, fontFamily: 'monospace', paddingTop: 3 }}>
                        {formatLongDate(event.date)}
                      </div>
                      <div style={{ padding: '12px 14px', borderRadius: theme.radius.md, background: theme.colors.surfaceAlt }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 999, background: toneColor(event.tone) }} />
                          <div style={{ fontSize: 13, fontWeight: 700, color: theme.colors.text }}>{event.title}</div>
                        </div>
                        <div style={{ fontSize: 12, color: theme.colors.textMuted, lineHeight: 1.5 }}>{event.detail}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </QuietCard>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 18, marginBottom: 18 }}>
            <QuietCard title="Where money went" subtitle="A quick read on the flow mix, with color and category share.">
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'grid', gap: 14 }}>
                  {expenseMix.items.length === 0 ? (
                    <Empty text="No accepted expense data yet." />
                  ) : (
                    <>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: theme.colors.textSoft }}>Expense mix</span>
                          <span style={{ fontSize: 12, color: theme.colors.textMuted }}>
                            {formatCurrency(expenseMix.total)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', height: 12, borderRadius: theme.radius.pill, overflow: 'hidden', background: theme.colors.surfaceAlt }}>
                          {expenseMix.items.map((item) => (
                            <div
                              key={item.category}
                              style={{
                                width: `${Math.max(6, item.share)}%`,
                                background: CATEGORY_COLORS[item.category] ?? theme.colors.accent,
                              }}
                              title={`${CATEGORY_LABELS[item.category] ?? item.category}: ${item.share.toFixed(1)}%`}
                            />
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {expenseMix.items.map((item) => (
                          <FlowRow
                            key={item.category}
                            label={CATEGORY_LABELS[item.category] ?? item.category}
                            value={formatCurrency(item.total)}
                            share={item.share}
                            color={CATEGORY_COLORS[item.category] ?? theme.colors.accent}
                            background={CATEGORY_BG_COLORS[item.category] ?? theme.colors.surfaceAlt}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <div style={{ ...theme.type.label, color: theme.colors.textSoft, marginBottom: 8 }}>Top merchants</div>
                  {merchants.length === 0 ? (
                    <Empty text="No merchant spend data yet." />
                  ) : (
                    merchants.map((item) => (
                      <ListRow
                        key={item.description}
                        label={item.description}
                        meta={`${item.transactionCount} transaction${item.transactionCount > 1 ? 's' : ''}`}
                        value={formatCurrency(Math.abs(item.total))}
                      />
                    ))
                  )}
                </div>
              </div>
            </QuietCard>

            <QuietCard title="Coming up" subtitle="Expected soon, based on recurring activity that Pocket recognizes.">
              <div style={{ display: 'grid', gap: 14 }}>
                <SegmentedControl
                  options={[
                    { value: 7, label: 'Next 7 days' },
                    { value: 14, label: 'Next 14 days' },
                    { value: 30, label: 'Next 30 days' },
                  ]}
                  value={upcomingDays}
                  onChange={(value) => setUpcomingDays(value)}
                />

                {upcoming.length === 0 ? (
                  <Empty text="No recurring charges are expected in this horizon yet." />
                ) : (
                  upcoming.map((item) => (
                    <ListRow
                      key={`${item.description}-${item.nextExpectedDate}`}
                      label={item.description}
                      meta={`${formatLongDate(item.nextExpectedDate)} · ${item.period} cadence`}
                      value={formatCurrency(item.amount)}
                    />
                  ))
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <SecondaryButton onClick={() => onOpenActivity('recurring')}>Open recurring</SecondaryButton>
                  <SecondaryButton onClick={onOpenConnect}>Check freshness</SecondaryButton>
                </div>
              </div>
            </QuietCard>
          </div>

          <QuietCard title="Next actions" subtitle="Pocket should keep the next best move obvious.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
              <ActionTile
                title="Review new imports"
                body="Clear pending items and strengthen the data that powers the rest of the workspace."
                cta="Open review"
                onClick={() => onOpenActivity('review')}
              />
              <ActionTile
                title="Check unusual merchants"
                body="See anything new or suspicious before it becomes part of your normal spending pattern."
                cta="Open flagged"
                onClick={() => onOpenActivity('flagged')}
              />
              <ActionTile
                title="Connect more history"
                body="Run connectors, import files, or update provider settings without leaving the trust layer."
                cta="Open connect"
                onClick={onOpenConnect}
              />
            </div>
          </QuietCard>
        </>
      )}
    </WorkspacePage>
  );
}

function PulseMetricCard({
  label,
  value,
  tone,
  delta,
  points,
}: {
  label: string;
  value: string;
  tone: 'success' | 'danger' | 'accent';
  delta: number | null;
  points: number[];
}) {
  return (
    <div style={{ border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.lg, padding: 16, background: theme.colors.surface }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: theme.colors.textSoft, fontWeight: 700 }}>{label}</div>
        <DeltaBadge value={delta} tone={tone} />
      </div>
      <div style={{ fontSize: 24, lineHeight: 1, fontWeight: 700, color: toneColor(tone), letterSpacing: '-0.04em' }}>{value}</div>
      <div style={{ marginTop: 10 }}>
        <Sparkline points={points} color={toneColor(tone)} />
      </div>
    </div>
  );
}

function ComparisonRow({
  label,
  value,
  delta,
  tone,
}: {
  label: string;
  value: string;
  delta: number | null;
  tone: 'success' | 'danger' | 'accent';
}) {
  const magnitude = Math.min(100, Math.abs(delta ?? 0));
  return (
    <div style={{ padding: '12px 14px', borderRadius: theme.radius.md, background: theme.colors.surfaceAlt }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.colors.text }}>{label}</div>
          <div style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 2 }}>{value}</div>
        </div>
        <DeltaBadge value={delta} tone={tone} />
      </div>
      <div style={{ height: 8, borderRadius: theme.radius.pill, background: theme.colors.surface }}>
        <div
          style={{
            width: `${Math.max(8, magnitude)}%`,
            height: '100%',
            borderRadius: theme.radius.pill,
            background: toneColor(tone),
            opacity: delta == null ? 0.25 : 1,
          }}
        />
      </div>
    </div>
  );
}

function DeltaBadge({ value, tone }: { value: number | null; tone: 'success' | 'danger' | 'accent' }) {
  if (value == null) {
    return <span style={{ fontSize: 11, color: theme.colors.textSoft }}>N/A</span>;
  }
  const positive = value >= 0;
  const arrow = positive ? '↑' : '↓';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 700,
        padding: '4px 8px',
        borderRadius: theme.radius.pill,
        color: toneColor(tone),
        background: theme.colors.surfaceAlt,
      }}
    >
      {arrow} {formatPctChange(Math.abs(value)).replace('+', '')}
    </span>
  );
}

function TimeSeriesChart({ points }: { points: OverviewSnapshot['trend'] }) {
  if (points.length === 0) {
    return <Empty text="No accepted activity yet for this range." />;
  }

  const width = 960;
  const height = 240;
  const padding = 24;
  const plotHeight = height - padding * 2;
  const minValue = Math.min(0, ...points.map((point) => point.net));
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => [point.spend, point.income, point.net]),
  );
  const spread = maxValue - minValue || 1;
  const xFor = (index: number) => padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2);
  const yFor = (value: number) => height - padding - ((value - minValue) / spread) * plotHeight;
  const lineFor = (values: number[]) =>
    values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(value)}`).join(' ');

  const spendPath = lineFor(points.map((point) => point.spend));
  const incomePath = lineFor(points.map((point) => point.income));
  const netPath = lineFor(points.map((point) => point.net));
  const zeroY = yFor(0);

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} aria-label="Cash flow over time">
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={padding}
            y1={padding + (height - padding * 2) * ratio}
            x2={width - padding}
            y2={padding + (height - padding * 2) * ratio}
            stroke={theme.colors.border}
            strokeDasharray="3 6"
          />
        ))}
        <line x1={padding} y1={zeroY} x2={width - padding} y2={zeroY} stroke={theme.colors.borderStrong} />
        <path d={spendPath} fill="none" stroke={theme.colors.danger} strokeWidth="3" strokeLinecap="round" />
        <path d={incomePath} fill="none" stroke={theme.colors.success} strokeWidth="3" strokeLinecap="round" />
        <path d={netPath} fill="none" stroke={theme.colors.accent} strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 10, fontSize: 12, color: theme.colors.textSoft }}>
        <span>{formatLongDate(points[0]!.date)}</span>
        <span>Peak {formatCurrency(maxValue)}</span>
        <span>{formatLongDate(points[points.length - 1]!.date)}</span>
      </div>
    </div>
  );
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length === 0) return null;
  const width = 120;
  const height = 30;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const spread = max - min || 1;
  const d = points.map((point, index) => {
    const x = (index / Math.max(1, points.length - 1)) * width;
    const y = height - ((point - min) / spread) * height;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 34, display: 'block' }} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: theme.colors.textMuted }}>
      <span style={{ width: 10, height: 10, borderRadius: 999, background: color }} />
      {label}
    </div>
  );
}

function FlowRow({
  label,
  value,
  share,
  color,
  background,
}: {
  label: string;
  value: string;
  share: number;
  color: string;
  background: string;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto auto',
        gap: 12,
        alignItems: 'center',
        padding: '10px 12px',
        borderRadius: theme.radius.md,
        background,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: theme.colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: color }}>
        {share.toFixed(0)}%
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: theme.colors.text }}>
        {value}
      </span>
    </div>
  );
}

function ListRow({ label, meta, value }: { label: string; meta: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: `1px solid ${theme.colors.border}` }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 650, color: theme.colors.text }}>{label}</div>
        <div style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 2 }}>{meta}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.colors.text }}>{value}</div>
    </div>
  );
}

function ActionTile({
  title,
  body,
  cta,
  onClick,
}: {
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        background: theme.colors.surfaceAlt,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radius.lg,
        padding: 16,
        cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: theme.colors.text }}>{title}</div>
      <div style={{ fontSize: 13, color: theme.colors.textMuted, lineHeight: 1.55, marginTop: 8 }}>{body}</div>
      <div style={{ marginTop: 12, color: theme.colors.accent, fontSize: 13, fontWeight: 700 }}>{cta}</div>
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <p style={{ fontSize: 13, color: theme.colors.textSoft, margin: 0 }}>{text}</p>;
}

function toneColor(tone: 'success' | 'danger' | 'accent' | 'warning') {
  switch (tone) {
    case 'success': return theme.colors.success;
    case 'danger': return theme.colors.danger;
    case 'warning': return theme.colors.warning;
    default: return theme.colors.accent;
  }
}

function monthKeyFromDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function pickerStyle(): React.CSSProperties {
  return {
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.lg,
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 600,
    color: theme.colors.text,
    background: theme.colors.surfaceAlt,
    outline: 'none',
    minHeight: 40,
  };
}
