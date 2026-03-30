/** Trim + lowercase for comparing country labels from profiles and cluster config. */
export function normalizeCountryLabel(value: string | undefined | null): string {
  return String(value ?? "").trim().toLowerCase();
}

export function countriesMatch(a: string | undefined | null, b: string | undefined | null): boolean {
  const na = normalizeCountryLabel(a);
  const nb = normalizeCountryLabel(b);
  if (!na || !nb) return false;
  return na === nb;
}
