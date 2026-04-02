import React, { useRef, useState } from 'react';
import type { ReviewTransaction } from '../pocket.js';
import { CATEGORY_LABELS } from '../constants.js';
import { SourceBadge } from './SourceBadge.js';
import { ConfidenceIndicator } from './ConfidenceIndicator.js';
import { QuickTag } from './QuickTag.js';

interface Props {
  txn: ReviewTransaction;
  focused: boolean;
  selected: boolean;
  suggestedCategory: string | null;
  onFocus: () => void;
  onToggleSelect: () => void;
  onAccept: () => void;
  onReject: () => void;
  onSetCategory: (category: string, saveMerchantRule: boolean) => void;
  isTagOpen: boolean;
  onOpenTag: () => void;
  onCloseTag: () => void;
}

export function TransactionRow({
  txn,
  focused,
  selected,
  suggestedCategory,
  onFocus,
  onToggleSelect,
  onAccept,
  onReject,
  onSetCategory,
  isTagOpen,
  onOpenTag,
  onCloseTag,
}: Props): React.ReactElement {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const [showWarnings, setShowWarnings] = useState(false);

  const warnings: Array<{ code: string; message: string }> = (() => {
    try { return JSON.parse(txn.warningsJson) as Array<{ code: string; message: string }>; }
    catch { return []; }
  })();

  const amount = txn.amount;
  const amountFmt = new Intl.NumberFormat('he-IL', { style: 'currency', currency: txn.originalCurrency || 'ILS' }).format(amount);
  const dateFmt = txn.date.slice(0, 10);
  const categoryLabel = txn.effectiveCategory ? (CATEGORY_LABELS[txn.effectiveCategory] ?? txn.effectiveCategory) : null;

  const statusColors: Record<string, string> = {
    pending: '#92400e',
    accepted: '#14532d',
    rejected: '#7f1d1d',
  };

  const rowBg = selected
    ? '#eff6ff'
    : focused
    ? '#f9fafb'
    : txn.reviewStatus === 'accepted'
    ? '#f0fdf4'
    : txn.reviewStatus === 'rejected'
    ? '#fef2f2'
    : '#fff';

  return (
    <tr
      ref={rowRef}
      role="row"
      aria-selected={selected}
      data-testid="transaction-row"
      data-review-status={txn.reviewStatus}
      tabIndex={0}
      onClick={onFocus}
      onFocus={onFocus}
      style={{
        background: rowBg,
        outline: focused ? '2px solid #3b82f6' : 'none',
        outlineOffset: -2,
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
    >
      {/* Checkbox */}
      <td style={{ padding: '10px 12px', width: 32 }}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${txn.description}`}
        />
      </td>

      {/* Date */}
      <td style={{ padding: '10px 8px', fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>
        {dateFmt}
      </td>

      {/* Description + badges */}
      <td style={{ padding: '10px 8px', minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>{txn.description}</span>
          <SourceBadge sourceType={txn.sourceType} extractionMethod={txn.extractionMethod} />
          {txn.possibleDuplicate && (
            <span
              title="This transaction may already exist in another account (same date, amount, and description). Consider rejecting it to avoid double-counting."
              style={{
                background: '#fde8ff',
                color: '#7e22ce',
                borderRadius: 4,
                padding: '1px 6px',
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              possible duplicate
            </span>
          )}
          {warnings.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowWarnings((p) => !p); }}
              aria-label={`${warnings.length} warning${warnings.length > 1 ? 's' : ''}`}
              title={warnings.map((w) => w.message).join('\n')}
              style={{
                border: 'none',
                background: '#fef3c7',
                color: '#92400e',
                borderRadius: 4,
                padding: '1px 6px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              warning {warnings.length}
            </button>
          )}
        </div>
        {showWarnings && warnings.length > 0 && (
          <ul style={{ margin: '6px 0 0', padding: '0 0 0 16px', fontSize: 12, color: '#92400e' }}>
            {warnings.map((w, i) => <li key={i}>{w.message}</li>)}
          </ul>
        )}
        {txn.installmentNumber && txn.installmentTotal && (
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
            Installment {txn.installmentNumber}/{txn.installmentTotal}
          </div>
        )}
      </td>

      {/* Amount */}
      <td style={{
        padding: '10px 8px',
        fontSize: 14,
        fontWeight: 600,
        color: amount < 0 ? '#dc2626' : '#16a34a',
        whiteSpace: 'nowrap',
        textAlign: 'right',
      }}>
        {amountFmt}
      </td>

      {/* Confidence */}
      <td style={{ padding: '10px 8px', width: 80 }}>
        <ConfidenceIndicator score={txn.confidenceScore} />
      </td>

      {/* Category */}
      <td style={{ padding: '10px 8px', position: 'relative', width: 140 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {categoryLabel ? (
            <span style={{
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 12,
              background: txn.userCategory ? '#ede9fe' : '#f3f4f6',
              color: txn.userCategory ? '#5b21b6' : '#374151',
              fontWeight: 500,
            }}>
              {categoryLabel}
            </span>
          ) : (
            <span style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>Untagged</span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); isTagOpen ? onCloseTag() : onOpenTag(); }}
            aria-label={`Tag ${txn.description}`}
            aria-haspopup="dialog"
            aria-expanded={isTagOpen}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 12,
              color: '#9ca3af',
              padding: '2px 4px',
            }}
          >
            {isTagOpen ? 'x' : 'T'}
          </button>
        </div>
        {isTagOpen && (
          <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100 }}>
            <QuickTag
              currentCategory={txn.effectiveCategory}
              suggestedCategory={suggestedCategory}
              onSelect={(cat, save) => { onSetCategory(cat, save); onCloseTag(); }}
              onClose={onCloseTag}
            />
          </div>
        )}
      </td>

      {/* Review status */}
      <td style={{ padding: '10px 8px', width: 90 }}>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: statusColors[txn.reviewStatus] ?? '#374151',
          background: txn.reviewStatus === 'accepted' ? '#dcfce7' : txn.reviewStatus === 'rejected' ? '#fee2e2' : '#fef3c7',
          padding: '2px 8px',
          borderRadius: 12,
        }}>
          {txn.reviewStatus}
        </span>
      </td>

      {/* Actions */}
      <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onAccept(); }}
            disabled={txn.reviewStatus === 'accepted'}
            aria-label={`Accept ${txn.description}`}
            style={actionStyle('#16a34a', txn.reviewStatus === 'accepted')}
          >
            Accept
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onReject(); }}
            disabled={txn.reviewStatus === 'rejected'}
            aria-label={`Reject ${txn.description}`}
            style={actionStyle('#dc2626', txn.reviewStatus === 'rejected')}
          >
            Reject
          </button>
        </div>
      </td>
    </tr>
  );
}

function actionStyle(color: string, disabled: boolean): React.CSSProperties {
  return {
    padding: '4px 10px',
    border: 'none',
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    background: disabled ? '#e5e7eb' : color,
    color: disabled ? '#9ca3af' : '#fff',
    opacity: disabled ? 0.6 : 1,
  };
}
