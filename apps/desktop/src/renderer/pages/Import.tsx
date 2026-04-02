import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { FileImportResult, ConnectorDescriptor, ConnectorRunResult } from '../pocket.js';

type ConnectorRunState = 'idle' | 'running' | 'done' | 'error';

interface ConnectorStatus {
  credentialsSet: boolean;
  lastRun?: ConnectorRunState;
  lastResult?: ConnectorRunResult;
}

export function Import(): React.ReactElement {
  const [connectors, setConnectors] = useState<ConnectorDescriptor[]>([]);
  const [status, setStatus] = useState<Record<string, ConnectorStatus>>({});
  const [runState, setRunState] = useState<Record<string, ConnectorRunState>>({});
  const [runResults, setRunResults] = useState<Record<string, ConnectorRunResult>>({});

  const [fileState, setFileState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [fileResult, setFileResult] = useState<FileImportResult | null>(null);
  const [log, setLog] = useState<Array<{ text: string; type: 'info' | 'ok' | 'err' | 'warn' }>>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const appendLog = (text: string, type: 'info' | 'ok' | 'err' | 'warn' = 'info') => {
    setLog((prev) => [...prev, { text, type }]);
    setTimeout(() => { logRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }); }, 30);
  };

  const loadConnectors = useCallback(async () => {
    const list = await window.pocket.credentials.listConnectors();
    setConnectors(list);

    const statuses: Record<string, ConnectorStatus> = {};
    for (const conn of list) {
      const checks = await Promise.all(
        conn.credentialFields.map((f) => window.pocket.credentials.getFieldStatus(conn.id, f)),
      );
      statuses[conn.id] = { credentialsSet: checks.every((c) => c.set) };
    }
    setStatus(statuses);
  }, []);

  useEffect(() => { void loadConnectors(); }, [loadConnectors]);

  const handleRun = async (conn: ConnectorDescriptor) => {
    if (runState[conn.id] === 'running') return;
    setRunState((s) => ({ ...s, [conn.id]: 'running' }));
    setRunResults((r) => { const n = { ...r }; delete n[conn.id]; return n; });

    const res = await window.pocket.connector.run(conn.id);
    setRunResults((r) => ({ ...r, [conn.id]: res }));
    setRunState((s) => ({ ...s, [conn.id]: res.error ? 'error' : 'done' }));
  };

  const handleFileImport = async () => {
    if (fileState === 'running') return;
    setFileState('running');
    setFileResult(null);
    setLog([]);
    appendLog('Opening file picker...');

    const res = await window.pocket.fileImport.pickAndExtract();
    setFileResult(res);

    if (res.canceled) {
      setFileState('idle');
      setLog([]);
      return;
    }

    if (res.error) {
      appendLog(res.error, 'err');
      setFileState('error');
      return;
    }

    if (res.fileResults && res.fileResults.length > 1) {
      appendLog(`Processing ${res.fileResults.length} files...`, 'info');
      for (const fr of res.fileResults) {
        if (fr.error) {
          appendLog(`${fr.file}: ${fr.error}`, 'err');
        } else {
          appendLog(`${fr.file}: ${fr.inserted} new, ${fr.duplicates} dupes`, fr.inserted > 0 ? 'ok' : 'warn');
        }
      }
    }

    const total = res.inserted ?? 0;
    const dupes = res.duplicates ?? 0;
    const errs = res.errors?.length ?? 0;

    if (total > 0) appendLog(`Total: ${total} new transaction${total === 1 ? '' : 's'} pending review`, 'ok');
    if (dupes > 0) appendLog(`${dupes} duplicate${dupes === 1 ? '' : 's'} skipped`, 'warn');
    if (errs > 0) appendLog(`${errs} error${errs === 1 ? '' : 's'} — check details below`, 'err');
    if (total === 0 && errs === 0) appendLog('No new transactions found.', 'warn');

    setFileState('done');
  };

  const hasAnyConnector = connectors.length > 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: hasAnyConnector ? '340px 1fr' : '1fr', gap: 0, height: '100%', overflow: 'hidden' }}>

      {/* ── LEFT: Data sources ── */}
      {hasAnyConnector && (
        <div style={{
          borderRight: '1px solid #1f2937',
          background: '#111827',
          overflowY: 'auto',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
              Live Connectors
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              Pull directly from bank and card APIs. Credentials required.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {connectors.map((conn) => {
              const st = runState[conn.id] ?? 'idle';
              const res = runResults[conn.id];
              const creds = status[conn.id];
              const credOk = creds?.credentialsSet ?? false;

              return (
                <ConnectorRow
                  key={conn.id}
                  conn={conn}
                  state={st}
                  result={res}
                  credentialsSet={credOk}
                  onRun={() => void handleRun(conn)}
                />
              );
            })}
          </div>

          {/* API limit notice */}
          <div style={{
            marginTop: 'auto',
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 11,
            color: '#6b7280',
            lineHeight: 1.6,
          }}>
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>NOTE</span>
            {' '}Bank APIs return at most ~3 months. For older history, export PDF/CSV from your bank portal and import below.
          </div>
        </div>
      )}

      {/* ── RIGHT: File import ── */}
      <div style={{
        background: '#0f172a',
        overflowY: 'auto',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
            File Import
          </div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            CSV · XLSX · PDF — all formats accepted. PDF requires a connected AI provider.
          </div>
        </div>

        {/* Drop zone / import button */}
        <button
          onClick={() => void handleFileImport()}
          disabled={fileState === 'running'}
          style={{
            background: fileState === 'running' ? '#1e293b' : '#1e293b',
            border: `2px dashed ${fileState === 'running' ? '#374151' : '#3b82f6'}`,
            borderRadius: 12,
            padding: '36px 20px',
            cursor: fileState === 'running' ? 'default' : 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => { if (fileState !== 'running') (e.currentTarget as HTMLButtonElement).style.borderColor = '#60a5fa'; }}
          onMouseLeave={(e) => { if (fileState !== 'running') (e.currentTarget as HTMLButtonElement).style.borderColor = '#3b82f6'; }}
        >
          <div style={{ fontSize: 28, color: '#3b82f6' }}>{fileState === 'running' ? '⟳' : '+'}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: fileState === 'running' ? '#4b5563' : '#e2e8f0' }}>
            {fileState === 'running' ? 'Processing...' : 'Choose files to import'}
          </div>
          <div style={{ fontSize: 12, color: '#475569' }}>
            CSV · XLSX · PDF &nbsp;·&nbsp; multiple files OK
          </div>
        </button>

        {/* Live log terminal */}
        {(log.length > 0 || fileState === 'running') && (
          <div
            ref={logRef}
            style={{
              background: '#0a0f1a',
              border: '1px solid #1e293b',
              borderRadius: 8,
              padding: '12px 14px',
              fontFamily: '"SF Mono", "Fira Code", "Menlo", monospace',
              fontSize: 12,
              lineHeight: 1.8,
              maxHeight: 180,
              overflowY: 'auto',
            }}
          >
            {fileState === 'running' && log.length === 0 && (
              <span style={{ color: '#3b82f6' }}>$ extracting...</span>
            )}
            {log.map((entry, i) => (
              <div key={i} style={{ color: entry.type === 'ok' ? '#34d399' : entry.type === 'err' ? '#f87171' : entry.type === 'warn' ? '#fbbf24' : '#94a3b8' }}>
                <span style={{ color: '#334155', marginRight: 8 }}>{String(i + 1).padStart(2, ' ')} |</span>
                {entry.text}
              </div>
            ))}
            {fileState === 'running' && log.length > 0 && (
              <span style={{ color: '#3b82f6' }}>_</span>
            )}
          </div>
        )}

        {/* Errors detail */}
        {fileState === 'done' && fileResult?.errors && fileResult.errors.length > 0 && (
          <div style={{
            background: '#1c0a0a',
            border: '1px solid #7f1d1d',
            borderRadius: 8,
            padding: '10px 14px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f87171', marginBottom: 6, letterSpacing: '0.08em' }}>ERRORS</div>
            {fileResult.errors.slice(0, 6).map((e, i) => (
              <div key={i} style={{ fontSize: 11, color: '#fca5a5', fontFamily: 'monospace', marginBottom: 2 }}>{e}</div>
            ))}
            {fileResult.errors.length > 6 && (
              <div style={{ fontSize: 11, color: '#6b7280' }}>...and {fileResult.errors.length - 6} more</div>
            )}
          </div>
        )}

        {/* Go to review CTA */}
        {fileState === 'done' && (fileResult?.inserted ?? 0) > 0 && (
          <div style={{
            background: '#052e16',
            border: '1px solid #166534',
            borderRadius: 8,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <div style={{ fontSize: 20, color: '#4ade80' }}>✓</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>
                {fileResult?.inserted} new transaction{fileResult?.inserted === 1 ? '' : 's'} pending review
              </div>
              <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>
                Go to Review tab to accept or reject.
              </div>
            </div>
            <button
              onClick={() => { setFileState('idle'); setLog([]); }}
              style={{ fontSize: 11, color: '#166534', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              import more
            </button>
          </div>
        )}

        {/* Guide */}
        <GuideSection />

        {/* Privacy */}
        <div style={{ fontSize: 11, color: '#334155', lineHeight: 1.6 }}>
          CSV/XLSX processed locally — no data leaves your device.
          PDF text is sent to your configured AI provider (not raw bytes, not account metadata).
        </div>
      </div>
    </div>
  );
}

// ── Connector row ──────────────────────────────────────────────────────────────

function ConnectorRow({
  conn, state, result, credentialsSet, onRun,
}: {
  conn: ConnectorDescriptor;
  state: ConnectorRunState;
  result?: ConnectorRunResult;
  credentialsSet: boolean;
  onRun: () => void;
}) {
  const dot = state === 'running' ? '#f59e0b'
    : state === 'done' && !result?.error ? '#4ade80'
    : state === 'error' || result?.error ? '#f87171'
    : credentialsSet ? '#6b7280'
    : '#374151';

  const dotLabel = state === 'running' ? 'importing'
    : state === 'done' && !result?.error ? 'done'
    : state === 'error' || result?.error ? 'error'
    : credentialsSet ? 'ready'
    : 'no credentials';

  return (
    <div style={{
      background: '#1f2937',
      border: '1px solid #374151',
      borderRadius: 8,
      padding: '10px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      {/* Status dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: dot,
        flexShrink: 0,
        boxShadow: state === 'running' ? `0 0 6px ${dot}` : (state === 'done' && !result?.error ? `0 0 4px ${dot}` : 'none'),
      }} title={dotLabel} />

      {/* Labels */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {conn.name}
        </div>
        <div style={{ fontSize: 10, color: '#4b5563', marginTop: 1 }}>
          {conn.institutionType}
          {state === 'done' && result && !result.error && (
            <span style={{ color: '#4ade80', marginLeft: 8 }}>
              +{result.inserted ?? 0} new
              {(result.duplicates ?? 0) > 0 ? `, ${result.duplicates} dupes` : ''}
            </span>
          )}
          {(state === 'error' || result?.error) && (
            <span style={{ color: '#f87171', marginLeft: 8 }} title={result?.error}>
              {result?.error?.slice(0, 40) ?? 'error'}
            </span>
          )}
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={onRun}
        disabled={state === 'running' || !credentialsSet}
        title={!credentialsSet ? 'Set credentials in Settings first' : undefined}
        style={{
          padding: '4px 12px',
          fontSize: 11,
          fontWeight: 700,
          borderRadius: 5,
          border: 'none',
          cursor: (state === 'running' || !credentialsSet) ? 'default' : 'pointer',
          background: state === 'running' ? '#374151'
            : !credentialsSet ? '#1f2937'
            : state === 'done' ? '#14532d'
            : '#1d4ed8',
          color: state === 'running' ? '#6b7280'
            : !credentialsSet ? '#374151'
            : '#fff',
          letterSpacing: '0.04em',
          flexShrink: 0,
        }}
      >
        {state === 'running' ? '...' : state === 'done' ? 'sync' : 'run'}
      </button>
    </div>
  );
}

// ── Guide ──────────────────────────────────────────────────────────────────────

function GuideSection() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid #1e293b', borderRadius: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', textAlign: 'left', background: '#1e293b', border: 'none',
          padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700, fontFamily: 'monospace' }}>{open ? '▼' : '▶'}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>How to export statements from Leumi credit card portal</span>
      </button>
      {open && (
        <div style={{ background: '#0f172a', padding: '12px 16px' }}>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#64748b', lineHeight: 2 }}>
            <li>Go to <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>hb2.bankleumi.co.il</span> and sign in</li>
            <li>Navigate to <span style={{ color: '#e2e8f0' }}>כרטיסי אשראי</span> (Credit Cards)</li>
            <li>Select your card (Visa 4411 or Mastercard 9414)</li>
            <li>Choose a billing period → click <span style={{ color: '#e2e8f0' }}>יצוא לקובץ</span> → PDF</li>
            <li>Import the PDF here — Gemini reads it natively</li>
          </ol>
        </div>
      )}
    </div>
  );
}
