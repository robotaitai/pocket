import React, { useEffect, useMemo, useState } from 'react';
import type { MerchantSummary } from '../pocket.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { CATEGORIES, CATEGORY_LABELS } from '../constants.js';
import { PageHeader, QuietCard, SegmentedControl, WorkspacePage } from '../components/Workspace.js';
import { theme } from '../theme.js';

type Tab = 'all' | 'new' | 'suspicious';
type SortKey = 'merchant' | 'category' | 'total' | 'transactions' | 'lastSeen' | 'flags';
type SortDirection = 'asc' | 'desc';

interface Props {
  embedded?: boolean;
  initialTab?: Tab;
}

export function MerchantView({ embedded = false, initialTab = 'all' }: Props): React.ReactElement {
  const [all, setAll] = useState<MerchantSummary[]>([]);
  const [newMerchants, setNewMerchants] = useState<MerchantSummary[]>([]);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [localCats, setLocalCats] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  useEffect(() => {
    void Promise.all([
      window.pocket.insights.getMerchants(50),
      window.pocket.insights.getNewMerchants(),
    ]).then(([merchantList, newMerchantList]) => {
      setAll(merchantList);
      setNewMerchants(newMerchantList);
      setLoading(false);
    });
  }, []);

  const handleCategoryChange = async (description: string, category: string) => {
    setSaving(description);
    setLocalCats((current) => ({ ...current, [description]: category }));
    await window.pocket.merchantRules.setForMerchant(description, category);
    setSaving(null);
  };

  const suspicious = newMerchants.filter((merchant) => merchant.isSuspicious);
  const displayed = tab === 'all'
    ? all
    : tab === 'new'
    ? newMerchants.filter((merchant) => merchant.isNew)
    : suspicious;
  const sortedDisplayed = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...displayed].sort((left, right) => {
      switch (sortKey) {
        case 'merchant':
          return direction * left.description.localeCompare(right.description);
        case 'category':
          return direction * (CATEGORY_LABELS[localCats[left.description] ?? left.effectiveCategory ?? ''] ?? 'Untagged')
            .localeCompare(CATEGORY_LABELS[localCats[right.description] ?? right.effectiveCategory ?? ''] ?? 'Untagged');
        case 'transactions':
          return direction * (left.transactionCount - right.transactionCount || left.description.localeCompare(right.description));
        case 'lastSeen':
          return direction * left.lastSeen.localeCompare(right.lastSeen);
        case 'flags':
          return direction * ((Number(left.isSuspicious) + Number(left.isNew)) - (Number(right.isSuspicious) + Number(right.isNew)) || left.description.localeCompare(right.description));
        case 'total':
        default:
          return direction * (Math.abs(left.total) - Math.abs(right.total) || left.description.localeCompare(right.description));
      }
    });
  }, [displayed, localCats, sortDirection, sortKey]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection(key === 'merchant' || key === 'category' ? 'asc' : 'desc');
  };

  const body = (
    <div style={{ display: 'grid', gap: 16 }}>
      {!embedded && (
        <PageHeader
          eyebrow="Activity"
          title="Merchants"
          description="Understand repeat spend, spot new names, and create merchant rules directly from the activity surface."
        />
      )}

      <QuietCard padding={18}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <SegmentedControl
            options={[
              { value: 'all', label: 'All merchants' },
              { value: 'new', label: 'New', count: newMerchants.filter((merchant) => merchant.isNew).length || undefined },
              { value: 'suspicious', label: 'Suspicious', count: suspicious.length || undefined },
            ]}
            value={tab}
            onChange={setTab}
          />
          {suspicious.length > 0 && <span style={{ fontSize: 13, color: theme.colors.warning }}>{suspicious.length} need a second look</span>}
        </div>
      </QuietCard>

      <QuietCard padding={0}>
        {loading ? (
          <div style={{ padding: 24, color: theme.colors.textSoft }}>Loading merchants...</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: theme.colors.textSoft, fontSize: 14 }}>
            No merchants in this view yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: theme.colors.surfaceAlt }}>
                  <SortableTh align="left" active={sortKey === 'merchant'} direction={sortDirection} onClick={() => toggleSort('merchant')}>Merchant</SortableTh>
                  <SortableTh align="left" active={sortKey === 'category'} direction={sortDirection} onClick={() => toggleSort('category')}>Category</SortableTh>
                  <SortableTh align="right" active={sortKey === 'total'} direction={sortDirection} onClick={() => toggleSort('total')}>Total</SortableTh>
                  <SortableTh align="center" active={sortKey === 'transactions'} direction={sortDirection} onClick={() => toggleSort('transactions')}>Transactions</SortableTh>
                  <SortableTh align="left" active={sortKey === 'lastSeen'} direction={sortDirection} onClick={() => toggleSort('lastSeen')}>Last seen</SortableTh>
                  <SortableTh align="center" active={sortKey === 'flags'} direction={sortDirection} onClick={() => toggleSort('flags')}>Flags</SortableTh>
                </tr>
              </thead>
              <tbody>
                {sortedDisplayed.map((merchant, index) => (
                  <tr key={merchant.description} style={{ borderTop: index === 0 ? 'none' : `1px solid ${theme.colors.border}` }}>
                    <Td align="left">
                      <div style={{ fontWeight: 650, color: theme.colors.text }}>{merchant.description}</div>
                    </Td>
                    <Td align="left">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <select
                          value={localCats[merchant.description] ?? merchant.effectiveCategory ?? ''}
                          onChange={(event) => void handleCategoryChange(merchant.description, event.target.value)}
                          disabled={saving === merchant.description}
                          style={{
                            fontSize: 12,
                            padding: '8px 10px',
                            borderRadius: theme.radius.md,
                            border: `1px solid ${theme.colors.borderStrong}`,
                            background: theme.colors.surface,
                            color: theme.colors.text,
                            minWidth: 130,
                          }}
                        >
                          <option value="">Untagged</option>
                          {CATEGORIES.map((category) => (
                            <option key={category} value={category}>{CATEGORY_LABELS[category] ?? category}</option>
                          ))}
                        </select>
                        {saving === merchant.description && <span style={{ fontSize: 12, color: theme.colors.textSoft }}>Saving...</span>}
                      </div>
                    </Td>
                    <Td align="right">
                      <span style={{ fontWeight: 700, color: theme.colors.danger }}>{formatCurrency(Math.abs(merchant.total))}</span>
                    </Td>
                    <Td align="center">{merchant.transactionCount}</Td>
                    <Td align="left">{formatDate(merchant.lastSeen)}</Td>
                    <Td align="center">
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        {merchant.isNew && <Flag text="New" tone={theme.colors.accent} bg={theme.colors.accentSoft} />}
                        {merchant.isSuspicious && <Flag text="Flagged" tone={theme.colors.warning} bg={theme.colors.warningSoft} />}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QuietCard>
    </div>
  );

  return embedded ? body : <WorkspacePage width={1120}>{body}</WorkspacePage>;
}

function Flag({ text, tone, bg }: { text: string; tone: string; bg: string }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color: tone, background: bg, padding: '4px 8px', borderRadius: theme.radius.pill }}>{text}</span>;
}

function SortableTh({
  children,
  align,
  active,
  direction,
  onClick,
}: {
  children: React.ReactNode;
  align: 'left' | 'right' | 'center';
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <th style={{ padding: '12px 14px', textAlign: align }}>
      <button
        onClick={onClick}
        style={{
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
          fontSize: 11,
          color: active ? theme.colors.text : theme.colors.textSoft,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {children} {active ? (direction === 'asc' ? '↑' : '↓') : '↕'}
      </button>
    </th>
  );
}

function Td({ children, align }: { children: React.ReactNode; align: 'left' | 'right' | 'center' }) {
  return <td style={{ padding: '14px', textAlign: align, fontSize: 13, color: theme.colors.textMuted }}>{children}</td>;
}
