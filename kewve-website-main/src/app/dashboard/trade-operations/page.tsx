'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { josefinSemiBold, josefinRegular } from '@/utils';
import {
  AlertCircle,
  ArrowLeftRight,
  Check,
  ChevronRight,
  Circle,
  Layers,
  X,
} from 'lucide-react';
import { aggregationAPI, buyerRequestAPI } from '@/lib/api';
import { asMongoIdString, buyerRequestRefSuffix, displayIdSuffix, requestDocumentId } from '@/lib/mongoId';
import { useAuth } from '@/contexts/AuthContext';

function eur(cents: number) {
  return `€${(Number(cents || 0) / 100).toFixed(2)}`;
}

/** Structured lines for buyer delivery (BuyerRequest.deliveryAddress). */
function deliveryAddressLines(d: Record<string, unknown> | undefined | null): string[] {
  if (!d || typeof d !== 'object' || !String((d as { line1?: string }).line1 || '').trim()) {
    return [];
  }
  const o = d as {
    company?: string;
    line1?: string;
    line2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
  };
  const lines: string[] = [];
  if (o.company?.trim()) lines.push(o.company.trim());
  if (o.line1?.trim()) lines.push(o.line1.trim());
  if (o.line2?.trim()) lines.push(o.line2.trim());
  const cityLine = [o.city, o.postalCode].filter(Boolean).join(', ').trim();
  if (cityLine) lines.push(cityLine);
  if (o.country?.trim()) lines.push(o.country.trim());
  if (o.phone?.trim()) lines.push(`Phone: ${o.phone.trim()}`);
  return lines;
}

function activeAllocations(row: any): any[] {
  const allocs = row?.matchPlan?.allocations || [];
  return allocs.filter((a: any) => Number(a.allocatedKg || 0) > 0);
}

function tradeUsesPerProducerResponses(row: any): boolean {
  const planAllocs = row?.matchPlan?.allocations || [];
  const activeCount = planAllocs.filter((a: any) => Number(a.allocatedKg || 0) > 0).length;
  return planAllocs.length > 0 && (row.fulfillmentMode === 'aggregation' || activeCount > 1);
}

function isAggregationStyleRow(row: any): boolean {
  if (row.fulfillmentMode === 'aggregation') return true;
  return activeAllocations(row).length > 1;
}

function canActLeadOrSole(row: any, uid: string): boolean {
  if (!uid) return false;
  if (asMongoIdString(row.producerId) === uid) return true;
  if (isAggregationStyleRow(row)) return false;
  const active = activeAllocations(row);
  if (active.length !== 1) return false;
  return asMongoIdString(active[0]?.producerId) === uid;
}

function primaryUnitPrice(row: any): number {
  const allocs = row?.matchPlan?.allocations;
  if (!Array.isArray(allocs) || !allocs.length) return 0;
  const pid = asMongoIdString(row.productId);
  const match = allocs.find((a: any) => asMongoIdString(a.productId) === pid);
  return Number((match || allocs[0])?.unitPrice || 0);
}

function invoiceProductSubtotalCents(row: any): number {
  const active = activeAllocations(row);
  if (!active.length) return 0;
  if (tradeUsesPerProducerResponses(row)) {
    return active.reduce((sum: number, a: any) => {
      if (String(a.producerResponse || 'pending') !== 'accepted') return sum;
      return sum + Math.round(Number(a.unitPrice || 0) * Number(a.allocatedKg || 0) * 100);
    }, 0);
  }
  const u = primaryUnitPrice(row);
  return Math.round(Number(u || 0) * Number(row.volumeKg || 0) * 100);
}

function invoicePreviewFromRow(row: any | null, additionalFeesCents: number) {
  if (!row) {
    return { subtotalCents: 0, platformFeeCents: 0, additionalFeesCents: 0, totalCents: 0 };
  }
  const subtotalCents = invoiceProductSubtotalCents(row);
  const platformFeeCents = Math.round((subtotalCents * 10) / 100);
  const extra = Math.max(0, Math.round(additionalFeesCents));
  return { subtotalCents, platformFeeCents, additionalFeesCents: extra, totalCents: subtotalCents + extra + platformFeeCents };
}

function tradeClosedForProducerView(row: any, t: any): boolean {
  const agg = tradeUsesPerProducerResponses(row);
  return (
    !!t.transactionClosed ||
    (!agg && t.producerDecision === 'declined') ||
    t.buyerReceipt === 'received_ok' ||
    t.fulfillmentStatus === 'cancelled'
  );
}

function producerVolumeKg(row: any, uid: string): number {
  const active = activeAllocations(row);
  const myLines = uid ? active.filter((a: any) => asMongoIdString(a.producerId) === uid) : [];
  if (myLines.length) {
    return myLines.reduce((s: number, a: any) => s + Number(a.allocatedKg || 0), 0);
  }
  return Number(row.volumeKg || 0);
}

/** Card status for summary + styling */
type CardTier = 'completed' | 'cancelled' | 'pending' | 'action';

function cardTier(row: any, uid: string): CardTier {
  const t = row.trade || {};
  const inv = t.invoice;
  const paid = !!inv?.paidAt;
  const closed = tradeClosedForProducerView(row, t);

  if (t.buyerReceipt === 'received_ok') return 'completed';
  if (t.transactionClosed && t.buyerReceipt === 'received_ok') return 'completed';
  if (t.payout?.status === 'completed' && t.buyerReceipt === 'received_ok') return 'completed';

  /** Cancelled fulfillment is closed for the producer — must not fall through to generic "Pending". */
  if (t.fulfillmentStatus === 'cancelled') return 'cancelled';

  if (t.issuesNeedAdmin) return 'action';

  const perProducer = tradeUsesPerProducerResponses(row);
  const active = activeAllocations(row);
  const myLines = uid ? active.filter((a: any) => asMongoIdString(a.producerId) === uid) : [];

  if ((row.status === 'matched' || row.status === 'in_review') && !closed) {
    if (perProducer && myLines.some((l: any) => String(l.producerResponse || 'pending') === 'pending')) {
      return 'action';
    }
    if (!perProducer && (t.producerDecision || 'pending') === 'pending' && canActLeadOrSole(row, uid)) {
      return 'action';
    }
  }

  return 'pending';
}

function cardSignals(row: any, uid: string): string[] {
  const out: string[] = [];
  const t = row.trade || {};
  const inv = t.invoice;
  const perProducer = tradeUsesPerProducerResponses(row);
  const active = activeAllocations(row);
  const myLines = uid ? active.filter((a: any) => asMongoIdString(a.producerId) === uid) : [];
  const remKg = Number(row.matchPlan?.remainingVolumeKg ?? 0);

  if (t.fulfillmentStatus === 'cancelled') {
    return inv?.paidAt ? ['Order cancelled · buyer paid'] : ['Order cancelled'];
  }

  if (remKg > 0) out.push(`${remKg.toLocaleString()} kg unallocated`);
  if (inv?.sentAt) {
    out.push(inv.paidAt ? 'Paid' : 'Invoice sent · awaiting payment');
  } else if (row.status === 'matched' && (t.producerDecision === 'accepted' || myLines.some((l: any) => l.producerResponse === 'accepted'))) {
    if (!isAggregationStyleRow(row)) out.push('Invoice not sent');
  }
  if (t.fulfillmentStatus && t.fulfillmentStatus !== 'none') {
    out.push(String(t.fulfillmentStatus).replace(/_/g, ' '));
  }
  if (out.length >= 2) return out.slice(0, 2);
  if (out.length === 1) return out;
  if (row.status === 'pending' || row.status === 'in_review') out.push('Awaiting match');
  return out.length ? out.slice(0, 2) : ['In progress'];
}

type DeclineCtx = { requestId: string; productId?: string } | null;

type Fulfillment = 'none' | 'processing' | 'dispatched' | 'delivered' | 'cancelled' | 'completed';

function clusterDeliveryLines(dest: any): string[] {
  if (!dest?.address || typeof dest.address !== 'object') return [];
  const a = dest.address as Record<string, string | undefined>;
  const lines: string[] = [];
  if (a.company?.trim()) lines.push(a.company.trim());
  if (a.line1?.trim()) lines.push(a.line1.trim());
  if (a.line2?.trim()) lines.push(a.line2.trim());
  const cityLine = [a.city, a.postalCode].filter(Boolean).join(', ').trim();
  if (cityLine) lines.push(cityLine);
  if (a.country?.trim()) lines.push(a.country.trim());
  if (a.phone?.trim()) lines.push(`Phone: ${a.phone.trim()}`);
  return lines;
}

type UnifiedFeedItem =
  | { kind: 'sourcing'; row: any; rowIndex: number; sortKey: number }
  | { kind: 'cluster'; cluster: any; entry: any; sortKey: number };

function sourcingDealLabel(row: any): 'Aggregation' | 'Single supplier' {
  return isAggregationStyleRow(row) ? 'Aggregation' : 'Single supplier';
}

export default function TradeOperationsPage() {
  const searchParams = useSearchParams();
  const requestIdHighlight = searchParams.get('requestId');
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [clusterSettlements, setClusterSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [declineCtx, setDeclineCtx] = useState<DeclineCtx>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [invoiceRow, setInvoiceRow] = useState<any | null>(null);
  const [additionalFeesEuros, setAdditionalFeesEuros] = useState('');
  const [additionalFeesNote, setAdditionalFeesNote] = useState('Delivery');
  const [detailRow, setDetailRow] = useState<any | null>(null);
  const [cancelPaidCtx, setCancelPaidCtx] = useState<{ rowId: string } | null>(null);
  const [cancelPaidReason, setCancelPaidReason] = useState('');
  const [detailClusterCtx, setDetailClusterCtx] = useState<{ cluster: any; entry: any } | null>(null);

  const uid = asMongoIdString(user?.id, (user as { _id?: unknown } | null)?._id);

  const load = useCallback(async () => {
    try {
      const [res, cs] = await Promise.all([
        buyerRequestAPI.list(),
        aggregationAPI.getMyClusterSettlements().catch(() => ({ data: [] as any[] })),
      ]);
      setRows(res.data || []);
      setClusterSettlements(Array.isArray(cs.data) ? cs.data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load trade requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const clusterLines = useMemo(() => {
    const out: { cluster: any; entry: any }[] = [];
    for (const c of clusterSettlements) {
      for (const e of c.settlement?.entries || []) {
        out.push({ cluster: c, entry: e });
      }
    }
    return out;
  }, [clusterSettlements]);

  const clusterLineCardTier = (entry: any): CardTier => {
    const s = String(entry?.supplyStatus || 'pending');
    const payout = String(entry?.payout?.status || 'none');
    if (payout === 'completed' && s === 'accepted') return 'completed';
    if (s === 'pending') return 'action';
    return 'pending';
  };

  const clusterLineSignals = (entry: any): string[] => {
    const s = String(entry?.supplyStatus || 'pending');
    const p = String(entry?.payout?.status || 'none');
    const sig: string[] = [`Supply: ${s.replace(/_/g, ' ')}`];
    if (p !== 'none') sig.push(`Transfer: ${p}`);
    return sig.slice(0, 2);
  };

  const unifiedFeed = useMemo(() => {
    const items: UnifiedFeedItem[] = [];
    rows.forEach((row, rowIndex) => {
      const sortKey = new Date(row.updatedAt || row.createdAt || 0).getTime();
      items.push({ kind: 'sourcing', row, rowIndex, sortKey });
    });
    for (const c of clusterSettlements) {
      for (const e of c.settlement?.entries || []) {
        const sortKey = new Date(
          c.purchase?.paidAt || c.settlement?.computedAt || c.updatedAt || c.createdAt || 0
        ).getTime();
        items.push({ kind: 'cluster', cluster: c, entry: e, sortKey });
      }
    }
    items.sort((a, b) => b.sortKey - a.sortKey);
    return items;
  }, [rows, clusterSettlements]);

  useEffect(() => {
    if (!requestIdHighlight || loading) return;
    const id = asMongoIdString(requestIdHighlight);
    if (!id) return;
    const el = document.getElementById(`trade-request-${id}`);
    if (el) {
      requestAnimationFrame(() =>
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
      );
    }
  }, [requestIdHighlight, loading, rows]);

  const summary = useMemo(() => {
    let pending = 0;
    let action = 0;
    let completed = 0;
    let cancelled = 0;
    let processingCents = 0;
    for (const row of rows) {
      const tier = cardTier(row, uid);
      if (tier === 'completed') completed++;
      else if (tier === 'cancelled') cancelled++;
      else if (tier === 'action') action++;
      else pending++;
      const t = row.trade || {};
      const inv = t.invoice;
      if (inv?.paidAt && tier !== 'completed' && !tradeClosedForProducerView(row, t)) {
        processingCents += Number(inv.totalCents || 0);
      }
    }
    for (const { cluster, entry } of clusterLines) {
      const tier = clusterLineCardTier(entry);
      if (tier === 'completed') completed++;
      else if (tier === 'action') action++;
      else pending++;
      if (cluster.purchase?.paidAt && tier !== 'completed') {
        processingCents += Number(entry.netPayoutCents || 0);
      }
    }
    const active = pending + action;
    return { active, pending, action, completed, cancelled, processingCents };
  }, [rows, clusterLines, uid]);

  const runClusterSupply = async (clusterId: string, entryId: string) => {
    const key = `cluster:${clusterId}:${entryId}`;
    try {
      setBusy(key);
      setError('');
      await aggregationAPI.updateProducerClusterSupply(clusterId, entryId);
      const cs = await aggregationAPI.getMyClusterSettlements();
      const list = Array.isArray(cs.data) ? cs.data : [];
      setClusterSettlements(list);
      setDetailClusterCtx((d) => {
        if (!d || String(d.cluster._id) !== String(clusterId)) return d;
        const cluster = list.find((c: any) => String(c._id) === String(clusterId));
        const entry = cluster?.settlement?.entries?.find((e: any) => String(e._id) === String(entryId));
        if (cluster && entry) return { cluster, entry };
        return d;
      });
    } catch (e: any) {
      setError(e?.message || 'Action failed.');
    } finally {
      setBusy(null);
    }
  };

  const run = async (id: string, fn: () => Promise<any>) => {
    try {
      setBusy(id);
      setError('');
      const res = await fn();
      if (res?.data) {
        setRows((prev) => prev.map((r) => (asMongoIdString(r._id) === id ? res.data : r)));
        setDetailRow((d: any) => (d && asMongoIdString(d._id) === id ? res.data : d));
      } else {
        await load();
      }
    } catch (e: any) {
      setError(e?.message || 'Action failed.');
    } finally {
      setBusy(null);
    }
  };

  const submitDecline = async () => {
    if (!declineCtx) return;
    await run(declineCtx.requestId, () =>
      buyerRequestAPI.producerDecision(declineCtx.requestId, {
        decision: 'declined',
        reason: declineReason,
        ...(declineCtx.productId ? { productId: asMongoIdString(declineCtx.productId) } : {}),
      })
    );
    setDeclineCtx(null);
    setDeclineReason('');
  };

  const additionalCentsPreview = useMemo(() => {
    const n = parseFloat(String(additionalFeesEuros || '').replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.round(n * 100);
  }, [additionalFeesEuros]);

  const preview = useMemo(
    () => invoicePreviewFromRow(invoiceRow, additionalCentsPreview),
    [invoiceRow, additionalCentsPreview]
  );

  const openInvoiceModal = (row: any) => {
    setInvoiceRow(row);
    setAdditionalFeesEuros('');
    setAdditionalFeesNote('Delivery');
  };

  const submitInvoice = async () => {
    if (!invoiceRow?._id) return;
    const id = asMongoIdString(invoiceRow._id);
    if (!id) return;
    await run(id, () =>
      buyerRequestAPI.generateInvoice(id, {
        additionalFeesCents: preview.additionalFeesCents,
        additionalFeesNote: additionalFeesNote.trim() || 'Additional fees',
      })
    );
    setInvoiceRow(null);
  };

  const invoiceVol = invoiceRow ? Number(invoiceRow.volumeKg || 0) : 0;

  const tierStyles: Record<
    CardTier,
    { bar: string; badge: string; label: string; icon: typeof Check }
  > = {
    completed: {
      bar: 'border-emerald-200 bg-emerald-50/60',
      badge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      label: 'Completed',
      icon: Check,
    },
    cancelled: {
      bar: 'border-gray-300 bg-gray-50/90',
      badge: 'bg-gray-200 text-gray-900 border-gray-300',
      label: 'Cancelled',
      icon: X,
    },
    pending: {
      bar: 'border-amber-200 bg-amber-50/50',
      badge: 'bg-amber-100 text-amber-900 border-amber-200',
      label: 'Pending',
      icon: Circle,
    },
    action: {
      bar: 'border-red-200 bg-red-50/40',
      badge: 'bg-amber-100 text-amber-900 border-amber-200',
      label: 'Action needed',
      icon: AlertCircle,
    },
  };

  return (
    <div className='max-w-6xl mx-auto space-y-8'>
      <div>
        <h1 className={`text-2xl lg:text-3xl text-gray-900 ${josefinSemiBold.className}`}>Trade Operations</h1>
        <p className={`text-sm text-gray-600 mt-1 ${josefinRegular.className}`}>
          All your deals in one place: single-supplier sourcing, aggregation allocations, and pooled cluster orders. Each card opens
          the full pipeline, delivery context, and actions.
        </p>
      </div>

      {/* Summary bar */}
      {!loading && (rows.length > 0 || clusterLines.length > 0) ? (
        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3'>
          <div className='rounded-xl border border-gray-200 bg-white px-4 py-3'>
            <p className={`text-xs text-gray-500 uppercase tracking-wide ${josefinSemiBold.className}`}>Active</p>
            <p className={`text-xl text-gray-900 mt-0.5 ${josefinSemiBold.className}`}>{summary.active}</p>
          </div>
          <div className='rounded-xl border border-gray-200 bg-white px-4 py-3'>
            <p className={`text-xs text-gray-500 uppercase tracking-wide ${josefinSemiBold.className}`}>Pending</p>
            <p className={`text-xl text-amber-700 mt-0.5 ${josefinSemiBold.className}`}>{summary.pending}</p>
          </div>
          <div className='rounded-xl border border-gray-200 bg-white px-4 py-3'>
            <p className={`text-xs text-gray-500 uppercase tracking-wide ${josefinSemiBold.className}`}>Processing</p>
            <p className={`text-lg text-gray-900 mt-0.5 ${josefinSemiBold.className}`}>{eur(summary.processingCents)}</p>
            <p className={`text-[10px] text-gray-500 ${josefinRegular.className}`}>Buyer invoices + your cluster payouts in flight</p>
          </div>
          <div className='rounded-xl border border-gray-200 bg-white px-4 py-3'>
            <p className={`text-xs text-gray-500 uppercase tracking-wide ${josefinSemiBold.className}`}>Completed</p>
            <p className={`text-xl text-emerald-700 mt-0.5 ${josefinSemiBold.className}`}>{summary.completed}</p>
          </div>
          <div className='rounded-xl border border-gray-200 bg-white px-4 py-3'>
            <p className={`text-xs text-gray-500 uppercase tracking-wide ${josefinSemiBold.className}`}>Cancelled</p>
            <p className={`text-xl text-gray-700 mt-0.5 ${josefinSemiBold.className}`}>{summary.cancelled}</p>
          </div>
        </div>
      ) : null}

      {summary.action > 0 ? (
        <p className={`text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 ${josefinRegular.className}`}>
          <span className={josefinSemiBold.className}>{summary.action}</span> line{summary.action !== 1 ? 's' : ''} need your
          response (accept/decline, mark cluster delivered, or resolve).
        </p>
      ) : null}

      <div className='flex items-center gap-2 text-gray-700'>
        <ArrowLeftRight className='w-5 h-5 text-gray-500 shrink-0' />
        <h2 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>All transactions</h2>
      </div>

      {/* Unified cards: sourcing + cluster */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {loading ? (
          <div className='col-span-full py-16 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50'>
            <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Loading trade operations…</p>
          </div>
        ) : unifiedFeed.length === 0 ? (
          <div className='col-span-full py-16 text-center rounded-xl border border-gray-200 bg-white'>
            <ArrowLeftRight className='w-10 h-10 text-gray-300 mx-auto mb-3' />
            <p className={`text-sm text-gray-500 max-w-sm mx-auto ${josefinRegular.className}`}>
              No transactions yet. Buyer requests and paid cluster lines appear here.
            </p>
          </div>
        ) : (
          unifiedFeed.map((item) => {
            if (item.kind === 'sourcing') {
              const { row, rowIndex } = item;
              const rowId = requestDocumentId(row);
              const t = row.trade || {};
              const tier = cardTier(row, uid);
              const st = tierStyles[tier];
              const TierIcon = st.icon;
              const refSuffix = buyerRequestRefSuffix(row, String(rowIndex));
              const vol = producerVolumeKg(row, uid);
              const inv = t.invoice;
              const amount =
                inv?.totalCents != null
                  ? eur(inv.totalCents)
                  : row.status === 'matched'
                    ? eur(invoicePreviewFromRow(row, 0).totalCents) + ' (est.)'
                    : '—';
              const signals = cardSignals(row, uid);
              const deal = sourcingDealLabel(row);
              return (
                <div
                  key={rowId || `row-${rowIndex}`}
                  id={rowId ? `trade-request-${rowId}` : undefined}
                  className={`rounded-xl border-2 p-4 transition-shadow hover:shadow-md flex flex-col h-full ${st.bar}`}>
                  <div className='min-w-0 flex-1 space-y-2'>
                    <div className='flex items-center justify-between gap-2 flex-wrap'>
                      <span
                        className={`inline-flex rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700 ${josefinSemiBold.className}`}>
                        {deal}
                      </span>
                      <span className={`text-sm text-gray-500 font-mono ${josefinRegular.className}`}>#{refSuffix}</span>
                    </div>
                    <div className='flex items-center justify-between gap-3'>
                      <span className={`text-xs text-gray-500 uppercase tracking-wide ${josefinSemiBold.className}`}>Sourcing</span>
                      <p className={`text-2xl text-gray-900 ${josefinSemiBold.className}`}>{amount}</p>
                    </div>
                    <p className={`text-lg text-gray-900 leading-tight ${josefinSemiBold.className}`}>
                      {row.productName || '—'} <span className='text-gray-700'>• {vol.toLocaleString()} kg</span>
                    </p>
                    <p className={`text-sm text-gray-700 ${josefinRegular.className}`}>
                      Buyer: <span className={josefinSemiBold.className}>{row.buyerName || '—'}</span>
                    </p>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${st.badge} ${josefinSemiBold.className}`}>
                        <TierIcon className='w-3.5 h-3.5' />
                        {st.label}
                      </span>
                      {signals[0] ? (
                        <span className={`text-sm text-gray-700 ${josefinRegular.className}`}>{signals[0]}</span>
                      ) : null}
                      {signals[1] ? (
                        <span className={`text-sm text-gray-700 ${josefinRegular.className}`}>• {signals[1]}</span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={() => {
                      setDetailClusterCtx(null);
                      setDetailRow(row);
                    }}
                    className={`mt-3 w-full inline-flex items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50 ${josefinSemiBold.className}`}>
                    View details
                    <ChevronRight className='w-4 h-4' />
                  </button>
                </div>
              );
            }
            const { cluster, entry } = item;
            const tier = clusterLineCardTier(entry);
            const st = tierStyles[tier];
            const TierIcon = st.icon;
            const signals = clusterLineSignals(entry);
            const amount = eur(entry.netPayoutCents || 0);
            const ckey = `${String(cluster._id)}:${String(entry._id)}`;
            return (
              <div
                key={ckey}
                className={`rounded-xl border-2 p-4 transition-shadow hover:shadow-md flex flex-col h-full ${st.bar}`}>
                <div className='min-w-0 flex-1 space-y-2'>
                  <div className='flex items-center justify-between gap-2 flex-wrap'>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] text-violet-900 ${josefinSemiBold.className}`}>
                      <Layers className='w-3 h-3 shrink-0' />
                      Cluster
                    </span>
                    <span className={`text-sm text-gray-500 font-mono ${josefinRegular.className}`}>{displayIdSuffix(cluster.clusterId)}</span>
                  </div>
                  <div className='flex items-center justify-between gap-3'>
                    <span className={`text-xs text-gray-500 uppercase tracking-wide ${josefinSemiBold.className}`}>Your payout</span>
                    <p className={`text-2xl text-gray-900 ${josefinSemiBold.className}`}>{amount}</p>
                  </div>
                  <p className={`text-lg text-gray-900 leading-tight ${josefinSemiBold.className}`}>
                    {entry.productName || '—'}{' '}
                    <span className='text-gray-700'>• {Number(entry.allocatedKg || 0).toLocaleString()} kg</span>
                  </p>
                  <p className={`text-sm text-gray-700 ${josefinRegular.className}`}>
                    Pool: <span className={josefinSemiBold.className}>{cluster.productName || '—'}</span>
                  </p>
                  <p className={`text-sm text-gray-700 ${josefinRegular.className}`}>
                    Buyer: <span className={josefinSemiBold.className}>{cluster.purchase?.buyerName || '—'}</span>
                  </p>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${st.badge} ${josefinSemiBold.className}`}>
                      <TierIcon className='w-3.5 h-3.5' />
                      {st.label}
                    </span>
                    {signals[0] ? (
                      <span className={`text-sm text-gray-700 ${josefinRegular.className}`}>{signals[0]}</span>
                    ) : null}
                    {signals[1] ? (
                      <span className={`text-sm text-gray-700 ${josefinRegular.className}`}>• {signals[1]}</span>
                    ) : null}
                  </div>
                </div>
                <button
                  type='button'
                  onClick={() => {
                    setDetailRow(null);
                    setDetailClusterCtx({ cluster, entry });
                  }}
                  className={`mt-3 w-full inline-flex items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50 ${josefinSemiBold.className}`}>
                  View details
                  <ChevronRight className='w-4 h-4' />
                </button>
              </div>
            );
          })
        )}
      </div>

      {error ? <p className={`text-sm text-red-600 ${josefinRegular.className}`}>{error}</p> : null}

      {/* Detail drawer */}
      {detailRow && (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <button
            type='button'
            className='absolute inset-0 bg-black/40'
            aria-label='Close'
            onClick={() => setDetailRow(null)}
          />
          <div className='relative w-full max-w-lg h-full bg-white shadow-xl border-l border-gray-200 flex flex-col overflow-hidden'>
            <div className='flex items-center justify-between border-b border-gray-100 px-4 py-3 shrink-0'>
              <div>
                <p className={`text-xs text-violet-900/90 ${josefinSemiBold.className}`}>
                  {sourcingDealLabel(detailRow)} · Sourcing
                </p>
                <p className={`text-xs text-gray-500 font-mono ${josefinRegular.className}`}>
                  #{buyerRequestRefSuffix(detailRow, '0')}
                </p>
                <h2 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>{detailRow.productName || '—'}</h2>
              </div>
              <button
                type='button'
                onClick={() => setDetailRow(null)}
                className='p-2 rounded-lg hover:bg-gray-100 text-gray-600'
                aria-label='Close'>
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='flex-1 overflow-y-auto px-4 py-4 space-y-6'>
              <DetailIssueSection row={detailRow} />
              <DetailTimeline row={detailRow} uid={uid} />
              <DetailPipeline row={detailRow} uid={uid} />
              <DetailActions
                row={detailRow}
                uid={uid}
                busy={busy}
                run={run}
                setDeclineCtx={setDeclineCtx}
                openInvoiceModal={openInvoiceModal}
                setCancelPaidCtx={setCancelPaidCtx}
              />
            </div>
          </div>
        </div>
      )}

      {detailClusterCtx ? (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <button
            type='button'
            className='absolute inset-0 bg-black/40'
            aria-label='Close'
            onClick={() => setDetailClusterCtx(null)}
          />
          <div className='relative w-full max-w-lg h-full bg-white shadow-xl border-l border-gray-200 flex flex-col overflow-hidden'>
            <div className='flex items-center justify-between border-b border-gray-100 px-4 py-3 shrink-0'>
              <div>
                <p className={`text-xs text-violet-900/90 flex items-center gap-1 ${josefinSemiBold.className}`}>
                  <Layers className='w-3.5 h-3.5' />
                  Cluster · Pooled order
                </p>
                <p className={`text-xs text-gray-500 font-mono ${josefinRegular.className}`}>
                  {displayIdSuffix(detailClusterCtx.cluster.clusterId)}
                </p>
                <h2 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>
                  {detailClusterCtx.entry.productName || '—'}
                </h2>
                <p className={`text-sm text-gray-600 ${josefinRegular.className}`}>
                  Pool: {detailClusterCtx.cluster.productName || '—'}
                </p>
              </div>
              <button
                type='button'
                onClick={() => setDetailClusterCtx(null)}
                className='p-2 rounded-lg hover:bg-gray-100 text-gray-600'
                aria-label='Close'>
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='flex-1 overflow-y-auto px-4 py-4 space-y-6'>
              <DetailClusterTimeline cluster={detailClusterCtx.cluster} entry={detailClusterCtx.entry} />
              <div className={`text-sm space-y-1.5 border border-gray-100 rounded-lg p-3 bg-gray-50/80 ${josefinRegular.className}`}>
                <p className={josefinSemiBold.className}>Order &amp; settlement</p>
                {detailClusterCtx.cluster.settlement?.buyerVolumeKg != null ? (
                  <p>
                    <span className='text-gray-500'>Buyer volume:</span>{' '}
                    {Number(detailClusterCtx.cluster.settlement.buyerVolumeKg).toLocaleString()} kg
                  </p>
                ) : null}
                {detailClusterCtx.cluster.settlement?.market ? (
                  <p>
                    <span className='text-gray-500'>Market:</span> {detailClusterCtx.cluster.settlement.market}
                  </p>
                ) : null}
                {detailClusterCtx.cluster.settlement?.timeline ? (
                  <p>
                    <span className='text-gray-500'>Timeline:</span> {detailClusterCtx.cluster.settlement.timeline}
                  </p>
                ) : null}
                {detailClusterCtx.cluster.settlement?.totalPaidCents != null ? (
                  <p>
                    <span className='text-gray-500'>Buyer paid (incl. fees):</span>{' '}
                    {eur(detailClusterCtx.cluster.settlement.totalPaidCents)}
                  </p>
                ) : null}
                {detailClusterCtx.cluster.purchase?.paidAt ? (
                  <p>
                    <span className='text-gray-500'>Paid at:</span>{' '}
                    {new Date(detailClusterCtx.cluster.purchase.paidAt).toLocaleString()}
                  </p>
                ) : null}
                {detailClusterCtx.cluster.purchase?.invoice?.sentAt ? (
                  <p>
                    <span className='text-gray-500'>Invoice sent:</span>{' '}
                    {new Date(detailClusterCtx.cluster.purchase.invoice.sentAt).toLocaleString()}
                  </p>
                ) : null}
                <p className='capitalize'>
                  <span className='text-gray-500'>Buyer receipt:</span>{' '}
                  {String(detailClusterCtx.cluster.purchase?.buyerReceipt || 'none').replace(/_/g, ' ')}
                </p>
                {detailClusterCtx.cluster.purchase?.refund?.status &&
                String(detailClusterCtx.cluster.purchase.refund.status) !== 'none' ? (
                  <p className='capitalize'>
                    <span className='text-gray-500'>Refund:</span> {String(detailClusterCtx.cluster.purchase.refund.status)}
                    {Number(detailClusterCtx.cluster.purchase.refund?.amountCents || 0) > 0
                      ? ` (${eur(Number(detailClusterCtx.cluster.purchase.refund.amountCents || 0))})`
                      : ''}
                  </p>
                ) : null}
              </div>
              <div className={`text-sm space-y-1 border border-sky-100 rounded-lg p-3 bg-sky-50/40 ${josefinRegular.className}`}>
                <p className={josefinSemiBold.className}>Your line</p>
                <p>
                  <span className='text-gray-500'>Allocated:</span>{' '}
                  {Number(detailClusterCtx.entry.allocatedKg || 0).toLocaleString()} kg
                </p>
                {detailClusterCtx.entry.grossShareCents != null ? (
                  <p>
                    <span className='text-gray-500'>Gross share:</span> {eur(detailClusterCtx.entry.grossShareCents)}
                  </p>
                ) : null}
                {detailClusterCtx.entry.additionalFeesShareCents != null &&
                Number(detailClusterCtx.entry.additionalFeesShareCents) > 0 ? (
                  <p>
                    <span className='text-gray-500'>Additional fees share:</span>{' '}
                    {eur(detailClusterCtx.entry.additionalFeesShareCents)}
                  </p>
                ) : null}
                <p>
                  <span className='text-gray-500'>Net payout:</span>{' '}
                  <span className={josefinSemiBold.className}>{eur(detailClusterCtx.entry.netPayoutCents || 0)}</span>
                </p>
                <p className='capitalize'>
                  <span className='text-gray-500'>Supply:</span> {String(detailClusterCtx.entry.supplyStatus || 'pending')}
                </p>
                <p className='capitalize'>
                  <span className='text-gray-500'>Transfer:</span> {String(detailClusterCtx.entry.payout?.status || 'none')}
                </p>
              </div>
              <div>
                <h3 className={`text-sm text-gray-900 mb-2 ${josefinSemiBold.className}`}>Delivery (ops)</h3>
                {clusterDeliveryLines(detailClusterCtx.cluster.purchase?.deliveryDestination).length > 0 ? (
                  <div
                    className={`text-sm text-gray-800 space-y-0.5 border border-emerald-100 rounded-lg p-3 bg-emerald-50/50 ${josefinRegular.className}`}>
                    {clusterDeliveryLines(detailClusterCtx.cluster.purchase?.deliveryDestination).map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                ) : (
                  <p
                    className={`text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 ${josefinRegular.className}`}>
                    Ops has not set a delivery address yet. They can add it under Products &amp; Clusters → cluster detail.
                  </p>
                )}
              </div>
              {detailClusterCtx.cluster.purchase?.paidAt &&
              String(detailClusterCtx.entry.supplyStatus || 'pending') === 'pending' ? (
                <button
                  type='button'
                  disabled={busy === `cluster:${detailClusterCtx.cluster._id}:${detailClusterCtx.entry._id}`}
                  onClick={() => runClusterSupply(String(detailClusterCtx.cluster._id), String(detailClusterCtx.entry._id))}
                  className={`text-sm bg-brand-green text-white rounded-lg px-3 py-2 disabled:opacity-50 ${josefinSemiBold.className}`}>
                  {busy === `cluster:${detailClusterCtx.cluster._id}:${detailClusterCtx.entry._id}`
                    ? 'Updating…'
                    : 'Mark delivered'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {invoiceRow && (
        <div className='fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4'>
          <div className='bg-white rounded-lg border border-gray-200 p-4 max-w-md w-full shadow max-h-[90vh] overflow-y-auto'>
            <div className='flex items-center justify-between mb-2'>
              <h3 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>Review &amp; send invoice</h3>
              <button
                type='button'
                onClick={() => setInvoiceRow(null)}
                className='text-gray-500 hover:text-gray-800 p-1'
                aria-label='Close'>
                <X className='w-5 h-5' />
              </button>
            </div>
            <p className={`text-sm text-gray-600 mb-3 ${josefinRegular.className}`}>
              {invoiceRow.productName || 'Product'} · {invoiceVol} kg @ €{primaryUnitPrice(invoiceRow).toFixed(2)}/kg
            </p>
            <label className={`block text-sm text-gray-700 mb-1 ${josefinSemiBold.className}`}>Additional fees (€)</label>
            <input
              type='text'
              inputMode='decimal'
              placeholder='0.00'
              value={additionalFeesEuros}
              onChange={(e) => setAdditionalFeesEuros(e.target.value)}
              className='w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-2'
            />
            <label className={`block text-sm text-gray-700 mb-1 ${josefinSemiBold.className}`}>Label for buyer</label>
            <input
              value={additionalFeesNote}
              onChange={(e) => setAdditionalFeesNote(e.target.value)}
              className='w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-2'
              placeholder='e.g. Delivery'
            />
            <p className={`text-xs text-gray-500 mb-3 ${josefinRegular.className}`}>
              Added to the buyer total. Platform fee stays 10% of the product line only.
            </p>
            <div className={`text-sm space-y-2 border border-gray-100 rounded-lg p-3 mb-3 ${josefinRegular.className}`}>
              <div className='flex justify-between'>
                <span className='text-gray-600'>Product subtotal</span>
                <span>{eur(preview.subtotalCents)}</span>
              </div>
              {preview.additionalFeesCents > 0 ? (
                <div className='flex justify-between'>
                  <span className='text-gray-600'>{additionalFeesNote.trim() || 'Additional fees'}</span>
                  <span>{eur(preview.additionalFeesCents)}</span>
                </div>
              ) : null}
              <div className='flex justify-between'>
                <span className='text-gray-600'>Platform fee (10% of product)</span>
                <span>{eur(preview.platformFeeCents)}</span>
              </div>
              <div className='flex justify-between font-medium border-t border-gray-100 pt-2'>
                <span>Buyer total</span>
                <span>{eur(preview.totalCents)}</span>
              </div>
            </div>
            <div className='flex justify-end gap-2'>
              <button type='button' onClick={() => setInvoiceRow(null)} className='text-sm border border-gray-300 rounded px-3 py-1'>
                Cancel
              </button>
              <button
                type='button'
                disabled={busy === asMongoIdString(invoiceRow._id) || preview.subtotalCents <= 0}
                onClick={submitInvoice}
                className='text-sm bg-brand-green text-white rounded px-3 py-1 disabled:opacity-50'>
                {busy === asMongoIdString(invoiceRow._id) ? 'Sending…' : 'Send invoice to buyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelPaidCtx && (
        <div className='fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4'>
          <div className='bg-white rounded-lg border border-gray-200 p-4 max-w-md w-full shadow'>
            <h3 className={`text-lg text-gray-900 mb-2 ${josefinSemiBold.className}`}>Cancel paid order</h3>
            <p className={`text-sm text-gray-600 mb-2 ${josefinRegular.className}`}>
              The buyer has already paid. Give a short reason for ops — they will be notified by email and can assign
              another producer if needed.
            </p>
            <textarea
              value={cancelPaidReason}
              onChange={(e) => setCancelPaidReason(e.target.value)}
              rows={4}
              placeholder='Reason for cancellation…'
              className='w-full border border-gray-300 rounded px-2 py-1 text-sm mb-3'
            />
            <div className='flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => {
                  setCancelPaidCtx(null);
                  setCancelPaidReason('');
                }}
                className='text-sm border border-gray-300 rounded px-3 py-1'>
                Back
              </button>
              <button
                type='button'
                disabled={busy === cancelPaidCtx.rowId || !cancelPaidReason.trim()}
                onClick={async () => {
                  const id = cancelPaidCtx.rowId;
                  const reason = cancelPaidReason.trim();
                  if (!reason) return;
                  await run(id, () => buyerRequestAPI.updateTradeFulfillment(id, 'cancelled', { reason }));
                  setCancelPaidCtx(null);
                  setCancelPaidReason('');
                }}
                className='text-sm bg-red-600 text-white rounded px-3 py-1 disabled:opacity-50'>
                {busy === cancelPaidCtx.rowId ? 'Cancelling…' : 'Confirm cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {declineCtx && (
        <div className='fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4'>
          <div className='bg-white rounded-lg border border-gray-200 p-4 max-w-md w-full shadow'>
            <h3 className={`text-lg text-gray-900 mb-2 ${josefinSemiBold.className}`}>Decline allocation</h3>
            <p className={`text-sm text-gray-600 mb-2 ${josefinRegular.className}`}>Optional message for the buyer:</p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
              className='w-full border border-gray-300 rounded px-2 py-1 text-sm mb-3'
            />
            <div className='flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => {
                  setDeclineCtx(null);
                  setDeclineReason('');
                }}
                className='text-sm border border-gray-300 rounded px-3 py-1'>
                Cancel
              </button>
              <button
                type='button'
                disabled={busy === asMongoIdString(declineCtx.requestId)}
                onClick={submitDecline}
                className='text-sm bg-red-600 text-white rounded px-3 py-1 disabled:opacity-50'>
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailClusterTimeline({ cluster, entry }: { cluster: any; entry: any }) {
  const paid = !!cluster.purchase?.paidAt;
  const supply = String(entry.supplyStatus || 'pending');
  const payout = String(entry.payout?.status || 'none');
  const buyerOk = String(cluster.purchase?.buyerReceipt || 'none') === 'received_ok';
  const steps = [
    { key: 'paid', label: 'Buyer paid', done: paid },
    { key: 'ship', label: 'Ship / deliver', done: ['delivered', 'verified', 'accepted'].includes(supply) },
    { key: 'ops', label: 'Ops verified', done: ['verified', 'accepted'].includes(supply) },
    { key: 'payout', label: 'Your payout', done: payout === 'completed' },
    { key: 'buyer', label: 'Buyer confirmed', done: buyerOk },
  ];
  return (
    <div>
      <h3 className={`text-sm text-gray-900 mb-3 ${josefinSemiBold.className}`}>Timeline</h3>
      <p className={`text-xs text-gray-500 mb-2 ${josefinRegular.className}`}>Paid → Deliver → Verify → Payout → Buyer receipt</p>
      <div className='flex flex-wrap gap-2'>
        {steps.map((s) => (
          <div
            key={s.key}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
              s.done ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-gray-50 border-gray-200 text-gray-500'
            } ${josefinSemiBold.className}`}>
            {s.done ? <Check className='w-3.5 h-3.5 shrink-0' /> : <Circle className='w-3.5 h-3.5 shrink-0' />}
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailIssueSection({ row }: { row: any }) {
  const t = row.trade || {};
  const buyerMsg = String(t.buyerReceiptNotes || '').trim();
  const resolution = String(t.issueResolutionNote || '').trim();
  if (!buyerMsg && !resolution && t.buyerReceipt !== 'received_issues') return null;
  return (
    <div className='rounded-xl border border-amber-100 bg-amber-50/40 p-4 space-y-3'>
      <h3 className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>Issue &amp; resolution</h3>
      {buyerMsg ? (
        <div>
          <p className={`text-xs text-gray-500 mb-0.5 ${josefinSemiBold.className}`}>Buyer report</p>
          <p className={`text-sm text-gray-800 whitespace-pre-wrap ${josefinRegular.className}`}>{buyerMsg}</p>
        </div>
      ) : null}
      {resolution ? (
        <div>
          <p className={`text-xs text-gray-500 mb-0.5 ${josefinSemiBold.className}`}>Kewve resolution</p>
          <p className={`text-sm text-gray-800 whitespace-pre-wrap ${josefinRegular.className}`}>{resolution}</p>
        </div>
      ) : null}
      {t.issuesNeedAdmin ? (
        <p className={`text-xs text-amber-800 ${josefinRegular.className}`}>Awaiting review from Kewve ops.</p>
      ) : null}
    </div>
  );
}

function DetailTimeline({ row, uid }: { row: any; uid: string }) {
  const t = row.trade || {};
  const inv = t.invoice;
  const perProducer = tradeUsesPerProducerResponses(row);
  const active = activeAllocations(row);
  const myLines = uid ? active.filter((a: any) => asMongoIdString(a.producerId) === uid) : [];
  const myAccepted =
    perProducer && myLines.length
      ? myLines.every((l: any) => String(l.producerResponse || 'pending') === 'accepted')
      : (t.producerDecision || 'pending') === 'accepted';

  const steps = [
    { key: 'accepted', label: 'Accepted', done: myAccepted || t.producerDecision === 'accepted' },
    { key: 'invoice', label: 'Invoiced', done: !!inv?.sentAt },
    { key: 'paid', label: 'Paid', done: !!inv?.paidAt },
    {
      key: 'delivered',
      label: 'Delivered',
      done: ['delivered', 'completed'].includes(String(t.fulfillmentStatus || '')),
    },
    {
      key: 'closed',
      label: 'Closed',
      done: !!t.transactionClosed || t.buyerReceipt === 'received_ok',
    },
  ];

  return (
    <div>
      <h3 className={`text-sm text-gray-900 mb-3 ${josefinSemiBold.className}`}>Timeline</h3>
      <p className={`text-xs text-gray-500 mb-2 ${josefinRegular.className}`}>Accepted → Invoiced → Paid → Delivered → Closed</p>
      <div className='flex flex-wrap gap-2'>
        {steps.map((s) => (
          <div
            key={s.key}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
              s.done ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-gray-50 border-gray-200 text-gray-500'
            } ${josefinSemiBold.className}`}>
            {s.done ? <Check className='w-3.5 h-3.5 shrink-0' /> : <Circle className='w-3.5 h-3.5 shrink-0' />}
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailPipeline({ row, uid }: { row: any; uid: string }) {
  const t = row.trade || {};
  const perProducer = tradeUsesPerProducerResponses(row);
  const active = activeAllocations(row);
  const inv = t.invoice;
  const remKg = Number(row.matchPlan?.remainingVolumeKg ?? 0);

  return (
    <div className='space-y-4'>
      <h3 className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>Pipeline</h3>
      <div className={`text-sm space-y-2 ${josefinRegular.className}`}>
        <p>
          <span className='text-gray-500'>Deal type:</span>{' '}
          <span className={josefinSemiBold.className}>{sourcingDealLabel(row)}</span>
        </p>
        <p>
          <span className='text-gray-500'>Match status:</span>{' '}
          <span className='capitalize'>{row.status || '—'}</span>
          {row.fulfillmentMode ? ` · ${row.fulfillmentMode}` : ''}
        </p>
        {remKg > 0 ? (
          <p className='text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1'>
            {remKg.toLocaleString()} kg still unallocated on this order
          </p>
        ) : null}
        {perProducer ? (
          <div>
            <p className='font-medium text-gray-800 mb-1'>Your allocation(s)</p>
            <ul className='list-disc list-inside space-y-1 text-gray-700'>
              {active.map((a: any, i: number) => (
                <li key={`${asMongoIdString(a.productId) || i}-${i}`}>
                  <span className='text-gray-900'>{a.productName || 'Listing'}</span>:{' '}
                  <span className='capitalize'>{a.producerResponse || 'pending'}</span>
                  {a.fulfillmentStatus && String(a.fulfillmentStatus) !== 'none' ? (
                    <span className='text-gray-500'> · {String(a.fulfillmentStatus).replace(/_/g, ' ')}</span>
                  ) : null}
                  {a.producerResponse === 'declined' && a.declinedReason ? (
                    <span className='text-gray-500'> — {a.declinedReason}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>
            <span className='text-gray-500'>Decision:</span> <span className='capitalize'>{t.producerDecision || 'pending'}</span>
          </p>
        )}
        {!isAggregationStyleRow(row) && deliveryAddressLines(row.deliveryAddress).length > 0 ? (
          <div className='border border-emerald-100 rounded-lg p-3 space-y-1.5 bg-emerald-50/50'>
            <p className={`text-gray-900 ${josefinSemiBold.className}`}>Buyer delivery</p>
            <div className={`text-sm text-gray-800 space-y-0.5 ${josefinRegular.className}`}>
              {deliveryAddressLines(row.deliveryAddress).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>
              Single-supplier order — ship to this address unless ops agrees otherwise.
            </p>
          </div>
        ) : null}
        {String(row.otherInformation || '').trim() ? (
          <div className='border border-sky-100 rounded-lg p-3 space-y-1.5 bg-sky-50/50'>
            <p className={`text-gray-900 ${josefinSemiBold.className}`}>Buyer additional information</p>
            <p className={`text-sm text-gray-800 whitespace-pre-wrap break-all ${josefinRegular.className}`}>
              {String(row.otherInformation)}
            </p>
          </div>
        ) : null}
        <div className='border border-gray-100 rounded-lg p-3 space-y-1 bg-gray-50/80'>
          <p className={josefinSemiBold.className}>Invoice</p>
          {inv?.sentAt ? (
            <>
              <p>
                {inv
                  ? `${eur(inv.subtotalCents)}${Number(inv.additionalFeesCents) > 0 ? ` + ${eur(inv.additionalFeesCents)}` : ''} + fee → ${eur(inv.totalCents)}`
                  : '—'}
              </p>
              <p className='capitalize'>{inv.paidAt ? 'Paid' : 'Unpaid'}</p>
            </>
          ) : (
            <p className='text-gray-600'>Invoice not sent yet</p>
          )}
        </div>
        <p className='capitalize'>
          <span className='text-gray-500'>Fulfillment:</span> {t.fulfillmentStatus || 'none'}
        </p>
        <p className='capitalize'>
          <span className='text-gray-500'>Buyer receipt:</span>{' '}
          {t.buyerReceipt && t.buyerReceipt !== 'none' ? String(t.buyerReceipt).replace(/_/g, ' ') : '—'}
        </p>
        {tradeClosedForProducerView(row, t) ? (
          <p className='text-amber-800 text-sm'>This trade is closed for your view.</p>
        ) : null}
      </div>
    </div>
  );
}

function DetailActions({
  row,
  uid,
  busy,
  run,
  setDeclineCtx,
  openInvoiceModal,
  setCancelPaidCtx,
}: {
  row: any;
  uid: string;
  busy: string | null;
  run: (id: string, fn: () => Promise<any>) => Promise<void>;
  setDeclineCtx: (v: DeclineCtx) => void;
  openInvoiceModal: (row: any) => void;
  setCancelPaidCtx: (v: { rowId: string } | null) => void;
}) {
  const rowId = requestDocumentId(row);
  const t = row.trade || {};
  const perProducer = tradeUsesPerProducerResponses(row);
  const active = activeAllocations(row);
  const myLines = uid ? active.filter((a: any) => asMongoIdString(a.producerId) === uid) : [];
  const myAcceptedLines = myLines.filter((a: any) => String(a.producerResponse || 'pending') === 'accepted');
  const closed = tradeClosedForProducerView(row, t);
  const decision = t.producerDecision || 'pending';
  const canAct = canActLeadOrSole(row, uid);
  const usePrimaryStyleAcceptDecline =
    canAct && !perProducer && decision === 'pending' && row.status === 'matched' && !closed;
  const usePerLineAcceptDecline =
    perProducer &&
    myLines.length > 0 &&
    (row.status === 'matched' || row.status === 'in_review') &&
    !closed &&
    decision === 'pending';
  const inv = t.invoice;
  const paid = !!inv?.paidAt;
  const sent = !!inv?.sentAt;

  return (
    <div>
      <h3 className={`text-sm text-gray-900 mb-2 ${josefinSemiBold.className}`}>Actions</h3>
      <div className={`flex flex-col gap-2 ${josefinRegular.className}`}>
        {usePerLineAcceptDecline
          ? myLines.map((line: any) => {
              const st = String(line.producerResponse || 'pending');
              const needProductId = myLines.length > 1;
              return (
                <div key={asMongoIdString(line.productId) || 'line'} className='border border-gray-100 rounded-lg p-3 space-y-2'>
                  <span className='text-xs text-gray-500 block truncate' title={line.productName}>
                    {line.productName || 'Your line'}
                  </span>
                  {st === 'pending' ? (
                    <div className='flex flex-wrap gap-2'>
                      <button
                        type='button'
                        disabled={busy === rowId}
                        onClick={() =>
                          run(rowId, () =>
                            buyerRequestAPI.producerDecision(rowId, {
                              decision: 'accepted',
                              ...(needProductId ? { productId: asMongoIdString(line.productId) } : {}),
                            })
                          )
                        }
                        className='text-sm border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50'>
                        Accept
                      </button>
                      <button
                        type='button'
                        disabled={busy === rowId}
                        onClick={() =>
                          setDeclineCtx({
                            requestId: rowId,
                            ...(needProductId ? { productId: asMongoIdString(line.productId) } : {}),
                          })
                        }
                        className='text-sm border border-red-200 text-red-700 rounded-lg px-3 py-1.5 hover:bg-red-50 disabled:opacity-50'>
                        Decline
                      </button>
                    </div>
                  ) : (
                    <span className='text-sm text-gray-500 capitalize'>{st}</span>
                  )}
                </div>
              );
            })
          : null}

        {usePrimaryStyleAcceptDecline ? (
          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              disabled={busy === rowId}
              onClick={() => run(rowId, () => buyerRequestAPI.producerDecision(rowId, { decision: 'accepted' }))}
              className='text-sm border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50'>
              Accept
            </button>
            <button
              type='button'
              disabled={busy === rowId}
              onClick={() => setDeclineCtx({ requestId: rowId })}
              className='text-sm border border-red-200 text-red-700 rounded-lg px-3 py-1.5 hover:bg-red-50 disabled:opacity-50'>
              Decline
            </button>
          </div>
        ) : null}

        {perProducer && !myLines.length ? <span className='text-gray-400 text-sm'>No allocation for you</span> : null}
        {!perProducer && !canAct ? <span className='text-gray-400 text-sm'>Primary producer only</span> : null}

        {(perProducer ? myAcceptedLines.length > 0 : canAct && decision === 'accepted') && !closed ? (
          <>
            {isAggregationStyleRow(row) && !sent ? (
              <p className='text-sm text-gray-600'>
                Buyer invoice for aggregate orders is sent by Kewve (admin). You can mark paid and update fulfillment once
                it appears here.
              </p>
            ) : null}
            {!isAggregationStyleRow(row) && !sent ? (
              <button
                type='button'
                disabled={busy === rowId}
                onClick={() => openInvoiceModal(row)}
                className='text-sm border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 w-fit'>
                Send invoice…
              </button>
            ) : null}
            {sent && !paid ? (
              <p className='text-sm text-gray-600'>Waiting for buyer payment via checkout link.</p>
            ) : null}
            {paid && !closed ? (
              perProducer ? (
                <div className='space-y-2'>
                  {myAcceptedLines.map((line: any) => {
                    const lineStatus = (line.fulfillmentStatus || 'none') as Fulfillment;
                    const needProductId = myAcceptedLines.length > 1;
                    return (
                      <div
                        key={`fulfillment-${asMongoIdString(line.productId) || 'line'}`}
                        className='border border-gray-100 rounded-lg p-3 space-y-2'>
                        <span className='text-xs text-gray-500 block truncate' title={line.productName}>
                          {line.productName || 'Your line'} · Fulfillment
                        </span>
                        <select
                          value={lineStatus}
                          disabled={busy === rowId}
                          onChange={(e) => {
                            const v = e.target.value as Fulfillment;
                            if (v === 'cancelled' && paid) {
                              setCancelPaidCtx({ rowId });
                              return;
                            }
                            run(rowId, () =>
                              buyerRequestAPI.updateTradeFulfillment(rowId, v, {
                                ...(needProductId ? { productId: asMongoIdString(line.productId) } : {}),
                              })
                            );
                          }}
                          className='text-sm border border-gray-300 rounded-lg px-2 py-1.5 max-w-full'>
                          <option value='none'>Fulfillment…</option>
                          <option value='processing'>Processing</option>
                          <option value='dispatched'>Dispatched</option>
                          <option value='delivered'>Delivered</option>
                          <option value='completed'>Completed</option>
                          <option value='cancelled'>Cancelled</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <select
                  value={(t.fulfillmentStatus || 'none') as Fulfillment}
                  disabled={busy === rowId}
                  onChange={(e) => {
                    const v = e.target.value as Fulfillment;
                    if (v === 'cancelled' && paid) {
                      setCancelPaidCtx({ rowId });
                      return;
                    }
                    run(rowId, () => buyerRequestAPI.updateTradeFulfillment(rowId, v));
                  }}
                  className='text-sm border border-gray-300 rounded-lg px-2 py-1.5 max-w-full'>
                  <option value='none'>Fulfillment…</option>
                  <option value='processing'>Processing</option>
                  <option value='dispatched'>Dispatched</option>
                  <option value='delivered'>Delivered</option>
                  <option value='completed'>Completed</option>
                  <option value='cancelled'>Cancelled</option>
                </select>
              )
            ) : null}
          </>
        ) : null}

        {!perProducer && decision === 'declined' && !usePerLineAcceptDecline ? (
          <span className='text-sm text-gray-500'>Declined{t.declinedReason ? `: ${t.declinedReason}` : ''}</span>
        ) : null}
      </div>
    </div>
  );
}
