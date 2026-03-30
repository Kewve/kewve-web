/** Maps stored contact form values to human-readable labels for email/UI. */
export function formatInterestRole(value: string): string {
  const v = (value || '').toLowerCase().trim();
  if (v === 'buyer') return 'Buyer';
  if (v === 'producer' || v === 'supplier') return 'Producer';
  return value || '—';
}

export function normalizeInterestRole(raw: string): 'buyer' | 'producer' | null {
  const v = raw.toLowerCase().trim();
  if (v === 'buyer') return 'buyer';
  if (v === 'producer' || v === 'supplier') return 'producer';
  return null;
}
