import { Types } from "mongoose";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { AggregationCluster } from "../models/AggregationCluster.js";
import { transferToConnectAccount } from "../services/stripePayout.js";
const DEFAULT_PLATFORM_FEE_PERCENT = 10;
export function computeInvoiceCentsFromSubtotal(subtotalCents, platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT) {
    const platformFeeCents = Math.round((subtotalCents * platformFeePercent) / 100);
    const totalCents = subtotalCents + platformFeeCents;
    return { subtotalCents, platformFeeCents, totalCents, platformFeePercent };
}
/** Same priority as buyer cluster request: largest committed first. */
export function allocateVolumeAcrossContributions(contributions, volumeKg) {
    const approved = (contributions || [])
        .filter((c) => c.status === "approved" && Number(c.committedKg || 0) > 0)
        .sort((a, b) => Number(b.committedKg || 0) - Number(a.committedKg || 0));
    let remaining = volumeKg;
    const allocations = [];
    for (const contribution of approved) {
        if (remaining <= 0)
            break;
        const cap = Number(contribution.committedKg || 0);
        const allocated = Math.min(remaining, cap);
        if (allocated <= 0)
            continue;
        allocations.push({ contribution, allocatedKg: allocated });
        remaining -= allocated;
    }
    const totalAllocatedKg = volumeKg - Math.max(remaining, 0);
    return { allocations, remainingKg: Math.max(remaining, 0), totalAllocatedKg };
}
export async function buildSettlementForCluster(cluster, volumeKg, market, timeline, platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT, additionalFeesCents = 0) {
    const { allocations, remainingKg, totalAllocatedKg } = allocateVolumeAcrossContributions(cluster.contributions || [], volumeKg);
    if (!allocations.length) {
        return { error: "No approved producer capacity for this cluster." };
    }
    if (remainingKg > 0) {
        return {
            error: `Requested volume exceeds available approved capacity (short by ${remainingKg} kg).`,
        };
    }
    const productIds = allocations.map((a) => a.contribution.productId);
    const products = await Product.find({ _id: { $in: productIds } })
        .select("unitPrice")
        .lean();
    const priceById = new Map();
    for (const p of products) {
        priceById.set(String(p._id), Number(p.unitPrice || 0));
    }
    const lineSubtotalCents = [];
    let subtotalCents = 0;
    for (const row of allocations) {
        const unit = priceById.get(String(row.contribution.productId)) || 0;
        if (!unit || unit <= 0) {
            return {
                error: `Missing unit price for product ${row.contribution.productName || row.contribution.productId}.`,
            };
        }
        const cents = Math.round(Number(row.allocatedKg) * unit * 100);
        lineSubtotalCents.push(cents);
        subtotalCents += cents;
    }
    const addFees = Math.max(0, Math.round(Number(additionalFeesCents || 0)));
    const platformFeeCents = Math.round((subtotalCents * platformFeePercent) / 100);
    const totalCents = subtotalCents + addFees + platformFeeCents;
    const entries = allocations.map((row, i) => {
        const grossShareCents = lineSubtotalCents[i] ?? 0;
        const additionalFeesShareCents = 0;
        const adjustmentCents = 0;
        const netPayoutCents = Math.max(0, grossShareCents + additionalFeesShareCents + adjustmentCents);
        const sharePercent = totalAllocatedKg > 0 ? Math.round((row.allocatedKg * 10000) / totalAllocatedKg) / 100 : 0;
        return {
            contributionId: row.contribution._id,
            producerId: row.contribution.producerId,
            producerName: row.contribution.producerName,
            productId: row.contribution.productId,
            productName: row.contribution.productName,
            allocatedKg: row.allocatedKg,
            sharePercent,
            grossShareCents,
            additionalFeesShareCents,
            adjustmentCents,
            netPayoutCents,
            supplyStatus: "pending",
            payout: { status: "none" },
        };
    });
    const settlement = {
        computedAt: new Date(),
        buyerVolumeKg: volumeKg,
        totalAllocatedKg,
        subtotalCents,
        additionalFeesCents: addFees,
        platformFeePercent,
        platformFeeCents,
        totalPaidCents: totalCents,
        currency: "eur",
        market,
        timeline,
        entries,
    };
    return { settlement };
}
export async function applyClusterPurchaseFromPaidSession(params) {
    const session = params.session;
    if (session.metadata?.type !== "cluster_checkout" || !session.metadata?.aggregationClusterId) {
        return { applied: false, skipReason: "not_cluster_checkout" };
    }
    const clusterId = String(session.metadata.aggregationClusterId);
    const buyerId = String(session.metadata.buyerId || "");
    const volumeKg = Number(session.metadata.volumeKg || 0);
    const market = String(session.metadata.market || "").trim() || "—";
    const timeline = String(session.metadata.timeline || "").trim() || "—";
    const additionalFeesCents = Math.max(0, Math.round(Number(session.metadata.additionalFeesCents || 0)));
    if (!buyerId || !volumeKg) {
        return { applied: false, skipReason: "missing_metadata" };
    }
    const doc = await AggregationCluster.findById(clusterId);
    if (!doc)
        return { applied: false, skipReason: "cluster_not_found" };
    if (doc.purchase?.paidAt) {
        return { applied: false, alreadyPaid: true };
    }
    const { settlement, error } = await buildSettlementForCluster(doc, volumeKg, market, timeline, undefined, additionalFeesCents);
    if (error) {
        return { applied: false, skipReason: error };
    }
    if (!settlement) {
        return { applied: false, skipReason: "settlement_failed" };
    }
    const expectedTotal = settlement.totalPaidCents;
    const got = session.amount_total;
    if (got == null || got !== expectedTotal) {
        return { applied: false, skipReason: `amount_mismatch:expected_${expectedTotal}_got_${got}` };
    }
    const cur = String(session.currency || "eur").toLowerCase();
    if (cur !== settlement.currency) {
        return { applied: false, skipReason: "currency_mismatch" };
    }
    const buyer = await User.findById(buyerId).select("name email");
    const prevPurchase = doc.purchase || {};
    const now = new Date();
    doc.purchase = {
        buyerId: prevPurchase.buyerId || new Types.ObjectId(buyerId),
        buyerName: prevPurchase.buyerName || buyer?.name || "",
        buyerEmail: prevPurchase.buyerEmail || buyer?.email || "",
        paidAt: now,
        stripeCheckoutSessionId: prevPurchase.stripeCheckoutSessionId || session.id,
        volumeKg: Number(prevPurchase.volumeKg || volumeKg),
        market: String(prevPurchase.market || market),
        timeline: String(prevPurchase.timeline || timeline),
        invoice: prevPurchase.invoice || {
            currency: settlement.currency,
            subtotalCents: settlement.subtotalCents,
            additionalFeesCents: Number(settlement.additionalFeesCents || 0),
            platformFeePercent: settlement.platformFeePercent,
            platformFeeCents: settlement.platformFeeCents,
            totalCents: settlement.totalPaidCents,
            generatedAt: now,
            sentAt: now,
        },
        buyerReceipt: "none",
        issuesNeedAdmin: false,
        refund: { status: "none" },
    };
    doc.settlement = settlement;
    doc.status = "closed";
    await doc.save();
    return { applied: true };
}
export async function tryPayoutClusterSettlementEntry(clusterId, entryId) {
    const cluster = await AggregationCluster.findById(clusterId);
    if (!cluster || !cluster.settlement?.entries?.length) {
        return { ok: false, message: "Cluster or settlement not found." };
    }
    const entries = cluster.settlement.entries;
    const entry = entries.find((e) => String(e._id) === entryId);
    if (!entry)
        return { ok: false, message: "Settlement entry not found." };
    if (entry.supplyStatus !== "accepted") {
        return { ok: false, message: "Producer supply must be marked accepted before payout." };
    }
    if (String(cluster.purchase?.buyerReceipt || "none") !== "received_ok") {
        return { ok: false, message: "Buyer receipt must be marked received_ok before payout." };
    }
    const payout = entry.payout || { status: "none" };
    if (payout.status === "completed") {
        return { ok: true, message: "Already paid." };
    }
    if (payout.status === "pending") {
        return { ok: false, message: "Payout already in progress." };
    }
    const amount = Number(entry.netPayoutCents || 0);
    if (amount < 1) {
        entry.payout = { ...payout, status: "failed", errorMessage: "Zero or negative payout amount." };
        cluster.markModified("settlement.entries");
        cluster.markModified("settlement");
        await cluster.save();
        return { ok: false, message: "Invalid payout amount." };
    }
    const producer = await User.findById(entry.producerId).select("stripeConnectAccountId name email");
    const dest = String(producer?.stripeConnectAccountId || "").trim();
    if (!dest.startsWith("acct_")) {
        entry.payout = {
            status: "failed",
            amountCents: amount,
            errorMessage: "Producer has no Stripe Connect account (acct_…).",
        };
        cluster.markModified("settlement.entries");
        cluster.markModified("settlement");
        await cluster.save();
        return { ok: false, message: entry.payout.errorMessage || "" };
    }
    entry.payout = { status: "pending", amountCents: amount, initiatedAt: new Date() };
    cluster.markModified("settlement.entries");
    cluster.markModified("settlement");
    await cluster.save();
    try {
        const transfer = await transferToConnectAccount({
            amountCents: amount,
            destinationAccountId: dest,
            metadata: {
                clusterId: String(cluster._id),
                settlementEntryId: entryId,
                producerId: String(entry.producerId),
            },
        });
        entry.payout = {
            status: "completed",
            amountCents: amount,
            stripeTransferId: transfer.id,
            initiatedAt: entry.payout.initiatedAt,
        };
        cluster.markModified("settlement.entries");
        cluster.markModified("settlement");
        await cluster.save();
        return { ok: true };
    }
    catch (e) {
        entry.payout = {
            status: "failed",
            amountCents: amount,
            initiatedAt: entry.payout.initiatedAt,
            errorMessage: e?.message || "Transfer failed",
        };
        cluster.markModified("settlement.entries");
        cluster.markModified("settlement");
        await cluster.save();
        return { ok: false, message: entry.payout.errorMessage };
    }
}
