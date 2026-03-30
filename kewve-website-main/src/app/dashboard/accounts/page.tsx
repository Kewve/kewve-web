'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Check,
  ChevronRight,
  Circle,
  Info,
  Layers,
  Package,
  Wallet,
  X,
} from 'lucide-react';
import { josefinRegular, josefinSemiBold } from '@/utils';
import { aggregationAPI, buyerRequestAPI } from '@/lib/api';
import { buyerRequestRefSuffix, displayIdSuffix } from '@/lib/mongoId';
import { useAuth } from '@/contexts/AuthContext';

function eur(cents: number) {
  return `€${(Number(cents || 0) / 100).toFixed(2)}`;
}

/** Single-supplier: matches backend — product subtotal + delivery = buyer total minus platform fee. */
function singleInvoiceProducerPayoutCents(inv: any): number {
  const total = Math.round(Number(inv?.totalCents || 0));
  const platform = Math.round(Number(inv?.platformFeeCents || 0));
  if (Number.isFinite(total) && total > 0 && Number.isFinite(platform)) {
    return Math.max(0, total - platform);
  }
  const sub = Math.max(0, Math.round(Number(inv?.subtotalCents || 0)));
  const add = Math.max(0, Math.round(Number(inv?.additionalFeesCents || 0)));
  return sub + add;
}

function producerPayoutPreview(row: any): {
  grossShareCents: number;
  additionalFeesShareCents: number;
  payoutCents: number;
  payoutStatus: 'none' | 'pending' | 'completed' | 'failed';
  errorMessage?: string;
} {
  const p = row?.trade?.producerPayoutPreview;
  if (p && typeof p === 'object') {
    return {
      grossShareCents: Number(p.grossShareCents || 0),
      additionalFeesShareCents: Number(p.additionalFeesShareCents || 0),
      payoutCents: Number(p.payoutCents || 0),
      payoutStatus: String(p.payoutStatus || 'none') as 'none' | 'pending' | 'completed' | 'failed',
      errorMessage: p.errorMessage ? String(p.errorMessage) : undefined,
    };
  }
  const inv = row?.trade?.invoice || {};
  return {
    grossShareCents: Number(inv.subtotalCents || 0),
    additionalFeesShareCents: Math.max(0, Math.round(Number(inv.additionalFeesCents || 0))),
    payoutCents: singleInvoiceProducerPayoutCents(inv),
    payoutStatus: String(row?.trade?.payout?.status || 'none') as 'none' | 'pending' | 'completed' | 'failed',
    errorMessage: row?.trade?.payout?.errorMessage ? String(row.trade.payout.errorMessage) : undefined,
  };
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

function isAggregationStyleRow(row: any): boolean {
  if (row.fulfillmentMode === 'aggregation') return true;
  return activeAllocations(row).length > 1;
}

function tradeUsesPerProducerResponses(row: any): boolean {
  const planAllocs = row?.matchPlan?.allocations || [];
  const activeCount = planAllocs.filter((a: any) => Number(a.allocatedKg || 0) > 0).length;
  return planAllocs.length > 0 && (row.fulfillmentMode === 'aggregation' || activeCount > 1);
}

function totalVolumeRequestedKg(row: any): number {
  return Number(row?.volumeKg || 0);
}

function totalVolumeDeliveredKg(row: any): number {
  const t = row?.trade || {};
  if (!tradeUsesPerProducerResponses(row)) {
    return ['delivered', 'completed'].includes(String(t?.fulfillmentStatus || '')) ? Number(row?.volumeKg || 0) : 0;
  }
  const allocs = activeAllocations(row).filter((a: any) => String(a?.producerResponse || 'pending') === 'accepted');
  return allocs.reduce((sum: number, a: any) => {
    const done = ['delivered', 'completed'].includes(String(a?.fulfillmentStatus || 'none'));
    return sum + (done ? Number(a?.allocatedKg || 0) : 0);
  }, 0);
}

/** Matches trade-operations: hide further producer actions when trade is finished for this view. */
function tradeClosedForProducerView(row: any, t: any): boolean {
  const agg = tradeUsesPerProducerResponses(row);
  return (
    !!t.transactionClosed ||
    (!agg && t.producerDecision === 'declined') ||
    t.buyerReceipt === 'received_ok' ||
    t.fulfillmentStatus === 'cancelled' ||
    t.fulfillmentStatus === 'completed'
  );
}

/** Primary producer OR any positive allocation (aggregation suppliers). */
function producerInvolvedInSourcingRequest(row: any, uid: string): boolean {
  if (!uid) return false;
  if (String(row.producerId) === uid) return true;
  const allocs = row?.matchPlan?.allocations || [];
  return allocs.some((a: any) => String(a.producerId) === uid && Number(a.allocatedKg || 0) > 0);
}

type TransactionFilter = 'all' | 'paid' | 'pending' | 'issues';

function isTerminalPaidOut(row: any): boolean {
  const t = row.trade;
  return t?.buyerReceipt === 'received_ok' && producerPayoutPreview(row).payoutStatus === 'completed';
}

function matchesSourcingFilter(row: any, f: TransactionFilter): boolean {
  const t = row.trade || {};
  const inv = t.invoice;
  if (f === 'all') return true;
  if (f === 'issues') return !!(t.issuesNeedAdmin || t.buyerReceipt === 'received_issues');
  if (f === 'paid') return !!inv?.paidAt;
  if (f === 'pending') {
    if (t.issuesNeedAdmin || t.buyerReceipt === 'received_issues') return false;
    return !isTerminalPaidOut(row);
  }
  return true;
}

type StatusTier = 'success' | 'warning' | 'danger' | 'muted';

function sourcingStatusMeta(row: any): { tier: StatusTier; label: string } {
  const t = row.trade || {};
  const inv = t.invoice;
  const payoutStatus = producerPayoutPreview(row).payoutStatus;
  if (t.issuesNeedAdmin || t.buyerReceipt === 'received_issues') {
    return { tier: 'danger', label: 'Action needed' };
  }
  if (inv?.paidAt && t.buyerReceipt === 'received_ok' && payoutStatus === 'completed') {
    return { tier: 'success', label: 'Paid out' };
  }
  if (inv?.paidAt && t.buyerReceipt === 'received_ok' && payoutStatus === 'failed') {
    return { tier: 'danger', label: 'Transfer failed' };
  }
  if (inv?.paidAt && t.buyerReceipt === 'received_ok') {
    return { tier: 'warning', label: 'Transfer pending' };
  }
  if (inv?.paidAt && t.buyerReceipt === 'none' && ['delivered', 'completed'].includes(String(t.fulfillmentStatus || ''))) {
    return { tier: 'warning', label: 'Awaiting receipt' };
  }
  if (inv?.paidAt) {
    return { tier: 'warning', label: 'Awaiting delivery' };
  }
  if (inv?.sentAt && !inv?.paidAt) {
    return { tier: 'warning', label: 'Awaiting payment' };
  }
  return { tier: 'muted', label: 'In progress' };
}

function statusBadgeClass(tier: StatusTier): string {
  switch (tier) {
    case 'success':
      return 'bg-emerald-50 text-emerald-900 border-emerald-200';
    case 'warning':
      return 'bg-amber-50 text-amber-900 border-amber-200';
    case 'danger':
      return 'bg-red-50 text-red-900 border-red-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

function SourcingTimeline({ row }: { row: any }) {
  const t = row.trade || {};
  const inv = t.invoice;
  const payoutStatus = producerPayoutPreview(row).payoutStatus;
  const steps = [
    { key: 'acc', label: 'Accepted', done: (t.producerDecision || 'pending') === 'accepted' },
    { key: 'inv', label: 'Invoiced', done: !!inv?.sentAt },
    { key: 'paid', label: 'Paid', done: !!inv?.paidAt },
    { key: 'xfer', label: 'Transferred', done: payoutStatus === 'completed' },
  ];
  return (
    <div className='mt-3'>
      <p className={`text-[10px] uppercase tracking-wide text-gray-400 mb-1.5 ${josefinSemiBold.className}`}>Timeline</p>
      <div className='flex flex-wrap items-center gap-1 text-[11px] text-gray-600'>
        {steps.map((s, i) => (
          <span key={s.key} className='inline-flex items-center gap-0.5'>
            {i > 0 ? <span className='text-gray-300 mx-0.5'>→</span> : null}
            <span className='inline-flex items-center gap-0.5'>
              {s.done ? (
                <Check className='w-3 h-3 text-emerald-600 shrink-0' aria-hidden />
              ) : (
                <Circle className='w-3 h-3 text-gray-300 shrink-0' aria-hidden />
              )}
              <span className={s.done ? 'text-gray-800' : 'text-gray-400'}>{s.label}</span>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function MoneyFlowStrip({ inv, yourPayoutCents }: { inv: any; yourPayoutCents: number }) {
  if (!inv?.sentAt) return null;
  const buyer = Number(inv.totalCents || 0);
  const fee = Number(inv.platformFeeCents || 0);
  const yours = Number(yourPayoutCents || 0);
  return (
    <div
      className={`mt-3 rounded-lg border border-gray-100 bg-gray-50/90 px-3 py-2.5 ${josefinRegular.className}`}>
      <p className={`text-[10px] uppercase tracking-wide text-gray-400 mb-2 ${josefinSemiBold.className}`}>
        Money flow
      </p>
      <div className='flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm'>
        <div className='min-w-0 flex-1 text-center sm:text-left'>
          <p className='text-gray-500'>Buyer paid</p>
          <p className={`text-gray-900 ${josefinSemiBold.className}`}>{eur(buyer)}</p>
        </div>
        <ArrowRight className='w-4 h-4 text-gray-300 hidden sm:block shrink-0' aria-hidden />
        <div className='min-w-0 flex-1 text-center'>
          <p className='text-gray-500'>Platform fee</p>
          <p className='text-gray-800'>{eur(fee)}</p>
        </div>
        <ArrowRight className='w-4 h-4 text-gray-300 hidden sm:block shrink-0' aria-hidden />
        <div className='min-w-0 flex-1 text-center sm:text-right'>
          <p className='text-gray-500'>Your payout</p>
          <p className={`text-emerald-800 ${josefinSemiBold.className}`}>{eur(yours)}</p>
        </div>
      </div>
    </div>
  );
}

const FILTER_TABS: { id: TransactionFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'paid', label: 'Paid' },
  { id: 'pending', label: 'Pending' },
  { id: 'issues', label: 'Issues' },
];

function clusterEntryMatchesFilter(entry: any, f: TransactionFilter): boolean {
  const tfer = String(entry?.payout?.status || '').toLowerCase();
  const paid = tfer === 'completed';
  const failed = tfer === 'failed';
  const hasErr = !!entry?.payout?.errorMessage || failed;
  if (f === 'all') return true;
  if (f === 'issues') return hasErr;
  if (f === 'paid') return paid;
  if (f === 'pending') {
    if (hasErr) return false;
    return !paid;
  }
  return true;
}

function clusterEmptyPlaceholderMatchesFilter(f: TransactionFilter): boolean {
  if (f === 'paid' || f === 'issues') return false;
  return true;
}

type UnifiedTxItem =
  | { kind: 'sourcing'; row: any; sortAt: number }
  | { kind: 'cluster'; clusterRow: any; entry: any; entryIdx: number; sortAt: number }
  | { kind: 'cluster-empty'; clusterRow: any; sortAt: number };

function buildUnifiedTransactions(
  mine: any[],
  clusterSettlements: any[],
  filter: TransactionFilter
): UnifiedTxItem[] {
  const list: UnifiedTxItem[] = [];
  for (const r of mine) {
    if (!matchesSourcingFilter(r, filter)) continue;
    const sortAt = new Date(
      (r as { updatedAt?: string; createdAt?: string }).updatedAt || (r as { createdAt?: string }).createdAt || 0
    ).getTime();
    list.push({ kind: 'sourcing', row: r, sortAt });
  }
  for (const cr of clusterSettlements) {
    const entries = (cr.settlement?.entries || []) as any[];
    const sortAt = new Date((cr as { updatedAt?: string }).updatedAt || 0).getTime();
    if (!entries.length) {
      if (clusterEmptyPlaceholderMatchesFilter(filter)) {
        list.push({ kind: 'cluster-empty', clusterRow: cr, sortAt });
      }
      continue;
    }
    entries.forEach((e: any, entryIdx: number) => {
      if (!clusterEntryMatchesFilter(e, filter)) return;
      list.push({ kind: 'cluster', clusterRow: cr, entry: e, entryIdx, sortAt });
    });
  }
  list.sort((a, b) => b.sortAt - a.sortAt);
  return list;
}

type AccountsDetailState =
  | { kind: 'sourcing'; row: any }
  | { kind: 'cluster'; clusterRow: any; entry: any }
  | { kind: 'cluster-empty'; clusterRow: any };

function AccountsSourcingDetailBody({ row }: { row: any }) {
  const t = row.trade || {};
  const inv = t.invoice;
  const meta = sourcingStatusMeta(row);
  const preview = producerPayoutPreview(row);
  const share = inv ? preview.payoutCents : 0;
  const requestedKg = totalVolumeRequestedKg(row);
  const deliveredKg = totalVolumeDeliveredKg(row);
  const remKg = Number(row.matchPlan?.remainingVolumeKg ?? 0);
  const perProducer = activeAllocations(row).length > 1 || row.fulfillmentMode === 'aggregation';
  const closedForView = tradeClosedForProducerView(row, t);

  return (
    <div className='space-y-5'>
      <div className='flex flex-wrap items-center gap-2'>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${statusBadgeClass(meta.tier)} ${josefinSemiBold.className}`}>
          {meta.label}
        </span>
      </div>

      {closedForView ? (
        <p className={`text-amber-800 text-sm ${josefinRegular.className}`}>This trade is closed for your view.</p>
      ) : null}

      <div className={`text-sm space-y-2 ${josefinRegular.className}`}>
        <p>
          <span className='text-gray-500'>Buyer:</span>{' '}
          <span className='text-gray-900'>{row.buyerName || '—'}</span>
          {row.buyerEmail ? (
            <span className='block text-xs text-gray-500 mt-0.5'>{row.buyerEmail}</span>
          ) : null}
        </p>
        <p>
          <span className='text-gray-500'>Volume:</span>{' '}
          <span className='tabular-nums'>{Number(row.volumeKg || 0).toLocaleString()} kg</span>
        </p>
        <p>
          <span className='text-gray-500'>Total volume requested:</span>{' '}
          <span className='tabular-nums'>{requestedKg.toLocaleString()} kg</span>
        </p>
        <p>
          <span className='text-gray-500'>Total volume delivered:</span>{' '}
          <span className='tabular-nums'>{deliveredKg.toLocaleString()} kg</span>
        </p>
        {row.market ? (
          <p>
            <span className='text-gray-500'>Market:</span> {row.market}
          </p>
        ) : null}
        {row.timeline ? (
          <p>
            <span className='text-gray-500'>Timeline:</span> {row.timeline}
          </p>
        ) : null}
        {row.packagingFormat ? (
          <p>
            <span className='text-gray-500'>Packaging:</span> {row.packagingFormat}
          </p>
        ) : null}
        <p>
          <span className='text-gray-500'>Match status:</span>{' '}
          <span className='capitalize'>{row.status || '—'}</span>
          {row.fulfillmentMode ? ` · ${row.fulfillmentMode}` : ''}
        </p>
        {remKg > 0 ? (
          <p className='text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 text-xs'>
            {remKg.toLocaleString()} kg still unallocated on this order
          </p>
        ) : null}
        {perProducer ? (
          <div>
            <p className={`text-gray-800 mb-1 ${josefinSemiBold.className}`}>Allocations</p>
            <ul className='list-disc list-inside space-y-1 text-gray-700 text-sm'>
              {activeAllocations(row).map((a: any, i: number) => (
                <li key={i}>
                  <span className='text-gray-900'>{a.productName || 'Listing'}</span>:{' '}
                  <span className='capitalize'>{a.producerResponse || 'pending'}</span>
                  {Number(a.allocatedKg || 0) > 0 ? (
                    <span className='text-gray-500'> · {Number(a.allocatedKg).toLocaleString()} kg</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>
            <span className='text-gray-500'>Your decision:</span>{' '}
            <span className='capitalize'>{t.producerDecision || 'pending'}</span>
          </p>
        )}
      </div>

      {!isAggregationStyleRow(row) && deliveryAddressLines(row.deliveryAddress).length > 0 ? (
        <div className='border border-emerald-100 rounded-lg p-3 space-y-1.5 bg-emerald-50/50'>
          <p className={`text-gray-900 ${josefinSemiBold.className}`}>Buyer delivery</p>
          <div className={`text-sm text-gray-800 space-y-0.5 ${josefinRegular.className}`}>
            {deliveryAddressLines(row.deliveryAddress).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      ) : null}

      {inv?.sentAt ? (
        <div className={`grid grid-cols-2 gap-3 text-sm ${josefinRegular.className}`}>
          <div>
            <p className='text-gray-500 text-xs'>Your share</p>
            <p className={`text-gray-900 ${josefinSemiBold.className}`}>{eur(share)}</p>
          </div>
          <div>
            <p className='text-gray-500 text-xs'>Buyer paid</p>
            <p className={`text-gray-900 ${josefinSemiBold.className}`}>{eur(inv.totalCents)}</p>
          </div>
        </div>
      ) : (
        <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Invoice not sent yet.</p>
      )}

      {inv?.sentAt ? <MoneyFlowStrip inv={inv} yourPayoutCents={share} /> : null}

      <SourcingTimeline row={row} />

      <div className={`border border-gray-100 rounded-lg p-3 space-y-2 text-sm ${josefinRegular.className}`}>
        <p className={`${josefinSemiBold.className}`}>Trade status</p>
        <p className='capitalize'>
          <span className='text-gray-500'>Fulfillment:</span> {t.fulfillmentStatus || 'none'}
        </p>
        <p className='capitalize'>
          <span className='text-gray-500'>Buyer receipt:</span>{' '}
          {t.buyerReceipt && t.buyerReceipt !== 'none' ? String(t.buyerReceipt).replace(/_/g, ' ') : '—'}
        </p>
        <p className='capitalize'>
          <span className='text-gray-500'>Payout:</span> {preview.payoutStatus || '—'}
        </p>
        {preview.errorMessage ? <p className='text-red-600 text-xs'>{preview.errorMessage}</p> : null}
        {t.issuesNeedAdmin ? (
          <p className='text-amber-800 text-xs'>This trade is flagged for admin review.</p>
        ) : null}
      </div>
    </div>
  );
}

function AccountsClusterDetailBody({ clusterRow, entry }: { clusterRow: any; entry: any }) {
  const s = clusterRow.settlement || {};
  const p = clusterRow.purchase;
  const supplyOk = String(entry.supplyStatus || '').toLowerCase() === 'accepted';
  const paidOk = String(entry.payout?.status || '').toLowerCase() === 'completed';

  return (
    <div className='space-y-5'>
      <div className={`text-sm space-y-2 ${josefinRegular.className}`}>
        <p>
          <span className='text-gray-500'>Cluster:</span>{' '}
          <span className='font-mono text-xs'>{displayIdSuffix(clusterRow.clusterId)}</span>
        </p>
        <p>
          <span className='text-gray-500'>Product:</span> {clusterRow.productName || '—'}
        </p>
        {s.computedAt ? (
          <p>
            <span className='text-gray-500'>Settlement computed:</span>{' '}
            {new Date(s.computedAt).toLocaleString()}
          </p>
        ) : null}
        {s.buyerVolumeKg != null ? (
          <p>
            <span className='text-gray-500'>Buyer volume:</span>{' '}
            <span className='tabular-nums'>{Number(s.buyerVolumeKg).toLocaleString()} kg</span>
          </p>
        ) : null}
        {s.totalAllocatedKg != null ? (
          <p>
            <span className='text-gray-500'>Total allocated:</span>{' '}
            <span className='tabular-nums'>{Number(s.totalAllocatedKg).toLocaleString()} kg</span>
          </p>
        ) : null}
        {s.subtotalCents != null ? (
          <p>
            <span className='text-gray-500'>Cluster subtotal:</span> {eur(s.subtotalCents)}
          </p>
        ) : null}
        {s.platformFeeCents != null ? (
          <p>
            <span className='text-gray-500'>Platform fee:</span> {eur(s.platformFeeCents)}
          </p>
        ) : null}
        {s.totalPaidCents != null ? (
          <p>
            <span className='text-gray-500'>Buyer paid (cluster):</span> {eur(s.totalPaidCents)}
          </p>
        ) : null}
        {s.market ? (
          <p>
            <span className='text-gray-500'>Market:</span> {s.market}
          </p>
        ) : null}
        {s.timeline ? (
          <p>
            <span className='text-gray-500'>Timeline:</span> {s.timeline}
          </p>
        ) : null}
      </div>

      {p?.paidAt ? (
        <div className={`border border-gray-100 rounded-lg p-3 space-y-1 text-sm ${josefinRegular.className}`}>
          <p className={josefinSemiBold.className}>Purchase</p>
          <p>
            <span className='text-gray-500'>Buyer:</span> {p.buyerName || '—'}
            {p.buyerEmail ? <span className='block text-xs text-gray-500'>{p.buyerEmail}</span> : null}
          </p>
          <p>
            <span className='text-gray-500'>Paid:</span> {new Date(p.paidAt).toLocaleString()}
          </p>
        </div>
      ) : null}

      {deliveryAddressLines(p?.deliveryDestination?.address as Record<string, unknown> | undefined).length > 0 ? (
        <div className='border border-emerald-100 rounded-lg p-3 space-y-1 bg-emerald-50/50 text-sm'>
          <p className={josefinSemiBold.className}>Delivery (ops)</p>
          <p className='text-xs text-gray-500 capitalize'>
            {p?.deliveryDestination?.mode === 'buyer_profile' ? 'Buyer saved address (snapshot)' : 'Custom address'}
          </p>
          {deliveryAddressLines(p?.deliveryDestination?.address as Record<string, unknown> | undefined).map((line, i) => (
            <p key={i} className={josefinRegular.className}>
              {line}
            </p>
          ))}
        </div>
      ) : null}

      <div className='border border-sky-100 rounded-lg p-3 space-y-2 bg-sky-50/40'>
        <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>Your line</p>
        <p className={`text-sm ${josefinRegular.className}`}>
          <span className='text-gray-500'>Allocated:</span>{' '}
          <span className='tabular-nums'>{Number(entry.allocatedKg || 0).toLocaleString()} kg</span>{' '}
          <span className='text-gray-400'>({Number(entry.sharePercent || 0).toFixed(0)}%)</span>
        </p>
        {entry.grossShareCents != null ? (
          <p className={`text-sm ${josefinRegular.className}`}>
            <span className='text-gray-500'>Gross share:</span> {eur(entry.grossShareCents)}
          </p>
        ) : null}
        {entry.adjustmentCents != null && Number(entry.adjustmentCents) !== 0 ? (
          <p className={`text-sm ${josefinRegular.className}`}>
            <span className='text-gray-500'>Adjustment:</span> {eur(entry.adjustmentCents)}
          </p>
        ) : null}
        <p className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>
          Net payout: {eur(entry.netPayoutCents)}
        </p>
        <div className='flex flex-wrap gap-2 pt-1'>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${
              supplyOk ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}>
            Supply: {entry.supplyStatus || 'pending'}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${
              paidOk ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-gray-50 text-gray-800 border-gray-200'
            }`}>
            Transfer: {entry.payout?.status || 'pending'}
          </span>
        </div>
        {entry.payout?.initiatedAt ? (
          <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>
            Initiated: {new Date(entry.payout.initiatedAt).toLocaleString()}
          </p>
        ) : null}
        {entry.payout?.errorMessage ? <p className='text-xs text-red-600'>{entry.payout.errorMessage}</p> : null}
      </div>
    </div>
  );
}

function AccountsClusterEmptyDetailBody({ clusterRow }: { clusterRow: any }) {
  const p = clusterRow.purchase;
  const s = clusterRow.settlement;

  return (
    <div className={`space-y-4 text-sm ${josefinRegular.className}`}>
      <p>
        <span className='text-gray-500'>Cluster:</span>{' '}
        <span className='font-mono text-xs'>{displayIdSuffix(clusterRow.clusterId)}</span>
      </p>
      <p>
        <span className='text-gray-500'>Product:</span> {clusterRow.productName || '—'}
      </p>
      <p className='text-gray-600'>
        No settlement lines yet. After the buyer pays and volumes are allocated to producers, your payout line will appear in
        Transactions.
      </p>
      {p?.paidAt ? (
        <div className='border border-gray-100 rounded-lg p-3 space-y-1'>
          <p className={josefinSemiBold.className}>Latest purchase</p>
          <p>
            Paid {new Date(p.paidAt).toLocaleString()} · {Number(p.volumeKg || 0).toLocaleString()} kg
          </p>
        </div>
      ) : null}
      {s?.computedAt && (!s.entries || s.entries.length === 0) ? (
        <p className='text-xs text-gray-500'>
          Settlement object present (computed {new Date(s.computedAt).toLocaleString()}) but no producer entries yet.
        </p>
      ) : null}
      <p className='pt-2'>
        <Link href='/dashboard/aggregation' className='text-brand-green font-semibold underline underline-offset-2'>
          Open aggregation workspace
        </Link>
      </p>
    </div>
  );
}

export default function ProducerAccountsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [clusterSettlements, setClusterSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all');
  const [detail, setDetail] = useState<AccountsDetailState | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openSourcingDetail = (row: any) => {
    setDetail({ kind: 'sourcing', row });
    setDetailLoading(true);
    buyerRequestAPI
      .getById(String(row._id))
      .then((res) => {
        if (res?.data) setDetail({ kind: 'sourcing', row: res.data });
      })
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await buyerRequestAPI.list();
        setRows(res.data || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load account data.');
      }
      try {
        const cr = await aggregationAPI.getMyClusterSettlements();
        setClusterSettlements(Array.isArray(cr.data) ? cr.data : []);
      } catch {
        setClusterSettlements([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!detail) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [detail]);

  const mine = useMemo(() => {
    const uid = user?.id;
    if (!uid) return [];
    return rows.filter((r) => producerInvolvedInSourcingRequest(r, uid));
  }, [rows, user?.id]);

  const summary = useMemo(() => {
    let eligiblePayout = 0;
    let paidOut = 0;
    let grossBuyerPaid = 0;
    for (const r of mine) {
      const t = r.trade;
      if (!t?.invoice?.paidAt) continue;
      grossBuyerPaid += Number(t.invoice.totalCents || 0);
      const preview = producerPayoutPreview(r);
      const share = preview.payoutCents;
      if (t.buyerReceipt === 'received_ok' && preview.payoutStatus === 'completed') {
        paidOut += share;
      } else if (t.buyerReceipt === 'received_ok' && preview.payoutStatus !== 'completed') {
        eligiblePayout += share;
      }
    }
    return { eligiblePayout, paidOut, grossBuyerPaid };
  }, [mine]);

  const unifiedTransactions = useMemo(
    () => buildUnifiedTransactions(mine, clusterSettlements, transactionFilter),
    [mine, clusterSettlements, transactionFilter]
  );

  const hasAnyTransactionSource = mine.length > 0 || clusterSettlements.length > 0;

  return (
    <div className='max-w-6xl mx-auto px-4 sm:px-6 space-y-10 pb-14'>
      <div className='pt-2'>
        <h1 className={`text-2xl lg:text-3xl text-gray-900 ${josefinSemiBold.className}`}>Accounts</h1>
        <p className={`text-sm text-gray-600 mt-2 max-w-2xl ${josefinRegular.className}`}>
          Payouts, sourcing invoices, and cluster settlements — one place.
        </p>
      </div>

      {/* Primary + secondary metrics */}
      <section className='space-y-4'>
        <div className='rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-white shadow-md shadow-emerald-900/5 p-6 sm:p-8'>
          <div className='flex flex-col sm:items-start gap-6'>
            <div className='flex gap-4'>
              <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800'>
                <Banknote className='w-6 h-6' aria-hidden />
              </div>
              <div>
                <p className={`text-sm text-emerald-900/90 uppercase tracking-wide ${josefinSemiBold.className}`}>
                  Ready for payout
                </p>
                <p className={`text-3xl sm:text-4xl text-gray-900 mt-1 tabular-nums ${josefinSemiBold.className}`}>
                  {eur(summary.eligiblePayout)}
                </p>
                <p className={`text-sm text-gray-600 mt-1 ${josefinRegular.className}`}>Queued for transfer.</p>
                <p className={`text-xs text-gray-600 mt-2 ${josefinRegular.className}`}>
                  Manage payouts in{' '}
                  <Link href='/dashboard/settings' className='text-brand-green font-semibold underline underline-offset-2'>
                    Settings
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <div className='rounded-xl border border-gray-200/90 bg-white p-5 shadow-sm'>
            <div className='flex items-center gap-2 text-gray-500 mb-1'>
              <Wallet className='w-4 h-4' aria-hidden />
              <span className={`text-xs uppercase tracking-wide ${josefinSemiBold.className}`}>Buyer paid (incl. fee)</span>
            </div>
            <p className={`text-2xl text-gray-900 tabular-nums ${josefinSemiBold.className}`}>{eur(summary.grossBuyerPaid)}</p>
          </div>
          <div className='rounded-xl border border-gray-200/90 bg-white p-5 shadow-sm'>
            <div className='flex items-center gap-2 text-gray-500 mb-1'>
              <Package className='w-4 h-4' aria-hidden />
              <span className={`text-xs uppercase tracking-wide ${josefinSemiBold.className}`}>Paid out (your share)</span>
            </div>
            <p className={`text-2xl text-gray-900 tabular-nums ${josefinSemiBold.className}`}>{eur(summary.paidOut)}</p>
          </div>
        </div>
      </section>

      {/* Sourcing + cluster transactions (unified) */}
      <section className='space-y-5'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex items-center gap-2'>
            <Wallet className='w-5 h-5 text-gray-600' aria-hidden />
            <h2 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>Transactions</h2>
          </div>
        </div>

        <p className={`text-sm text-gray-600 mt-1 ${josefinRegular.className}`}>
          Sourcing requests and aggregation cluster payouts in one place. Use filters to focus on status.
        </p>

        <div
          className='flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs text-amber-950'
          title='Connect your Stripe account in Settings so transfers can be sent.'>
          <Info className='w-4 h-4 shrink-0 mt-0.5 opacity-80' aria-hidden />
          <span className={josefinRegular.className}>
            Stripe Connect is required for payouts (sourcing and clusters).{' '}
            <Link href='/dashboard/settings' className='text-brand-green font-semibold underline underline-offset-2'>
              Settings
            </Link>
          </span>
        </div>

        <div className='flex flex-wrap gap-2'>
          {FILTER_TABS.map((tab) => {
            const active = transactionFilter === tab.id;
            return (
              <button
                key={tab.id}
                type='button'
                onClick={() => setTransactionFilter(tab.id)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  active
                    ? 'border-brand-green bg-brand-green text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                } ${josefinSemiBold.className}`}>
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className='rounded-xl border border-gray-100 py-16 text-center text-sm text-gray-500'>Loading…</div>
        ) : !hasAnyTransactionSource ? (
          <div className='rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-14 text-center text-sm text-gray-500'>
            No sourcing or cluster transactions yet.
          </div>
        ) : unifiedTransactions.length === 0 ? (
          <div className='rounded-xl border border-gray-100 py-12 text-center text-sm text-gray-500'>
            No transactions match this filter.
          </div>
        ) : (
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            {unifiedTransactions.map((item) => {
              if (item.kind === 'sourcing') {
                const row = item.row;
                const t = row.trade;
                const inv = t?.invoice;
                const meta = sourcingStatusMeta(row);
                const share = inv ? producerPayoutPreview(row).payoutCents : 0;
                const requestedKg = totalVolumeRequestedKg(row);
                const deliveredKg = totalVolumeDeliveredKg(row);
                return (
                  <div
                    key={`s-${String(row._id)}`}
                    className='rounded-xl border border-gray-200/90 bg-white p-5 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow'>
                    <div className='flex flex-wrap items-start justify-between gap-2'>
                      <div className='min-w-0'>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-violet-900 ${josefinSemiBold.className}`}>
                          <Package className='w-3 h-3 shrink-0' aria-hidden />
                          Sourcing
                        </span>
                        <p className='font-mono text-xs text-gray-500 mt-2'>#{buyerRequestRefSuffix(row)}</p>
                        <p className={`text-base text-gray-900 mt-0.5 ${josefinSemiBold.className}`}>
                          {row.buyerName || '—'}
                        </p>
                        <p className={`text-xs text-gray-500 mt-0.5 ${josefinRegular.className}`}>{row.productName || '—'}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${statusBadgeClass(meta.tier)} ${josefinSemiBold.className}`}>
                        {meta.tier === 'danger' ? (
                          <AlertCircle className='w-3.5 h-3.5 shrink-0' aria-hidden />
                        ) : meta.tier === 'success' ? (
                          <Check className='w-3.5 h-3.5 shrink-0' aria-hidden />
                        ) : (
                          <Circle className='w-3.5 h-3.5 shrink-0' aria-hidden />
                        )}
                        {meta.label}
                      </span>
                    </div>

                    {inv?.sentAt ? (
                      <>
                        <div className={`mt-4 grid grid-cols-2 gap-3 text-sm ${josefinRegular.className}`}>
                          <div>
                            <p className='text-gray-500 text-xs'>Your share</p>
                            <p className={`text-gray-900 ${josefinSemiBold.className}`}>{eur(share)}</p>
                          </div>
                          <div>
                            <p className='text-gray-500 text-xs'>Buyer paid</p>
                            <p className={`text-gray-900 ${josefinSemiBold.className}`}>{eur(inv.totalCents)}</p>
                          </div>
                        </div>
                        <div className={`mt-3 grid grid-cols-2 gap-3 text-sm ${josefinRegular.className}`}>
                          <div>
                            <p className='text-gray-500 text-xs'>Total volume requested</p>
                            <p className={`text-gray-900 tabular-nums ${josefinSemiBold.className}`}>
                              {requestedKg.toLocaleString()} kg
                            </p>
                          </div>
                          <div>
                            <p className='text-gray-500 text-xs'>Total volume delivered</p>
                            <p className={`text-gray-900 tabular-nums ${josefinSemiBold.className}`}>
                              {deliveredKg.toLocaleString()} kg
                            </p>
                          </div>
                        </div>
                        <MoneyFlowStrip inv={inv} yourPayoutCents={share} />
                      </>
                    ) : (
                      <p className={`mt-4 text-sm text-gray-500 ${josefinRegular.className}`}>Invoice not sent yet.</p>
                    )}

                    <SourcingTimeline row={row} />

                    <button
                      type='button'
                      onClick={() => openSourcingDetail(row)}
                      className={`mt-5 inline-flex items-center justify-center gap-1 w-full rounded-lg border border-gray-200 py-2.5 text-sm text-gray-900 hover:bg-gray-50 ${josefinSemiBold.className}`}>
                      View details
                      <ChevronRight className='w-4 h-4' aria-hidden />
                    </button>
                  </div>
                );
              }

              if (item.kind === 'cluster-empty') {
                const row = item.clusterRow;
                return (
                  <div
                    key={`ce-${String(row._id)}`}
                    className='rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-5 flex flex-col justify-center min-h-[160px]'>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-sky-900 w-fit ${josefinSemiBold.className}`}>
                      <Layers className='w-3 h-3 shrink-0' aria-hidden />
                      Cluster
                    </span>
                    <p className={`text-sm text-gray-600 mt-3 ${josefinRegular.className}`}>
                      <span className={josefinSemiBold.className}>{row.productName || 'Cluster'}</span>
                      <span className='font-mono text-xs text-gray-500 block mt-1'>{displayIdSuffix(row.clusterId)}</span>
                      Settlement lines will appear here when allocated.
                    </p>
                    <button
                      type='button'
                      onClick={() => setDetail({ kind: 'cluster-empty', clusterRow: row })}
                      className={`mt-4 inline-flex items-center justify-center gap-1 w-full rounded-lg border border-gray-200 py-2.5 text-sm text-gray-900 hover:bg-gray-50 ${josefinSemiBold.className}`}>
                      View details
                      <ChevronRight className='w-4 h-4' aria-hidden />
                    </button>
                  </div>
                );
              }

              const { clusterRow: row, entry: e, entryIdx: idx } = item;
              const supplyOk = String(e.supplyStatus || '').toLowerCase() === 'accepted';
              const paidOk = String(e.payout?.status || '').toLowerCase() === 'completed';
              return (
                <div
                  key={`c-${String(row._id)}-${String(e._id || idx)}`}
                  className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow'>
                  <div className='flex flex-wrap items-start justify-between gap-2'>
                    <div className='min-w-0 flex-1'>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-sky-900 ${josefinSemiBold.className}`}>
                        <Layers className='w-3 h-3 shrink-0' aria-hidden />
                        Cluster
                      </span>
                      <p className={`text-base text-gray-900 truncate mt-2 ${josefinSemiBold.className}`}>
                        {row.productName || 'Product'}
                      </p>
                      <p className='font-mono text-xs text-gray-500 mt-0.5'>{displayIdSuffix(row.clusterId)}</p>
                    </div>
                  </div>
                  <p className={`text-sm text-gray-700 mt-4 ${josefinRegular.className}`}>
                    <span className='text-gray-500'>Your share:</span>{' '}
                    <span className={josefinSemiBold.className}>{Number(e.allocatedKg || 0).toLocaleString()} kg</span>{' '}
                    <span className='text-gray-400'>({Number(e.sharePercent || 0).toFixed(0)}%)</span>
                  </p>
                  <p className={`text-lg text-gray-900 mt-1 ${josefinSemiBold.className}`}>
                    {eur(e.netPayoutCents)} <span className='text-sm font-normal text-gray-500'>expected</span>
                  </p>
                  <div className='flex flex-wrap gap-2 mt-4'>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${
                        supplyOk ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-amber-50 text-amber-900 border-amber-200'
                      }`}>
                      {supplyOk ? '✓ Accepted' : `Supply: ${e.supplyStatus || 'pending'}`}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${
                        paidOk ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-gray-50 text-gray-800 border-gray-200'
                      }`}>
                      {paidOk ? '✓ Paid' : `Transfer: ${e.payout?.status || 'pending'}`}
                    </span>
                  </div>
                  {e.payout?.errorMessage ? (
                    <p className='text-xs text-red-600 mt-2'>{e.payout.errorMessage}</p>
                  ) : null}
                  <button
                    type='button'
                    onClick={() => setDetail({ kind: 'cluster', clusterRow: row, entry: e })}
                    className={`mt-5 inline-flex items-center justify-center gap-1 w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-800 hover:bg-gray-50 ${josefinSemiBold.className}`}>
                    View details
                    <ChevronRight className='w-4 h-4' aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {error ? <p className='text-sm text-red-600'>{error}</p> : null}

      {detail ? (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <button
            type='button'
            className='absolute inset-0 bg-black/40'
            aria-label='Close'
            onClick={() => setDetail(null)}
          />
          <div className='relative w-full max-w-lg h-full bg-white shadow-xl border-l border-gray-200 flex flex-col overflow-hidden'>
            <div className='flex items-center justify-between border-b border-gray-100 px-4 py-3 shrink-0'>
              <div className='min-w-0 pr-2'>
                {detail.kind === 'sourcing' ? (
                  <>
                    <p className={`text-xs text-gray-500 font-mono ${josefinRegular.className}`}>
                      #{buyerRequestRefSuffix(detail.row)}
                    </p>
                    <h2 className={`text-lg text-gray-900 truncate ${josefinSemiBold.className}`}>
                      {detail.row.productName || '—'}
                    </h2>
                    <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Sourcing</p>
                  </>
                ) : detail.kind === 'cluster' ? (
                  <>
                    <p className={`text-xs text-gray-500 font-mono truncate ${josefinRegular.className}`}>
                      {displayIdSuffix(detail.clusterRow.clusterId)}
                    </p>
                    <h2 className={`text-lg text-gray-900 truncate ${josefinSemiBold.className}`}>
                      {detail.clusterRow.productName || 'Cluster'}
                    </h2>
                    <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Cluster payout</p>
                  </>
                ) : (
                  <>
                    <p className={`text-xs text-gray-500 font-mono truncate ${josefinRegular.className}`}>
                      {displayIdSuffix(detail.clusterRow.clusterId)}
                    </p>
                    <h2 className={`text-lg text-gray-900 truncate ${josefinSemiBold.className}`}>
                      {detail.clusterRow.productName || 'Cluster'}
                    </h2>
                    <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Cluster (pending lines)</p>
                  </>
                )}
              </div>
              <button
                type='button'
                onClick={() => setDetail(null)}
                className='p-2 rounded-lg hover:bg-gray-100 text-gray-600 shrink-0'
                aria-label='Close'>
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='flex-1 overflow-y-auto px-4 py-4'>
              {detailLoading && detail.kind === 'sourcing' ? (
                <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Refreshing…</p>
              ) : null}
              {detail.kind === 'sourcing' ? <AccountsSourcingDetailBody row={detail.row} /> : null}
              {detail.kind === 'cluster' ? (
                <AccountsClusterDetailBody clusterRow={detail.clusterRow} entry={detail.entry} />
              ) : null}
              {detail.kind === 'cluster-empty' ? <AccountsClusterEmptyDetailBody clusterRow={detail.clusterRow} /> : null}
            </div>
          </div>
        </div>
      ) : null}

      <p className={`text-xs text-gray-400 max-w-xl ${josefinRegular.className}`}>
        Set up payouts under{' '}
        <Link href='/dashboard/settings' className='text-brand-green underline'>
          Settings → Payouts
        </Link>{' '}
        so Kewve can send transfers when orders complete.
      </p>
    </div>
  );
}
