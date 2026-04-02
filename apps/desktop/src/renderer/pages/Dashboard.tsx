import React, { useState } from 'react';
import { ReviewQueue } from './ReviewQueue.js';

type Tab = 'review' | 'accounts' | 'settings';

export function Dashboard() {
  const [tab, setTab] = useState<Tab>('review');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>
      <header style={{ display: 'flex', alignItems: 'center', padding: '0 24px', background: '#fff', borderBottom: '1px solid #e5e7eb', height: 52 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginRight: 32, letterSpacing: '-0.02em' }}>Pocket</span>
        <nav style={{ display: 'flex', gap: 4 }}>
          {(['review', 'accounts', 'settings'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              aria-current={tab === t ? 'page' : undefined}
              style={{
                border: 'none',
                background: 'none',
                padding: '6px 14px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: tab === t ? 600 : 400,
                color: tab === t ? '#1d4ed8' : '#6b7280',
                borderBottom: tab === t ? '2px solid #1d4ed8' : '2px solid transparent',
                borderRadius: '4px 4px 0 0',
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'review' && <ReviewQueue />}
        {tab === 'accounts' && (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            Account connections coming in a future step.
          </div>
        )}
        {tab === 'settings' && (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            Settings coming in a future step.
          </div>
        )}
      </main>
    </div>
  );
}
