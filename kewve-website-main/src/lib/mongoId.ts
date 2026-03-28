const HEX24 = /^[a-f0-9]{24}$/i;
const MAX_DEPTH = 6;

function extractHex24FromString(t: string): string {
  const m = t.match(/[a-f0-9]{24}/i);
  return m ? m[0].toLowerCase() : '';
}

function parseOne(value: unknown, depth: number): string {
  if (depth > MAX_DEPTH) return '';
  if (value == null || value === '') return '';

  if (typeof value === 'string') {
    const t = value.trim();
    if (HEX24.test(t)) return t.toLowerCase();
    if (t.startsWith('{') && t.includes('$oid')) {
      try {
        const p = JSON.parse(t) as { $oid?: string };
        if (typeof p.$oid === 'string' && HEX24.test(p.$oid)) return p.$oid.trim().toLowerCase();
      } catch {
        /* ignore */
      }
    }
    const scraped = extractHex24FromString(t);
    if (scraped) return scraped;
    return '';
  }

  if (typeof value === 'object' && value !== null) {
    const o = value as Record<string, unknown>;
    if (typeof o.$oid === 'string' && HEX24.test(o.$oid)) return o.$oid.trim().toLowerCase();
    if ('_id' in o) {
      const inner = parseOne(o._id, depth + 1);
      if (inner) return inner;
    }
    if (typeof o.id === 'string' || typeof o.id === 'object') {
      const inner = parseOne(o.id, depth + 1);
      if (inner) return inner;
    }
    const ts = (value as { toString?: () => string }).toString;
    if (typeof ts === 'function') {
      const s = ts.call(value);
      if (typeof s === 'string') {
        const u = s.trim();
        if (HEX24.test(u)) return u.toLowerCase();
        const scraped = extractHex24FromString(u);
        if (scraped) return scraped;
      }
    }
  }

  const s = String(value).trim();
  if (s === '[object Object]') return '';
  if (HEX24.test(s)) return s.toLowerCase();
  return extractHex24FromString(s);
}

/**
 * Normalize Mongo-style ids from API JSON (hex string, { $oid }, nested _id, ObjectId-like).
 */
export function asMongoIdString(value: unknown, ...extras: unknown[]): string {
  const a = parseOne(value, 0);
  if (a) return a;
  for (const e of extras) {
    const b = parseOne(e, 0);
    if (b) return b;
  }
  return '';
}

/**
 * Buyer-request document id for API URLs. Never scrape arbitrary 24-hex from JSON — other fields
 * (buyerId, productId) would mismatch admin/buyer refs and break producer actions.
 */
export function requestDocumentId(row: unknown): string {
  if (!row || typeof row !== 'object') return '';
  const r = row as Record<string, unknown>;
  const direct = asMongoIdString(r._id, r.id);
  if (direct) return direct;
  try {
    const s = JSON.stringify(row);
    const quoted = s.match(/"_id"\s*:\s*"\s*([a-f0-9]{24})\s*"/i);
    if (quoted) return quoted[1].toLowerCase();
    const oid = s.match(/"_id"\s*:\s*\{\s*"\$oid"\s*:\s*"([a-f0-9]{24})"\s*\}/i);
    if (oid) return oid[1].toLowerCase();
    return '';
  } catch {
    return '';
  }
}

/** Default length for human-visible id tails (Mongo ObjectId, Stripe ids, cluster refs). */
export const DISPLAY_ID_SUFFIX_LEN = 4;

/**
 * Last N characters of an identifier for display (never full ids in UI/email).
 * Works on hex ObjectIds, Stripe session/refund ids, and strings like CLU-…-1234.
 */
export function displayIdSuffix(
  value: unknown,
  len: number = DISPLAY_ID_SUFFIX_LEN,
  emptyFallback = '—'
): string {
  if (value == null || value === '') return emptyFallback;
  const normalized =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? asMongoIdString(value) || requestDocumentId(value)
      : asMongoIdString(value);
  const raw = (normalized || String(value).trim()).trim();
  if (!raw) return emptyFallback;
  const n = Math.max(1, Math.min(32, len));
  return raw.length > n ? raw.slice(-n) : raw;
}

/** Last 4 chars of the request `_id` — same convention for admin, buyer, and producer tables. */
export function buyerRequestRefSuffix(rowOrId: unknown, rowIndexFallback = ''): string {
  const id =
    typeof rowOrId === 'object' && rowOrId !== null && !Array.isArray(rowOrId)
      ? requestDocumentId(rowOrId)
      : asMongoIdString(rowOrId);
  if (id.length >= DISPLAY_ID_SUFFIX_LEN) return id.slice(-DISPLAY_ID_SUFFIX_LEN);
  if (id.length > 0) return id;
  return rowIndexFallback ? `—${rowIndexFallback}` : '—';
}
