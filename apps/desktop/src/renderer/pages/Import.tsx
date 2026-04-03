import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ConnectorDescriptor, ConnectorRunResult, FileImportResult } from '../pocket.js';
import { Chip, PrimaryButton, QuietCard, SecondaryButton } from '../components/Workspace.js';
import { theme } from '../theme.js';

type ConnectorRunState = 'idle' | 'running' | 'done' | 'error';

interface ConnectorStatus {
  credentialsSet: boolean;
}

interface Props {
  embedded?: boolean;
  onOpenSettings?: () => void;
}

export function Import({ embedded = false, onOpenSettings }: Props): React.ReactElement {
  const [connectors, setConnectors] = useState<ConnectorDescriptor[]>([]);
  const [status, setStatus] = useState<Record<string, ConnectorStatus>>({});
  const [runState, setRunState] = useState<Record<string, ConnectorRunState>>({});
  const [runResults, setRunResults] = useState<Record<string, ConnectorRunResult>>({});
  const [fileState, setFileState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [fileResult, setFileResult] = useState<FileImportResult | null>(null);
  const [activity, setActivity] = useState<Array<{ text: string; tone: 'neutral' | 'success' | 'warning' | 'danger' }>>([]);
  const activityRef = useRef<HTMLDivElement>(null);

  const pushActivity = (text: string, tone: 'neutral' | 'success' | 'warning' | 'danger' = 'neutral') => {
    setActivity((prev) => [...prev, { text, tone }]);
    setTimeout(() => activityRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }), 30);
  };

  const loadConnectors = useCallback(async () => {
    const list = await window.pocket.credentials.listConnectors();
    setConnectors(list);

    const nextStatus: Record<string, ConnectorStatus> = {};
    for (const conn of list) {
      const checks = await Promise.all(conn.credentialFields.map((field) => window.pocket.credentials.getFieldStatus(conn.id, field)));
      nextStatus[conn.id] = { credentialsSet: checks.every((check) => check.set) };
    }
    setStatus(nextStatus);
  }, []);

  useEffect(() => { void loadConnectors(); }, [loadConnectors]);

  const handleRun = async (conn: ConnectorDescriptor) => {
    if (runState[conn.id] === 'running') return;
    setRunState((state) => ({ ...state, [conn.id]: 'running' }));
    const result = await window.pocket.connector.run(conn.id);
    setRunResults((state) => ({ ...state, [conn.id]: result }));
    setRunState((state) => ({ ...state, [conn.id]: result.error ? 'error' : 'done' }));
  };

  const handleFileImport = async () => {
    if (fileState === 'running') return;
    setFileState('running');
    setFileResult(null);
    setActivity([]);
    pushActivity('Choose one or more files to import.');

    const result = await window.pocket.fileImport.pickAndExtract();
    setFileResult(result);

    if (result.canceled) {
      setFileState('idle');
      setActivity([]);
      return;
    }

    if (result.error) {
      pushActivity(result.error, 'danger');
      setFileState('error');
      return;
    }

    if (result.fileResults && result.fileResults.length > 0) {
      for (const entry of result.fileResults) {
        if (entry.error) {
          pushActivity(`${entry.file}: ${entry.error}`, 'danger');
        } else if (entry.inserted > 0) {
          pushActivity(`${entry.file}: ${entry.inserted} new, ${entry.duplicates} duplicate${entry.duplicates === 1 ? '' : 's'}`, 'success');
        } else {
          pushActivity(`${entry.file}: no new transactions (${entry.duplicates} duplicates)`, 'warning');
        }
      }
    }

    if ((result.inserted ?? 0) > 0) {
      pushActivity(`${result.inserted ?? 0} new transaction${(result.inserted ?? 0) === 1 ? '' : 's'} are ready for review.`, 'success');
    }
    if ((result.errors?.length ?? 0) > 0) {
      pushActivity(`${result.errors?.length ?? 0} issue${(result.errors?.length ?? 0) === 1 ? '' : 's'} need attention.`, 'danger');
    }
    if ((result.inserted ?? 0) === 0 && (result.errors?.length ?? 0) === 0) {
      pushActivity('Import finished, but nothing new was added.', 'warning');
    }
    setFileState('done');
  };

  const content = (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(320px, 0.85fr)', gap: 18 }}>
      <QuietCard title="Import files" subtitle="Use files for older history, one-off statements, or card PDFs that do not come through bank APIs.">
        <div style={{ display: 'grid', gap: 16 }}>
          <button
            onClick={() => void handleFileImport()}
            disabled={fileState === 'running'}
            style={{
              border: `1.5px solid ${theme.colors.borderStrong}`,
              borderRadius: theme.radius.lg,
              padding: '28px 24px',
              background: theme.colors.surfaceAlt,
              cursor: fileState === 'running' ? 'default' : 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: theme.colors.textSoft, marginBottom: 8 }}>File import</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: theme.colors.text, letterSpacing: '-0.03em' }}>
              {fileState === 'running' ? 'Processing selected files...' : 'Choose CSV, XLSX, or PDF files'}
            </div>
            <div style={{ fontSize: 13, color: theme.colors.textMuted, marginTop: 10, lineHeight: 1.55 }}>
              Multiple files are supported. PDFs use native parsing when possible, otherwise your connected provider can help.
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Chip tone="accent">Multiple files ok</Chip>
              <Chip tone="neutral">CSV, XLSX, PDF</Chip>
            </div>
          </button>

          {(fileResult || activity.length > 0) && (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                <MiniStat label="New" value={String(fileResult?.inserted ?? 0)} />
                <MiniStat label="Duplicates" value={String(fileResult?.duplicates ?? 0)} />
                <MiniStat label="Errors" value={String(fileResult?.errors?.length ?? 0)} />
              </div>

              <div
                ref={activityRef}
                style={{
                  maxHeight: 220,
                  overflowY: 'auto',
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.md,
                  background: theme.colors.surface,
                }}
              >
                {activity.map((entry, index) => (
                  <div
                    key={`${entry.text}-${index}`}
                    style={{
                      padding: '12px 14px',
                      borderTop: index === 0 ? 'none' : `1px solid ${theme.colors.border}`,
                      color: entry.tone === 'success'
                        ? theme.colors.success
                        : entry.tone === 'warning'
                        ? theme.colors.warning
                        : entry.tone === 'danger'
                        ? theme.colors.danger
                        : theme.colors.textMuted,
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    {entry.text}
                  </div>
                ))}
              </div>

              {fileResult?.errors && fileResult.errors.length > 0 && (
                <div style={{ border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, background: theme.colors.dangerSoft }}>
                  {fileResult.errors.slice(0, 6).map((error, index) => (
                    <div
                      key={`${error}-${index}`}
                      style={{
                        padding: '10px 12px',
                        borderTop: index === 0 ? 'none' : `1px solid ${theme.colors.border}`,
                        color: theme.colors.danger,
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      {error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </QuietCard>

      <div style={{ display: 'grid', gap: 18 }}>
        <QuietCard title="Live connectors" subtitle="Best for recent history from banks and cards you already connected.">
          <div style={{ display: 'grid', gap: 10 }}>
            {connectors.map((conn) => (
              <ConnectorRow
                key={conn.id}
                conn={conn}
                credentialsSet={status[conn.id]?.credentialsSet ?? false}
                state={runState[conn.id] ?? 'idle'}
                result={runResults[conn.id]}
                onRun={() => void handleRun(conn)}
              />
            ))}
          </div>
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: theme.radius.md, background: theme.colors.warningSoft, color: theme.colors.warning, fontSize: 12, lineHeight: 1.55 }}>
            Most bank APIs expose about three months of history. Use file import when you need older backfill.
          </div>
        </QuietCard>

        <QuietCard title="Need setup help?" subtitle="Connection and provider settings stay close by, but out of primary navigation.">
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 13, color: theme.colors.textMuted, lineHeight: 1.55 }}>
              Bank credentials and provider keys stay on-device. Use settings to add or rotate credentials, test access, and control privacy boundaries.
            </div>
            {onOpenSettings && (
              <SecondaryButton onClick={onOpenSettings}>Open settings</SecondaryButton>
            )}
          </div>
        </QuietCard>
      </div>
    </div>
  );

  return embedded ? content : <div style={{ padding: 24 }}>{content}</div>;
}

function ConnectorRow({
  conn,
  credentialsSet,
  state,
  result,
  onRun,
}: {
  conn: ConnectorDescriptor;
  credentialsSet: boolean;
  state: ConnectorRunState;
  result?: ConnectorRunResult;
  onRun: () => void;
}) {
  const tone = state === 'error' ? 'danger' : state === 'done' ? 'success' : credentialsSet ? 'accent' : 'warning';
  const toneLabel = state === 'running'
    ? 'Running'
    : state === 'done'
    ? 'Imported'
    : state === 'error'
    ? 'Needs attention'
    : credentialsSet
    ? 'Ready'
    : 'Credentials missing';

  return (
    <div style={{ border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, padding: 14, background: theme.colors.surfaceAlt }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.colors.text }}>{conn.name}</div>
          <div style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 4 }}>{conn.institutionType}</div>
        </div>
        <Chip tone={tone}>{toneLabel}</Chip>
      </div>
      {result && !result.error && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, fontSize: 12, color: theme.colors.textMuted }}>
          <span>{result.inserted ?? 0} new</span>
          <span>{result.duplicates ?? 0} duplicate{(result.duplicates ?? 0) === 1 ? '' : 's'}</span>
          {typeof result.accounts === 'number' && <span>{result.accounts} account{result.accounts === 1 ? '' : 's'}</span>}
        </div>
      )}
      {result?.error && (
        <div style={{ marginTop: 10, fontSize: 12, color: theme.colors.danger, lineHeight: 1.5 }}>
          {result.error}
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <PrimaryButton onClick={onRun} disabled={!credentialsSet || state === 'running'}>
          {state === 'running' ? 'Running...' : 'Run import'}
        </PrimaryButton>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, background: theme.colors.surface, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, color: theme.colors.textSoft, fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: theme.colors.text }}>{value}</div>
    </div>
  );
}
