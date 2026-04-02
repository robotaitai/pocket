import React, { useState } from 'react';
import { ReviewQueue } from './ReviewQueue.js';
import { DashboardHome } from './DashboardHome.js';
import { RecurringPayments } from './RecurringPayments.js';
import { MerchantView } from './MerchantView.js';
import { Timeline } from './Timeline.js';
import { ImportHealth } from './ImportHealth.js';
import { Chat } from './Chat.js';
import { Import } from './Import.js';
import { Settings } from './Settings.js';

type Tab = 'home' | 'review' | 'recurring' | 'merchants' | 'timeline' | 'health' | 'chat' | 'import' | 'settings';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'review', label: 'Review' },
  { id: 'recurring', label: 'Recurring' },
  { id: 'merchants', label: 'Merchants' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'health', label: 'Import Health' },
  { id: 'chat', label: 'Chat' },
  { id: 'import', label: 'Import' },
  { id: 'settings', label: 'Settings' },
];

export function Dashboard() {
  const [tab, setTab] = useState<Tab>('home');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>
      <header style={{ display: 'flex', alignItems: 'center', padding: '0 20px', background: '#fff', borderBottom: '1px solid #e5e7eb', height: 48, flexShrink: 0 }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginRight: 24, letterSpacing: '-0.02em' }}>Pocket</span>
        <nav style={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              style={{
                border: 'none',
                background: 'none',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: tab === t.id ? 700 : 400,
                color: tab === t.id ? '#1d4ed8' : '#6b7280',
                borderBottom: tab === t.id ? '2px solid #1d4ed8' : '2px solid transparent',
                borderRadius: '4px 4px 0 0',
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'home' && <DashboardHome />}
        {tab === 'review' && <ReviewQueue />}
        {tab === 'recurring' && <RecurringPayments />}
        {tab === 'merchants' && <MerchantView />}
        {tab === 'timeline' && <Timeline />}
        {tab === 'health' && <ImportHealth />}
        {tab === 'chat' && <Chat />}
        {tab === 'import' && <Import />}
        {tab === 'settings' && <Settings />}
      </main>
    </div>
  );
}
