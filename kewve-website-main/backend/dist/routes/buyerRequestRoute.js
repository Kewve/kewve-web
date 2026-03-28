import { Router } from "express";
import Stripe from "stripe";
import { authenticate } from "../middleware/auth.js";
import { userHasRole } from "../utils/userRoles.js";
import { Product } from "../models/Product.js";
import { BuyerRequest } from "../models/BuyerRequest.js";
import { User } from "../models/User.js";
import { applyTradeClosureRules, computeProducerPayoutPreviewForRequest, ensureTrade, FULFILLMENT_STATUSES, getActiveAllocations, invoiceIsPaid, isAggregationStyle, isLeadOrSoleAllocatedProducer, isPrimaryProducer, issueTradeInvoiceIfEligible, markTradeInvoicePaidFromStripe, stripAggregationAllocationsForProducerView, stripIssueAdminNotesFromBuyerRequestRow, syncLegacyRequestStatusWithTrade, syncTradeFulfillmentFromAllocations, syncTradeProducerDecisionFromAllocations, tradeIsTerminalClosed, } from "../utils/buyerRequestTrade.js";
import { sendAdminNotificationEmail } from "../utils/adminMail.js";
import { displayIdSuffix } from "../utils/displayId.js";
import { notifyBuyerInvoiceSent } from "../utils/tradeNotifyMail.js";
const router = Router();
async function notifyAdminProducerCancelledPaidOrder(requestDoc, producerLabel, reason) {
    const id = String(requestDoc._id);
    const subject = `[Kewve] Paid order cancelled by producer — ${requestDoc.productName || "Request"}`;
    const text = [
        "A producer cancelled a paid order and submitted a reason.",
        "",
        `Request ID: ${displayIdSuffix(id)}`,
        `Buyer: ${requestDoc.buyerName} <${requestDoc.buyerEmail}>`,
        `Product: ${requestDoc.productName}`,
        `Producer: ${producerLabel}`,
        "",
        "Reason:",
        reason,
        "",
        "Reassign another producer in Ops → Trade operations (Reassign producer).",
    ].join("\n");
    try {
        await sendAdminNotificationEmail({ subject, text });
    }
    catch (e) {
        console.error("notifyAdminProducerCancelledPaidOrder:", e);
    }
}
function parseRequestDeliveryAddress(body) {
    const b = body;
    const d = b?.deliveryAddress;
    if (!d || typeof d !== "object") {
        return { ok: false, message: "deliveryAddress is required (line1, city, postalCode, country)." };
    }
    const o = d;
    const line1 = String(o.line1 ?? "").trim().slice(0, 500);
    const line2 = String(o.line2 ?? "").trim().slice(0, 500);
    const city = String(o.city ?? "").trim().slice(0, 200);
    const postalCode = String(o.postalCode ?? "").trim().slice(0, 64);
    const country = String(o.country ?? "").trim().slice(0, 120);
    const phone = String(o.phone ?? "").trim().slice(0, 80);
    const company = String(o.company ?? "").trim().slice(0, 200);
    if (!line1 || !city || !postalCode || !country) {
        return { ok: false, message: "Delivery address needs line1, city, postalCode, and country." };
    }
    return { ok: true, value: { line1, line2, city, postalCode, country, phone, company } };
}
function getFrontendOrigin() {
    const raw = process.env.FRONTEND_URL || "http://localhost:3000";
    return raw.split(",")[0].trim();
}
const ALLOWED_STATUSES = ["pending", "in_review", "matched", "closed"];
// POST /api/buyer-requests - Buyer creates a request for a product
router.post("/buyer-requests", authenticate, async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        if (!userHasRole(authUser, "buyer")) {
            res.status(403).json({ success: false, message: "Only buyers can create product requests." });
            return;
        }
        const { productId, volumeKg, market, timeline, packagingFormat } = req.body || {};
        if (!productId || !volumeKg || !market || !timeline) {
            res.status(400).json({ success: false, message: "productId, volumeKg, market and timeline are required." });
            return;
        }
        const deliveryParsed = parseRequestDeliveryAddress(req.body);
        if (!deliveryParsed.ok) {
            res.status(400).json({ success: false, message: deliveryParsed.message });
            return;
        }
        const product = await Product.findOne({
            _id: productId,
            readiness: "approved",
            verification: "verified",
        }).select("name category userId monthlyCapacity unitPrice minimumOrderQuantity");
        if (!product) {
            res.status(404).json({ success: false, message: "Product not found or not eligible for requests." });
            return;
        }
        const parsedVolume = Number(volumeKg);
        if (!Number.isFinite(parsedVolume) || parsedVolume <= 0) {
            res.status(400).json({ success: false, message: "Volume must be a valid number greater than zero." });
            return;
        }
        const producer = await User.findById(product.userId).select("name").lean();
        const producerName = producer?.name || "Producer";
        const canSingleSupply = Number(product.monthlyCapacity || 0) >= parsedVolume;
        const minimumOrderQuantity = Number(product.minimumOrderQuantity || 0);
        if (canSingleSupply && minimumOrderQuantity > 0 && parsedVolume < minimumOrderQuantity) {
            res.status(400).json({
                success: false,
                message: `Minimum order quantity for this product is ${minimumOrderQuantity} kg.`,
            });
            return;
        }
        const created = await BuyerRequest.create({
            buyerId: authUser._id,
            buyerName: authUser.name || "Buyer",
            buyerEmail: authUser.email,
            producerId: product.userId,
            productId: product._id,
            productName: product.name || "Untitled Product",
            category: product.category || "uncategorized",
            volumeKg: parsedVolume,
            market: String(market),
            timeline: String(timeline),
            packagingFormat: String(packagingFormat || ""),
            deliveryAddress: deliveryParsed.value,
            status: canSingleSupply ? "matched" : "pending",
            fulfillmentMode: canSingleSupply ? "single" : "aggregation",
            matchPlan: canSingleSupply
                ? {
                    generatedAt: new Date(),
                    requiredVolumeKg: parsedVolume,
                    totalAllocatedKg: parsedVolume,
                    remainingVolumeKg: 0,
                    matchedProducerCount: 1,
                    allocations: [
                        {
                            producerId: product.userId,
                            producerName,
                            productId: product._id,
                            productName: product.name || "Untitled Product",
                            allocatedKg: parsedVolume,
                            availableCapacityKg: Number(product.monthlyCapacity || 0),
                            unitPrice: Number(product.unitPrice || 0),
                            producerResponse: "pending",
                            fulfillmentStatus: "none",
                        },
                    ],
                }
                : undefined,
        });
        res.status(201).json({ success: true, data: created });
    }
    catch (error) {
        console.error("Create buyer request error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to create buyer request" });
    }
});
// GET /api/buyer-requests - Buyer sees own requests, producer sees requests for own products
router.get("/buyer-requests", authenticate, async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        if (userHasRole(authUser, "buyer")) {
            const data = await BuyerRequest.find({ buyerId: authUser._id }).sort({ createdAt: -1 }).lean();
            res.status(200).json({ success: true, data });
            return;
        }
        if (userHasRole(authUser, "producer")) {
            const data = await BuyerRequest.find({
                $or: [{ producerId: authUser._id }, { "matchPlan.allocations.producerId": authUser._id }],
            })
                .sort({ createdAt: -1 })
                .lean();
            const uid = authUser._id.toString();
            const sanitized = data.map((row) => {
                const safe = stripAggregationAllocationsForProducerView(row, uid);
                stripIssueAdminNotesFromBuyerRequestRow(safe);
                const preview = computeProducerPayoutPreviewForRequest(row, uid);
                safe.trade = { ...(safe.trade || {}), producerPayoutPreview: preview };
                return safe;
            });
            res.status(200).json({ success: true, data: sanitized });
            return;
        }
        res.status(403).json({ success: false, message: "Unauthorized for buyer request access." });
    }
    catch (error) {
        console.error("List buyer requests error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to fetch buyer requests" });
    }
});
// GET /api/buyer-requests/:id — single request (buyer: own; producer: involved)
router.get("/buyer-requests/:id", authenticate, async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const doc = await BuyerRequest.findById(req.params.id);
        if (!doc) {
            res.status(404).json({ success: false, message: "Buyer request not found." });
            return;
        }
        if (userHasRole(authUser, "buyer")) {
            if (doc.buyerId.toString() !== authUser._id.toString()) {
                res.status(403).json({ success: false, message: "Forbidden." });
                return;
            }
            res.status(200).json({ success: true, data: doc });
            return;
        }
        if (userHasRole(authUser, "producer")) {
            const involved = isPrimaryProducer(doc, authUser._id.toString()) ||
                (doc.matchPlan?.allocations || []).some((a) => String(a.producerId) === authUser._id.toString());
            if (!involved) {
                res.status(403).json({ success: false, message: "Forbidden." });
                return;
            }
            const payload = stripAggregationAllocationsForProducerView(doc.toObject(), authUser._id.toString());
            stripIssueAdminNotesFromBuyerRequestRow(payload);
            payload.trade = {
                ...(payload.trade || {}),
                producerPayoutPreview: computeProducerPayoutPreviewForRequest(doc.toObject(), authUser._id.toString()),
            };
            res.status(200).json({ success: true, data: payload });
            return;
        }
        res.status(403).json({ success: false, message: "Unauthorized." });
    }
    catch (error) {
        console.error("Get buyer request error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to fetch buyer request" });
    }
});
// POST /api/buyer-requests/:id/trade/checkout-session — Stripe Checkout (buyer pays Kewve)
router.post("/buyer-requests/:id/trade/checkout-session", authenticate, async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser || !userHasRole(authUser, "buyer")) {
            res.status(403).json({ success: false, message: "Only buyers can pay invoices." });
            return;
        }
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) {
            res.status(503).json({ success: false, message: "Stripe is not configured on the server." });
            return;
        }
        const requestDoc = await BuyerRequest.findById(req.params.id);
        if (!requestDoc) {
            res.status(404).json({ success: false, message: "Buyer request not found." });
            return;
        }
        if (requestDoc.buyerId.toString() !== authUser._id.toString()) {
            res.status(403).json({ success: false, message: "You can only pay your own invoices." });
            return;
        }
        if (tradeIsTerminalClosed(requestDoc)) {
            res.status(400).json({ success: false, message: "This transaction is closed." });
            return;
        }
        const t = ensureTrade(requestDoc);
        if (t.producerDecision === "declined") {
            res.status(400).json({ success: false, message: "This request was declined." });
            return;
        }
        const inv = t.invoice;
        if (!inv?.sentAt) {
            res.status(400).json({ success: false, message: "No invoice has been issued yet." });
            return;
        }
        if (inv.paidAt) {
            res.status(400).json({ success: false, message: "This invoice is already paid." });
            return;
        }
        const totalCents = Number(inv.totalCents || 0);
        if (!Number.isFinite(totalCents) || totalCents < 50) {
            res.status(400).json({ success: false, message: "Invalid invoice amount." });
            return;
        }
        const stripe = new Stripe(key);
        const base = getFrontendOrigin();
        const rid = String(requestDoc._id);
        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            customer_email: requestDoc.buyerEmail || authUser.email,
            line_items: [
                {
                    price_data: {
                        currency: String(inv.currency || "eur").toLowerCase(),
                        product_data: {
                            name: `Kewve — ${requestDoc.productName || "Product order"}`,
                            description: `Trade request ${rid.slice(-8)} · ${inv.platformFeePercent ?? 10}% platform fee on product${Number(inv.additionalFeesCents || 0) > 0 ? " · plus add-on fees" : ""}`,
                        },
                        unit_amount: totalCents,
                    },
                    quantity: 1,
                },
            ],
            success_url: `${base}/buyer/trade-operations/${rid}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${base}/buyer/trade-operations/${rid}?checkout=cancel`,
            metadata: {
                type: "trade_invoice",
                buyerRequestId: rid,
            },
        });
        inv.stripeCheckoutSessionId = session.id;
        syncLegacyRequestStatusWithTrade(requestDoc);
        await requestDoc.save();
        if (!session.url) {
            res.status(500).json({ success: false, message: "Stripe did not return a checkout URL." });
            return;
        }
        res.status(200).json({ success: true, url: session.url });
    }
    catch (error) {
        console.error("Trade checkout session error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to create checkout session" });
    }
});
// POST /api/buyer-requests/:id/trade/sync-checkout — confirm payment after redirect (idempotent)
router.post("/buyer-requests/:id/trade/sync-checkout", authenticate, async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser || !userHasRole(authUser, "buyer")) {
            res.status(403).json({ success: false, message: "Only buyers can sync checkout." });
            return;
        }
        const sessionId = String(req.body?.sessionId || "").trim();
        if (!sessionId) {
            res.status(400).json({ success: false, message: "sessionId is required." });
            return;
        }
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) {
            res.status(503).json({ success: false, message: "Stripe is not configured." });
            return;
        }
        const requestDoc = await BuyerRequest.findById(req.params.id);
        if (!requestDoc) {
            res.status(404).json({ success: false, message: "Buyer request not found." });
            return;
        }
        if (requestDoc.buyerId.toString() !== authUser._id.toString()) {
            res.status(403).json({ success: false, message: "Forbidden." });
            return;
        }
        const stripe = new Stripe(key);
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.metadata?.type !== "trade_invoice" || String(session.metadata?.buyerRequestId) !== String(requestDoc._id)) {
            res.status(400).json({ success: false, message: "This payment does not belong to this request." });
            return;
        }
        if (session.payment_status !== "paid") {
            res.status(400).json({ success: false, message: "Payment is not completed yet." });
            return;
        }
        const result = await markTradeInvoicePaidFromStripe({
            buyerRequestId: String(requestDoc._id),
            amountTotalCents: session.amount_total,
            currency: session.currency,
        });
        const fresh = await BuyerRequest.findById(requestDoc._id);
        res.status(200).json({
            success: true,
            data: fresh,
            sync: result,
        });
    }
    catch (error) {
        console.error("Sync trade checkout error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to sync payment" });
    }
});
// PUT /api/buyer-requests/:id/status - Producer updates request status, buyer can close own request
router.put("/buyer-requests/:id/status", authenticate, async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const nextStatus = String(req.body?.status || "").trim();
        if (!ALLOWED_STATUSES.includes(nextStatus)) {
            res.status(400).json({ success: false, message: "Invalid status value." });
            return;
        }
        const requestDoc = await BuyerRequest.findById(req.params.id);
        if (!requestDoc) {
            res.status(404).json({ success: false, message: "Buyer request not found." });
            return;
        }
        if (userHasRole(authUser, "producer")) {
            const isPrimary = isPrimaryProducer(requestDoc, authUser._id.toString());
            const isMatchedProducer = (requestDoc.matchPlan?.allocations || []).some((allocation) => String(allocation.producerId) === authUser._id.toString());
            if (!isPrimary && !isMatchedProducer) {
                res.status(403).json({ success: false, message: "You can only update requests for your own products." });
                return;
            }
            if (!isPrimary) {
                res.status(403).json({
                    success: false,
                    message: "Only the primary producer for this request can change pipeline status here.",
                });
                return;
            }
            if (tradeIsTerminalClosed(requestDoc)) {
                res.status(400).json({ success: false, message: "This transaction is closed and cannot be updated." });
                return;
            }
            requestDoc.status = nextStatus;
            syncLegacyRequestStatusWithTrade(requestDoc);
            await requestDoc.save();
            res.status(200).json({ success: true, data: requestDoc });
            return;
        }
        if (userHasRole(authUser, "buyer")) {
            if (requestDoc.buyerId.toString() !== authUser._id.toString()) {
                res.status(403).json({ success: false, message: "You can only update your own requests." });
                return;
            }
            if (nextStatus !== "closed") {
                res.status(403).json({ success: false, message: "Buyers can only close their own requests." });
                return;
            }
            requestDoc.status = "closed";
            const t = ensureTrade(requestDoc);
            t.transactionClosed = true;
            t.transactionClosedAt = new Date();
            syncLegacyRequestStatusWithTrade(requestDoc);
            await requestDoc.save();
            res.status(200).json({ success: true, data: requestDoc });
            return;
        }
        res.status(403).json({ success: false, message: "Unauthorized to update buyer request status." });
    }
    catch (error) {
        console.error("Update buyer request status error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to update buyer request status" });
    }
});
// PUT /api/buyer-requests/:id/trade/producer-decision
// Aggregation: each allocated producer responds for their own line (optional body.productId if multiple lines).
// Single: primary producer only; mirrors onto the sole allocation.
router.put("/buyer-requests/:id/trade/producer-decision", authenticate, async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser || !userHasRole(authUser, "producer")) {
            res.status(403).json({ success: false, message: "Only producers can respond to trade requests." });
            return;
        }
        const decision = String(req.body?.decision || "").trim();
        if (decision !== "accepted" && decision !== "declined") {
            res.status(400).json({ success: false, message: "decision must be accepted or declined." });
            return;
        }
        const requestDoc = await BuyerRequest.findById(req.params.id);
        if (!requestDoc) {
            res.status(404).json({ success: false, message: "Buyer request not found." });
            return;
        }
        if (tradeIsTerminalClosed(requestDoc)) {
            res.status(400).json({ success: false, message: "This transaction is closed." });
            return;
        }
        const uid = authUser._id.toString();
        const planAllocs = requestDoc.matchPlan?.allocations || [];
        const aggLines = planAllocs.filter((a) => String(a.producerId) === uid && Number(a.allocatedKg || 0) > 0);
        const activeCount = planAllocs.filter((a) => Number(a.allocatedKg || 0) > 0).length;
        const usePerProducerResponses = planAllocs.length > 0 && (requestDoc.fulfillmentMode === "aggregation" || activeCount > 1);
        if (usePerProducerResponses) {
            if (!aggLines.length) {
                res.status(403).json({ success: false, message: "You have no allocation on this request." });
                return;
            }
            const productIdFilter = String(req.body?.productId || "").trim();
            const candidates = productIdFilter
                ? aggLines.filter((a) => String(a.productId) === productIdFilter)
                : aggLines;
            if (!candidates.length) {
                res.status(400).json({ success: false, message: "No allocation matches the given productId." });
                return;
            }
            if (candidates.length > 1 && !productIdFilter) {
                res.status(400).json({
                    success: false,
                    message: "You have multiple allocations on this request. Pass productId for the line you are responding to.",
                });
                return;
            }
            const line = candidates[0];
            if (String(line.producerResponse || "pending") !== "pending") {
                res.status(400).json({ success: false, message: "You have already responded to this allocation." });
                return;
            }
            if (decision === "accepted" && !["matched", "in_review"].includes(String(requestDoc.status || ""))) {
                res.status(400).json({
                    success: false,
                    message: "The request must be in review or matched before you can accept it.",
                });
                return;
            }
            line.producerResponse = decision;
            if (decision === "declined") {
                line.declinedReason = String(req.body?.reason || "").trim().slice(0, 2000);
                line.declinedAt = new Date();
            }
            else {
                line.declinedReason = "";
                line.declinedAt = undefined;
            }
            syncTradeProducerDecisionFromAllocations(requestDoc);
            applyTradeClosureRules(requestDoc);
            await requestDoc.save();
            res.status(200).json({ success: true, data: requestDoc });
            return;
        }
        if (!isLeadOrSoleAllocatedProducer(requestDoc, uid)) {
            res.status(403).json({ success: false, message: "Only the primary producer can accept or decline this request." });
            return;
        }
        const t = ensureTrade(requestDoc);
        const tradeDecision = String(t.producerDecision || "pending").trim();
        if (tradeDecision !== "pending") {
            res.status(400).json({ success: false, message: "Producer has already responded to this request." });
            return;
        }
        if (decision === "accepted" && requestDoc.status !== "matched") {
            res.status(400).json({
                success: false,
                message: "The request must be matched before you can accept it.",
            });
            return;
        }
        t.producerDecision = decision;
        if (decision === "declined") {
            t.declinedReason = String(req.body?.reason || "").trim().slice(0, 2000);
            t.declinedAt = new Date();
        }
        else {
            t.declinedReason = "";
            t.declinedAt = undefined;
        }
        const active = getActiveAllocations(requestDoc);
        if (active.length === 1) {
            const a = active[0];
            a.producerResponse = decision;
            if (decision === "declined") {
                a.declinedReason = t.declinedReason;
                a.declinedAt = t.declinedAt;
            }
            else {
                a.declinedReason = "";
                a.declinedAt = undefined;
            }
        }
        syncTradeProducerDecisionFromAllocations(requestDoc);
        applyTradeClosureRules(requestDoc);
        await requestDoc.save();
        res.status(200).json({ success: true, data: requestDoc });
    }
    catch (error) {
        console.error("Producer trade decision error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to update decision" });
    }
});
// POST /api/buyer-requests/:id/trade/invoice — generate & mark invoice sent (producer)
router.post("/buyer-requests/:id/trade/invoice", authenticate, async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser || !userHasRole(authUser, "producer")) {
            res.status(403).json({ success: false, message: "Only producers can create invoices." });
            return;
        }
        const requestDoc = await BuyerRequest.findById(req.params.id);
        if (!requestDoc) {
            res.status(404).json({ success: false, message: "Buyer request not found." });
            return;
        }
        if (!isLeadOrSoleAllocatedProducer(requestDoc, authUser._id.toString())) {
            res.status(403).json({ success: false, message: "Only the primary producer can issue the invoice." });
            return;
        }
        if (isAggregationStyle(requestDoc)) {
            res.status(403).json({
                success: false,
                message: "Aggregation trades are invoiced by admin from Trade Operations.",
            });
            return;
        }
        const rawExtra = req.body?.additionalFeesCents;
        let additionalFeesCents = 0;
        if (rawExtra !== undefined && rawExtra !== null && rawExtra !== "") {
            additionalFeesCents = Math.round(Number(rawExtra));
            if (!Number.isFinite(additionalFeesCents) || additionalFeesCents < 0) {
                res.status(400).json({ success: false, message: "additionalFeesCents must be a non-negative whole number of cents." });
                return;
            }
            if (additionalFeesCents > 10_000_000) {
                res.status(400).json({ success: false, message: "additionalFeesCents exceeds the allowed maximum." });
                return;
            }
        }
        const additionalFeesNote = String(req.body?.additionalFeesNote ?? "")
            .trim()
            .slice(0, 200);
        const issued = await issueTradeInvoiceIfEligible(requestDoc, { additionalFeesCents, additionalFeesNote });
        if (!issued.ok) {
            res.status(400).json({ success: false, message: issued.message });
            return;
        }
        syncLegacyRequestStatusWithTrade(requestDoc);
        await requestDoc.save();
        void notifyBuyerInvoiceSent(requestDoc);
        res.status(200).json({ success: true, data: requestDoc });
    }
    catch (error) {
        console.error("Trade invoice error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to create invoice" });
    }
});
// PUT /api/buyer-requests/:id/trade/invoice/mark-paid
router.put("/buyer-requests/:id/trade/invoice/mark-paid", authenticate, async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser || !userHasRole(authUser, "producer")) {
            res.status(403).json({ success: false, message: "Forbidden." });
            return;
        }
        res.status(403).json({
            success: false,
            message: "Producers cannot manually mark invoices as paid. Buyer payment via Stripe updates this automatically.",
        });
        return;
    }
    catch (error) {
        console.error("Mark invoice paid error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to mark invoice paid" });
    }
});
// PUT /api/buyer-requests/:id/trade/fulfillment
router.put("/buyer-requests/:id/trade/fulfillment", authenticate, async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser || !userHasRole(authUser, "producer")) {
            res.status(403).json({ success: false, message: "Only producers can update fulfillment here." });
            return;
        }
        const next = String(req.body?.status || "").trim();
        if (!FULFILLMENT_STATUSES.includes(next)) {
            res.status(400).json({ success: false, message: "Invalid fulfillment status." });
            return;
        }
        const requestDoc = await BuyerRequest.findById(req.params.id);
        if (!requestDoc) {
            res.status(404).json({ success: false, message: "Buyer request not found." });
            return;
        }
        if (tradeIsTerminalClosed(requestDoc)) {
            res.status(400).json({ success: false, message: "This transaction is closed." });
            return;
        }
        const t = ensureTrade(requestDoc);
        if (t.producerDecision !== "accepted") {
            res.status(400).json({ success: false, message: "The request must be accepted first." });
            return;
        }
        if (!invoiceIsPaid(requestDoc)) {
            res.status(400).json({ success: false, message: "Mark the invoice as paid before updating fulfillment." });
            return;
        }
        const isAgg = isAggregationStyle(requestDoc);
        const uid = authUser._id.toString();
        const activeAllocs = getActiveAllocations(requestDoc);
        const myAcceptedAllocs = activeAllocs.filter((a) => String(a.producerId) === uid && String(a.producerResponse || "pending") === "accepted");
        if (!isAgg && !isLeadOrSoleAllocatedProducer(requestDoc, uid)) {
            res.status(403).json({ success: false, message: "Only the primary producer can update fulfillment." });
            return;
        }
        if (isAgg && !myAcceptedAllocs.length) {
            res.status(403).json({ success: false, message: "You have no accepted allocation on this request." });
            return;
        }
        if (next === "cancelled") {
            const reason = String(req.body?.reason ?? "").trim();
            if (!reason) {
                res.status(400).json({
                    success: false,
                    message: "A reason is required when cancelling a paid order. Describe why for the admin team.",
                });
                return;
            }
            t.producerCancelledPaidOrderReason = reason.slice(0, 4000);
            t.producerCancelledPaidOrderAt = new Date();
            t.awaitingProducerReassignment = true;
            t.adminCancelledPaidOrderReason = "";
            t.adminCancelledPaidOrderAt = undefined;
            const producerLabel = String(authUser.name || authUser.email || authUser._id);
            void notifyAdminProducerCancelledPaidOrder(requestDoc, producerLabel, reason);
        }
        if (isAgg) {
            const productIdRaw = String(req.body?.productId || "").trim();
            let target = myAcceptedAllocs;
            if (productIdRaw) {
                target = myAcceptedAllocs.filter((a) => String(a.productId) === productIdRaw);
                if (!target.length) {
                    res.status(400).json({ success: false, message: "No accepted allocation matches the provided productId." });
                    return;
                }
            }
            else if (myAcceptedAllocs.length > 1) {
                res.status(400).json({
                    success: false,
                    message: "You have multiple accepted allocations on this request. Pass productId for the line to update.",
                });
                return;
            }
            for (const line of target) {
                line.fulfillmentStatus = next;
            }
            syncTradeFulfillmentFromAllocations(requestDoc);
        }
        else {
            t.fulfillmentStatus = next;
        }
        applyTradeClosureRules(requestDoc);
        await requestDoc.save();
        res.status(200).json({ success: true, data: requestDoc });
    }
    catch (error) {
        console.error("Producer fulfillment error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to update fulfillment" });
    }
});
// PUT /api/buyer-requests/:id/trade/buyer-receipt
router.put("/buyer-requests/:id/trade/buyer-receipt", authenticate, async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser || !userHasRole(authUser, "buyer")) {
            res.status(403).json({ success: false, message: "Only buyers can confirm receipt." });
            return;
        }
        const receipt = String(req.body?.receipt || "").trim();
        if (receipt !== "received_ok" && receipt !== "received_issues") {
            res.status(400).json({ success: false, message: "receipt must be received_ok or received_issues." });
            return;
        }
        const requestDoc = await BuyerRequest.findById(req.params.id);
        if (!requestDoc) {
            res.status(404).json({ success: false, message: "Buyer request not found." });
            return;
        }
        if (requestDoc.buyerId.toString() !== authUser._id.toString()) {
            res.status(403).json({ success: false, message: "You can only confirm receipt on your own requests." });
            return;
        }
        if (tradeIsTerminalClosed(requestDoc)) {
            res.status(400).json({ success: false, message: "This transaction is already closed." });
            return;
        }
        const t = ensureTrade(requestDoc);
        const fs = t.fulfillmentStatus;
        if (fs !== "delivered" && fs !== "completed") {
            res.status(400).json({
                success: false,
                message: "Receipt can only be recorded after the order is marked delivered or completed.",
            });
            return;
        }
        if (t.buyerReceipt !== "none") {
            res.status(400).json({ success: false, message: "Receipt has already been submitted." });
            return;
        }
        t.buyerReceipt = receipt;
        t.buyerReceiptNotes = String(req.body?.notes || "").trim().slice(0, 4000);
        t.buyerReceiptAt = new Date();
        if (receipt === "received_issues") {
            t.issuesNeedAdmin = true;
        }
        applyTradeClosureRules(requestDoc);
        await requestDoc.save();
        res.status(200).json({ success: true, data: requestDoc });
    }
    catch (error) {
        console.error("Buyer receipt error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to record receipt" });
    }
});
export default router;
