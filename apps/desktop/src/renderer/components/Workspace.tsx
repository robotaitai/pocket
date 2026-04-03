import React from 'react';
import { theme, ui } from '../theme.js';

export function WorkspacePage({
  children,
  width = ui.pageWidth,
}: {
  children: React.ReactNode;
  width?: number | string;
}): React.ReactElement {
  return (
    <div style={{ minHeight: '100%', background: theme.colors.pageBg }}>
      <div style={{ maxWidth: width, margin: '0 auto', padding: '28px 24px 36px' }}>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', gap: 20, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow && (
          <div style={{ ...theme.type.eyebrow, color: theme.colors.textSoft, textTransform: 'uppercase', marginBottom: 8 }}>
            {eyebrow}
          </div>
        )}
        <h1 style={{ ...theme.type.title, margin: 0, color: theme.colors.text }}>
          {title}
        </h1>
        {description && (
          <p style={{ ...theme.type.body, margin: '10px 0 0', color: theme.colors.textMuted, maxWidth: 760 }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}

export function QuietCard({
  children,
  title,
  subtitle,
  padding = 20,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  padding?: number;
}): React.ReactElement {
  return (
    <section
      style={{
        background: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radius.lg,
        boxShadow: theme.shadow.card,
        padding,
      }}
    >
      {(title || subtitle) && (
        <div style={{ marginBottom: 14 }}>
          {title && <h2 style={{ ...theme.type.sectionTitle, color: theme.colors.text, margin: 0 }}>{title}</h2>}
          {subtitle && <p style={{ ...theme.type.bodySmall, color: theme.colors.textMuted, margin: title ? '6px 0 0' : 0 }}>{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (value: T) => void;
}): React.ReactElement {
  return (
    <div
      role="tablist"
      aria-label="View switcher"
      style={{
        display: 'inline-flex',
        padding: 4,
        gap: 4,
        background: theme.colors.surfaceAlt,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radius.pill,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            style={{
              border: 'none',
              background: active ? theme.colors.surface : 'transparent',
              color: active ? theme.colors.text : theme.colors.textMuted,
              borderRadius: theme.radius.pill,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: active ? 700 : 600,
              cursor: 'pointer',
              boxShadow: active ? '0 1px 2px rgba(16, 32, 51, 0.08)' : 'none',
              transition: ui.transition,
              whiteSpace: 'nowrap',
            }}
          >
            {option.label}
            {typeof option.count === 'number' ? ` ${option.count}` : ''}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}): React.ReactElement {
  const tones = {
    neutral: { color: theme.colors.textMuted, background: theme.colors.surfaceAlt },
    accent: { color: theme.colors.accent, background: theme.colors.accentSoft },
    success: { color: theme.colors.success, background: theme.colors.successSoft },
    warning: { color: theme.colors.warning, background: theme.colors.warningSoft },
    danger: { color: theme.colors.danger, background: theme.colors.dangerSoft },
  };
  const toneStyle = tones[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: theme.radius.pill,
        padding: '4px 10px',
        fontSize: 12,
        fontWeight: 700,
        color: toneStyle.color,
        background: toneStyle.background,
      }}
    >
      {children}
    </span>
  );
}

export function MetricStrip({
  items,
}: {
  items: Array<{ label: string; value: string; detail?: string; tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger' }>;
}): React.ReactElement {
  const toneColor = (tone?: string): string => {
    switch (tone) {
      case 'accent': return theme.colors.accent;
      case 'success': return theme.colors.success;
      case 'warning': return theme.colors.warning;
      case 'danger': return theme.colors.danger;
      default: return theme.colors.text;
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: 14 }}>
      {items.map((item) => (
        <QuietCard key={item.label} padding={18}>
          <div style={{ ...theme.type.label, color: theme.colors.textSoft, marginBottom: 10 }}>{item.label}</div>
          <div style={{ ...theme.type.metric, color: toneColor(item.tone) }}>{item.value}</div>
          {item.detail && <div style={{ ...theme.type.bodySmall, color: theme.colors.textMuted, marginTop: 8 }}>{item.detail}</div>}
        </QuietCard>
      ))}
    </div>
  );
}

export function FilterRow({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      {children}
    </div>
  );
}

export function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>): React.ReactElement {
  return (
    <input
      {...props}
      style={{
        border: `1px solid ${theme.colors.borderStrong}`,
        borderRadius: theme.radius.md,
        padding: '10px 12px',
        fontSize: 13,
        background: theme.colors.surface,
        color: theme.colors.text,
        ...(props.style ?? {}),
      }}
    />
  );
}

export function FieldSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>): React.ReactElement {
  return (
    <select
      {...props}
      style={{
        border: `1px solid ${theme.colors.borderStrong}`,
        borderRadius: theme.radius.md,
        padding: '10px 12px',
        fontSize: 13,
        background: theme.colors.surface,
        color: theme.colors.text,
        ...(props.style ?? {}),
      }}
    />
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>): React.ReactElement {
  return (
    <button
      {...props}
      style={{
        border: 'none',
        borderRadius: theme.radius.md,
        background: theme.colors.accent,
        color: '#fff',
        padding: '10px 14px',
        fontSize: 13,
        fontWeight: 700,
        cursor: props.disabled ? 'default' : 'pointer',
        opacity: props.disabled ? 0.55 : 1,
        ...(props.style ?? {}),
      }}
    />
  );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>): React.ReactElement {
  return (
    <button
      {...props}
      style={{
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radius.md,
        background: theme.colors.surface,
        color: theme.colors.text,
        padding: '10px 14px',
        fontSize: 13,
        fontWeight: 650,
        cursor: props.disabled ? 'default' : 'pointer',
        opacity: props.disabled ? 0.55 : 1,
        ...(props.style ?? {}),
      }}
    />
  );
}

export function SideDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}): React.ReactElement | null {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.20)',
        zIndex: 500,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(760px, 100vw)',
          height: '100vh',
          background: theme.colors.pageBg,
          boxShadow: theme.shadow.floating,
          borderLeft: `1px solid ${theme.colors.border}`,
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            background: 'rgba(251, 252, 254, 0.92)',
            backdropFilter: 'blur(8px)',
            borderBottom: `1px solid ${theme.colors.border}`,
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ ...theme.type.sectionTitle, color: theme.colors.text }}>{title}</div>
          <SecondaryButton onClick={onClose}>Close</SecondaryButton>
        </div>
        {children}
      </aside>
    </div>
  );
}
