import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReviewBatchSummary, ReviewTransaction } from '../pocket.js';
import { TransactionRow } from '../components/TransactionRow.js';
import { BulkActions } from '../components/BulkActions.js';
import { KeyboardHelp } from '../components/KeyboardHelp.js';
import { SOURCE_TYPE_LABELS } from '../constants.js';
import { useKeyboard } from '../hooks/useKeyboard.js';

interface Props {
  batch: ReviewBatchSummary;
  onBack: () => void;
}

export function BatchReview({ batch, onBack }: Props): React.ReactElement {
  const [transactions, setTransactions] = useState<ReviewTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openTagId, setOpenTagId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [suggestedCategories, setSuggestedCategories] = useState<Record<string, string | null>>({});
  const [statusMessage, setStatusMessage] = useState('');

  const loadTransactions = useCallback(async () => {
    const txns = await window.pocket.review.getTransactions({ batchId: batch.batchId, reviewStatus: 'all' });
    setTransactions(txns);
    setLoading(false);

    // Pre-fetch merchant rule suggestions
    const suggestions: Record<string, string | null> = {};
    for (const t of txns) {
      suggestions[t.id] = await window.pocket.merchantRules.suggest(t.description);
    }
    setSuggestedCategories(suggestions);
  }, [batch.batchId]);

  useEffect(() => { void loadTransactions(); }, [loadTransactions]);

  const focused = transactions[focusedIdx] ?? null;

  const notify = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 2000);
  };

  const handleAccept = useCallback(async (ids: string[]) => {
    await window.pocket.review.accept(ids);
    await loadTransactions();
    notify(`Accepted ${ids.length} transaction${ids.length > 1 ? 's' : ''}`);
    setSelectedIds(new Set());
  }, [loadTransactions]);

  const handleReject = useCallback(async (ids: string[]) => {
    await window.pocket.review.reject(ids);
    await loadTransactions();
    notify(`Rejected ${ids.length} transaction${ids.length > 1 ? 's' : ''}`);
    setSelectedIds(new Set());
  }, [loadTransactions]);

  const handleSetCategory = useCallback(async (id: string, category: string, saveMerchantRule: boolean) => {
    await window.pocket.review.setCategory(id, category, saveMerchantRule);
    await loadTransactions();
    notify(`Tagged as ${category}${saveMerchantRule ? ' (rule saved)' : ''}`);
  }, [loadTransactions]);

  const handleUndo = useCallback(async () => {
    const result = await window.pocket.review.undo();
    if (result.restoredCount > 0) {
      await loadTransactions();
      notify(`Undone: ${result.actionType} (${result.restoredCount} records restored)`);
    }
  }, [loadTransactions]);

  const pendingCount = transactions.filter((t) => t.reviewStatus === 'pending').length;
  const acceptedCount = transactions.filter((t) => t.reviewStatus === 'accepted').length;
  const rejectedCount = transactions.filter((t) => t.reviewStatus === 'rejected').length;

  // Keyboard bindings
  const keyBindings = useMemo(() => [
    {
      key: 'j', description: 'Next', shift: false,
      handler: () => setFocusedIdx((i) => Math.min(i + 1, transactions.length - 1)),
    },
    {
      key: 'ArrowDown', description: 'Next', shift: false,
      handler: () => setFocusedIdx((i) => Math.min(i + 1, transactions.length - 1)),
    },
    {
      key: 'k', description: 'Previous', shift: false,
      handler: () => setFocusedIdx((i) => Math.max(i - 1, 0)),
    },
    {
      key: 'ArrowUp', description: 'Previous', shift: false,
      handler: () => setFocusedIdx((i) => Math.max(i - 1, 0)),
    },
    {
      key: 'a', description: 'Accept', shift: false,
      handler: () => {
        if (selectedIds.size > 0) {
          void handleAccept([...selectedIds]);
        } else if (focused) {
          void handleAccept([focused.id]);
        }
      },
    },
    {
      key: 'r', description: 'Reject', shift: false,
      handler: () => {
        if (selectedIds.size > 0) {
          void handleReject([...selectedIds]);
        } else if (focused) {
          void handleReject([focused.id]);
        }
      },
    },
    {
      key: 't', description: 'Tag', shift: false,
      handler: () => { if (focused) setOpenTagId(focused.id); },
    },
    {
      key: ' ', description: 'Toggle select', shift: false,
      handler: () => {
        if (!focused) return;
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.has(focused.id) ? next.delete(focused.id) : next.add(focused.id);
          return next;
        });
      },
    },
    {
      key: 'a', description: 'Select all', shift: true,
      handler: () => setSelectedIds(new Set(transactions.map((t) => t.id))),
    },
    {
      key: 'u', description: 'Undo', shift: false,
      handler: () => void handleUndo(),
    },
    {
      key: '?', description: 'Help', shift: false,
      handler: () => setShowHelp(true),
    },
    {
      key: 'Escape', description: 'Close', shift: false,
      handler: () => { setShowHelp(false); setOpenTagId(null); },
    },
  ], [transactions.length, focused, selectedIds, handleAccept, handleReject, handleUndo]);

  useKeyboard(keyBindings, !showHelp || openTagId === null);

  const sourceLabel = SOURCE_TYPE_LABELS[batch.sourceType] ?? batch.sourceType;
  const batchDate = batch.createdAt.slice(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 20px',
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <button
          onClick={onBack}
          aria-label="Back to review queue"
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280', padding: '0 4px' }}
        >
          &larr;
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {sourceLabel} import &mdash; {batchDate}
          </h1>
          {batch.sourceFile && (
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{batch.sourceFile}</div>
          )}
        </div>
        <div style={{ flex: 1 }} />

        {/* Progress */}
        <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
          <Stat label="Pending" value={pendingCount} color="#92400e" bg="#fef3c7" />
          <Stat label="Accepted" value={acceptedCount} color="#14532d" bg="#dcfce7" />
          <Stat label="Rejected" value={rejectedCount} color="#7f1d1d" bg="#fee2e2" />
        </div>

        <button
          onClick={() => setShowHelp(true)}
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
          style={{ border: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}
        >
          ? Help
        </button>
      </div>

      {/* Status toast */}
      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#111827',
            color: '#fff',
            padding: '8px 20px',
            borderRadius: 8,
            fontSize: 13,
            zIndex: 300,
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Bulk actions */}
      <BulkActions
        selectedCount={selectedIds.size}
        totalCount={transactions.length}
        onSelectAll={() => setSelectedIds(new Set(transactions.map((t) => t.id)))}
        onAcceptSelected={() => void handleAccept([...selectedIds])}
        onRejectSelected={() => void handleReject([...selectedIds])}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No transactions in this batch.</div>
        ) : (
          <table
            role="table"
            aria-label="Transactions for review"
            style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}
          >
            <thead>
              <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                <th style={th()}>
                  <input
                    type="checkbox"
                    checked={transactions.length > 0 && selectedIds.size === transactions.length}
                    ref={(el) => {
                      if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < transactions.length;
                    }}
                    onChange={() => {
                      if (selectedIds.size === transactions.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(transactions.map((t) => t.id)));
                      }
                    }}
                    aria-label="Select all transactions"
                    title="Select all / Deselect all"
                  />
                </th>
                <th style={th('left')}>Date</th>
                <th style={th('left')}>Description</th>
                <th style={th('right')}>Amount</th>
                <th style={th()}>Confidence</th>
                <th style={th('left')}>Category</th>
                <th style={th()}>Status</th>
                <th style={th()}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn, idx) => (
                <React.Fragment key={txn.id}>
                  <TransactionRow
                    txn={txn}
                    focused={idx === focusedIdx}
                    selected={selectedIds.has(txn.id)}
                    suggestedCategory={suggestedCategories[txn.id] ?? null}
                    onFocus={() => setFocusedIdx(idx)}
                    onToggleSelect={() =>
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        next.has(txn.id) ? next.delete(txn.id) : next.add(txn.id);
                        return next;
                      })
                    }
                    onAccept={() => void handleAccept([txn.id])}
                    onReject={() => void handleReject([txn.id])}
                    onSetCategory={(cat, save) => void handleSetCategory(txn.id, cat, save)}
                    isTagOpen={openTagId === txn.id}
                    onOpenTag={() => setOpenTagId(txn.id)}
                    onCloseTag={() => setOpenTagId(null)}
                  />
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer hint */}
      <div style={{
        padding: '8px 20px',
        background: '#fff',
        borderTop: '1px solid #e5e7eb',
        fontSize: 12,
        color: '#9ca3af',
        display: 'flex',
        gap: 16,
      }}>
        <span>j/k navigate</span>
        <span>a accept</span>
        <span>r reject</span>
        <span>t tag</span>
        <span>Space select</span>
        <span>Shift+A select all</span>
        <span>u undo</span>
        <span>? help</span>
      </div>

      {showHelp && <KeyboardHelp onClose={() => setShowHelp(false)} />}
    </div>
  );
}

function Stat({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 18,
        fontWeight: 700,
        color,
        background: bg,
        padding: '2px 10px',
        borderRadius: 8,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function th(align?: 'left' | 'right'): React.CSSProperties {
  return {
    padding: '10px 8px',
    textAlign: align ?? 'center',
    fontSize: 12,
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };
}
