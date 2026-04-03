import React, { useMemo, useState } from 'react';
import { DashboardHome } from './DashboardHome.js';
import { Chat } from './Chat.js';
import { Settings } from './Settings.js';
import { ActivityWorkspace, type ActivityMode } from './ActivityWorkspace.js';
import { ConnectWorkspace } from './ConnectWorkspace.js';
import { Chip, SecondaryButton, SideDrawer } from '../components/Workspace.js';
import { theme } from '../theme.js';

type Tab = 'overview' | 'activity' | 'assistant' | 'connect';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity' },
  { id: 'assistant', label: 'Assistant' },
  { id: 'connect', label: 'Connect' },
];

export function Dashboard(): React.ReactElement {
  const [tab, setTab] = useState<Tab>('overview');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activityMode, setActivityMode] = useState<ActivityMode>('review');
  const [assistantQuestion, setAssistantQuestion] = useState<{ id: number; text: string } | null>(null);

  const queueAssistantQuestion = (text: string) => {
    setAssistantQuestion({ id: Date.now(), text });
    setTab('assistant');
  };

  const statusChip = useMemo(() => (
    <Chip tone="accent">Local-first workspace</Chip>
  ), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: theme.colors.appBg, fontFamily: 'system-ui, sans-serif', color: theme.colors.text }}>
      <header
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: 'rgba(251, 252, 254, 0.92)',
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${theme.colors.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', color: theme.colors.text }}>
              Pocket
            </div>
            <div style={{ fontSize: 11, color: theme.colors.textSoft, marginTop: 2 }}>
              Intelligent personal finance workspace
            </div>
          </div>
          <nav style={{ display: 'flex', gap: 6 }}>
            {TABS.map((item) => {
              const active = item.id === tab;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  aria-current={active ? 'page' : undefined}
                  style={{
                    border: 'none',
                    borderRadius: theme.radius.pill,
                    background: active ? theme.colors.surface : 'transparent',
                    color: active ? theme.colors.text : theme.colors.textMuted,
                    padding: '10px 14px',
                    fontSize: 13,
                    fontWeight: active ? 700 : 600,
                    cursor: 'pointer',
                    boxShadow: active ? '0 2px 10px rgba(16, 32, 51, 0.06)' : 'none',
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {statusChip}
          <SecondaryButton onClick={() => setSettingsOpen(true)}>Settings</SecondaryButton>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'overview' && (
          <DashboardHome
            onAskPocket={queueAssistantQuestion}
            onOpenActivity={(mode) => {
              setActivityMode(mode ?? 'review');
              setTab('activity');
            }}
            onOpenConnect={() => setTab('connect')}
          />
        )}
        {tab === 'activity' && (
          <ActivityWorkspace
            mode={activityMode}
            onAskPocket={queueAssistantQuestion}
          />
        )}
        {tab === 'assistant' && (
          <Chat
            queuedQuestion={assistantQuestion}
            onQuestionConsumed={() => setAssistantQuestion(null)}
          />
        )}
        {tab === 'connect' && (
          <ConnectWorkspace onOpenSettings={() => setSettingsOpen(true)} />
        )}
      </main>

      <SideDrawer open={settingsOpen} title="Settings" onClose={() => setSettingsOpen(false)}>
        <Settings embedded />
      </SideDrawer>
    </div>
  );
}
