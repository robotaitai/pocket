import React from 'react';

interface Props {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onAcceptSelected: () => void;
  onRejectSelected: () => void;
  onClearSelection: () => void;
}

export function BulkActions({ selectedCount, totalCount, onSelectAll, onAcceptSelected, onRejectSelected, onClearSelection }: Props): React.ReactElement | null {
  if (selectedCount === 0) return null;

  const allSelected = selectedCount === totalCount;

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        background: '#eff6ff',
        borderTop: '1px solid #bfdbfe',
        borderBottom: '1px solid #bfdbfe',
      }}
    >
      <span style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>
        {selectedCount} of {totalCount} selected
      </span>
      {!allSelected && (
        <button
          onClick={onSelectAll}
          style={{ ...actionBtn('#1d4ed8'), background: 'transparent', color: '#1d4ed8', border: '1px solid #93c5fd' }}
        >
          Select all {totalCount}
        </button>
      )}
      <div style={{ flex: 1 }} />
      <button
        onClick={onAcceptSelected}
        aria-label={`Accept ${selectedCount} selected`}
        style={actionBtn('#16a34a')}
      >
        Accept ({selectedCount})
      </button>
      <button
        onClick={onRejectSelected}
        aria-label={`Reject ${selectedCount} selected`}
        style={actionBtn('#dc2626')}
      >
        Reject ({selectedCount})
      </button>
      <button
        onClick={onClearSelection}
        aria-label="Clear selection"
        style={{ ...actionBtn('#6b7280'), background: 'transparent', color: '#6b7280', border: '1px solid #d1d5db' }}
      >
        Clear
      </button>
    </div>
  );
}

function actionBtn(color: string): React.CSSProperties {
  return {
    padding: '5px 14px',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    background: color,
    color: '#fff',
  };
}
