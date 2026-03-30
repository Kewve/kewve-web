'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Layers, MessageSquareWarning, Receipt, Sparkles, Truck, X } from 'lucide-react';
import { titleFont, josefinSemiBold, josefinRegular } from '@/utils';
import { adminAPI } from '@/lib/api';
import { asMongoIdString, buyerRequestRefSuffix, displayIdSuffix } from '@/lib/mongoId';

type Fulfillment = 'none' | 'processing' | 'dispatched' | 'delivered' | 'cancelled' | 'completed';

interface MatchAllocation {
  producerId: string;
  producerName?: string;
  productId: string;
  productName?: string;
  allocatedKg: number;
  availableCapacityKg?: number;
  unitPrice?: number;
  producerResponse?: string;
  fulfillmentStatus?: Fulfillment;
  declinedReason?: string;
}

interface DeliveryAddress {
  line1?: string;
  line2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  company?: string;
}

interface AdminBuyerRequest {
  _id: string;
  buyerName?: string;
  buyerEmail?: string;
  producerId?: string;
  productName?: string;
  category?: string;
  volumeKg?: number;
  market?: string;
  status?: string;
  trade?: Record<string, any>;
  fulfillmentMode?: 'single' | 'aggregation';
  deliveryAddress?: DeliveryAddress;
  matchPlan?: {
    requiredVolumeKg?: number;
    totalAllocatedKg?: number;
    matchedProducerCount?: number;
    remainingVolumeKg?: number;
    allocations?: MatchAllocation[];
  };
}

function eurFromCents(cents: number | undefined | null) {
  const n = Number(cents || 0);
  return `€${(n / 100).toFixed(2)}`;
}

function formatDelivery(d?: DeliveryAddress) {
  if (!d?.line1) return null;
  const parts = [
    d.company,
    d.line1,
    d.line2,
    [d.city, d.postalCode].filter(Boolean).join(', '),
    d.country,
    d.phone,
  ].filter(Boolean);
  return parts.join(' · ');
}

function primaryProducerLabel(row: AdminBuyerRequest): string {
  const allocs = row.matchPlan?.allocations || [];
  const pid = asMongoIdString(row.producerId);
  const match = allocs.find((a) => asMongoIdString(a.producerId) === pid) || allocs[0];
  const pidTail = displayIdSuffix(pid);
  if (match?.producerName) {
    return `${match.producerName} (#${pidTail})`;
  }
  return pid ? `Producer #${pidTail}` : '—';
}

function canUseAutoMatch(row: AdminBuyerRequest): boolean {
  return row.fulfillmentMode !== 'single';
}

function activeAllocRows(row: AdminBuyerRequest): MatchAllocation[] {
  return (row.matchPlan?.allocations || []).filter((a) => Number(a.allocatedKg || 0) > 0);
}

function isAggregationTrade(row: AdminBuyerRequest): boolean {
  if (row.fulfillmentMode === 'aggregation') return true;
  return activeAllocRows(row).length > 1;
}

/** Buyer paid, then fulfillment was cancelled — ops can assign a new producer. */
function isPaidCancelledReassign(row: AdminBuyerRequest): boolean {
  const t = row.trade || {};
  return !!t.invoice?.paidAt && t.fulfillmentStatus === 'cancelled';
}

function aggregationInvoiceSubtotalCents(row: AdminBuyerRequest): number {
  return activeAllocRows(row).reduce((sum, a) => {
    if (String(a.producerResponse || 'pending') !== 'accepted') return sum;
    return sum + Math.round(Number(a.unitPrice || 0) * Number(a.allocatedKg || 0) * 100);
  }, 0);
}

function canSendAggregationInvoice(row: AdminBuyerRequest): boolean {
  if (!isAggregationTrade(row)) return false;
  const t = row.trade || {};
  if (t.invoice?.sentAt) return false;
  if (t.producerDecision !== 'accepted') return false;
  if (Number(row.matchPlan?.remainingVolumeKg ?? 0) > 0) return false;
  const active = activeAllocRows(row);
  if (!active.length) return false;
  return active.every((a) => String(a.producerResponse || 'pending') === 'accepted');
}

/** Short scannable hints for the page header (replaces a long paragraph). */
const OPS_TRADE_HEADER_HINTS = [
  { icon: Layers, title: 'Match plan', hint: 'Volume coverage and each producer’s accept / decline.' },
  { icon: Receipt, title: 'Buyer invoice', hint: 'Aggregation only — send when the plan is full and every supplier has accepted.' },
  { icon: Sparkles, title: 'Plan & Auto Match', hint: 'Edit allocations in plan details or run Auto Match on aggregation requests.' },
  { icon: Truck, title: 'Admin fulfillment', hint: 'Override shipment steps until the trade is closed.' },
  { icon: MessageSquareWarning, title: 'Issue / notes', hint: 'Resolve buyer-reported problems here.' },
] as const;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Same pool as POST /admin/buyer-requests/:id/auto-match: approved + capacity,
 * request category, then exact product name (case-insensitive) when any match exists; otherwise all in category.
 */
function filterProductsForBuyerRequest(products: any[], snapshot: AdminBuyerRequest): any[] {
  const approved = products.filter(
    (p: any) =>
      p.readiness === 'approved' &&
      p.verification === 'verified' &&
      Number(p.monthlyCapacity || 0) > 0
  );

  const cat = String(snapshot.category || '').trim();
  const requestedName = String(snapshot.productName || '').trim();

  if (!cat) {
    if (!requestedName) return [];
    const exactRe = new RegExp(`^${escapeRegex(requestedName)}$`, 'i');
    const pool = approved.filter((p: any) => exactRe.test(String(p.name || '').trim()));
    const label = (p: any) => String(p.name || 'Product');
    return [...pool].sort((a, b) => label(a).localeCompare(label(b)));
  }

  let pool = approved.filter((p: any) => String(p.category || '').trim() === cat);
  if (requestedName) {
    const exactRe = new RegExp(`^${escapeRegex(requestedName)}$`, 'i');
    const nameHits = pool.filter((p: any) => exactRe.test(String(p.name || '').trim()));
    if (nameHits.length > 0) {
      pool = nameHits;
    }
  }

  const label = (p: any) => String(p.name || 'Product');
  return [...pool].sort((a, b) => label(a).localeCompare(label(b)));
}

export default function TradeOperationsPage() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<AdminBuyerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [planEditor, setPlanEditor] = useState<{
    requestId: string;
    requiredVolumeKg: number;
    allocations: MatchAllocation[];
    snapshot: AdminBuyerRequest;
  } | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [tradeBusy, setTradeBusy] = useState<string | null>(null);
  const [resolveFor, setResolveFor] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveCloseOk, setResolveCloseOk] = useState(true);
  const [resolveRefundBuyer, setResolveRefundBuyer] = useState(false);
  const [resolveRefundEuros, setResolveRefundEuros] = useState('');
  const [issueNoteDraft, setIssueNoteDraft] = useState('');
  const [addingIssueNote, setAddingIssueNote] = useState(false);
  const [adminInvoiceRow, setAdminInvoiceRow] = useState<AdminBuyerRequest | null>(null);
  const [adminInvoiceFeesEuros, setAdminInvoiceFeesEuros] = useState('');
  const [adminInvoiceFeesNote, setAdminInvoiceFeesNote] = useState('Delivery');
  const [adminInvoiceBusy, setAdminInvoiceBusy] = useState(false);
  const [productCatalog, setProductCatalog] = useState<any[]>([]);
  const [productCatalogLoading, setProductCatalogLoading] = useState(false);
  const [reassignSingle, setReassignSingle] = useState<AdminBuyerRequest | null>(null);
  const [reassignProductId, setReassignProductId] = useState('');
  const [reassignCatalog, setReassignCatalog] = useState<any[]>([]);
  const [reassignCatalogLoading, setReassignCatalogLoading] = useState(false);
  const [reassignBusy, setReassignBusy] = useState(false);
  const [detailsRow, setDetailsRow] = useState<AdminBuyerRequest | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminAPI.getBuyerRequests();
        setRows(res.data || []);
      } catch (err: any) {
        setError(err?.message || 'Failed to load buyer requests.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const requestIdHighlight = searchParams.get('requestId');

  useEffect(() => {
    if (!requestIdHighlight || loading) return;
    const id = asMongoIdString(requestIdHighlight);
    if (!id) return;
    const el = document.getElementById(`trade-admin-${id}`);
    if (el) {
      requestAnimationFrame(() =>
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
      );
    }
  }, [requestIdHighlight, loading, rows]);

  useEffect(() => {
    if (!planEditor) {
      setProductCatalog([]);
      setProductCatalogLoading(false);
      return;
    }
    let cancelled = false;
    setProductCatalogLoading(true);
    (async () => {
      try {
        const res = await adminAPI.getProducts();
        if (!cancelled) setProductCatalog(res.data || []);
      } catch {
        if (!cancelled) setProductCatalog([]);
      } finally {
        if (!cancelled) setProductCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planEditor?.requestId]);

  useEffect(() => {
    if (!reassignSingle) {
      setReassignCatalog([]);
      setReassignCatalogLoading(false);
      return;
    }
    let cancelled = false;
    setReassignCatalogLoading(true);
    (async () => {
      try {
        const res = await adminAPI.getProducts();
        if (!cancelled) setReassignCatalog(res.data || []);
      } catch {
        if (!cancelled) setReassignCatalog([]);
      } finally {
        if (!cancelled) setReassignCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reassignSingle?._id]);

  const eligibleReassignProducts = useMemo(() => {
    if (!reassignSingle) return [];
    return filterProductsForBuyerRequest(reassignCatalog, reassignSingle);
  }, [reassignCatalog, reassignSingle]);

  const eligibleCatalogProducts = useMemo(() => {
    if (!planEditor?.snapshot) return [];
    return filterProductsForBuyerRequest(productCatalog, planEditor.snapshot);
  }, [productCatalog, planEditor?.requestId, planEditor?.snapshot?.category, planEditor?.snapshot?.productName]);

  const adminInvoiceExtraCents = useMemo(() => {
    const n = parseFloat(String(adminInvoiceFeesEuros || '').replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.round(n * 100);
  }, [adminInvoiceFeesEuros]);

  const adminInvoicePreview = useMemo(() => {
    if (!adminInvoiceRow) {
      return { subtotalCents: 0, platformFeeCents: 0, additionalFeesCents: 0, totalCents: 0 };
    }
    const subtotalCents = aggregationInvoiceSubtotalCents(adminInvoiceRow);
    const platformFeeCents = Math.round((subtotalCents * 10) / 100);
    const extra = Math.max(0, adminInvoiceExtraCents);
    return {
      subtotalCents,
      platformFeeCents,
      additionalFeesCents: extra,
      totalCents: subtotalCents + extra + platformFeeCents,
    };
  }, [adminInvoiceRow, adminInvoiceExtraCents]);

  const openAdminInvoiceModal = (row: AdminBuyerRequest) => {
    setAdminInvoiceRow(row);
    setAdminInvoiceFeesEuros('');
    setAdminInvoiceFeesNote('Delivery');
  };

  const submitAdminInvoice = async () => {
    if (!adminInvoiceRow?._id) return;
    try {
      setAdminInvoiceBusy(true);
      setError('');
      const id = adminInvoiceRow._id;
      const res = await adminAPI.sendBuyerRequestTradeInvoice(id, {
        additionalFeesCents: adminInvoicePreview.additionalFeesCents,
        additionalFeesNote: adminInvoiceFeesNote.trim() || 'Additional fees',
      });
      setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...res.data } : r)));
      setAdminInvoiceRow(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to send invoice.');
    } finally {
      setAdminInvoiceBusy(false);
    }
  };

  const updateStatus = async (id: string, status: 'pending' | 'in_review' | 'matched' | 'closed') => {
    try {
      setUpdatingId(id);
      setError('');
      await adminAPI.updateBuyerRequestStatus(id, status);
      setRows((prev) => prev.map((row) => (row._id === id ? { ...row, status } : row)));
    } catch (err: any) {
      setError(err?.message || 'Failed to update request status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const autoMatch = async (id: string) => {
    try {
      setMatchingId(id);
      setError('');
      const res = await adminAPI.autoMatchBuyerRequest(id);
      setRows((prev) => prev.map((row) => (row._id === id ? { ...row, ...res.data } : row)));
    } catch (err: any) {
      setError(err?.message || 'Failed to auto-match request.');
    } finally {
      setMatchingId(null);
    }
  };

  const openPlanEditor = (row: AdminBuyerRequest) => {
    setPlanEditor({
      requestId: row._id,
      requiredVolumeKg: Number(row.matchPlan?.requiredVolumeKg || row.volumeKg || 0),
      allocations: (row.matchPlan?.allocations || []).map((allocation) => ({
        producerId: String(allocation.producerId),
        producerName: allocation.producerName || 'Producer',
        productId: String(allocation.productId),
        productName: allocation.productName || row.productName || 'Product',
        allocatedKg: Number(allocation.allocatedKg || 0),
        availableCapacityKg: Number(allocation.availableCapacityKg || 0),
        unitPrice: Number(allocation.unitPrice || 0),
        producerResponse: allocation.producerResponse,
        declinedReason: allocation.declinedReason,
      })),
      snapshot: row,
    });
  };

  const updateEditedAllocation = (index: number, value: string) => {
    if (!planEditor) return;
    const parsed = Number(value);
    setPlanEditor({
      ...planEditor,
      allocations: planEditor.allocations.map((allocation, i) =>
        i === index
          ? {
              ...allocation,
              allocatedKg: Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
            }
          : allocation
      ),
    });
  };

  const setAllocationProductFromCatalog = (index: number, productId: string) => {
    if (!planEditor || !productId) return;
    const p = eligibleCatalogProducts.find((x: any) => String(x._id) === productId);
    if (!p) return;
    const cap = Number(p.monthlyCapacity || 0);
    setPlanEditor({
      ...planEditor,
      allocations: planEditor.allocations.map((allocation, i) => {
        if (i !== index) return allocation;
        const prevKg = Number(allocation.allocatedKg || 0);
        const fallbackKg = Math.min(Math.max(Number(planEditor.requiredVolumeKg || 0), 1), cap);
        const mergedKg = prevKg > 0 ? Math.min(prevKg, cap) : fallbackKg;
        const allocatedKg = Math.max(1, Math.min(cap, mergedKg));
        return {
          ...allocation,
          producerId: String(p.userId),
          producerName: p.producer?.name || p.producer?.businessName || 'Producer',
          productId: String(p._id),
          productName: p.name || planEditor.snapshot.productName || 'Product',
          availableCapacityKg: cap,
          unitPrice: Number(p.unitPrice || 0),
          allocatedKg,
        };
      }),
    });
  };

  const updateAllocationIds = (index: number, field: 'producerId' | 'productId', value: string) => {
    if (!planEditor) return;
    setPlanEditor({
      ...planEditor,
      allocations: planEditor.allocations.map((allocation, i) =>
        i === index ? { ...allocation, [field]: value.trim() } : allocation
      ),
    });
  };

  const removeAllocationRow = (index: number) => {
    if (!planEditor || planEditor.allocations.length <= 1) return;
    setPlanEditor({
      ...planEditor,
      allocations: planEditor.allocations.filter((_, i) => i !== index),
    });
  };

  const addAllocationRow = () => {
    if (!planEditor || !eligibleCatalogProducts.length) {
      setError(
        'No listings match this request (category + product name, same rules as Auto Match). Use custom IDs below or add matching approved products.'
      );
      return;
    }
    const p = eligibleCatalogProducts[0];
    const cap = Number(p.monthlyCapacity || 0);
    const need = Math.max(0, planEditor.requiredVolumeKg - planEditor.allocations.reduce((s, a) => s + Number(a.allocatedKg || 0), 0));
    const allocatedKg = Math.min(cap, need > 0 ? need : Math.min(cap, 1));
    setPlanEditor({
      ...planEditor,
      allocations: [
        ...planEditor.allocations,
        {
          producerId: String(p.userId),
          producerName: p.producer?.name || p.producer?.businessName || 'Producer',
          productId: String(p._id),
          productName: p.name || planEditor.snapshot.productName || 'Product',
          allocatedKg,
          availableCapacityKg: cap,
          unitPrice: Number(p.unitPrice || 0),
        },
      ],
    });
  };

  const savePlan = async () => {
    if (!planEditor) return;
    try {
      setSavingPlan(true);
      setError('');
      const payload = planEditor.allocations.map((allocation) => ({
        producerId: allocation.producerId,
        productId: allocation.productId,
        allocatedKg: Number(allocation.allocatedKg || 0),
      }));
      const paidCancelled = isPaidCancelledReassign(planEditor.snapshot);
      const buyerNote = paidCancelled
        ? String(window.prompt('Optional note to buyer about this reassignment') || '').trim()
        : '';
      const res = paidCancelled
        ? await adminAPI.reassignPaidCancellation(planEditor.requestId, { allocations: payload, buyerNote })
        : await adminAPI.updateBuyerRequestMatchPlan(planEditor.requestId, payload);
      setRows((prev) => prev.map((row) => (row._id === planEditor.requestId ? { ...row, ...res.data } : row)));
      setPlanEditor(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to save match plan.');
    } finally {
      setSavingPlan(false);
    }
  };

  const submitReassignSingle = async () => {
    if (!reassignSingle?._id || !reassignProductId.trim()) return;
    try {
      setReassignBusy(true);
      setError('');
      const buyerNote = String(window.prompt('Optional note to buyer about this reassignment') || '').trim();
      const res = await adminAPI.reassignPaidCancellation(reassignSingle._id, {
        productId: reassignProductId.trim(),
        buyerNote,
      });
      setRows((prev) => prev.map((row) => (row._id === reassignSingle._id ? { ...row, ...res.data } : row)));
      setReassignSingle(null);
      setReassignProductId('');
    } catch (err: any) {
      setError(err?.message || 'Failed to reassign producer.');
    } finally {
      setReassignBusy(false);
    }
  };

  const finalizePaidCancellation = async (id: string) => {
    const reason = String(window.prompt('Reason for final cancellation (required)') || '').trim();
    if (!reason) return;
    const buyerNote = String(window.prompt('Optional note to buyer about this cancellation') || '').trim();
    try {
      setTradeBusy(id);
      setError('');
      const res = await adminAPI.finalizePaidCancellation(id, { reason, buyerNote });
      setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...res.data } : r)));
    } catch (err: any) {
      setError(err?.message || 'Failed to finalize cancellation.');
    } finally {
      setTradeBusy(null);
    }
  };

  const refundPaidCancellation = async (id: string, invoiceTotalCents: number) => {
    const amountText = String(window.prompt('Refund amount in euros (leave blank for full refund)') || '').trim();
    const note = String(window.prompt('Optional internal refund note') || '').trim();
    let amountCents: number | undefined;
    if (amountText) {
      const parsed = Number(amountText.replace(',', '.'));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError('Enter a valid positive refund amount.');
        return;
      }
      amountCents = Math.round(parsed * 100);
      if (amountCents > Number(invoiceTotalCents || 0)) {
        setError('Refund cannot exceed invoice total.');
        return;
      }
    }
    try {
      setTradeBusy(id);
      setError('');
      const res = await adminAPI.refundBuyerRequestTrade(id, { amountCents, note });
      setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...res.data } : r)));
    } catch (err: any) {
      setError(err?.message || 'Failed to refund order.');
    } finally {
      setTradeBusy(null);
    }
  };

  const adminFulfillment = async (id: string, status: Fulfillment) => {
    try {
      setTradeBusy(id);
      setError('');
      const res = await adminAPI.updateAdminTradeFulfillment(id, status);
      setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...res.data } : r)));
    } catch (err: any) {
      setError(err?.message || 'Failed to update fulfillment.');
    } finally {
      setTradeBusy(null);
    }
  };

  const submitResolve = async () => {
    if (!resolveFor) return;
    try {
      setTradeBusy(resolveFor);
      setError('');
      const refundAmountCents =
        resolveRefundBuyer && resolveRefundEuros.trim()
          ? Math.round(Number.parseFloat(resolveRefundEuros.replace(',', '.')) * 100)
          : undefined;
      const res = await adminAPI.resolveTradeIssues(resolveFor, {
        closeAsReceivedOk: resolveCloseOk,
        resolutionNote: resolveNotes.trim(),
        refundBuyer: resolveRefundBuyer,
        refundAmountCents:
          resolveRefundBuyer && refundAmountCents !== undefined && Number.isFinite(refundAmountCents) && refundAmountCents > 0
            ? refundAmountCents
            : undefined,
      });
      setRows((prev) => prev.map((r) => (r._id === resolveFor ? { ...r, ...res.data } : r)));
      setResolveFor(null);
      setResolveNotes('');
      setIssueNoteDraft('');
      setResolveRefundBuyer(false);
      setResolveRefundEuros('');
    } catch (err: any) {
      setError(err?.message || 'Failed to resolve issue.');
    } finally {
      setTradeBusy(null);
    }
  };

  const submitIssueNote = async () => {
    if (!resolveFor || !issueNoteDraft.trim()) return;
    try {
      setAddingIssueNote(true);
      setError('');
      const res = await adminAPI.appendTradeIssueNote(resolveFor, issueNoteDraft.trim());
      setRows((prev) => prev.map((r) => (r._id === resolveFor ? { ...r, ...res.data } : r)));
      setIssueNoteDraft('');
    } catch (err: any) {
      setError(err?.message || 'Failed to add note.');
    } finally {
      setAddingIssueNote(false);
    }
  };

  const renderPaymentLines = (t: Record<string, any>) => {
    const inv = t?.invoice;
    if (!inv?.sentAt && !inv?.generatedAt) {
      return <p className='text-gray-400'>No invoice yet</p>;
    }
    const extra = Number(inv.additionalFeesCents || 0);
    return (
      <div className='space-y-0.5'>
        <p>Product {eurFromCents(inv.subtotalCents)}</p>
        {extra > 0 ? (
          <p>
            {inv.additionalFeesNote?.trim() || 'Additional'} {eurFromCents(extra)}
          </p>
        ) : null}
        <p>
          Platform ({inv.platformFeePercent ?? 10}% on product) {eurFromCents(inv.platformFeeCents)}
        </p>
        <p className='font-medium text-gray-800'>
          Total {eurFromCents(inv.totalCents)}
          {inv.paidAt ? ' · paid' : ' · unpaid'}
        </p>
      </div>
    );
  };

  const renderTradeCard = (row: AdminBuyerRequest) => {
    const t = row.trade || {};
    const closed = !!t.transactionClosed;
    const mp = row.matchPlan;
    const reqKg = Number(mp?.requiredVolumeKg || row.volumeKg || 0);
    const allocKg = Number(mp?.totalAllocatedKg ?? 0);
    const remKg = Number(mp?.remainingVolumeKg ?? Math.max(reqKg - allocKg, 0));
    const allocs = mp?.allocations || [];
    const total = Number(t?.invoice?.totalCents || 0);
    const issueOpen = !!t.issuesNeedAdmin;
    const modeLabel = isAggregationTrade(row)
      ? `Aggregation Deal (${mp?.matchedProducerCount || activeAllocRows(row).length || 0} suppliers)`
      : 'Single Supplier Deal';

    return (
      <div
        key={row._id}
        id={`trade-admin-${asMongoIdString(row._id)}`}
        className='rounded-2xl border border-gray-200 bg-white p-5 shadow-sm'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <p className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>{modeLabel}</p>
            <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>#{buyerRequestRefSuffix(row)}</p>
          </div>
          <p className={`text-base text-gray-900 ${josefinSemiBold.className}`}>{eurFromCents(total)}</p>
        </div>

        <div className={`mt-2 text-sm text-gray-800 space-y-0.5 ${josefinRegular.className}`}>
          <p>
            {row.productName || '—'} • {Number(row.volumeKg || 0)} kg
          </p>
          <p>Buyer: {row.buyerName || '—'}</p>
        </div>

        <div className='mt-3 flex flex-wrap items-center gap-2'>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs border ${
              issueOpen
                ? 'border-amber-300 bg-amber-50 text-amber-900'
                : closed
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-gray-300 bg-gray-50 text-gray-800'
            } ${josefinSemiBold.className}`}>
            {issueOpen ? 'Issue open' : closed ? 'Completed' : 'In progress'}
          </span>
          <span className={`text-xs text-gray-600 ${josefinRegular.className}`}>
            {(t.invoice?.paidAt ? 'Paid' : 'Unpaid') +
              ' • ' +
              (String(t.fulfillmentStatus || 'none').replace(/_/g, ' ') || 'none') +
              (t.buyerReceipt && t.buyerReceipt !== 'none' ? ` • ${String(t.buyerReceipt).replace(/_/g, ' ')}` : '')}
          </span>
        </div>

        <div className='mt-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3'>
          <p className={`text-xs text-gray-700 ${josefinSemiBold.className}`}>Match Plan</p>
          <p className={`text-xs text-gray-600 mt-1 ${josefinRegular.className}`}>
            {isAggregationTrade(row) ? `${mp?.matchedProducerCount || 0} suppliers` : '1 supplier'} •{' '}
            {remKg > 0 ? `${remKg} kg short` : 'Full coverage'}
          </p>
          {allocs.length > 0 ? (
            <ul className={`mt-2 list-disc list-inside text-xs text-gray-700 space-y-1 ${josefinRegular.className}`}>
              {allocs.map((a, i) => (
                <li key={`${a.producerId}-${a.productId}-${i}`}>
                  {a.producerName || 'Producer'} · {Number(a.allocatedKg || 0)} kg
                  {a.unitPrice != null && Number(a.unitPrice) > 0 ? ` @ €${Number(a.unitPrice).toFixed(2)}/kg` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className={`mt-2 text-xs text-gray-400 italic ${josefinRegular.className}`}>No allocations yet</p>
          )}
          <div className='mt-2 border-t border-gray-200 pt-2'>{renderPaymentLines(t)}</div>
        </div>

        {isPaidCancelledReassign(row) ? (
          <div className='mt-3 rounded border border-amber-200 bg-amber-50/90 p-2 text-amber-950'>
            <p className='font-medium text-[11px]'>Paid order cancelled — assign a new producer</p>
            {t.producerCancelledPaidOrderReason ? (
              <p className='text-[10px] mt-1 whitespace-pre-wrap opacity-90'>
                Producer reason: {t.producerCancelledPaidOrderReason}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className='mt-4 flex flex-wrap gap-1'>
          {canSendAggregationInvoice(row) ? (
            <button
              type='button'
              onClick={() => openAdminInvoiceModal(row)}
              disabled={tradeBusy === row._id || adminInvoiceBusy || closed}
              className='border border-emerald-600 rounded px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-50 disabled:opacity-50'>
              Send buyer invoice…
            </button>
          ) : null}
          {canUseAutoMatch(row) ? (
            <button
              type='button'
              onClick={() => autoMatch(row._id)}
              disabled={matchingId === row._id}
              className='border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-70'>
              {matchingId === row._id ? '…' : 'Auto Match'}
            </button>
          ) : (
            <span className='text-[10px] text-gray-400 px-1 py-1 border border-transparent'>Auto Match N/A</span>
          )}
          <button
            type='button'
            onClick={() => setDetailsRow(row)}
            className='border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-50'>
            View details
          </button>
          <button
            type='button'
            onClick={() => openPlanEditor(row)}
            className='border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-50'>
            Manage
          </button>
        </div>

        <div className='mt-2 flex flex-wrap items-center gap-1'>
          <select
            value={row.status || 'pending'}
            disabled={updatingId === row._id}
            onChange={(e) => updateStatus(row._id, e.target.value as 'pending' | 'in_review' | 'matched' | 'closed')}
            className='border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 bg-white disabled:opacity-70'>
            <option value='pending'>Pending</option>
            <option value='in_review'>Review</option>
            <option value='matched'>Matched</option>
            <option value='closed'>Closed</option>
          </select>
          <span className='text-[10px] text-gray-500 uppercase'>Admin ship</span>
          <select
            value={(t.fulfillmentStatus || 'none') as Fulfillment}
            disabled={tradeBusy === row._id || closed}
            onChange={(e) => adminFulfillment(row._id, e.target.value as Fulfillment)}
            className='border border-gray-300 rounded px-2 py-1 text-xs disabled:opacity-50'>
            <option value='none'>—</option>
            <option value='processing'>Processing</option>
            <option value='dispatched'>Dispatched</option>
            <option value='delivered'>Delivered</option>
            <option value='completed'>Completed</option>
            <option value='cancelled'>Cancelled</option>
          </select>
          {t.issuesNeedAdmin ? (
            <button
              type='button'
              onClick={() => {
                setResolveFor(row._id);
                setResolveCloseOk(true);
                setResolveNotes('');
                setIssueNoteDraft('');
                setResolveRefundBuyer(false);
                setResolveRefundEuros('');
              }}
              className='text-xs border border-amber-400 text-amber-900 rounded px-2 py-1 hover:bg-amber-50'>
              Issue / notes
            </button>
          ) : null}
          {isPaidCancelledReassign(row) ? (
            <>
              {isAggregationTrade(row) ? (
                <button
                  type='button'
                  onClick={() => openPlanEditor(row)}
                  className='border border-amber-600 rounded px-2 py-1 text-xs text-amber-900 hover:bg-amber-50'>
                  Reassign (edit plan)
                </button>
              ) : (
                <button
                  type='button'
                  onClick={() => {
                    setReassignSingle(row);
                    setReassignProductId('');
                  }}
                  className='border border-amber-600 rounded px-2 py-1 text-xs text-amber-900 hover:bg-amber-50'>
                  Reassign producer
                </button>
              )}
              <button
                type='button'
                disabled={tradeBusy === row._id}
                onClick={() => finalizePaidCancellation(row._id)}
                className='border border-red-300 rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60'>
                Cancel order
              </button>
              {t.adminCancelledPaidOrderAt ? (
                <button
                  type='button'
                  disabled={tradeBusy === row._id || String(t.refund?.status || '') === 'completed'}
                  onClick={() => refundPaidCancellation(row._id, Number(t.invoice?.totalCents || 0))}
                  className='border border-sky-300 rounded px-2 py-1 text-xs text-sky-800 hover:bg-sky-50 disabled:opacity-60'>
                  {String(t.refund?.status || '') === 'completed' ? 'Refunded' : 'Refund buyer'}
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    );
  };

  const aggregationRows = rows.filter((r) => isAggregationTrade(r));
  const singleRows = rows.filter((r) => !isAggregationTrade(r));

  return (
    <div className='max-w-7xl mx-auto space-y-6'>
      <div className='space-y-4'>
        <div>
          <h1 className={`text-2xl lg:text-3xl text-gray-900 ${titleFont.className}`}>Trade Operations</h1>
          <p className={`text-sm text-gray-600 mt-1 ${josefinRegular.className}`}>
            Work through allocations, invoicing, and fulfillment from the cards below.
          </p>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3'>
          {OPS_TRADE_HEADER_HINTS.map(({ icon: Icon, title, hint }) => (
            <div
              key={title}
              className='flex gap-3 rounded-xl border border-gray-200/90 bg-white/80 px-3 py-3 shadow-sm shadow-gray-900/5'>
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-900 border border-orange-100/80 ${josefinSemiBold.className}`}
                aria-hidden>
                <Icon className='h-4 w-4' strokeWidth={2} />
              </div>
              <div className='min-w-0'>
                <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>{title}</p>
                <p className={`text-xs text-gray-500 leading-snug mt-0.5 ${josefinRegular.className}`}>{hint}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className='rounded-xl border border-gray-200 bg-white px-4 py-6'>
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Loading buyer requests...</p>
        </div>
      ) : rows.length > 0 ? (
        <div className='space-y-7'>
          {aggregationRows.length > 0 ? (
            <section className='space-y-3'>
              <h2 className={`text-xl text-gray-900 ${josefinSemiBold.className}`}>Aggregation Deal ({aggregationRows.length})</h2>
              <div className='space-y-3'>{aggregationRows.map((row) => renderTradeCard(row))}</div>
            </section>
          ) : null}
          {singleRows.length > 0 ? (
            <section className='space-y-3'>
              <h2 className={`text-xl text-gray-900 ${josefinSemiBold.className}`}>Single Supplier Deal</h2>
              <div className='space-y-3'>{singleRows.map((row) => renderTradeCard(row))}</div>
            </section>
          ) : null}
        </div>
      ) : (
        <div className='rounded-xl border border-gray-200 bg-white px-4 py-6'>
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>No buyer requests yet.</p>
        </div>
      )}
      {error ? <p className={`text-sm text-red-600 ${josefinRegular.className}`}>{error}</p> : null}

      {detailsRow && (
        <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4'>
          <div className='bg-white w-full max-w-4xl rounded-lg border border-gray-200 p-4 shadow-lg max-h-[90vh] overflow-y-auto'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className={`text-xl sm:text-2xl text-gray-900 ${josefinSemiBold.className}`}>Request &amp; allocation plan</h2>
              <button type='button' onClick={() => setDetailsRow(null)} className='text-gray-500 hover:text-gray-700 p-1'>
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className={`mb-4 space-y-2 text-sm border border-gray-100 rounded-lg p-3 bg-gray-50/80 ${josefinRegular.className}`}>
              <p>
                <span className='text-gray-500'>Buyer:</span>{' '}
                <span className='text-gray-900'>{detailsRow.buyerName || '—'}</span> · {detailsRow.buyerEmail || '—'}
              </p>
              <p>
                <span className='text-gray-500'>Product:</span> {detailsRow.productName || '—'} · {Number(detailsRow.volumeKg || 0)} kg ·
                Market: {detailsRow.market || '—'}
              </p>
              <p>
                <span className='text-gray-500'>Mode:</span>{' '}
                <span className='capitalize'>{detailsRow.fulfillmentMode || '—'}</span>
              </p>
              <p>
                <span className='text-gray-500'>Listed producer:</span> {primaryProducerLabel(detailsRow)}
              </p>
              {formatDelivery(detailsRow.deliveryAddress) ? (
                <p>
                  <span className='text-gray-500'>Delivery:</span> {formatDelivery(detailsRow.deliveryAddress)}
                </p>
              ) : null}
              <div className='border-t border-gray-200 pt-2 mt-2'>
                <p className={`text-xs font-semibold text-gray-700 mb-1 ${josefinSemiBold.className}`}>Payment (invoice)</p>
                {renderPaymentLines(detailsRow.trade || {})}
              </div>
              {(String(detailsRow.trade?.buyerReceiptNotes || '').trim() ||
                String(detailsRow.trade?.issueResolutionNote || '').trim() ||
                (Array.isArray(detailsRow.trade?.issueAdminNotes) && (detailsRow.trade?.issueAdminNotes?.length ?? 0) > 0)) ? (
                <div className='border-t border-gray-200 pt-2 mt-2 space-y-2'>
                  <p className={`text-xs font-semibold text-gray-700 ${josefinSemiBold.className}`}>Issue &amp; resolution</p>
                  {String(detailsRow.trade?.buyerReceiptNotes || '').trim() ? (
                    <div className={`rounded border border-amber-100 bg-amber-50/50 p-2 text-sm ${josefinRegular.className}`}>
                      <span className={`text-xs text-gray-500 block mb-0.5 ${josefinSemiBold.className}`}>Buyer message</span>
                      <p className='text-gray-800 whitespace-pre-wrap'>{detailsRow.trade?.buyerReceiptNotes}</p>
                    </div>
                  ) : null}
                  {String(detailsRow.trade?.issueResolutionNote || '').trim() ? (
                    <div className={`rounded border border-emerald-100 bg-emerald-50/50 p-2 text-sm ${josefinRegular.className}`}>
                      <span className={`text-xs text-gray-500 block mb-0.5 ${josefinSemiBold.className}`}>
                        Public resolution (buyer &amp; producer)
                      </span>
                      <p className='text-gray-800 whitespace-pre-wrap'>{detailsRow.trade?.issueResolutionNote}</p>
                    </div>
                  ) : null}
                  {Array.isArray(detailsRow.trade?.issueAdminNotes) && (detailsRow.trade?.issueAdminNotes?.length ?? 0) > 0 ? (
                    <div className={`rounded border border-gray-200 bg-gray-50 p-2 text-sm ${josefinRegular.className}`}>
                      <span className={`text-xs text-gray-500 block mb-1 ${josefinSemiBold.className}`}>Internal notes (ops only)</span>
                      <ul className='space-y-1.5'>
                        {(detailsRow.trade?.issueAdminNotes ?? []).map((n: { body?: string; authorName?: string; createdAt?: string }, i: number) => (
                          <li key={i} className='text-xs text-gray-700 whitespace-pre-wrap'>
                            <span className='text-gray-500'>
                              {n.authorName || 'Admin'}
                              {n.createdAt ? ` · ${new Date(n.createdAt).toLocaleString()}` : ''}
                            </span>
                            <br />
                            {n.body}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className='mb-4'>
              <p className={`text-sm text-gray-600 ${josefinRegular.className}`}>
                Required volume: <span className='text-gray-900'>{Number(detailsRow.matchPlan?.requiredVolumeKg || detailsRow.volumeKg || 0)} kg</span>
              </p>
              <p className={`text-sm text-gray-600 ${josefinRegular.className}`}>
                Allocated:{' '}
                <span className='text-gray-900'>
                  {(detailsRow.matchPlan?.allocations || []).reduce((sum, a) => sum + Number(a.allocatedKg || 0), 0)} kg
                </span>
              </p>
            </div>

            <div className='space-y-3'>
              {((detailsRow.matchPlan?.allocations || []) as MatchAllocation[]).length > 0 ? (
                (detailsRow.matchPlan?.allocations || []).map((allocation, index) => (
                  <div key={`${allocation.producerId}-${allocation.productId}-${index}`} className='border border-gray-200 rounded-lg p-3'>
                    <div className='flex flex-wrap items-start justify-between gap-2'>
                      <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>
                        {allocation.producerName || 'Producer'} — {allocation.productName || 'Product'}
                      </p>
                      {allocation.producerResponse ? (
                        <span className={`text-xs capitalize text-gray-600 ${josefinRegular.className}`}>
                          Response: {allocation.producerResponse}
                        </span>
                      ) : null}
                    </div>
                    <p className={`text-xs text-gray-600 mt-1 ${josefinRegular.className}`}>
                      {Number(allocation.allocatedKg || 0)} kg
                      {allocation.unitPrice != null && Number(allocation.unitPrice) >= 0
                        ? ` · Unit price: €${Number(allocation.unitPrice).toFixed(2)}/kg`
                        : ''}
                    </p>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs ${josefinRegular.className}`}>
                      <p className='text-gray-600'>
                        Producer ID: <span className='font-mono text-gray-800'>{allocation.producerId}</span>
                      </p>
                      <p className='text-gray-600'>
                        Product ID: <span className='font-mono text-gray-800'>{allocation.productId}</span>
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>No allocations yet.</p>
              )}
            </div>

            <div className='flex justify-end mt-4'>
              <button
                type='button'
                onClick={() => setDetailsRow(null)}
                className={`border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 ${josefinRegular.className}`}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {adminInvoiceRow && (
        <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-lg border border-gray-200 p-4 max-w-md w-full shadow-lg max-h-[90vh] overflow-y-auto'>
            <div className='flex items-center justify-between mb-2'>
              <h3 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>Send buyer invoice (aggregation)</h3>
              <button
                type='button'
                onClick={() => setAdminInvoiceRow(null)}
                className='text-gray-500 hover:text-gray-800 p-1'
                aria-label='Close'>
                <X className='w-5 h-5' />
              </button>
            </div>
            <p className={`text-sm text-gray-600 mb-2 ${josefinRegular.className}`}>
              Product subtotal is the sum of each <strong>accepted</strong> line (€/kg × kg). Platform fee is 10% on that
              subtotal only.
            </p>
            <ul className={`text-xs text-gray-700 mb-3 space-y-1 border border-gray-100 rounded-lg p-2 max-h-40 overflow-y-auto ${josefinRegular.className}`}>
              {activeAllocRows(adminInvoiceRow).map((a, i) => (
                <li key={i} className='flex justify-between gap-2'>
                  <span className='truncate'>
                    {a.producerName || 'Producer'} · {a.productName || 'Product'}
                  </span>
                  <span>
                    {Number(a.allocatedKg || 0)} kg × €{Number(a.unitPrice || 0).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <label className={`block text-sm text-gray-700 mb-1 ${josefinSemiBold.className}`}>Additional fees (€)</label>
            <input
              type='text'
              inputMode='decimal'
              placeholder='0.00'
              value={adminInvoiceFeesEuros}
              onChange={(e) => setAdminInvoiceFeesEuros(e.target.value)}
              className='w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-2'
            />
            <label className={`block text-sm text-gray-700 mb-1 ${josefinSemiBold.className}`}>Label for buyer</label>
            <input
              value={adminInvoiceFeesNote}
              onChange={(e) => setAdminInvoiceFeesNote(e.target.value)}
              className='w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-2'
              placeholder='e.g. Delivery'
            />
            <div className={`text-sm space-y-2 border border-gray-100 rounded-lg p-3 mb-3 ${josefinRegular.className}`}>
              <div className='flex justify-between'>
                <span className='text-gray-600'>Product subtotal</span>
                <span>{eurFromCents(adminInvoicePreview.subtotalCents)}</span>
              </div>
              {adminInvoicePreview.additionalFeesCents > 0 ? (
                <div className='flex justify-between'>
                  <span className='text-gray-600'>{adminInvoiceFeesNote.trim() || 'Additional fees'}</span>
                  <span>{eurFromCents(adminInvoicePreview.additionalFeesCents)}</span>
                </div>
              ) : null}
              <div className='flex justify-between'>
                <span className='text-gray-600'>Platform fee (10% of product)</span>
                <span>{eurFromCents(adminInvoicePreview.platformFeeCents)}</span>
              </div>
              <div className='flex justify-between font-medium border-t border-gray-100 pt-2'>
                <span>Buyer total</span>
                <span>{eurFromCents(adminInvoicePreview.totalCents)}</span>
              </div>
            </div>
            <div className='flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setAdminInvoiceRow(null)}
                className={`text-sm border border-gray-300 rounded px-3 py-1 ${josefinRegular.className}`}>
                Cancel
              </button>
              <button
                type='button'
                disabled={adminInvoiceBusy || adminInvoicePreview.subtotalCents <= 0}
                onClick={submitAdminInvoice}
                className={`text-sm bg-brand-green text-white rounded px-3 py-1 disabled:opacity-50 ${josefinSemiBold.className}`}>
                {adminInvoiceBusy ? 'Sending…' : 'Send invoice to buyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resolveFor &&
        (() => {
          const row = rows.find((r) => r._id === resolveFor);
          const t = row?.trade || {};
          const adminNotes: Array<{ body?: string; createdAt?: string; authorName?: string }> = Array.isArray(
            t.issueAdminNotes
          )
            ? t.issueAdminNotes
            : [];
          return (
            <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4'>
              <div className='bg-white w-full max-w-lg rounded-lg border border-gray-200 p-4 max-h-[90vh] overflow-y-auto'>
                <h2 className={`text-lg text-gray-900 mb-2 ${josefinSemiBold.className}`}>Buyer-reported issue</h2>
                <p className={`text-xs text-gray-500 mb-3 ${josefinRegular.className}`}>Request #{buyerRequestRefSuffix(resolveFor)}</p>

                {t.buyerReceiptNotes ? (
                  <div className='mb-4'>
                    <p className={`text-xs font-medium text-gray-700 mb-1 ${josefinSemiBold.className}`}>Buyer message</p>
                    <p
                      className={`text-sm text-gray-800 whitespace-pre-wrap rounded border border-gray-100 bg-gray-50 p-2 ${josefinRegular.className}`}>
                      {t.buyerReceiptNotes}
                    </p>
                  </div>
                ) : null}

                {adminNotes.length > 0 ? (
                  <div className='mb-4'>
                    <p className={`text-xs font-medium text-gray-700 mb-2 ${josefinSemiBold.className}`}>Admin notes</p>
                    <ul className='space-y-2 max-h-40 overflow-y-auto'>
                      {adminNotes.map((n, i) => (
                        <li
                          key={`${n.createdAt || i}-${i}`}
                          className={`text-sm text-gray-800 rounded border border-amber-100 bg-amber-50/50 p-2 ${josefinRegular.className}`}>
                          <span className='text-xs text-gray-500 block mb-0.5'>
                            {n.authorName || 'Admin'}
                            {n.createdAt ? ` · ${new Date(n.createdAt).toLocaleString()}` : ''}
                          </span>
                          {n.body}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className='mb-4'>
                  <label className={`text-xs font-medium text-gray-700 block mb-1 ${josefinSemiBold.className}`}>
                    Add internal note
                  </label>
                  <textarea
                    value={issueNoteDraft}
                    onChange={(e) => setIssueNoteDraft(e.target.value)}
                    placeholder='Ops only — not visible to buyer or producer'
                    rows={2}
                    className='w-full border border-gray-300 rounded px-2 py-1 text-sm mb-2'
                  />
                  <button
                    type='button'
                    disabled={addingIssueNote || !issueNoteDraft.trim()}
                    onClick={submitIssueNote}
                    className='text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 disabled:opacity-50'>
                    {addingIssueNote ? 'Saving…' : 'Save note'}
                  </button>
                </div>

                <div className='border-t border-gray-100 pt-4 mt-2'>
                  <p className={`text-sm text-gray-700 mb-2 ${josefinSemiBold.className}`}>Mark resolved</p>
                  <label className={`flex items-center gap-2 text-sm mb-2 ${josefinRegular.className}`}>
                    <input type='checkbox' checked={resolveCloseOk} onChange={(e) => setResolveCloseOk(e.target.checked)} />
                    Close as &quot;received — no issues&quot; (eligible for producer payout queue)
                  </label>
                  <p className={`text-xs text-gray-500 mb-2 ${josefinRegular.className}`}>
                    Uncheck to close the case without changing receipt status (no automatic payout eligibility).
                  </p>
                  <label className={`text-xs font-medium text-gray-700 block mb-1 ${josefinSemiBold.className}`}>
                    Resolution note (visible to buyer &amp; producer)
                  </label>
                  <textarea
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    placeholder='Summary for the buyer and producer — shown in transaction details'
                    rows={2}
                    className='w-full border border-gray-300 rounded px-2 py-1 text-sm mb-3'
                  />
                  {t.invoice?.paidAt ? (
                    <div className={`mb-3 rounded-lg border border-sky-100 bg-sky-50/60 p-3 space-y-2 ${josefinRegular.className}`}>
                      <label className='flex items-center gap-2 text-sm text-gray-800'>
                        <input
                          type='checkbox'
                          checked={resolveRefundBuyer}
                          onChange={(e) => setResolveRefundBuyer(e.target.checked)}
                        />
                        Refund buyer via Stripe (full invoice amount by default)
                      </label>
                      {resolveRefundBuyer ? (
                        <div>
                          <label className={`text-xs text-gray-600 block mb-1 ${josefinSemiBold.className}`}>
                            Partial amount (€, optional)
                          </label>
                          <input
                            type='text'
                            inputMode='decimal'
                            value={resolveRefundEuros}
                            onChange={(e) => setResolveRefundEuros(e.target.value)}
                            placeholder={`Full: ${(Number(t.invoice?.totalCents || 0) / 100).toFixed(2)} — leave empty for full refund`}
                            className='w-full border border-gray-300 rounded px-2 py-1 text-sm'
                          />
                          <p className='text-[11px] text-gray-500 mt-1'>Requires a Stripe checkout payment on this invoice.</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <div className='flex justify-end gap-2'>
                    <button
                      type='button'
                      onClick={() => {
                        setResolveFor(null);
                        setIssueNoteDraft('');
                        setResolveRefundBuyer(false);
                        setResolveRefundEuros('');
                      }}
                      className='border border-gray-300 rounded px-3 py-1 text-sm'>
                      Cancel
                    </button>
                    <button
                      type='button'
                      disabled={tradeBusy === resolveFor}
                      onClick={submitResolve}
                      className='bg-brand-green text-white rounded px-3 py-1 text-sm disabled:opacity-50'>
                      Resolve &amp; close transaction
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {planEditor && (
        <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto'>
          <div className='bg-white w-full max-w-3xl rounded-lg border border-gray-200 p-4 my-6 max-h-[min(90vh,900px)] overflow-y-auto'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className={`text-xl sm:text-2xl text-gray-900 ${josefinSemiBold.className}`}>Request &amp; allocation plan</h2>
              <button type='button' onClick={() => setPlanEditor(null)} className='text-gray-500 hover:text-gray-700 p-1'>
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className={`mb-4 space-y-2 text-sm border border-gray-100 rounded-lg p-3 bg-gray-50/80 ${josefinRegular.className}`}>
              <p>
                <span className='text-gray-500'>Buyer:</span>{' '}
                <span className='text-gray-900'>{planEditor.snapshot.buyerName || '—'}</span> ·{' '}
                {planEditor.snapshot.buyerEmail || '—'}
              </p>
              <p>
                <span className='text-gray-500'>Product:</span> {planEditor.snapshot.productName || '—'} ·{' '}
                {Number(planEditor.snapshot.volumeKg || 0)} kg · Market: {planEditor.snapshot.market || '—'}
              </p>
              <p>
                <span className='text-gray-500'>Mode:</span>{' '}
                <span className='capitalize'>{planEditor.snapshot.fulfillmentMode || '—'}</span>
              </p>
              <p>
                <span className='text-gray-500'>Listed producer:</span> {primaryProducerLabel(planEditor.snapshot)}
              </p>
              {formatDelivery(planEditor.snapshot.deliveryAddress) ? (
                <p>
                  <span className='text-gray-500'>Delivery:</span> {formatDelivery(planEditor.snapshot.deliveryAddress)}
                </p>
              ) : null}
              <div className='border-t border-gray-200 pt-2 mt-2'>
                <p className={`text-xs font-semibold text-gray-700 mb-1 ${josefinSemiBold.className}`}>Payment (invoice)</p>
                {renderPaymentLines(planEditor.snapshot.trade || {})}
              </div>
            </div>

            {isPaidCancelledReassign(planEditor.snapshot) ? (
              <div
                className={`mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 ${josefinRegular.className}`}>
                <p className={josefinSemiBold.className}>Paid order was cancelled — producer reassignment</p>
                <p className='text-xs mt-1'>
                  Saving applies the allocations below, reopens the trade, and resets supplier accept/decline. Buyer payment
                  stays on record; handle refunds or payouts outside this flow if needed.
                </p>
              </div>
            ) : null}

            <div className='mb-4'>
              <p className={`text-sm text-gray-600 ${josefinRegular.className}`}>
                Required volume: <span className='text-gray-900'>{planEditor.requiredVolumeKg} kg</span>
              </p>
              <p className={`text-sm text-gray-600 ${josefinRegular.className}`}>
                Allocated:{' '}
                <span className='text-gray-900'>
                  {planEditor.allocations.reduce((sum, a) => sum + Number(a.allocatedKg || 0), 0)} kg
                </span>
              </p>
              <p className={`text-xs text-gray-500 mt-2 ${josefinRegular.className}`}>
                Picker includes only producers with listings that qualify for this request — same logic as{' '}
                <strong>Auto Match</strong>: category{' '}
                <span className='text-gray-700'>{planEditor.snapshot.category || '—'}</span>
                {planEditor.snapshot.productName ? (
                  <>
                    {' '}
                    and product name <span className='text-gray-700'>«{planEditor.snapshot.productName}»</span> when such
                    listings exist (otherwise any approved product in that category).
                  </>
                ) : (
                  ' (all approved products in that category).'
                )}{' '}
                {productCatalogLoading
                  ? 'Loading catalog…'
                  : `${eligibleCatalogProducts.length} matching option(s).`}
              </p>
            </div>

            {planEditor.allocations.length > 0 ? (
              <>
                <p className={`text-sm font-medium text-gray-800 mb-2 ${josefinSemiBold.className}`}>
                  Allocations — swap producer/product, adjust kg, add or remove rows
                </p>
                <div className='space-y-3'>
                  {planEditor.allocations.map((allocation, index) => (
                    <div key={`${allocation.producerId}-${allocation.productId}-${index}`} className='border border-gray-200 rounded-lg p-3'>
                      <div className='flex flex-wrap items-start justify-between gap-2'>
                        <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>
                          {allocation.producerName} — {allocation.productName}
                        </p>
                        {allocation.producerResponse ? (
                          <span className={`text-xs capitalize text-gray-600 ${josefinRegular.className}`}>
                            Response: {allocation.producerResponse}
                          </span>
                        ) : null}
                      </div>
                      {productCatalogLoading ? (
                        <p className={`text-xs text-gray-500 mt-2 ${josefinRegular.className}`}>Loading product catalog…</p>
                      ) : eligibleCatalogProducts.length > 0 ? (
                        <div className='mt-2'>
                          <label className={`text-xs text-gray-600 block mb-1 ${josefinRegular.className}`}>
                            Producer / product (matches this request only)
                          </label>
                          <select
                            value={
                              eligibleCatalogProducts.some((x: any) => String(x._id) === String(allocation.productId))
                                ? allocation.productId
                                : ''
                            }
                            onChange={(e) => setAllocationProductFromCatalog(index, e.target.value)}
                            className='w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-800 bg-white'>
                            <option value=''>Custom IDs (use fields below)</option>
                            {eligibleCatalogProducts.map((p: any) => (
                              <option key={String(p._id)} value={String(p._id)}>
                                {p.name || 'Product'} · {p.producer?.name || p.producer?.businessName || 'Producer'} · €
                                {Number(p.unitPrice || 0).toFixed(2)}/kg · cap {Number(p.monthlyCapacity || 0)} kg
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <p className={`text-xs text-amber-800 mt-2 ${josefinRegular.className}`}>
                          No listings match this request in the catalog — use Producer / Product IDs below; save still
                          validates on the server.
                        </p>
                      )}
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2'>
                        <div>
                          <label className={`text-xs text-gray-600 ${josefinRegular.className}`}>Producer ID</label>
                          <input
                            value={allocation.producerId}
                            onChange={(e) => updateAllocationIds(index, 'producerId', e.target.value)}
                            className='w-full mt-0.5 border border-gray-300 rounded px-2 py-1 text-xs font-mono text-gray-800'
                          />
                        </div>
                        <div>
                          <label className={`text-xs text-gray-600 ${josefinRegular.className}`}>Product ID</label>
                          <input
                            value={allocation.productId}
                            onChange={(e) => updateAllocationIds(index, 'productId', e.target.value)}
                            className='w-full mt-0.5 border border-gray-300 rounded px-2 py-1 text-xs font-mono text-gray-800'
                          />
                        </div>
                      </div>
                      <p className={`text-xs text-gray-500 mt-2 ${josefinRegular.className}`}>
                        Capacity: {Number(allocation.availableCapacityKg || 0)} kg
                        {allocation.unitPrice != null && Number(allocation.unitPrice) >= 0
                          ? ` · Unit price (invoice line): €${Number(allocation.unitPrice).toFixed(2)}/kg`
                          : ''}
                      </p>
                      <div className='mt-2'>
                        <label className={`text-xs text-gray-600 ${josefinRegular.className}`}>Allocated quantity (kg)</label>
                        <input
                          type='number'
                          min={1}
                          max={
                            Number(allocation.availableCapacityKg || 0) > 0
                              ? Number(allocation.availableCapacityKg || 0)
                              : undefined
                          }
                          step='1'
                          value={allocation.allocatedKg}
                          onChange={(e) => updateEditedAllocation(index, e.target.value)}
                          className='w-full mt-1 border border-gray-300 rounded px-2 py-1 text-sm text-gray-700'
                        />
                      </div>
                      <div className='mt-2 flex justify-end'>
                        <button
                          type='button'
                          disabled={planEditor.allocations.length <= 1}
                          onClick={() => removeAllocationRow(index)}
                          className='text-xs text-red-700 border border-red-200 rounded px-2 py-0.5 hover:bg-red-50 disabled:opacity-40'>
                          Remove row
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type='button'
                  onClick={addAllocationRow}
                  disabled={productCatalogLoading || !eligibleCatalogProducts.length}
                  className={`mt-3 text-sm border border-dashed border-gray-300 rounded px-3 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50 ${josefinRegular.className}`}>
                  + Add allocation
                </button>
              </>
            ) : (
              <div className={`text-sm text-gray-600 mb-4 space-y-3 ${josefinRegular.className}`}>
                <p>No producer allocations yet. Run <strong>Auto Match</strong> or add rows manually.</p>
                <button
                  type='button'
                  onClick={addAllocationRow}
                  disabled={productCatalogLoading || !eligibleCatalogProducts.length}
                  className='text-sm border border-gray-300 rounded px-3 py-2 text-gray-800 hover:bg-gray-50 disabled:opacity-50'>
                  Add first allocation
                </button>
              </div>
            )}

            <div className='flex justify-end gap-2 mt-4'>
              <button
                type='button'
                onClick={() => setPlanEditor(null)}
                className={`border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 ${josefinRegular.className}`}>
                Close
              </button>
              {planEditor.allocations.length > 0 ? (
                <button
                  type='button'
                  onClick={savePlan}
                  disabled={savingPlan}
                  className={`bg-brand-green text-white rounded px-3 py-2 text-sm disabled:opacity-70 ${josefinSemiBold.className}`}>
                  {savingPlan
                    ? 'Saving...'
                    : isPaidCancelledReassign(planEditor.snapshot)
                      ? 'Save & reassign'
                      : 'Save plan'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {reassignSingle && (
        <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4'>
          <div className='bg-white w-full max-w-md rounded-lg border border-gray-200 p-4 shadow-lg'>
            <div className='flex items-center justify-between mb-2'>
              <h2 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>Reassign producer</h2>
              <button
                type='button'
                onClick={() => {
                  setReassignSingle(null);
                  setReassignProductId('');
                }}
                className='text-gray-500 hover:text-gray-800 p-1'
                aria-label='Close'>
                <X className='w-5 h-5' />
              </button>
            </div>
            <p className={`text-sm text-gray-600 mb-3 ${josefinRegular.className}`}>
              Choose an approved listing. The trade reopens for the new supplier to accept; the buyer&apos;s payment
              remains recorded.
            </p>
            {reassignCatalogLoading ? (
              <p className={`text-sm text-gray-500 mb-3 ${josefinRegular.className}`}>Loading listings…</p>
            ) : eligibleReassignProducts.length === 0 ? (
              <p className={`text-sm text-amber-800 mb-3 ${josefinRegular.className}`}>
                No matching approved products for this request category. Add or approve listings first.
              </p>
            ) : (
              <label className={`block text-sm text-gray-700 mb-1 ${josefinSemiBold.className}`}>Product listing</label>
            )}
            {eligibleReassignProducts.length > 0 ? (
              <select
                value={reassignProductId}
                onChange={(e) => setReassignProductId(e.target.value)}
                className='w-full border border-gray-300 rounded px-2 py-2 text-sm mb-4'>
                <option value=''>Select…</option>
                {eligibleReassignProducts.map((p: any) => (
                  <option key={String(p._id)} value={String(p._id)}>
                    {p.name || 'Product'} · {p.producer?.name || p.producer?.businessName || 'Producer'}
                  </option>
                ))}
              </select>
            ) : null}
            <div className='flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => {
                  setReassignSingle(null);
                  setReassignProductId('');
                }}
                className={`border border-gray-300 rounded px-3 py-1.5 text-sm ${josefinRegular.className}`}>
                Cancel
              </button>
              <button
                type='button'
                disabled={reassignBusy || !reassignProductId.trim() || eligibleReassignProducts.length === 0}
                onClick={submitReassignSingle}
                className={`bg-brand-green text-white rounded px-3 py-1.5 text-sm disabled:opacity-50 ${josefinSemiBold.className}`}>
                {reassignBusy ? 'Saving…' : 'Confirm reassignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
