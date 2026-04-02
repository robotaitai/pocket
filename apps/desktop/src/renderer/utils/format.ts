export function formatCurrency(amount: number, currency = 'ILS'): string {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency }).format(amount);
}

export function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export function formatPctChange(value: number | null): string {
  if (value == null) return 'N/A';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function freshnessColor(label: string): string {
  switch (label) {
    case 'today': return '#16a34a';
    case 'this-week': return '#2563eb';
    case 'this-month': return '#d97706';
    default: return '#dc2626';
  }
}
