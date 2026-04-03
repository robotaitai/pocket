import React, { useEffect, useState } from 'react';
import { Chip, PageHeader, PrimaryButton, QuietCard, SegmentedControl, SecondaryButton, WorkspacePage } from '../components/Workspace.js';
import { theme } from '../theme.js';
import { MerchantView } from './MerchantView.js';
import { RecurringPayments } from './RecurringPayments.js';
import { ReviewQueue } from './ReviewQueue.js';
import { Timeline } from './Timeline.js';

export type ActivityMode = 'review' | 'timeline' | 'merchants' | 'recurring' | 'flagged';

interface Props {
  mode?: ActivityMode;
  onAskPocket: (question: string) => void;
}

export function ActivityWorkspace({ mode = 'review', onAskPocket }: Props): React.ReactElement {
  const [activeMode, setActiveMode] = useState<ActivityMode>(mode);
  const [pendingReview, setPendingReview] = useState(0);
  const [suspiciousCount, setSuspiciousCount] = useState(0);

  useEffect(() => { setActiveMode(mode); }, [mode]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      window.pocket.review.getBatches(),
      window.pocket.insights.getNewMerchants(),
    ]).then(([batches, merchants]) => {
      if (cancelled) return;
      setPendingReview(batches.reduce((sum, batch) => sum + batch.pending, 0));
      setSuspiciousCount(merchants.filter((merchant) => merchant.isSuspicious).length);
    });
    return () => { cancelled = true; };
  }, [activeMode]);

  const smartActions: Record<ActivityMode, string[]> = {
    review: [
      'What needs review first?',
      'Summarize the pending imports.',
    ],
    timeline: [
      'What changed in my recent activity?',
      'Find the largest expenses this month.',
    ],
    merchants: [
      'Summarize my top merchants.',
      'Which merchants grew the most recently?',
    ],
    recurring: [
      'Which recurring payments look highest?',
      'What subscriptions should I review?',
    ],
    flagged: [
      'Why do these merchants look suspicious?',
      'Summarize the flagged activity.',
    ],
  };

  const options = [
    { value: 'review', label: 'Needs review', count: pendingReview > 0 ? pendingReview : undefined },
    { value: 'timeline', label: 'Timeline' },
    { value: 'merchants', label: 'Merchants' },
    { value: 'recurring', label: 'Recurring' },
    { value: 'flagged', label: 'Flagged', count: suspiciousCount > 0 ? suspiciousCount : undefined },
  ] as const;

  return (
    <WorkspacePage width={1220}>
      <PageHeader
        eyebrow="Activity"
        title="Work the ledger, not the navigation"
        description="Review, search, drill into merchants, and inspect recurring behavior from one working surface."
        actions={<SegmentedControl options={options} value={activeMode} onChange={setActiveMode} />}
      />

      <QuietCard padding={18}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip tone={pendingReview > 0 ? 'warning' : 'success'}>
              {pendingReview > 0 ? `${pendingReview} pending review` : 'Review queue clear'}
            </Chip>
            {suspiciousCount > 0 && <Chip tone="danger">{suspiciousCount} flagged merchants</Chip>}
            <span style={{ fontSize: 13, color: theme.colors.textMuted }}>
              Smart actions stay close to the activity you are working on.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {smartActions[activeMode].map((prompt, index) => (
              <button
                key={prompt}
                onClick={() => onAskPocket(prompt)}
                style={{
                  border: `1px solid ${theme.colors.border}`,
                  background: index === 0 ? theme.colors.surface : theme.colors.surfaceAlt,
                  color: theme.colors.text,
                  borderRadius: theme.radius.pill,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 650,
                  cursor: 'pointer',
                }}
              >
                {prompt}
              </button>
            ))}
            <PrimaryButton onClick={() => onAskPocket('Summarize the current activity view.')}>
              Ask Pocket
            </PrimaryButton>
          </div>
        </div>
      </QuietCard>

      <div style={{ marginTop: 18 }}>
        {activeMode === 'review' && <ReviewQueue embedded onAskPocket={onAskPocket} />}
        {activeMode === 'timeline' && <Timeline embedded />}
        {activeMode === 'merchants' && <MerchantView embedded initialTab="all" />}
        {activeMode === 'recurring' && <RecurringPayments embedded />}
        {activeMode === 'flagged' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <QuietCard
              title="Flagged activity"
              subtitle="Pocket keeps unusual merchants and suspicious behavior in the same activity workspace instead of hiding them behind another page."
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, color: theme.colors.textMuted }}>
                  Use this view to check charges that look unfamiliar before they become part of normal history.
                </div>
                <SecondaryButton onClick={() => onAskPocket('Summarize the suspicious merchants and what makes them unusual.')}>
                  Explain flagged merchants
                </SecondaryButton>
              </div>
            </QuietCard>
            <MerchantView embedded initialTab="suspicious" />
          </div>
        )}
      </div>
    </WorkspacePage>
  );
}
