import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ProviderConfig, ProviderType, ConnectionTestResult, ConnectorDescriptor, CredentialTestResult } from '../pocket.js';

const PROVIDER_LABELS: Record<ProviderType, string> = {
  openai: 'OpenAI (GPT)',
  anthropic: 'Anthropic (Claude)',
  gemini: 'Google Gemini',
  local: 'None',
};

const PROVIDER_DOCS: Record<Exclude<ProviderType, 'local'>, string> = {
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
  gemini: 'https://makersuite.google.com/app/apikey',
};

export function Settings(): React.ReactElement {
  const [config, setConfig] = useState<ProviderConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyMasked, setApiKeyMasked] = useState(true);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Import settings
  const [lookbackDays, setLookbackDays] = useState<string>('365');
  const [lookbackSaved, setLookbackSaved] = useState(false);

  // Bank credentials state
  const [connectors, setConnectors] = useState<ConnectorDescriptor[]>([]);
  const [credValues, setCredValues] = useState<Record<string, string>>({}); // connectorId:field → value
  const [credStatus, setCredStatus] = useState<Record<string, boolean>>({}); // connectorId:field → isSet
  const [connTestResults, setConnTestResults] = useState<Record<string, CredentialTestResult>>({});
  const [connTestLoading, setConnTestLoading] = useState<Record<string, boolean>>({});
  const credSavedRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const loadConfig = useCallback(async () => {
    const c = await window.pocket.provider.getConfig();
    setConfig(c);
  }, []);

  const loadConnectors = useCallback(async () => {
    const list = await window.pocket.credentials.listConnectors();
    setConnectors(list);
    // Load set/unset status for each field
    const status: Record<string, boolean> = {};
    await Promise.all(
      list.flatMap((conn) =>
        conn.credentialFields.map(async (field) => {
          const { set } = await window.pocket.credentials.getFieldStatus(conn.id, field);
          status[`${conn.id}:${field}`] = set;
        }),
      ),
    );
    setCredStatus(status);
  }, []);

  useEffect(() => {
    void loadConfig();
    void loadConnectors();
    void window.pocket.settings.get('import_lookback_days').then((v) => {
      if (v) setLookbackDays(v);
    });
  }, [loadConfig, loadConnectors]);

  const handleModeChange = async (mode: 'local' | 'connected') => {
    await window.pocket.provider.setConfig({ mode });
    setConfig((c) => c ? { ...c, mode } : c);
    setTestResult(null);
  };

  const handleProviderChange = async (providerType: ProviderType) => {
    await window.pocket.provider.setConfig({ providerType });
    setConfig((c) => c ? { ...c, providerType } : c);
    setApiKey('');
    setTestResult(null);
  };

  const handleSaveKey = async () => {
    if (!apiKey.trim() || !config) return;
    setSaving(true);
    await window.pocket.provider.setKey(config.providerType, apiKey.trim());
    setApiKey('');
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleClearKey = async () => {
    if (!config) return;
    await window.pocket.provider.clearKey(config.providerType);
    setTestResult(null);
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    const result = await window.pocket.provider.testConnection();
    setTestResult(result);
    setTestLoading(false);
  };

  // Connector credential handlers
  const handleCredSave = async (connectorId: string, field: string) => {
    const key = `${connectorId}:${field}`;
    const value = credValues[key];
    if (!value?.trim()) return;
    await window.pocket.credentials.setField(connectorId, field, value.trim());
    setCredValues((v) => ({ ...v, [key]: '' }));
    setCredStatus((s) => ({ ...s, [key]: true }));
    setConnTestResults((r) => { const next = { ...r }; delete next[connectorId]; return next; });
  };

  const handleCredClear = async (connectorId: string, field: string) => {
    const key = `${connectorId}:${field}`;
    await window.pocket.credentials.clearField(connectorId, field);
    setCredStatus((s) => ({ ...s, [key]: false }));
    setConnTestResults((r) => { const next = { ...r }; delete next[connectorId]; return next; });
  };

  const handleConnTest = async (connectorId: string) => {
    setConnTestLoading((l) => ({ ...l, [connectorId]: true }));
    setConnTestResults((r) => { const next = { ...r }; delete next[connectorId]; return next; });
    const result = await window.pocket.credentials.testConnection(connectorId);
    setConnTestResults((r) => ({ ...r, [connectorId]: result }));
    setConnTestLoading((l) => ({ ...l, [connectorId]: false }));
  };

  const handleLookbackSave = async () => {
    const days = parseInt(lookbackDays, 10);
    if (isNaN(days) || days < 1 || days > 1825) return;
    await window.pocket.settings.set('import_lookback_days', String(days));
    setLookbackSaved(true);
    setTimeout(() => setLookbackSaved(false), 3000);
  };

  const handleToggle = async (field: 'chatEnhancementEnabled' | 'merchantSuggestionsEnabled') => {
    if (!config) return;
    const next = { ...config, [field]: !config[field] };
    await window.pocket.provider.setConfig({ [field]: next[field] });
    setConfig(next);
  };

  if (!config) return <div style={{ padding: 40, color: '#9ca3af' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ margin: '0 0 28px', fontSize: 22, fontWeight: 700 }}>Settings</h1>

      {/* Mode section */}
      <Section title="Agent Mode">
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          Local-only mode works with no external services. Connected mode unlocks PDF import and smarter chat answers using your own provider key.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['local', 'connected'] as const).map((mode) => (
            <ModeCard
              key={mode}
              active={config.mode === mode}
              onClick={() => void handleModeChange(mode)}
              title={mode === 'local' ? 'Local Only' : 'Connected Agent'}
              description={mode === 'local'
                ? 'No external calls. Scrapers, CSV/XLSX import, and grounded chat all work.'
                : 'Your API key enables PDF extraction and optional chat enhancement.'
              }
            />
          ))}
        </div>
      </Section>

      {/* Provider section — only shown in connected mode */}
      {config.mode === 'connected' && (
        <Section title="Provider">
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
              Provider
            </label>
            <select
              value={config.providerType}
              onChange={(e) => void handleProviderChange(e.target.value as ProviderType)}
              style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '7px 10px', fontSize: 13, width: '100%' }}
            >
              {(['openai', 'anthropic', 'gemini'] as Exclude<ProviderType, 'local'>[]).map((p) => (
                <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
              ))}
            </select>
            {config.providerType !== 'local' && (
              <a
                href={PROVIDER_DOCS[config.providerType as Exclude<ProviderType, 'local'>]}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: '#2563eb', marginTop: 4, display: 'inline-block' }}
              >
                Get an API key
              </a>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
              API Key
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type={apiKeyMasked ? 'password' : 'text'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your API key here..."
                aria-label="API key input"
                style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: 6, padding: '7px 10px', fontSize: 13 }}
              />
              <button
                onClick={() => setApiKeyMasked((m) => !m)}
                style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}
                aria-label={apiKeyMasked ? 'Show key' : 'Hide key'}
              >
                {apiKeyMasked ? 'Show' : 'Hide'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => void handleSaveKey()}
                disabled={!apiKey.trim() || saving}
                style={{ padding: '7px 16px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: apiKey.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 600, opacity: apiKey.trim() ? 1 : 0.5 }}
              >
                {saving ? 'Saving...' : saved ? 'Saved' : 'Save Key'}
              </button>
              <button
                onClick={() => void handleClearKey()}
                style={{ padding: '7px 14px', border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
              >
                Clear Key
              </button>
              <button
                onClick={() => void handleTest()}
                disabled={testLoading}
                style={{ padding: '7px 14px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
              >
                {testLoading ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
            {testResult && (
              <div style={{
                marginTop: 10,
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 13,
                background: testResult.ok ? '#d1fae5' : '#fee2e2',
                color: testResult.ok ? '#065f46' : '#7f1d1d',
              }}>
                {testResult.ok ? 'Connection successful.' : `Connection failed: ${testResult.error ?? 'Unknown error'}`}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Agent capabilities — only shown in connected mode */}
      {config.mode === 'connected' && (
        <Section title="Agent Capabilities">
          <Toggle
            label="Chat enhancement"
            description="Provider can rephrase locally-computed answers more naturally. Numbers and data are never changed."
            checked={config.chatEnhancementEnabled}
            onChange={() => void handleToggle('chatEnhancementEnabled')}
          />
          <Toggle
            label="Merchant category suggestions"
            description="Provider can suggest categories for unknown merchant names. Only the merchant name is sent — no amounts or accounts."
            checked={config.merchantSuggestionsEnabled}
            onChange={() => void handleToggle('merchantSuggestionsEnabled')}
          />
        </Section>
      )}

      {/* Bank credentials section */}
      <Section title="Bank and Card Credentials">
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          Credentials are stored in the OS keychain (macOS Keychain, Windows Credential Manager, or libsecret on Linux). They never leave your device and are not stored in any database or config file.
        </p>
        {connectors.map((conn) => {
          const testResult = connTestResults[conn.id];
          const testLoading = connTestLoading[conn.id] ?? false;
          const allSet = conn.credentialFields.every((f) => credStatus[`${conn.id}:${f}`]);
          return (
            <div key={conn.id} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{conn.name}</span>
                <span style={{ fontSize: 10, color: '#6b7280', background: '#f3f4f6', padding: '1px 7px', borderRadius: 8 }}>
                  {conn.institutionType}
                </span>
                {allSet && (
                  <span style={{ fontSize: 10, color: '#065f46', background: '#d1fae5', padding: '1px 7px', borderRadius: 8 }}>
                    credentials set
                  </span>
                )}
              </div>
              {conn.credentialFields.map((field) => {
                const key = `${conn.id}:${field}`;
                const isSet = credStatus[key] ?? false;
                return (
                  <div key={field} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', width: 120, flexShrink: 0 }}>
                      {field}
                      {isSet && <span style={{ marginLeft: 4, color: '#059669' }}>*</span>}
                    </label>
                    <input
                      type="password"
                      placeholder={isSet ? '(already set — paste to update)' : `Enter ${field}...`}
                      value={credValues[key] ?? ''}
                      onChange={(e) => setCredValues((v) => ({ ...v, [key]: e.target.value }))}
                      aria-label={`${conn.name} ${field}`}
                      style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 9px', fontSize: 13 }}
                    />
                    <button
                      onClick={() => void handleCredSave(conn.id, field)}
                      disabled={!(credValues[key]?.trim())}
                      style={{ padding: '5px 12px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: credValues[key]?.trim() ? 'pointer' : 'default', fontSize: 12, fontWeight: 600, opacity: credValues[key]?.trim() ? 1 : 0.4 }}
                    >
                      Save
                    </button>
                    {isSet && (
                      <button
                        onClick={() => void handleCredClear(conn.id, field)}
                        style={{ padding: '5px 10px', border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                );
              })}
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => void handleConnTest(conn.id)}
                  disabled={!allSet || testLoading}
                  style={{ padding: '6px 14px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, cursor: allSet && !testLoading ? 'pointer' : 'default', fontSize: 12, opacity: allSet ? 1 : 0.5 }}
                >
                  {testLoading ? 'Testing...' : 'Test Connection'}
                </button>
                {testResult && (
                  <span style={{ marginLeft: 10, fontSize: 12, color: testResult.ok ? '#065f46' : '#7f1d1d' }}>
                    {testResult.ok
                      ? `Connected (${testResult.accountsFound ?? 0} accounts found)`
                      : `Failed: ${testResult.error ?? 'Unknown error'}`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </Section>

      {/* Import settings */}
      <Section title="Import Settings">
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
            Import lookback period (days)
          </label>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: '#6b7280' }}>
            How far back to import transactions when running a bank or card connector. Default is 365 days (1 year). Maximum is 1825 days (5 years).
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number"
              min={1}
              max={1825}
              value={lookbackDays}
              onChange={(e) => setLookbackDays(e.target.value)}
              style={{
                width: 100, padding: '7px 10px', border: '1px solid #d1d5db',
                borderRadius: 8, fontSize: 14,
              }}
            />
            <button
              onClick={() => void handleLookbackSave()}
              style={{
                padding: '7px 18px', background: '#1d4ed8', color: '#fff',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}
            >
              {lookbackSaved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </Section>

      {/* Privacy section */}
      <Section title="Privacy Boundaries">
        <PrivacyBoundary
          title="What is NEVER sent anywhere"
          items={[
            'Bank credentials, passwords, or ID numbers (stored in OS keychain only)',
            'Account IDs, account numbers, or IBAN',
            'Account balances',
            'Transaction IDs or raw DB query results',
            'Any user-identifying information',
          ]}
          color="#fee2e2"
          borderColor="#fca5a5"
          labelColor="#7f1d1d"
        />
        <PrivacyBoundary
          title="What is sent when a provider is connected"
          items={[
            'Document text from files you explicitly choose to import',
            'Your question + the formatted local answer (for chat enhancement)',
            'Merchant name string only (for category suggestions)',
          ]}
          color="#d1fae5"
          borderColor="#6ee7b7"
          labelColor="#065f46"
        />
      </Section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h2>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {children}
      </div>
    </div>
  );
}

function ModeCard({ active, onClick, title, description }: { active: boolean; onClick(): void; title: string; description: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, textAlign: 'left', padding: '14px 16px',
        border: `2px solid ${active ? '#1d4ed8' : '#e5e7eb'}`,
        borderRadius: 10, background: active ? '#eff6ff' : '#fff', cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: active ? '#1d4ed8' : '#111827', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{description}</div>
    </button>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange(): void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16, cursor: 'pointer' }}
      />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{description}</div>
      </div>
    </div>
  );
}

function PrivacyBoundary({ title, items, color, borderColor, labelColor }: {
  title: string; items: string[]; color: string; borderColor: string; labelColor: string;
}) {
  return (
    <div style={{ background: color, border: `1px solid ${borderColor}`, borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: labelColor, marginBottom: 8 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {items.map((item) => (
          <li key={item} style={{ fontSize: 12, color: '#374151', marginBottom: 2 }}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
