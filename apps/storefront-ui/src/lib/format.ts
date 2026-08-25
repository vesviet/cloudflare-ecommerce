export function formatCurrency(amount: string | number | null | undefined): string {
  if (amount == null) return '—';
  const value = typeof amount === 'number' ? amount : parseInt(String(amount), 10);
  if (Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}
