import React, { useState } from 'react';
import type { CategoryBreakdownItem } from '../pocket.js';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../constants.js';
import { formatCurrency } from '../utils/format.js';

interface Props {
  items: CategoryBreakdownItem[];
  title: string;
  size?: number;
}

/**
 * Donut pie chart — pure SVG, no external charting library.
 * Shows spending breakdown by category with an interactive legend.
 */
export function PieChart({ items, title, size = 180 }: Props): React.ReactElement {
  const [hovered, setHovered] = useState<string | null>(null);

  const total = items.reduce((s, i) => s + i.total, 0);

  if (items.length === 0 || total === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 13 }}>
        No data for this period.
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * 0.56;

  // Build arc paths
  const slices = buildSlices(items, total, cx, cy, outerR, innerR);

  const hoveredItem = hovered ? items.find((i) => i.category === hovered) : null;
  const centerLabel = hoveredItem
    ? { text: CATEGORY_LABELS[hoveredItem.category] ?? hoveredItem.category, value: formatCurrency(hoveredItem.total) }
    : { text: title, value: formatCurrency(total) };

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {/* SVG donut */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-label={`${title} pie chart`}
          role="img"
        >
          {slices.map((s) => (
            <path
              key={s.category}
              d={s.path}
              fill={s.color}
              stroke="#fff"
              strokeWidth={2}
              opacity={hovered === null || hovered === s.category ? 1 : 0.35}
              style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
              onMouseEnter={() => setHovered(s.category)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          {/* Center text */}
          <text
            x={cx}
            y={cy - 8}
            textAnchor="middle"
            fontSize={10}
            fill="#6b7280"
            fontFamily="system-ui, sans-serif"
          >
            {centerLabel.text.length > 14 ? centerLabel.text.slice(0, 13) + '…' : centerLabel.text}
          </text>
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            fontSize={13}
            fontWeight="700"
            fill="#111827"
            fontFamily="system-ui, sans-serif"
          >
            {centerLabel.value}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160, flex: 1 }}>
        {items.map((item) => {
          const pct = ((item.total / total) * 100).toFixed(1);
          const color = CATEGORY_COLORS[item.category] ?? '#d1d5db';
          const label = CATEGORY_LABELS[item.category] ?? item.category;
          const isHovered = hovered === item.category;

          return (
            <div
              key={item.category}
              onMouseEnter={() => setHovered(item.category)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'default',
                opacity: hovered === null || isHovered ? 1 : 0.5,
                transition: 'opacity 0.15s',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 12, color: '#374151', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {label}
              </span>
              <span style={{ fontSize: 12, color: '#6b7280', flexShrink: 0 }}>{pct}%</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#111827', flexShrink: 0, minWidth: 60, textAlign: 'right' }}>
                {formatCurrency(item.total)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SVG arc helpers ────────────────────────────────────────────────────────────

interface Slice {
  category: string;
  color: string;
  path: string;
}

function buildSlices(
  items: CategoryBreakdownItem[],
  total: number,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
): Slice[] {
  let startAngle = -Math.PI / 2; // start at 12 o'clock

  return items.map((item) => {
    const fraction = item.total / total;
    const angle = fraction * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;

    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);
    const x3 = cx + innerR * Math.cos(endAngle);
    const y3 = cy + innerR * Math.sin(endAngle);
    const x4 = cx + innerR * Math.cos(startAngle);
    const y4 = cy + innerR * Math.sin(startAngle);

    const path = [
      `M ${x1} ${y1}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ');

    startAngle = endAngle;

    return {
      category: item.category,
      color: CATEGORY_COLORS[item.category] ?? '#d1d5db',
      path,
    };
  });
}
