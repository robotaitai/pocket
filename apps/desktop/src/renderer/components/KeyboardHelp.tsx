import React from 'react';

interface Props {
  onClose: () => void;
}

const SHORTCUTS: Array<{ keys: string; description: string }> = [
  { keys: 'j / ArrowDown', description: 'Next transaction' },
  { keys: 'k / ArrowUp', description: 'Previous transaction' },
  { keys: 'a', description: 'Accept focused transaction' },
  { keys: 'r', description: 'Reject focused transaction' },
  { keys: 't', description: 'Tag / categorize focused transaction' },
  { keys: 'Space', description: 'Select / deselect for bulk action' },
  { keys: 'A (with selection)', description: 'Accept all selected' },
  { keys: 'R (with selection)', description: 'Reject all selected' },
  { keys: 'u', description: 'Undo last action' },
  { keys: '?', description: 'Show this help' },
  { keys: 'Esc', description: 'Close overlay / cancel' },
];

export function KeyboardHelp({ onClose }: Props): React.ReactElement {
  return (
    <div
      role="dialog"
      aria-label="Keyboard shortcuts"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
        zIndex: 200,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '24px 32px',
        minWidth: 380,
        boxShadow: '0 20px 48px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Keyboard Shortcuts</h2>
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af' }}
          >
            x
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {SHORTCUTS.map(({ keys, description }) => (
              <tr key={keys} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 0', paddingRight: 24 }}>
                  <kbd style={{
                    background: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                  }}>
                    {keys}
                  </kbd>
                </td>
                <td style={{ padding: '8px 0', fontSize: 13, color: '#374151' }}>{description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
