import type React from 'react';

export const theme = {
  colors: {
    appBg: '#f6f7fb',
    pageBg: '#fbfcfe',
    surface: '#ffffff',
    surfaceAlt: '#f4f6fb',
    surfaceMuted: '#eef2f8',
    border: '#dde4ee',
    borderStrong: '#c8d4e3',
    text: '#102033',
    textMuted: '#5b6b80',
    textSoft: '#7f8ea3',
    accent: '#16325c',
    accentSoft: '#e8eef8',
    success: '#1b6b4b',
    successSoft: '#e7f6ee',
    warning: '#9a6700',
    warningSoft: '#fff6dd',
    danger: '#a73737',
    dangerSoft: '#fdecec',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 18,
    xl: 24,
    pill: 999,
  },
  space: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  shadow: {
    card: '0 10px 30px rgba(16, 32, 51, 0.05)',
    floating: '0 18px 40px rgba(16, 32, 51, 0.10)',
  },
  type: {
    eyebrow: { fontSize: 11, letterSpacing: '0.08em', fontWeight: 700 } as React.CSSProperties,
    label: { fontSize: 12, fontWeight: 600 } as React.CSSProperties,
    body: { fontSize: 14, lineHeight: 1.55 } as React.CSSProperties,
    bodySmall: { fontSize: 12, lineHeight: 1.5 } as React.CSSProperties,
    title: { fontSize: 28, lineHeight: 1.15, fontWeight: 700, letterSpacing: '-0.03em' } as React.CSSProperties,
    sectionTitle: { fontSize: 18, lineHeight: 1.2, fontWeight: 650, letterSpacing: '-0.02em' } as React.CSSProperties,
    metric: { fontSize: 30, lineHeight: 1, fontWeight: 700, letterSpacing: '-0.04em' } as React.CSSProperties,
  },
};

export const ui = {
  pageWidth: 1180,
  transition: '160ms ease',
};
