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

type Tab = 'home' | 'review' | 'insights' | 'chat' | 'import' | 'settings';
type InsightsSubTab = 'merchants' | 'recurring';
type ImportSubTab = 'import' | 'health';
type ReviewSubTab = 'queue' | 'timeline';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'review', label: 'Review' },
  { id: 'insights', label: 'Insights' },
  { id: 'chat', label: 'Chat' },
  { id: 'import', label: 'Import' },
  { id: 'settings', label: 'Settings' },
];

export function Dashboard() {
  const [tab, setTab] = useState<Tab>('home');
  const [insightsSub, setInsightsSub] = useState<InsightsSubTab>('merchants');
  const [importSub, setImportSub] = useState<ImportSubTab>('import');
  const [reviewSub, setReviewSub] = useState<ReviewSubTab>('queue');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>
      <header style={{ display: 'flex', alignItems: 'center', padding: '0 20px', background: '#fff', borderBottom: '1px solid #e5e7eb', height: 48, flexShrink: 0 }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginRight: 24, letterSpacing: '-0.02em' }}>Pocket</span>
        <nav style={{ display: 'flex', gap: 2 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              style={{
                border: 'none',
                background: 'none',
                padding: '6px 14px',
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

        {tab === 'review' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <SubNav tabs={[{ id: 'queue', label: 'Review Queue' }, { id: 'timeline', label: 'Timeline' }]} active={reviewSub} onChange={(v) => setReviewSub(v as ReviewSubTab)} />
            {reviewSub === 'queue' && <ReviewQueue />}
            {reviewSub === 'timeline' && <Timeline />}
          </div>
        )}

        {tab === 'insights' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <SubNav tabs={[{ id: 'merchants', label: 'Merchants' }, { id: 'recurring', label: 'Recurring' }]} active={insightsSub} onChange={(v) => setInsightsSub(v as InsightsSubTab)} />
            {insightsSub === 'merchants' && <MerchantView />}
            {insightsSub === 'recurring' && <RecurringPayments />}
          </div>
        )}

        {tab === 'chat' && <Chat />}

        {tab === 'import' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <SubNav tabs={[{ id: 'import', label: 'Import' }, { id: 'health', label: 'Import Health' }]} active={importSub} onChange={(v) => setImportSub(v as ImportSubTab)} />
            {importSub === 'import' && <Import />}
            {importSub === 'health' && <ImportHealth />}
          </div>
        )}

        {tab === 'settings' && <Settings />}
      </main>
    </div>
  );
}

function SubNav({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange(v: string): void }) {
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', background: '#fff', paddingLeft: 24, flexShrink: 0 }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            border: 'none', background: 'none', padding: '8px 16px',
            cursor: 'pointer', fontSize: 13,
            fontWeight: active === t.id ? 600 : 400,
            color: active === t.id ? '#111827' : '#6b7280',
            borderBottom: active === t.id ? '2px solid #111827' : '2px solid transparent',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
