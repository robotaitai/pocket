import React, { useCallback, useEffect, useState } from 'react';
import type { ReviewBatchSummary } from '../pocket.js';
import { BatchReview } from './BatchReview.js';
import { SOURCE_TYPE_LABELS } from '../constants.js';

export function ReviewQueue(): React.ReactElement {
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
        onBack={() => { setActiveBatch(null); void loadBatches(); }}
      />
    );
  }

  const hasPending = batches.some((b) => b.pending > 0);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Review Queue</h1>
        {hasPending && (
          <span style={{
            marginLeft: 12,
            background: '#fef3c7',
            color: '#92400e',
            borderRadius: 12,
            padding: '2px 10px',
            fontSize: 13,
            fontWeight: 600,
          }}>
            {batches.reduce((s, b) => s + b.pending, 0)} pending
          </span>
        )}
      </div>

      {loading ? (
        <p style={{ color: '#9ca3af' }}>Loading...</p>
      ) : batches.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {batches.map((batch) => (
            <BatchCard key={batch.batchId} batch={batch} onOpen={() => setActiveBatch(batch)} />
          ))}
        </div>
      )}
    </div>
  );
}

function BatchCard({ batch, onOpen }: { batch: ReviewBatchSummary; onOpen: () => void }) {
  const sourceLabel = SOURCE_TYPE_LABELS[batch.sourceType] ?? batch.sourceType;
  const date = batch.createdAt.slice(0, 10);
  const isFullyReviewed = batch.pending === 0;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${sourceLabel} batch from ${date}`}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      style={{
        background: '#fff',
        border: `1px solid ${isFullyReviewed ? '#d1fae5' : '#fde68a'}`,
        borderRadius: 10,
        padding: '16px 20px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.15s',
      }}
    >
      {/* Source type badge */}
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: isFullyReviewed ? '#d1fae5' : '#fef3c7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        color: isFullyReviewed ? '#065f46' : '#92400e',
        flexShrink: 0,
        letterSpacing: '0.04em',
      }}>
        {sourceLabel.slice(0, 3).toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>
          {sourceLabel} import &mdash; {date}
        </div>
        {batch.sourceFile && (
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{batch.sourceFile}</div>
        )}
        {batch.providerUsed && (
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Provider: {batch.providerUsed}</div>
        )}
      </div>

      {/* Counts */}
      <div style={{ display: 'flex', gap: 10, fontSize: 13 }}>
        {batch.pending > 0 && (
          <Count label="pending" value={batch.pending} color="#92400e" bg="#fef3c7" />
        )}
        {batch.accepted > 0 && (
          <Count label="accepted" value={batch.accepted} color="#065f46" bg="#d1fae5" />
        )}
        {batch.rejected > 0 && (
          <Count label="rejected" value={batch.rejected} color="#7f1d1d" bg="#fee2e2" />
        )}
      </div>

      <div style={{ fontSize: 20, color: '#9ca3af' }}>&rsaquo;</div>
    </div>
  );
}

function Count({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color, background: bg, padding: '0 8px', borderRadius: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      textAlign: 'center',
      padding: '64px 0',
      color: '#9ca3af',
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>-</div>
      <h2 style={{ margin: '0 0 8px', fontSize: 20, color: '#374151' }}>No import batches yet</h2>
      <p style={{ margin: 0, fontSize: 14 }}>
        Run a connector import or upload a bank statement to get started.
      </p>
    </div>
  );
}
