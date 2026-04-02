import React from 'react';
import { SOURCE_TYPE_LABELS } from '../constants.js';

interface Props {
  sourceType: string;
  extractionMethod: string;
}

const SOURCE_COLORS: Record<string, string> = {
  scraper: '#2563eb',
  pdf: '#7c3aed',
  xlsx: '#059669',
  csv: '#d97706',
  api: '#0891b2',
  fixture: '#9ca3af',
};

export function SourceBadge({ sourceType, extractionMethod }: Props): React.ReactElement {
  const label = SOURCE_TYPE_LABELS[sourceType] ?? sourceType;
  const color = SOURCE_COLORS[sourceType] ?? '#6b7280';
  const title = `Source: ${label} / Method: ${extractionMethod}`;

  return (
    <span
      title={title}
      aria-label={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '1px 6px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.03em',
        color: '#fff',
        backgroundColor: color,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}
