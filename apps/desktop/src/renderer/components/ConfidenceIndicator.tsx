import React from 'react';

interface Props {
  score: number | null;
}

export function ConfidenceIndicator({ score }: Props): React.ReactElement | null {
  if (score === null || score >= 1) return null;

  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? '#16a34a' : score >= 0.6 ? '#d97706' : '#dc2626';
  const label = `Confidence: ${pct}%`;

  return (
    <span
      title={label}
      aria-label={label}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 40,
          height: 6,
          borderRadius: 3,
          background: '#e5e7eb',
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            display: 'block',
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: 3,
          }}
        />
      </span>
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{pct}%</span>
    </span>
  );
}
