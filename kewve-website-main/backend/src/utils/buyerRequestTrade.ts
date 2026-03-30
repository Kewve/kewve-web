import { createHash, timingSafeEqual } from "crypto";
import { BuyerRequest } from "../models/BuyerRequest.js";
import type { BuyerRequestDocument } from "../models/BuyerRequest.js";
import { Product } from "../models/Product.js";
import { notifyProducersTradePaid } from "./tradeNotifyMail.js";

export const FULFILLMENT_STATUSES = [
  "none",
  "processing",
  "dispatched",
  "delivered",
  "cancelled",
  "completed",
] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];
const FULFILLMENT_STAGE_RANK: Record<FulfillmentStatus, number> = {
  none: 0,
  processing: 1,
  dispatched: 2,
  delivered: 3,
  completed: 4,
  cancelled: -1,
};

export function ensureTrade(doc: BuyerRequestDocument): NonNullable<BuyerRequestDocument["trade"]> {
  if (!doc.trade) {
    (doc as any).trade = {};
  }
  return doc.trade!;
}

/** Allocations with a positive kg share. */
export function getActiveAllocations(doc: BuyerRequestDocument): NonNullable<BuyerRequestDocument["matchPlan"]>["allocations"] {
  return (doc.matchPlan?.allocations || []).filter((a: any) => Number(a?.allocatedKg || 0) > 0);
}

export function isAggregationStyle(doc: Pick<BuyerRequestDocument, "fulfillmentMode" | "matchPlan">): boolean {
  if (doc.fulfillmentMode === "aggregation") return true;
  return getActiveAllocations(doc as BuyerRequestDocument).length > 1;
}

/**
 * Producer API: only return the viewer's allocation rows so other suppliers stay private.
 * Do not use structuredClone on Mongoose lean docs — BSON ObjectId does not clone reliably and
 * can turn into `{}`, breaking `_id` / `producerId` in JSON (wrong Ref, Accept/Decline hidden).
 */
/** Remove ops-only internal notes from trade before sending to buyer or producer. */
export function stripIssueAdminNotesFromTradeJson(trade: Record<string, unknown> | undefined | null): void {
  if (!trade || typeof trade !== "object") return;
  delete trade.issueAdminNotes;
}

export function stripIssueAdminNotesFromBuyerRequestRow(row: Record<string, unknown>): void {
  const tr = row.trade as Record<string, unknown> | undefined;
  stripIssueAdminNotesFromTradeJson(tr);
}

export function stripAggregationAllocationsForProducerView<T extends Record<string, unknown>>(doc: T, viewerProducerId: string): T {
  if (!isAggregationStyle(doc as unknown as BuyerRequestDocument)) {
    return doc;
  }
  const plain = JSON.parse(JSON.stringify(doc)) as T;
  const uid = String(viewerProducerId);
  const allocs = (plain as { matchPlan?: { allocations?: unknown } }).matchPlan?.allocations;
  if (!Array.isArray(allocs)) {
    return plain;
  }
  (plain as { matchPlan?: Record<string, unknown> }).matchPlan = {
    ...((plain as { matchPlan?: Record<string, unknown> }).matchPlan || {}),
    allocations: allocs.filter((a: { producerId?: unknown }) => String(a.producerId) === uid),
  };
  return plain;
}

export function tradeIsTerminalClosed(doc: BuyerRequestDocument): boolean {
  const t = doc.trade;
  if (!t) return false;
  if (t.transactionClosed) return true;
  if (t.producerDecision === "declined" && !isAggregationStyle(doc)) return true;
  if (t.fulfillmentStatus === "cancelled") return true;
  if (t.buyerReceipt === "received_ok") return true;
  return false;
}

export function applyTradeClosureRules(doc: BuyerRequestDocument): void {
  const t = ensureTrade(doc);
  if (!t.transactionClosed) {
    const declineCloses = t.producerDecision === "declined" && !isAggregationStyle(doc);
    if (declineCloses || t.fulfillmentStatus === "cancelled" || t.buyerReceipt === "received_ok") {
      t.transactionClosed = true;
      t.transactionClosedAt = new Date();
    }
  }
  syncLegacyRequestStatusWithTrade(doc);
}

/** Keeps pipeline `status` aligned with trade (buyer Requests page, Match column, etc.). */
export function syncLegacyRequestStatusWithTrade(doc: BuyerRequestDocument): void {
  const t = doc.trade;
  const fs = t?.fulfillmentStatus;

  const issueOpen = t?.buyerReceipt === "received_issues" && t?.issuesNeedAdmin;
  const awaitingBuyerReceipt =
    !!t?.invoice?.paidAt &&
    t?.producerDecision === "accepted" &&
    (fs === "delivered" || fs === "completed") &&
    t?.buyerReceipt === "none";

  const declineClosesRequest = t?.producerDecision === "declined" && !isAggregationStyle(doc);
  const shouldClose =
    !issueOpen &&
    !awaitingBuyerReceipt &&
    (t?.transactionClosed === true || declineClosesRequest || fs === "cancelled" || t?.buyerReceipt === "received_ok");

  if (shouldClose) {
    doc.status = "closed";
    return;
  }

  if (issueOpen || awaitingBuyerReceipt) {
    if (doc.status === "closed") {
      doc.status = "matched";
    }
  }
}

export function isPrimaryProducer(doc: BuyerRequestDocument, userId: string): boolean {
  return doc.producerId.toString() === userId;
}

/** Lead on the request, or the only active allocation (handles bad/missing top-level producerId vs match plan). Non-aggregation only for the sole-alloc fallback. */
export function isLeadOrSoleAllocatedProducer(doc: BuyerRequestDocument, userId: string): boolean {
  if (isPrimaryProducer(doc, userId)) return true;
  if (isAggregationStyle(doc)) return false;
  const active = getActiveAllocations(doc);
  if (active.length !== 1) return false;
  return String((active[0] as any).producerId) === userId;
}

/** Sync trade.producerDecision from per-allocation responses (aggregation) or single allocation. */
export function syncTradeProducerDecisionFromAllocations(doc: BuyerRequestDocument): void {
  const t = ensureTrade(doc);
  const allocs = getActiveAllocations(doc);
  const mp = doc.matchPlan;

  if (isAggregationStyle(doc) && (mp?.allocations?.length || 0) > 0) {
    const rem = Number(mp?.remainingVolumeKg ?? 0);
    const allAccepted =
      allocs.length > 0 && allocs.every((a: any) => String(a.producerResponse || "pending") === "accepted");
    if (allAccepted && rem === 0) {
      t.producerDecision = "accepted";
      t.declinedReason = "";
      t.declinedAt = undefined;
    } else {
      t.producerDecision = "pending";
      t.declinedReason = "";
      t.declinedAt = undefined;
    }
    return;
  }

  if (allocs.length === 1) {
    const a = allocs[0] as any;
    const ar = String(a.producerResponse || t.producerDecision || "pending");
    if (ar === "accepted" || ar === "declined") {
      t.producerDecision = ar as "accepted" | "declined";
      if (ar === "declined") {
        t.declinedReason = String(a.declinedReason || "");
        t.declinedAt = a.declinedAt || new Date();
      } else {
        t.declinedReason = "";
        t.declinedAt = undefined;
      }
    }
  }
}

/**
 * For aggregation requests, keep top-level trade.fulfillmentStatus aligned with all accepted producer lines.
 * Buyer-facing stage only advances when every accepted allocation reaches that stage.
 */
export function syncTradeFulfillmentFromAllocations(doc: BuyerRequestDocument): void {
  if (!isAggregationStyle(doc)) return;
  const t = ensureTrade(doc);
  const accepted = getActiveAllocations(doc).filter((a: any) => String(a.producerResponse || "pending") === "accepted");
  if (!accepted.length) {
    t.fulfillmentStatus = "none";
    return;
  }
  const statuses = accepted.map((a: any) => String(a.fulfillmentStatus || "none") as FulfillmentStatus);
  if (statuses.some((s) => s === "cancelled")) {
    t.fulfillmentStatus = "cancelled";
    return;
  }
  const minRank = statuses.reduce((min, s) => Math.min(min, FULFILLMENT_STAGE_RANK[s] ?? 0), Number.POSITIVE_INFINITY);
  if (minRank >= FULFILLMENT_STAGE_RANK.completed) t.fulfillmentStatus = "completed";
  else if (minRank >= FULFILLMENT_STAGE_RANK.delivered) t.fulfillmentStatus = "delivered";
  else if (minRank >= FULFILLMENT_STAGE_RANK.dispatched) t.fulfillmentStatus = "dispatched";
  else if (minRank >= FULFILLMENT_STAGE_RANK.processing) t.fulfillmentStatus = "processing";
  else t.fulfillmentStatus = "none";
}

export function aggregationReadyForInvoice(doc: BuyerRequestDocument): { ok: true } | { ok: false; message: string } {
  if (!isAggregationStyle(doc)) return { ok: true };
  const rem = Number(doc.matchPlan?.remainingVolumeKg ?? 0);
  if (rem > 0) {
    return { ok: false, message: "Match plan must cover the full requested volume before invoicing." };
  }
  const allocs = getActiveAllocations(doc);
  if (!allocs.length) {
    return { ok: false, message: "No allocations on this request." };
  }
  for (const a of allocs) {
    if (String((a as any).producerResponse || "pending") !== "accepted") {
      return { ok: false, message: "Every allocated producer must accept before the lead can send an invoice." };
    }
  }
  return { ok: true };
}

/** Product subtotal (cents) from accepted allocations × each product unit price. */
export function computeAggregationInvoiceProductSubtotalCents(doc: BuyerRequestDocument): number {
  let sum = 0;
  for (const a of getActiveAllocations(doc)) {
    if (String((a as any).producerResponse || "pending") !== "accepted") continue;
    sum += Math.round(Number((a as any).unitPrice || 0) * Number((a as any).allocatedKg || 0) * 100);
  }
  return sum;
}

export function invoiceIsPaid(doc: BuyerRequestDocument): boolean {
  const paid = doc.trade?.invoice?.paidAt;
  return !!paid;
}

export function verifyPayoutPasscode(input: string, expected: string | undefined): boolean {
  if (!expected || typeof input !== "string") return false;
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Platform fee on product subtotal only; optional additional fees (e.g. delivery) without extra %. */
export function computeInvoiceCentsFromProductSubtotal(
  productSubtotalCents: number,
  additionalFeesCents = 0,
  platformFeePercent = 10
) {
  const subtotalCents = Math.max(0, Math.round(Number(productSubtotalCents || 0)));
  const extra = Math.max(0, Math.round(Number(additionalFeesCents || 0)));
  const platformFeeCents = Math.round((subtotalCents * platformFeePercent) / 100);
  const totalCents = subtotalCents + extra + platformFeeCents;
  return {
    subtotalCents,
    additionalFeesCents: extra,
    platformFeeCents,
    totalCents,
    platformFeePercent,
  };
}

/**
 * Single-line product: unitPrice × volumeKg (same as productSubtotal in cents).
 * For aggregation, use computeInvoiceCentsFromProductSubtotal(computeAggregationInvoiceProductSubtotalCents(doc), ...).
 */
export function computeInvoiceCents(
  unitPrice: number,
  volumeKg: number,
  additionalFeesCents = 0,
  platformFeePercent = 10
) {
  const productLine = Math.round(Number(unitPrice || 0) * Number(volumeKg || 0) * 100);
  return computeInvoiceCentsFromProductSubtotal(productLine, additionalFeesCents, platformFeePercent);
}

/** Validates preconditions, computes amounts, sets `trade.invoice` with sentAt (does not save). */
export async function issueTradeInvoiceIfEligible(
  requestDoc: BuyerRequestDocument,
  params: { additionalFeesCents: number; additionalFeesNote: string }
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (tradeIsTerminalClosed(requestDoc)) {
    return { ok: false, message: "This transaction is closed." };
  }
  const t = ensureTrade(requestDoc);
  const aggReady = aggregationReadyForInvoice(requestDoc);
  if (!aggReady.ok) {
    return aggReady;
  }
  if (t.producerDecision !== "accepted") {
    return { ok: false, message: "All producers must accept before generating an invoice." };
  }
  if (invoiceIsPaid(requestDoc)) {
    return { ok: false, message: "Invoice is already marked paid." };
  }
  if (t.invoice?.sentAt) {
    return { ok: false, message: "An invoice was already sent for this request." };
  }

  const platformFeePercent = 10;
  let cents;
  if (isAggregationStyle(requestDoc)) {
    const productSubtotalCents = computeAggregationInvoiceProductSubtotalCents(requestDoc);
    cents = computeInvoiceCentsFromProductSubtotal(
      productSubtotalCents,
      params.additionalFeesCents,
      platformFeePercent
    );
  } else {
    const product = await Product.findById(requestDoc.productId).select("unitPrice").lean();
    const unitPrice = Number(product?.unitPrice || 0);
    const volumeKg = Number(requestDoc.volumeKg || 0);
    cents = computeInvoiceCents(unitPrice, volumeKg, params.additionalFeesCents, platformFeePercent);
  }

  const now = new Date();
  t.invoice = {
    currency: "eur",
    platformFeePercent,
    subtotalCents: cents.subtotalCents,
    additionalFeesCents: cents.additionalFeesCents,
    additionalFeesNote: params.additionalFeesNote.trim().slice(0, 200),
    platformFeeCents: cents.platformFeeCents,
    totalCents: cents.totalCents,
    generatedAt: now,
    sentAt: now,
  };
  return { ok: true };
}

/**
 * Single-supplier trade: producer gets producer fee (product subtotal) + delivery (invoice additional fees) =
 * buyer total paid minus platform fee only.
 */
export function invoiceProducerPayoutCents(inv: {
  subtotalCents?: number;
  additionalFeesCents?: number;
  totalCents?: number;
  platformFeeCents?: number;
}): number {
  const total = Math.round(Number(inv?.totalCents || 0));
  const platform = Math.round(Number(inv?.platformFeeCents || 0));
  if (Number.isFinite(total) && total > 0 && Number.isFinite(platform)) {
    return Math.max(0, total - platform);
  }
  const sub = Math.max(0, Math.round(Number(inv?.subtotalCents || 0)));
  const add = Math.max(0, Math.round(Number(inv?.additionalFeesCents || 0)));
  return sub + add;
}

export function computeProducerPayoutPreviewForRequest(
  doc: any,
  producerId: string
): {
  grossShareCents: number;
  additionalFeesShareCents: number;
  payoutCents: number;
  payoutStatus: "none" | "pending" | "completed" | "failed";
  errorMessage?: string;
} {
  const t = doc?.trade || {};
  const inv = t?.invoice || {};
  if (!isAggregationStyle(doc as BuyerRequestDocument)) {
    return {
      grossShareCents: Number(inv?.subtotalCents || 0),
      additionalFeesShareCents: Math.max(0, Math.round(Number(inv?.additionalFeesCents || 0))),
      payoutCents: invoiceProducerPayoutCents(inv),
      payoutStatus: (t?.payout?.status || "none") as "none" | "pending" | "completed" | "failed",
      errorMessage: t?.payout?.errorMessage,
    };
  }

  const active = getActiveAllocations(doc as BuyerRequestDocument);
  const accepted = active.filter((a: any) => String(a?.producerResponse || "pending") === "accepted");
  const mine = accepted.filter((a: any) => String(a?.producerId) === String(producerId));
  const grossShareCents = mine.reduce((sum: number, a: any) => {
    return sum + Math.round(Number(a?.unitPrice || 0) * Number(a?.allocatedKg || 0) * 100);
  }, 0);
  const additionalFeesShareCents = 0;
  const expected = grossShareCents;

  const statuses = mine.map((a: any) => String(a?.payout?.status || "none"));
  const actualAmount = mine.reduce((sum: number, a: any) => {
    const st = String(a?.payout?.status || "none");
    const amt = Number(a?.payout?.amountCents || 0);
    return ["pending", "completed"].includes(st) && amt > 0 ? sum + amt : sum;
  }, 0);
  const payoutStatus = statuses.includes("failed")
    ? "failed"
    : mine.length > 0 && statuses.every((s: string) => s === "completed")
      ? "completed"
      : statuses.includes("pending")
        ? "pending"
        : "none";
  const firstError = mine.find((a: any) => a?.payout?.errorMessage)?.payout?.errorMessage;

  return {
    grossShareCents,
    additionalFeesShareCents,
    payoutCents: actualAmount > 0 ? actualAmount : expected,
    payoutStatus,
    errorMessage: firstError || undefined,
  };
}

/** Idempotent: sets paidAt when Stripe payment matches invoice total (webhook or sync). */
export async function markTradeInvoicePaidFromStripe(params: {
  buyerRequestId: string;
  amountTotalCents: number | null | undefined;
  currency: string | null | undefined;
}): Promise<{ applied: boolean; alreadyPaid?: boolean; skipReason?: string }> {
  const doc = await BuyerRequest.findById(params.buyerRequestId);
  if (!doc) return { applied: false, skipReason: "request_not_found" };

  const t = ensureTrade(doc);
  const inv = t.invoice;
  if (!inv?.sentAt) return { applied: false, skipReason: "no_invoice" };
  if (inv.paidAt) return { applied: false, alreadyPaid: true };

  const expected = Number(inv.totalCents || 0);
  const got = params.amountTotalCents;
  if (!expected || got == null || got !== expected) {
    return { applied: false, skipReason: "amount_mismatch" };
  }
  const cur = String(inv.currency || "eur").toLowerCase();
  if (params.currency && String(params.currency).toLowerCase() !== cur) {
    return { applied: false, skipReason: "currency_mismatch" };
  }

  inv.paidAt = new Date();
  syncLegacyRequestStatusWithTrade(doc);
  await doc.save();
  void notifyProducersTradePaid(doc);
  return { applied: true };
}
