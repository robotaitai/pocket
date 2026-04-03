import React, { useCallback, useEffect, useState } from 'react';
import type { ReviewBatchSummary } from '../pocket.js';
import { BatchReview } from './BatchReview.js';
import { SOURCE_TYPE_LABELS } from '../constants.js';
import { Chip, PageHeader, QuietCard, SecondaryButton, WorkspacePage } from '../components/Workspace.js';
import { theme } from '../theme.js';

interface Props {
  embedded?: boolean;
  onAskPocket?: (question: string) => void;
}

export function ReviewQueue({ embedded = false, onAskPocket }: Props): React.ReactElement {
  const [batches, setBatches] = useState<ReviewBatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBatch, setActiveBatch] = useState<ReviewBatchSummary | null>(null);

  const loadBatches = useCallback(async () => {
    const data = await window.pocket.review.getBatches();
    setBatches(data);
    setLoading(false);
  }, []);

  useEffect(() => { void loadBatches(); }, [loadBatches]);

  if (activeBatch) {
    return (
      <BatchReview
        batch={activeBatch}
        embedded={embedded}
        onBack={() => { setActiveBatch(null); void loadBatches(); }}
      />
    );
  }

  const hasPending = batches.some((batch) => batch.pending > 0);
  const pendingCount = batches.reduce((sum, batch) => sum + batch.pending, 0);
  const body = (
    <>
      {!embedded && (
        <PageHeader
          eyebrow="Activity"
          title="Needs review"
          description="Every imported record passes through review before it becomes trusted data."
          actions={hasPending ? <Chip tone="warning">{pendingCount} pending</Chip> : <Chip tone="success">All clear</Chip>}
        />
      )}

      {onAskPocket && hasPending && (
        <QuietCard padding={16}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: theme.colors.textMuted }}>
              Pocket can help summarize what is waiting in the queue before you open a batch.
            </div>
            <SecondaryButton onClick={() => onAskPocket('Summarize the pending review queue and highlight anything risky.')}>
              Summarize pending review
            </SecondaryButton>
          </div>
        </QuietCard>
      )}

      <div style={{ display: 'grid', gap: 12, marginTop: embedded || !hasPending ? 0 : 16 }}>
        {loading ? (
          <QuietCard>
            <div style={{ color: theme.colors.textSoft }}>Loading review queue...</div>
          </QuietCard>
        ) : batches.length === 0 ? (
          <QuietCard>
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: theme.colors.text }}>No import batches yet</div>
              <div style={{ fontSize: 13, color: theme.colors.textMuted, marginTop: 8 }}>
                Run a connector or import files from Connect to start building trusted activity.
              </div>
            </div>
          </QuietCard>
        ) : (
          batches.map((batch) => (
            <BatchCard key={batch.batchId} batch={batch} onOpen={() => setActiveBatch(batch)} />
          ))
        )}
      </div>
    </>
  );

  return embedded ? body : <WorkspacePage width={960}>{body}</WorkspacePage>;
}

function BatchCard({ batch, onOpen }: { batch: ReviewBatchSummary; onOpen: () => void }) {
  const sourceLabel = SOURCE_TYPE_LABELS[batch.sourceType] ?? batch.sourceType;
  const date = batch.createdAt.slice(0, 10);
  const isFullyReviewed = batch.pending === 0;

  return (
    <button
      onClick={onOpen}
      aria-label={`Open ${sourceLabel} batch from ${date}`}
      style={{
        textAlign: 'left',
        width: '100%',
        background: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radius.lg,
        padding: '18px 20px',
        cursor: 'pointer',
        boxShadow: theme.shadow.card,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: theme.colors.text }}>
              {sourceLabel} import
            </span>
            <Chip tone={isFullyReviewed ? 'success' : 'warning'}>{isFullyReviewed ? 'Reviewed' : `${batch.pending} pending`}</Chip>
          </div>
          <div style={{ fontSize: 13, color: theme.colors.textMuted }}>{date}</div>
          {batch.sourceFile && (
            <div style={{ fontSize: 12, color: theme.colors.textSoft, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {batch.sourceFile}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
          <Count label="Pending" value={batch.pending} />
          <Count label="Accepted" value={batch.accepted} />
          <Count label="Rejected" value={batch.rejected} />
        </div>
      </div>
    </button>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ minWidth: 70, textAlign: 'right' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: theme.colors.text }}>{value}</div>
      <div style={{ fontSize: 11, color: theme.colors.textSoft, marginTop: 2 }}>{label}</div>
    </div>
  );
}
