import React, { useCallback, useEffect, useState } from 'react';
import { Chip, PageHeader, QuietCard, SecondaryButton, WorkspacePage } from '../components/Workspace.js';
import { theme } from '../theme.js';
import type { ConnectorDescriptor, ProviderConfig } from '../pocket.js';
import { Import } from './Import.js';
import { ImportHealth } from './ImportHealth.js';

interface Props {
  onOpenSettings: () => void;
}

export function ConnectWorkspace({ onOpenSettings }: Props): React.ReactElement {
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);
  const [connectors, setConnectors] = useState<ConnectorDescriptor[]>([]);
  const [readyConnectors, setReadyConnectors] = useState(0);

  const load = useCallback(async () => {
    const [provider, connectorList] = await Promise.all([
      window.pocket.provider.getConfig(),
      window.pocket.credentials.listConnectors(),
    ]);
    setProviderConfig(provider);
    setConnectors(connectorList);

    const statuses = await Promise.all(
      connectorList.map(async (connector) => {
        const checks = await Promise.all(
          connector.credentialFields.map((field) => window.pocket.credentials.getFieldStatus(connector.id, field)),
        );
        return checks.every((check) => check.set);
      }),
    );
    setReadyConnectors(statuses.filter(Boolean).length);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <WorkspacePage width={1220}>
      <PageHeader
        eyebrow="Connect"
        title="Bring data in with confidence"
        description="Connect live institutions, import files, monitor ingestion health, and keep the privacy boundary explicit."
        actions={<SecondaryButton onClick={onOpenSettings}>Manage credentials and provider</SecondaryButton>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) 360px', gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 18 }}>
          <Import embedded onOpenSettings={onOpenSettings} />
          <ImportHealth embedded />
        </div>

        <div style={{ display: 'grid', gap: 18, position: 'sticky', top: 28 }}>
          <QuietCard title="Connection status" subtitle="Pocket keeps trust signals visible without turning this into an ops console.">
            <div style={{ display: 'grid', gap: 12 }}>
              <StatRow
                label="Connected institutions"
                value={`${readyConnectors}/${connectors.length || 0}`}
                detail={readyConnectors > 0 ? 'At least one connector is ready to run.' : 'No connector credentials stored yet.'}
              />
              <StatRow
                label="Assistant mode"
                value={providerConfig?.mode === 'connected' ? 'Connected' : 'Local only'}
                detail={providerConfig?.mode === 'connected'
                  ? `${providerConfig.providerType} is available for PDF extraction and optional enhancement.`
                  : 'No external provider required for local-only usage.'}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Chip tone={providerConfig?.mode === 'connected' ? 'accent' : 'neutral'}>
                  {providerConfig?.mode === 'connected' ? 'Provider active' : 'No provider'}
                </Chip>
                <Chip tone={readyConnectors > 0 ? 'success' : 'warning'}>
                  {readyConnectors > 0 ? 'Ready to import' : 'Credentials needed'}
                </Chip>
              </div>
            </div>
          </QuietCard>

          <QuietCard title="Privacy boundary" subtitle="The product should always explain what stays local and what is optional.">
            <div style={{ display: 'grid', gap: 12 }}>
              <BoundarySection
                title="Always local"
                items={[
                  'Transactions, balances, and account identifiers stay on-device.',
                  'Bank and card credentials are stored in the OS keychain.',
                  'Review status, rules, and insights live in the local SQLite database.',
                ]}
              />
              <BoundarySection
                title="Only when you opt in"
                items={[
                  'Chosen PDF bytes can be sent to your connected provider for extraction.',
                  'Optional chat enhancement uses your provider but stays grounded in local answers.',
                  'Merchant suggestions send only merchant names, not money data.',
                ]}
              />
            </div>
          </QuietCard>
        </div>
      </div>
    </WorkspacePage>
  );
}

function StatRow({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: theme.radius.md, background: theme.colors.surfaceAlt }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: theme.colors.textSoft, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: theme.colors.text }}>{value}</div>
      <div style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 4, lineHeight: 1.5 }}>{detail}</div>
    </div>
  );
}

function BoundarySection({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: theme.radius.md, background: theme.colors.surfaceAlt }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.colors.text, marginBottom: 8 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, color: theme.colors.textMuted }}>
        {items.map((item) => (
          <li key={item} style={{ fontSize: 12, lineHeight: 1.55, marginBottom: 4 }}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
