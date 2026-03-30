/** Keep in sync with frontend `src/lib/mongoId.ts` DISPLAY_ID_SUFFIX_LEN. */
export const DISPLAY_ID_SUFFIX_LEN = 4;
/** Last N characters of an id for emails/logs (Mongo, Stripe, human-readable cluster refs). */
export function displayIdSuffix(value, len = DISPLAY_ID_SUFFIX_LEN, emptyFallback = "—") {
    if (value == null || value === "")
        return emptyFallback;
    const raw = String(value).trim();
    if (!raw)
        return emptyFallback;
    const n = Math.max(1, Math.min(32, len));
    return raw.length > n ? raw.slice(-n) : raw;
}
