export function formatCurrency(amount: string | number | null | undefined): string {
  if (amount == null) return '—';
  const value = typeof amount === 'number' ? amount : parseInt(String(amount), 10);
  if (Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100);
}
