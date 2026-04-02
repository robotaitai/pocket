import React, { useCallback, useEffect, useState } from 'react';
import type { FileImportResult, ConnectorDescriptor, ConnectorRunResult } from '../pocket.js';

type ImportState = 'idle' | 'extracting' | 'done' | 'error';
type ConnectorRunState = 'idle' | 'running' | 'done' | 'error';

export function Import(): React.ReactElement {
  const [state, setState] = useState<ImportState>('idle');
  const [result, setResult] = useState<FileImportResult | null>(null);
  const [onReviewClick, setOnReviewClick] = useState<(() => void) | null>(null);

  // Scraper connectors
  const [connectors, setConnectors] = useState<ConnectorDescriptor[]>([]);
  const [runState, setRunState] = useState<Record<string, ConnectorRunState>>({});
  const [runResults, setRunResults] = useState<Record<string, ConnectorRunResult>>({});

  const loadConnectors = useCallback(async () => {
    const list = await window.pocket.credentials.listConnectors();
    setConnectors(list);
  }, []);

  useEffect(() => { void loadConnectors(); }, [loadConnectors]);

  const handleRunConnector = async (connectorId: string) => {
    setRunState((s) => ({ ...s, [connectorId]: 'running' }));
    setRunResults((r) => { const n = { ...r }; delete n[connectorId]; return n; });
    const res = await window.pocket.connector.run(connectorId);
    setRunResults((r) => ({ ...r, [connectorId]: res }));
    setRunState((s) => ({ ...s, [connectorId]: res.error ? 'error' : 'done' }));
  };

  const handleImport = async () => {
    setState('extracting');
    setResult(null);

    const res = await window.pocket.fileImport.pickAndExtract();
    setResult(res);

    if (res.canceled) {
      setState('idle');
    } else if (res.error) {
      setState('error');
    } else {
      setState('done');
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700 }}>Import</h1>
      <p style={{ margin: '0 0 28px', fontSize: 14, color: '#6b7280' }}>
        Import financial data from CSV, Excel, or PDF files. Imported records enter the Review queue and require approval before they affect your data.
      </p>

      {/* Bank / card scraper import */}
      {connectors.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 28 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#374151' }}>Bank and Card Import</h2>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
            Import directly from your bank or card provider. Credentials must be set in Settings first.
            Imports the last 90 days. All records go to Review before being accepted.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {connectors.map((conn) => {
              const st = runState[conn.id] ?? 'idle';
              const res = runResults[conn.id];
              return (
                <div key={conn.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 140 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{conn.name}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{conn.institutionType}</div>
                  </div>
                  <button
                    onClick={() => void handleRunConnector(conn.id)}
                    disabled={st === 'running'}
                    style={{
                      padding: '7px 18px',
                      background: st === 'running' ? '#6b7280' : '#1d4ed8',
                      color: '#fff', border: 'none', borderRadius: 8,
                      cursor: st === 'running' ? 'default' : 'pointer',
                      fontSize: 13, fontWeight: 600,
                    }}
                  >
                    {st === 'running' ? 'Importing...' : 'Import now'}
                  </button>
                  {st === 'done' && res && !res.error && (
                    <span style={{ fontSize: 13, color: '#065f46' }}>
                      {res.inserted} new transactions ({res.duplicates} duplicates skipped) — go to Review to accept
                    </span>
                  )}
                  {(st === 'error' || res?.error) && (
                    <span style={{ fontSize: 13, color: '#7f1d1d' }}>{res?.error ?? 'Import failed'}</span>
                  )}
                  {res?.errors && res.errors.length > 0 && (
                    <span style={{ fontSize: 11, color: '#92400e' }}>{res.errors.length} row errors</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Format guide */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        <FormatCard
          title="CSV"
          description="Structured exports from your bank's website. Parsed locally — no provider required."
          supported={true}
          requiresProvider={false}
        />
        <FormatCard
          title="Excel (XLSX)"
          description="Spreadsheet exports. Converted to CSV internally — no provider required."
          supported={true}
          requiresProvider={false}
        />
        <FormatCard
          title="PDF"
          description="Bank statement PDFs. Requires a connected provider (OpenAI, Claude, or Gemini) in Settings."
          supported={true}
          requiresProvider={true}
        />
      </div>

      {/* Import button */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <button
          onClick={() => void handleImport()}
          disabled={state === 'extracting'}
          style={{
            padding: '12px 32px',
            background: state === 'extracting' ? '#6b7280' : '#1d4ed8',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: state === 'extracting' ? 'default' : 'pointer',
          }}
        >
          {state === 'extracting' ? 'Extracting...' : 'Choose File to Import'}
        </button>
        {state === 'extracting' && (
          <p style={{ marginTop: 12, fontSize: 13, color: '#9ca3af' }}>
            Reading file and extracting transactions — this may take a moment for PDFs.
          </p>
        )}
      </div>

      {/* Result */}
      {state === 'error' && result?.error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#7f1d1d', marginBottom: 6 }}>Import failed</div>
          <div style={{ fontSize: 13, color: '#374151' }}>{result.error}</div>
          {result.error.includes('provider') && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
              Go to Settings to configure a connected provider for PDF import.
            </div>
          )}
          <button
            onClick={() => setState('idle')}
            style={{ marginTop: 12, padding: '6px 14px', border: '1px solid #fca5a5', background: '#fff', color: '#7f1d1d', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
          >
            Try again
          </button>
        </div>
      )}

      {state === 'done' && result && !result.error && (
        <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#065f46', marginBottom: 10 }}>Import complete</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 12 }}>
            <StatBadge label="Extracted" value={result.inserted ?? 0} color="#065f46" />
            {(result.duplicates ?? 0) > 0 && <StatBadge label="Duplicates skipped" value={result.duplicates ?? 0} color="#92400e" />}
            {(result.errors?.length ?? 0) > 0 && <StatBadge label="Errors" value={result.errors?.length ?? 0} color="#7f1d1d" />}
          </div>

          {result.documentWarnings && result.documentWarnings.length > 0 && (
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, padding: '8px 12px', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>Document warnings</div>
              {result.documentWarnings.map((w) => <div key={w} style={{ fontSize: 12, color: '#374151' }}>{w}</div>)}
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div style={{ background: '#fee2e2', borderRadius: 6, padding: '8px 12px', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#7f1d1d', marginBottom: 4 }}>Row errors</div>
              {result.errors.slice(0, 5).map((e) => <div key={e} style={{ fontSize: 12, color: '#374151' }}>{e}</div>)}
              {result.errors.length > 5 && <div style={{ fontSize: 12, color: '#9ca3af' }}>...and {result.errors.length - 5} more</div>}
            </div>
          )}

          <div style={{ fontSize: 13, color: '#065f46' }}>
            All imported records are pending review. Go to the <strong>Review</strong> tab to accept or reject them.
          </div>

          <button
            onClick={() => setState('idle')}
            style={{ marginTop: 12, padding: '6px 14px', border: '1px solid #6ee7b7', background: '#fff', color: '#065f46', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            Import another file
          </button>
        </div>
      )}

      {/* Privacy note */}
      <div style={{ marginTop: 32, padding: '12px 16px', background: '#f3f4f6', borderRadius: 8, fontSize: 12, color: '#6b7280' }}>
        <strong>Privacy:</strong> Files are processed locally. For CSV and XLSX, no data leaves your device.
        For PDF files, only the extracted text content (not account metadata) is sent to your configured provider.
      </div>
    </div>
  );
}

function FormatCard({ title, description, supported, requiresProvider }: {
  title: string; description: string; supported: boolean; requiresProvider: boolean;
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '14px 16px',
      border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{title}</span>
        {requiresProvider && (
          <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '1px 6px', borderRadius: 8 }}>
            Needs provider
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{description}</div>
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6b7280' }}>{label}</div>
    </div>
  );
}
