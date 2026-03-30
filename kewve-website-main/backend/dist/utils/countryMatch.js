/** Trim + lowercase for comparing country labels from profiles and cluster config. */
export function normalizeCountryLabel(value) {
    return String(value ?? "").trim().toLowerCase();
}
export function countriesMatch(a, b) {
    const na = normalizeCountryLabel(a);
    const nb = normalizeCountryLabel(b);
    if (!na || !nb)
        return false;
    return na === nb;
}
