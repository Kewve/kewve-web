import { Router } from "express";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import { userHasRole } from "../utils/userRoles.js";
import { User } from "../models/User.js";
import { Assessment } from "../models/Assessment.js";
import { Product } from "../models/Product.js";
import { DiscountCode } from "../models/DiscountCode.js";
import { BuyerRequest } from "../models/BuyerRequest.js";
import { AggregationCluster } from "../models/AggregationCluster.js";
import { applyTradeClosureRules, ensureTrade, FULFILLMENT_STATUSES, getActiveAllocations, invoiceProducerPayoutCents, isAggregationStyle, invoiceIsPaid, issueTradeInvoiceIfEligible, syncLegacyRequestStatusWithTrade, syncTradeFulfillmentFromAllocations, syncTradeProducerDecisionFromAllocations, tradeIsTerminalClosed, verifyPayoutPasscode, } from "../utils/buyerRequestTrade.js";
import { notifyProducersTradePaid } from "../utils/tradeNotifyMail.js";
import { transferToConnectAccount } from "../services/stripePayout.js";
import { stripComplianceDocumentsForClient, syncProductComplianceStatus, } from "../utils/productCompliance.js";
const router = Router();
function adminProductJson(product) {
    const o = { ...product };
    if (Array.isArray(o.complianceDocuments) && o.complianceDocuments.length) {
        o.complianceDocuments = stripComplianceDocumentsForClient(o.complianceDocuments);
    }
    return o;
}
function tradeIssueNoteAuthor(req) {
    const u = req.user;
    if (u?._id) {
        return { authorId: u._id, authorName: String(u.name || u.email || "Admin") };
    }
    return { authorName: String(u?.name || u?.email || "Admin") };
}
function pushTradeIssueAdminNote(t, req, body) {
    const text = body.trim().slice(0, 4000);
    if (!text)
        return;
    const author = tradeIssueNoteAuthor(req);
    if (!t.issueAdminNotes) {
        t.issueAdminNotes = [];
    }
    t.issueAdminNotes.push({
        body: text,
        createdAt: new Date(),
        authorId: author.authorId,
        authorName: author.authorName,
    });
}
/** Stripe refund for a paid trade invoice; mutates `trade.refund` on success only. */
async function stripeRefundPaidTradeInvoice(requestDoc, amountCents, note, metadataType) {
    const t = ensureTrade(requestDoc);
    if (!invoiceIsPaid(requestDoc) || !t.invoice?.paidAt) {
        return { ok: false, message: "Only paid requests can be refunded." };
    }
    if (t.refund?.status === "completed") {
        return { ok: false, message: "This request has already been refunded." };
    }
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        return { ok: false, message: "Stripe is not configured." };
    }
    const sessionId = String(t.invoice?.stripeCheckoutSessionId || "").trim();
    if (!sessionId) {
        return { ok: false, message: "No Stripe checkout session is linked to this invoice." };
    }
    const totalCents = Number(t.invoice?.totalCents || 0);
    if (!Number.isFinite(totalCents) || totalCents <= 0) {
        return { ok: false, message: "Invalid invoice total for refund." };
    }
    if (!Number.isFinite(amountCents) || amountCents < 1 || amountCents > totalCents) {
        return { ok: false, message: "Refund amount must be between 1 and the invoice total (cents)." };
    }
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
    if (!paymentIntentId) {
        return { ok: false, message: "Could not resolve Stripe payment intent for this invoice." };
    }
    try {
        const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: amountCents,
            metadata: {
                buyerRequestId: String(requestDoc._id),
                type: metadataType,
            },
        });
        t.refund = t.refund || { status: "none" };
        t.refund.status = "completed";
        t.refund.amountCents = amountCents;
        t.refund.note = note.slice(0, 1000);
        t.refund.stripeRefundId = refund.id;
        t.refund.refundedAt = new Date();
        t.refund.errorMessage = undefined;
        return { ok: true, refundId: refund.id };
    }
    catch (err) {
        return { ok: false, message: err?.message || "Stripe refund failed" };
    }
}
// POST /api/admin/login - Admin login using .env credentials
router.post("/admin/login", (req, res) => {
    const { email, password } = req.body;
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        res.status(500).json({ success: false, message: "Admin credentials not configured" });
        return;
    }
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        res.status(401).json({ success: false, message: "Invalid admin credentials" });
        return;
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        res.status(500).json({ success: false, message: "JWT_SECRET not set" });
        return;
    }
    const token = jwt.sign({ adminEmail: ADMIN_EMAIL, role: "admin" }, secret, { expiresIn: "30d" });
    res.json({
        success: true,
        message: "Admin login successful",
        data: {
            user: {
                id: "admin",
                email: ADMIN_EMAIL,
                name: "Admin",
                role: "admin",
            },
            token,
        },
    });
});
// Admin auth middleware that also accepts admin JWT tokens
export const authenticateAdmin = async (req, res, next) => {
    try {
        const tokenStr = req.headers.authorization?.replace("Bearer ", "");
        if (!tokenStr) {
            res.status(401).json({ success: false, message: "Authentication required" });
            return;
        }
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            res.status(500).json({ success: false, message: "JWT_SECRET not set" });
            return;
        }
        const decoded = jwt.verify(tokenStr, secret);
        // Admin token (from admin login)
        if (decoded.role === "admin" && decoded.adminEmail) {
            req.user = { role: "admin", email: decoded.adminEmail, name: "Admin" };
            next();
            return;
        }
        // Regular user token - check if they're an admin in DB
        if (decoded.userId) {
            const user = await User.findById(decoded.userId);
            if (user && userHasRole(user, "admin")) {
                req.user = user;
                next();
                return;
            }
        }
        res.status(403).json({ success: false, message: "Admin access required" });
    }
    catch {
        res.status(401).json({ success: false, message: "Invalid token" });
    }
};
// GET /api/admin/me - Get admin user info
router.get("/admin/me", authenticateAdmin, (req, res) => {
    const user = req.user;
    res.json({
        success: true,
        data: {
            user: {
                id: "admin",
                email: user.email,
                name: user.name || "Admin",
                role: "admin",
            },
        },
    });
});
// POST /api/discount-codes/validate - Public validation endpoint used during registration/payment
router.post("/discount-codes/validate", async (req, res) => {
    try {
        const rawCode = (req.body?.code || "").toString().trim().toUpperCase();
        if (!rawCode) {
            res.status(400).json({ success: false, message: "Discount code is required" });
            return;
        }
        const discountCode = await DiscountCode.findOne({ code: rawCode, isActive: true });
        if (!discountCode) {
            res.status(404).json({ success: false, message: "Invalid or inactive discount code" });
            return;
        }
        res.status(200).json({
            success: true,
            data: {
                code: discountCode.code,
                discountPercent: Number(discountCode.discountPercent || 0),
                // Legacy fields kept for older clients.
                discountAmountEuros: Number(discountCode.discountAmountEuros || 0),
                discountAmountCents: Math.round(Number(discountCode.discountAmountEuros || 0) * 100),
            },
        });
    }
    catch (error) {
        console.error("Validate discount code error:", error);
        res.status(500).json({ success: false, message: "Failed to validate discount code" });
    }
});
// GET /api/pricing/assessment-tier - Public assessment price (single standard tier; no early-bird tiers)
router.get("/pricing/assessment-tier", async (_req, res) => {
    try {
        const paidProducerCount = await User.countDocuments({
            roles: { $in: ["producer"] },
            role: { $ne: "admin" },
        });
        const nextUserNumber = paidProducerCount + 1;
        const unitAmountCents = 10000;
        const tierLabel = "standard";
        res.status(200).json({
            success: true,
            data: {
                unitAmountCents,
                unitAmount: unitAmountCents / 100,
                tierLabel,
                paidProducerCount,
                nextUserNumber,
            },
        });
    }
    catch (error) {
        console.error("Assessment tier pricing error:", error);
        res.status(500).json({ success: false, message: "Failed to calculate assessment pricing tier" });
    }
});
// GET /api/admin/discount-codes - Admin list of discount codes
router.get("/admin/discount-codes", authenticateAdmin, async (_req, res) => {
    try {
        const codes = await DiscountCode.find({}).sort({ createdAt: -1 }).lean();
        res.status(200).json({ success: true, data: codes });
    }
    catch (error) {
        console.error("Admin discount codes list error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch discount codes" });
    }
});
// POST /api/admin/discount-codes - Admin create unique code
router.post("/admin/discount-codes", authenticateAdmin, async (req, res) => {
    try {
        const rawCode = (req.body?.code || "").toString().trim().toUpperCase();
        if (!rawCode) {
            res.status(400).json({ success: false, message: "Code is required" });
            return;
        }
        const existing = await DiscountCode.findOne({ code: rawCode });
        if (existing) {
            res.status(400).json({ success: false, message: "Discount code already exists" });
            return;
        }
        const rawDiscountPercent = req.body?.discountPercent;
        const parsedDiscountPercent = typeof rawDiscountPercent === "number"
            ? rawDiscountPercent
            : typeof rawDiscountPercent === "string"
                ? Number(rawDiscountPercent)
                : NaN;
        const discountPercent = Number.isFinite(parsedDiscountPercent) && parsedDiscountPercent > 0
            ? Math.min(100, Number(parsedDiscountPercent.toFixed(2)))
            : 10;
        const createdBy = (req.user?.email || "admin").toString();
        const code = await DiscountCode.create({
            code: rawCode,
            discountPercent,
            isActive: true,
            createdBy,
        });
        res.status(201).json({ success: true, message: "Discount code created", data: code });
    }
    catch (error) {
        console.error("Admin create discount code error:", error);
        res.status(500).json({ success: false, message: "Failed to create discount code" });
    }
});
// PUT /api/admin/discount-codes/:id/toggle - Activate/deactivate a code
router.put("/admin/discount-codes/:id/toggle", authenticateAdmin, async (req, res) => {
    try {
        const code = await DiscountCode.findById(req.params.id);
        if (!code) {
            res.status(404).json({ success: false, message: "Discount code not found" });
            return;
        }
        code.isActive = !code.isActive;
        await code.save();
        res.status(200).json({
            success: true,
            message: `Discount code ${code.isActive ? "activated" : "deactivated"}`,
            data: code,
        });
    }
    catch (error) {
        console.error("Admin toggle discount code error:", error);
        res.status(500).json({ success: false, message: "Failed to update discount code" });
    }
});
// GET /api/admin/producers
router.get("/admin/producers", authenticateAdmin, async (req, res) => {
    try {
        const producers = await User.find({
            roles: { $in: ["producer"] },
            role: { $ne: "admin" },
        })
            .select("-password")
            .sort({ createdAt: -1 });
        const producerData = await Promise.all(producers.map(async (user) => {
            const assessment = await Assessment.findOne({ userId: user._id }).select("-documents.data");
            const productCount = await Product.countDocuments({ userId: user._id });
            let readinessStatus = "not_started";
            if (assessment) {
                const hasAnswers = assessment.get("country") || assessment.get("businessRegistered") || assessment.get("haccpProcess");
                if (hasAnswers)
                    readinessStatus = "in_progress";
                if (assessment.get("confirmAccuracy") === "yes" && assessment.get("agreeCompliance") === "yes")
                    readinessStatus = "completed";
            }
            let verificationStatus = "pending";
            if (assessment && assessment.verified) {
                verificationStatus = "verified";
            }
            else if (assessment && assessment.documents && assessment.documents.length > 0) {
                const allApproved = assessment.documents.every((d) => d.status === "approved");
                const someApproved = assessment.documents.some((d) => d.status === "approved");
                const someRejected = assessment.documents.some((d) => d.status === "rejected");
                if (allApproved)
                    verificationStatus = "all_approved";
                else if (someRejected)
                    verificationStatus = "action_needed";
                else if (someApproved)
                    verificationStatus = "in_review";
                else
                    verificationStatus = "submitted";
            }
            return {
                id: user._id,
                name: user.name,
                businessName: user.businessName || "-",
                country: user.country || "-",
                email: user.email,
                discountCodeUsed: user.discountCodeUsed || null,
                readiness: readinessStatus,
                verification: verificationStatus,
                products: productCount,
                createdAt: user.createdAt,
            };
        }));
        res.status(200).json({ success: true, data: producerData });
    }
    catch (error) {
        console.error("Admin producers error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch producers" });
    }
});
// GET /api/admin/stats
router.get("/admin/stats", authenticateAdmin, async (req, res) => {
    try {
        const totalProducers = await User.countDocuments({
            roles: { $in: ["producer"] },
            role: { $ne: "admin" },
        });
        const verifiedProducers = await Assessment.countDocuments({ verified: true });
        const totalProducts = await Product.countDocuments({});
        const totalAssessments = await Assessment.countDocuments({});
        // Count documents pending review across all assessments
        const assessments = await Assessment.find({}).select("documents");
        let pendingDocs = 0;
        let totalDocs = 0;
        let approvedDocs = 0;
        let rejectedDocs = 0;
        assessments.forEach((a) => {
            if (a.documents) {
                a.documents.forEach((d) => {
                    totalDocs++;
                    if (d.status === "pending")
                        pendingDocs++;
                    else if (d.status === "approved")
                        approvedDocs++;
                    else if (d.status === "rejected")
                        rejectedDocs++;
                });
            }
        });
        res.status(200).json({
            success: true,
            data: {
                totalProducers,
                verifiedProducers,
                totalProducts,
                totalAssessments,
                pendingDocs,
                totalDocs,
                approvedDocs,
                rejectedDocs,
            },
        });
    }
    catch (error) {
        console.error("Admin stats error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch stats" });
    }
});
const ASSESSMENT_RANGE_DAYS = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
};
function toAssessmentRange(input) {
    const v = String(input || "").trim().toLowerCase();
    if (v === "7d" || v === "30d" || v === "90d")
        return v;
    return "30d";
}
function assessmentConversionRate(count, previous) {
    if (previous == null)
        return null;
    if (!Number.isFinite(previous) || previous <= 0)
        return 0;
    return Math.round((count / previous) * 10000) / 100;
}
function hasTruthy(value) {
    if (value === null || value === undefined)
        return false;
    if (value instanceof Date)
        return Number.isFinite(value.getTime());
    if (typeof value === "string")
        return value.trim().length > 0;
    if (typeof value === "number")
        return Number.isFinite(value);
    if (typeof value === "boolean")
        return value;
    if (Array.isArray(value))
        return value.length > 0;
    if (typeof value === "object")
        return Object.keys(value).length > 0;
    return false;
}
// GET /api/admin/analytics/assessment-dropoff?range=7d|30d|90d
router.get("/admin/analytics/assessment-dropoff", authenticateAdmin, async (req, res) => {
    try {
        const range = toAssessmentRange(req.query.range);
        const now = new Date();
        const from = new Date(now.getTime() - ASSESSMENT_RANGE_DAYS[range] * 24 * 60 * 60 * 1000);
        const assessments = await Assessment.find({ createdAt: { $gte: from, $lte: now } })
            .select("createdAt country businessRegistered productRegulatoryApproval traceToCustomers haccpCertification monthlyProductionCapacity exportGradeCartons labelsInEnglish shelfLifeInfo documents deliverToUK exportPricing confirmAccuracy agreeCompliance")
            .lean();
        const stages = [
            { key: "started", label: "Started assessment", done: (a) => hasTruthy(a.createdAt) },
            { key: "export_context", label: "Export context", done: (a) => hasTruthy(a.country) },
            { key: "business_legal", label: "Business & legal readiness", done: (a) => hasTruthy(a.businessRegistered) },
            { key: "product_definition", label: "Product definition", done: (a) => hasTruthy(a.productRegulatoryApproval) },
            { key: "traceability", label: "Product traceability", done: (a) => hasTruthy(a.traceToCustomers) },
            { key: "food_safety", label: "Food safety", done: (a) => hasTruthy(a.haccpCertification) },
            { key: "capacity", label: "Production capacity", done: (a) => hasTruthy(a.monthlyProductionCapacity) },
            { key: "packaging", label: "Packaging readiness", done: (a) => hasTruthy(a.exportGradeCartons) },
            { key: "labelling", label: "Labelling compliance", done: (a) => hasTruthy(a.labelsInEnglish) },
            { key: "shelf_life", label: "Shelf life", done: (a) => hasTruthy(a.shelfLifeInfo) },
            { key: "documentation", label: "Documentation readiness", done: (a) => Array.isArray(a.documents) && a.documents.length > 0 },
            { key: "logistics", label: "Logistics understanding", done: (a) => hasTruthy(a.deliverToUK) },
            { key: "financial", label: "Financial readiness", done: (a) => hasTruthy(a.exportPricing) },
            {
                key: "compliance_confirmation",
                label: "Compliance confirmation",
                done: (a) => String(a.confirmAccuracy || "") === "yes" && String(a.agreeCompliance || "") === "yes",
            },
        ];
        // Enforce ordered funnel progression so stage counts are always monotonic.
        // A user only counts for stage N if all stages 0..N are complete.
        const stageCompletionCounts = new Array(stages.length).fill(0);
        for (const assessment of assessments) {
            let lastSequentialStage = -1;
            for (let i = 0; i < stages.length; i += 1) {
                if (stages[i].done(assessment)) {
                    lastSequentialStage = i;
                    continue;
                }
                break;
            }
            if (lastSequentialStage >= 0) {
                for (let i = 0; i <= lastSequentialStage; i += 1) {
                    stageCompletionCounts[i] += 1;
                }
            }
        }
        let previousCount = null;
        const stageCounts = stages.map((stage, idx) => {
            const count = stageCompletionCounts[idx] || 0;
            const conversionFromPrevious = assessmentConversionRate(count, previousCount);
            const dropoffFromPrevious = previousCount == null ? null : Math.max(0, previousCount - count);
            previousCount = count;
            return {
                key: stage.key,
                label: stage.label,
                count,
                conversionFromPrevious,
                dropoffFromPrevious,
            };
        });
        const totalStarted = stageCounts[0]?.count || 0;
        const completed = stageCounts[stageCounts.length - 1]?.count || 0;
        const completionRate = totalStarted > 0 ? Math.round((completed / totalStarted) * 10000) / 100 : 0;
        res.status(200).json({
            success: true,
            data: {
                range,
                dateWindow: { from: from.toISOString(), to: now.toISOString() },
                summary: {
                    totalStarted,
                    completed,
                    completionRate,
                },
                stages: stageCounts,
            },
        });
    }
    catch (error) {
        console.error("Admin assessment dropoff analytics error:", error);
        res.status(500).json({ success: false, message: error?.message || "Failed to load assessment drop-off analytics." });
    }
});
function escapeAdminSearchRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/** Global search for ops: products, buyer requests, clusters, producers (admin JWT). */
router.get("/admin/search", authenticateAdmin, async (req, res) => {
    try {
        const q = String(req.query.q || "").trim();
        const scopeRaw = String(req.query.scope || "all").toLowerCase();
        const scope = ["all", "products", "trades", "clusters", "producers"].includes(scopeRaw) ? scopeRaw : "all";
        if (q.length < 2) {
            res.status(200).json({
                success: true,
                data: { products: [], buyerRequests: [], clusters: [], producers: [] },
            });
            return;
        }
        const rx = new RegExp(escapeAdminSearchRegex(q), "i");
        const idMatch = (field) => ({
            $expr: {
                $regexMatch: {
                    input: { $toString: `$${field}` },
                    regex: escapeAdminSearchRegex(q),
                    options: "i",
                },
            },
        });
        const refSuffixFromId = (id) => {
            const hex = id.replace(/[^a-f0-9]/gi, "");
            return hex.length >= 4 ? hex.slice(-4) : hex;
        };
        const products = [];
        const buyerRequests = [];
        const clusters = [];
        const producers = [];
        if (scope === "all" || scope === "products") {
            const rows = await Product.find({
                $or: [{ name: rx }, { category: rx }, { description: rx }, idMatch("_id")],
            })
                .select("name category")
                .sort({ updatedAt: -1 })
                .limit(8)
                .lean();
            for (const p of rows) {
                products.push({ _id: String(p._id), name: p.name, category: p.category });
            }
        }
        if (scope === "all" || scope === "trades") {
            const rows = await BuyerRequest.find({
                $or: [
                    { productName: rx },
                    { buyerName: rx },
                    { buyerEmail: rx },
                    { market: rx },
                    { category: rx },
                    idMatch("_id"),
                ],
            })
                .select("productName buyerName volumeKg status market")
                .sort({ updatedAt: -1 })
                .limit(10)
                .lean();
            for (const r of rows) {
                const id = String(r._id);
                buyerRequests.push({
                    _id: id,
                    refSuffix: refSuffixFromId(id),
                    productName: r.productName,
                    buyerName: r.buyerName,
                    status: r.status,
                    market: r.market,
                });
            }
        }
        if (scope === "all" || scope === "clusters") {
            const rows = await AggregationCluster.find({
                $or: [{ productName: rx }, { clusterId: rx }, { status: rx }, idMatch("_id")],
            })
                .select("productName clusterId status")
                .sort({ updatedAt: -1 })
                .limit(8)
                .lean();
            for (const c of rows) {
                clusters.push({
                    _id: String(c._id),
                    productName: c.productName,
                    clusterId: c.clusterId,
                    status: c.status,
                });
            }
        }
        if (scope === "all" || scope === "producers") {
            const rows = await User.find({
                roles: { $in: ["producer"] },
                $or: [{ name: rx }, { email: rx }, idMatch("_id")],
            })
                .select("name email")
                .sort({ updatedAt: -1 })
                .limit(8)
                .lean();
            for (const u of rows) {
                producers.push({ _id: String(u._id), name: u.name, email: u.email });
            }
        }
        res.status(200).json({
            success: true,
            data: { products, buyerRequests, clusters, producers },
        });
    }
    catch (error) {
        console.error("Admin search error:", error);
        res.status(500).json({ success: false, message: error?.message || "Search failed" });
    }
});
// GET /api/admin/buyer-requests
router.get("/admin/buyer-requests", authenticateAdmin, async (_req, res) => {
    try {
        const data = await BuyerRequest.find({}).sort({ createdAt: -1 }).lean();
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        console.error("Admin buyer requests error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch buyer requests" });
    }
});
// PUT /api/admin/buyer-requests/:id/status
router.put("/admin/buyer-requests/:id/status", authenticateAdmin, async (req, res) => {
    try {
        const status = String(req.body?.status || "").trim();
        if (!["pending", "in_review", "matched", "closed"].includes(status)) {
            res.status(400).json({ success: false, message: "Invalid status value." });
            return;
        }
        const doc = await BuyerRequest.findById(req.params.id);
        if (!doc) {
            res.status(404).json({ success: false, message: "Buyer request not found." });
            return;
        }
        doc.status = status;
        syncLegacyRequestStatusWithTrade(doc);
        await doc.save();
        res.status(200).json({ success: true, data: doc });
    }
    catch (error) {
        console.error("Admin update buyer request status error:", error);
        res.status(500).json({ success: false, message: "Failed to update buyer request status" });
    }
});
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// POST /api/admin/buyer-requests/:id/auto-match
// Finds the least number of qualified producers by taking highest capacities first.
router.post("/admin/buyer-requests/:id/auto-match", authenticateAdmin, async (req, res) => {
    try {
        const requestDoc = await BuyerRequest.findById(req.params.id);
        if (!requestDoc) {
            res.status(404).json({ success: false, message: "Buyer request not found." });
            return;
        }
        if (requestDoc.fulfillmentMode === "single") {
            res.status(400).json({
                success: false,
                message: "Auto-match is only for aggregation sourcing requests. Single-supplier requests are matched at creation.",
            });
            return;
        }
        const requiredVolumeKg = Number(requestDoc.volumeKg || 0);
        if (!Number.isFinite(requiredVolumeKg) || requiredVolumeKg <= 0) {
            res.status(400).json({ success: false, message: "Buyer request volume is invalid." });
            return;
        }
        const productNameRegex = new RegExp(`^${escapeRegex(requestDoc.productName || "")}$`, "i");
        const baseFilter = {
            readiness: "approved",
            verification: "verified",
            monthlyCapacity: { $gt: 0 },
            category: requestDoc.category,
        };
        let candidates = await Product.find({
            ...baseFilter,
            name: productNameRegex,
        })
            .select("userId name monthlyCapacity unitPrice aggregation")
            .lean();
        // If exact name match yields no candidate, fallback to category-level aggregation.
        if (!candidates.length) {
            candidates = await Product.find(baseFilter)
                .select("userId name monthlyCapacity unitPrice aggregation")
                .lean();
        }
        if (!candidates.length) {
            requestDoc.fulfillmentMode = "aggregation";
            requestDoc.matchPlan = {
                generatedAt: new Date(),
                requiredVolumeKg,
                totalAllocatedKg: 0,
                remainingVolumeKg: requiredVolumeKg,
                matchedProducerCount: 0,
                allocations: [],
            };
            requestDoc.status = "in_review";
            syncTradeProducerDecisionFromAllocations(requestDoc);
            syncLegacyRequestStatusWithTrade(requestDoc);
            await requestDoc.save();
            res.status(200).json({ success: true, data: requestDoc, message: "No qualified producers found yet." });
            return;
        }
        // Keep one best-capacity candidate per producer to minimize producer count.
        const bestByProducer = new Map();
        for (const candidate of candidates) {
            const producerKey = String(candidate.userId);
            const current = bestByProducer.get(producerKey);
            if (!current || Number(candidate.monthlyCapacity || 0) > Number(current.monthlyCapacity || 0)) {
                bestByProducer.set(producerKey, candidate);
            }
        }
        const shortlist = Array.from(bestByProducer.values()).sort((a, b) => {
            const aEligible = a.aggregation === "eligible" ? 1 : 0;
            const bEligible = b.aggregation === "eligible" ? 1 : 0;
            if (aEligible !== bEligible)
                return bEligible - aEligible;
            return Number(b.monthlyCapacity || 0) - Number(a.monthlyCapacity || 0);
        });
        const producerIds = shortlist.map((item) => item.userId);
        const producers = await User.find({ _id: { $in: producerIds } }).select("name").lean();
        const producerNameMap = new Map(producers.map((p) => [String(p._id), p.name || "Producer"]));
        let remaining = requiredVolumeKg;
        const allocations = [];
        for (const candidate of shortlist) {
            if (remaining <= 0)
                break;
            const availableCapacityKg = Number(candidate.monthlyCapacity || 0);
            if (availableCapacityKg <= 0)
                continue;
            const allocatedKg = Math.min(remaining, availableCapacityKg);
            allocations.push({
                producerId: candidate.userId,
                producerName: producerNameMap.get(String(candidate.userId)) || "Producer",
                productId: candidate._id,
                productName: candidate.name || requestDoc.productName,
                allocatedKg,
                availableCapacityKg,
                unitPrice: Number(candidate.unitPrice || 0),
                producerResponse: "pending",
                fulfillmentStatus: "none",
                declinedReason: "",
            });
            remaining -= allocatedKg;
        }
        const totalAllocatedKg = requiredVolumeKg - Math.max(remaining, 0);
        requestDoc.fulfillmentMode = allocations.length > 1 || Math.max(remaining, 0) > 0 ? "aggregation" : "single";
        requestDoc.matchPlan = {
            generatedAt: new Date(),
            requiredVolumeKg,
            totalAllocatedKg,
            remainingVolumeKg: Math.max(remaining, 0),
            matchedProducerCount: allocations.length,
            allocations,
        };
        requestDoc.status = remaining <= 0 ? "matched" : "in_review";
        syncTradeProducerDecisionFromAllocations(requestDoc);
        syncLegacyRequestStatusWithTrade(requestDoc);
        await requestDoc.save();
        res.status(200).json({
            success: true,
            data: requestDoc,
            message: remaining <= 0
                ? "Auto-match completed."
                : "Partial match generated. More producer capacity is needed.",
        });
    }
    catch (error) {
        console.error("Admin auto-match buyer request error:", error);
        res.status(500).json({ success: false, message: "Failed to auto-match buyer request" });
    }
});
// PUT /api/admin/buyer-requests/:id/match-plan
// Allows admin to manually tweak producer allocations from the generated plan.
router.put("/admin/buyer-requests/:id/match-plan", authenticateAdmin, async (req, res) => {
    try {
        const requestDoc = await BuyerRequest.findById(req.params.id);
        if (!requestDoc) {
            res.status(404).json({ success: false, message: "Buyer request not found." });
            return;
        }
        const incomingAllocations = Array.isArray(req.body?.allocations) ? req.body.allocations : [];
        if (!incomingAllocations.length) {
            res.status(400).json({ success: false, message: "At least one allocation is required." });
            return;
        }
        const candidateProductIds = incomingAllocations
            .map((a) => String(a?.productId || "").trim())
            .filter(Boolean);
        const products = await Product.find({
            _id: { $in: candidateProductIds },
            readiness: "approved",
            verification: "verified",
        })
            .select("userId name monthlyCapacity unitPrice")
            .lean();
        const productMap = new Map(products.map((p) => [String(p._id), p]));
        const producerIds = Array.from(new Set(products.map((p) => String(p.userId))));
        const producers = await User.find({ _id: { $in: producerIds } }).select("name").lean();
        const producerNameMap = new Map(producers.map((p) => [String(p._id), p.name || "Producer"]));
        const prevAllocs = (requestDoc.matchPlan?.allocations || []);
        const sanitizedAllocations = [];
        for (const allocation of incomingAllocations) {
            const productId = String(allocation?.productId || "").trim();
            const producerId = String(allocation?.producerId || "").trim();
            const allocatedKg = Number(allocation?.allocatedKg || 0);
            if (!productId || !producerId)
                continue;
            if (!Number.isFinite(allocatedKg) || allocatedKg <= 0)
                continue;
            const product = productMap.get(productId);
            if (!product)
                continue;
            if (String(product.userId) !== producerId)
                continue;
            const availableCapacityKg = Number(product.monthlyCapacity || 0);
            if (availableCapacityKg <= 0)
                continue;
            const cappedAllocatedKg = Math.min(allocatedKg, availableCapacityKg);
            sanitizedAllocations.push({
                producerId,
                producerName: producerNameMap.get(producerId) || "Producer",
                productId,
                productName: product.name || requestDoc.productName,
                allocatedKg: cappedAllocatedKg,
                availableCapacityKg,
                unitPrice: Number(product.unitPrice || 0),
                fulfillmentStatus: "none",
            });
        }
        if (!sanitizedAllocations.length) {
            res.status(400).json({ success: false, message: "No valid allocations provided." });
            return;
        }
        for (const s of sanitizedAllocations) {
            const prev = prevAllocs.find((p) => String(p.producerId) === String(s.producerId) && String(p.productId) === String(s.productId));
            if (!prev || Number(prev.allocatedKg) !== Number(s.allocatedKg)) {
                s.producerResponse = "pending";
                s.fulfillmentStatus = "none";
                s.declinedReason = "";
                s.declinedAt = undefined;
                continue;
            }
            s.producerResponse = prev.producerResponse || "pending";
            s.fulfillmentStatus = prev.fulfillmentStatus || "none";
            s.declinedReason = prev.declinedReason || "";
            s.declinedAt = prev.declinedAt;
        }
        const requiredVolumeKg = Number(requestDoc.volumeKg || 0);
        const totalAllocatedKg = sanitizedAllocations.reduce((sum, a) => sum + Number(a.allocatedKg || 0), 0);
        const remainingVolumeKg = Math.max(requiredVolumeKg - totalAllocatedKg, 0);
        requestDoc.fulfillmentMode =
            sanitizedAllocations.length > 1 || remainingVolumeKg > 0 ? "aggregation" : "single";
        requestDoc.matchPlan = {
            generatedAt: new Date(),
            requiredVolumeKg,
            totalAllocatedKg,
            remainingVolumeKg,
            matchedProducerCount: sanitizedAllocations.length,
            allocations: sanitizedAllocations,
        };
        requestDoc.status = remainingVolumeKg <= 0 ? "matched" : "in_review";
        syncTradeProducerDecisionFromAllocations(requestDoc);
        syncLegacyRequestStatusWithTrade(requestDoc);
        await requestDoc.save();
        res.status(200).json({ success: true, data: requestDoc, message: "Match plan updated." });
    }
    catch (error) {
        console.error("Admin update match plan error:", error);
        res.status(500).json({ success: false, message: "Failed to update match plan" });
    }
});
// POST /api/admin/buyer-requests/:id/reassign-paid-cancellation — after producer cancelled a paid order
router.post("/admin/buyer-requests/:id/reassign-paid-cancellation", authenticateAdmin, async (req, res) => {
    try {
        const requestDoc = await BuyerRequest.findById(req.params.id);
        if (!requestDoc) {
            res.status(404).json({ success: false, message: "Buyer request not found." });
            return;
        }
        const t = ensureTrade(requestDoc);
        if (!invoiceIsPaid(requestDoc)) {
            res.status(400).json({
                success: false,
                message: "Reassignment applies only when the buyer invoice was paid before cancellation.",
            });
            return;
        }
        if (t.fulfillmentStatus !== "cancelled") {
            res.status(400).json({ success: false, message: "Fulfillment must be cancelled before reassigning the producer." });
            return;
        }
        const productIdRaw = String(req.body?.productId || "").trim();
        const incomingAllocations = Array.isArray(req.body?.allocations) ? req.body.allocations : [];
        const buyerNote = String(req.body?.buyerNote || "").trim().slice(0, 1000);
        const reopenTrade = () => {
            t.transactionClosed = false;
            t.transactionClosedAt = undefined;
            t.fulfillmentStatus = "none";
            t.awaitingProducerReassignment = false;
            t.adminCancelledPaidOrderReason = "";
            t.adminCancelledPaidOrderAt = undefined;
            t.adminBuyerNote = buyerNote;
        };
        if (incomingAllocations.length > 0) {
            const candidateProductIds = incomingAllocations
                .map((a) => String(a?.productId || "").trim())
                .filter(Boolean);
            const products = await Product.find({
                _id: { $in: candidateProductIds },
                readiness: "approved",
                verification: "verified",
            })
                .select("userId name monthlyCapacity unitPrice")
                .lean();
            const productMap = new Map(products.map((p) => [String(p._id), p]));
            const producerIds = Array.from(new Set(products.map((p) => String(p.userId))));
            const producers = await User.find({ _id: { $in: producerIds } }).select("name").lean();
            const producerNameMap = new Map(producers.map((p) => [String(p._id), p.name || "Producer"]));
            const sanitizedAllocations = [];
            for (const allocation of incomingAllocations) {
                const productId = String(allocation?.productId || "").trim();
                const producerId = String(allocation?.producerId || "").trim();
                const allocatedKg = Number(allocation?.allocatedKg || 0);
                if (!productId || !producerId)
                    continue;
                if (!Number.isFinite(allocatedKg) || allocatedKg <= 0)
                    continue;
                const product = productMap.get(productId);
                if (!product)
                    continue;
                if (String(product.userId) !== producerId)
                    continue;
                const availableCapacityKg = Number(product.monthlyCapacity || 0);
                if (availableCapacityKg <= 0)
                    continue;
                const cappedAllocatedKg = Math.min(allocatedKg, availableCapacityKg);
                sanitizedAllocations.push({
                    producerId,
                    producerName: producerNameMap.get(producerId) || "Producer",
                    productId,
                    productName: product.name || requestDoc.productName,
                    allocatedKg: cappedAllocatedKg,
                    availableCapacityKg,
                    unitPrice: Number(product.unitPrice || 0),
                    producerResponse: "pending",
                    fulfillmentStatus: "none",
                    declinedReason: "",
                });
            }
            if (!sanitizedAllocations.length) {
                res.status(400).json({ success: false, message: "No valid allocations provided." });
                return;
            }
            const requiredVolumeKg = Number(requestDoc.volumeKg || 0);
            const totalAllocatedKg = sanitizedAllocations.reduce((sum, a) => sum + Number(a.allocatedKg || 0), 0);
            const remainingVolumeKg = Math.max(requiredVolumeKg - totalAllocatedKg, 0);
            requestDoc.fulfillmentMode =
                sanitizedAllocations.length > 1 || remainingVolumeKg > 0 ? "aggregation" : "single";
            requestDoc.matchPlan = {
                generatedAt: new Date(),
                requiredVolumeKg,
                totalAllocatedKg,
                remainingVolumeKg,
                matchedProducerCount: sanitizedAllocations.length,
                allocations: sanitizedAllocations,
            };
            requestDoc.status = remainingVolumeKg <= 0 ? "matched" : "in_review";
            const first = sanitizedAllocations[0];
            if (first) {
                requestDoc.producerId = first.producerId;
                requestDoc.productId = first.productId;
                requestDoc.productName = first.productName || requestDoc.productName;
            }
            reopenTrade();
            syncTradeProducerDecisionFromAllocations(requestDoc);
            syncLegacyRequestStatusWithTrade(requestDoc);
            applyTradeClosureRules(requestDoc);
            await requestDoc.save();
            res.status(200).json({ success: true, data: requestDoc, message: "Producers reassigned; trade reopened." });
            return;
        }
        if (!productIdRaw) {
            res.status(400).json({
                success: false,
                message: "Provide productId (single-supplier) or allocations[] (same shape as Plan details).",
            });
            return;
        }
        if (isAggregationStyle(requestDoc)) {
            res.status(400).json({
                success: false,
                message: "This is an aggregation request. Send allocations[] in the body (same as Plan details).",
            });
            return;
        }
        const product = await Product.findOne({
            _id: productIdRaw,
            readiness: "approved",
            verification: "verified",
        })
            .select("userId name monthlyCapacity unitPrice category")
            .lean();
        if (!product) {
            res.status(400).json({ success: false, message: "Product not found or not approved for trade." });
            return;
        }
        const requiredVolumeKg = Number(requestDoc.volumeKg || 0);
        const availableCapacityKg = Number(product.monthlyCapacity || 0);
        if (availableCapacityKg <= 0) {
            res.status(400).json({ success: false, message: "Product has no available capacity." });
            return;
        }
        const allocatedKg = Math.min(requiredVolumeKg, availableCapacityKg);
        const remainingVolumeKg = Math.max(requiredVolumeKg - allocatedKg, 0);
        const producerName = (await User.findById(product.userId).select("name").lean())?.name || "Producer";
        const allocations = [
            {
                producerId: product.userId,
                producerName,
                productId: product._id,
                productName: product.name || requestDoc.productName,
                allocatedKg,
                availableCapacityKg,
                unitPrice: Number(product.unitPrice || 0),
                producerResponse: "pending",
                fulfillmentStatus: "none",
                declinedReason: "",
            },
        ];
        requestDoc.producerId = product.userId;
        requestDoc.productId = product._id;
        requestDoc.productName = product.name || requestDoc.productName;
        if (product.category) {
            requestDoc.category = product.category;
        }
        requestDoc.fulfillmentMode = "single";
        requestDoc.matchPlan = {
            generatedAt: new Date(),
            requiredVolumeKg,
            totalAllocatedKg: allocatedKg,
            remainingVolumeKg,
            matchedProducerCount: 1,
            allocations: allocations,
        };
        requestDoc.status = remainingVolumeKg <= 0 ? "matched" : "in_review";
        reopenTrade();
        syncTradeProducerDecisionFromAllocations(requestDoc);
        syncLegacyRequestStatusWithTrade(requestDoc);
        applyTradeClosureRules(requestDoc);
        await requestDoc.save();
        res.status(200).json({ success: true, data: requestDoc, message: "Producer reassigned; trade reopened." });
    }
    catch (error) {
        console.error("Admin reassign paid cancellation error:", error);
        res.status(500).json({ success: false, message: "Failed to reassign producer" });
    }
});
// POST /api/admin/buyer-requests/:id/cancel-paid-cancellation
// Finalizes a producer-paid cancellation as an actual cancellation.
router.post("/admin/buyer-requests/:id/cancel-paid-cancellation", authenticateAdmin, async (req, res) => {
    try {
        const requestDoc = await BuyerRequest.findById(req.params.id);
        if (!requestDoc) {
            res.status(404).json({ success: false, message: "Buyer request not found." });
            return;
        }
        const t = ensureTrade(requestDoc);
        if (!invoiceIsPaid(requestDoc)) {
            res.status(400).json({ success: false, message: "Only paid cancellations can be finalized from this action." });
            return;
        }
        if (t.fulfillmentStatus !== "cancelled" || !t.awaitingProducerReassignment) {
            res.status(400).json({ success: false, message: "This request is not awaiting admin cancellation/reassignment." });
            return;
        }
        const reason = String(req.body?.reason || "").trim().slice(0, 4000);
        if (!reason) {
            res.status(400).json({ success: false, message: "A cancellation reason is required." });
            return;
        }
        const buyerNote = String(req.body?.buyerNote || "").trim().slice(0, 1000);
        t.awaitingProducerReassignment = false;
        t.adminCancelledPaidOrderReason = reason;
        t.adminCancelledPaidOrderAt = new Date();
        t.adminBuyerNote = buyerNote;
        t.transactionClosed = true;
        t.transactionClosedAt = new Date();
        applyTradeClosureRules(requestDoc);
        await requestDoc.save();
        res.status(200).json({ success: true, data: requestDoc, message: "Paid cancellation finalized by admin." });
    }
    catch (error) {
        console.error("Admin cancel paid cancellation error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to finalize cancellation" });
    }
});
// POST /api/admin/buyer-requests/:id/trade/refund
// Refund is only available after admin finalizes a paid cancellation.
router.post("/admin/buyer-requests/:id/trade/refund", authenticateAdmin, async (req, res) => {
    try {
        const requestDoc = await BuyerRequest.findById(req.params.id);
        if (!requestDoc) {
            res.status(404).json({ success: false, message: "Buyer request not found." });
            return;
        }
        const t = ensureTrade(requestDoc);
        if (!invoiceIsPaid(requestDoc) || !t.invoice?.paidAt) {
            res.status(400).json({ success: false, message: "Only paid requests can be refunded." });
            return;
        }
        if (!t.adminCancelledPaidOrderAt) {
            res.status(400).json({ success: false, message: "Finalize admin cancellation first, then issue a refund." });
            return;
        }
        if (t.refund?.status === "completed") {
            res.status(400).json({ success: false, message: "This request has already been refunded." });
            return;
        }
        const totalCents = Number(t.invoice?.totalCents || 0);
        if (!Number.isFinite(totalCents) || totalCents <= 0) {
            res.status(400).json({ success: false, message: "Invalid invoice total for refund." });
            return;
        }
        const rawAmount = Number(req.body?.amountCents || totalCents);
        const amountCents = Math.round(rawAmount);
        if (!Number.isFinite(amountCents) || amountCents < 1 || amountCents > totalCents) {
            res.status(400).json({ success: false, message: "amountCents must be between 1 and invoice total." });
            return;
        }
        const note = String(req.body?.note || "").trim().slice(0, 1000);
        const refundRes = await stripeRefundPaidTradeInvoice(requestDoc, amountCents, note, "admin_paid_cancellation_refund");
        if (!refundRes.ok) {
            res.status(502).json({ success: false, message: refundRes.message, data: requestDoc });
            return;
        }
        await requestDoc.save();
        res.status(200).json({ success: true, data: requestDoc, refundId: refundRes.refundId });
    }
    catch (error) {
        console.error("Admin trade refund error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to refund trade" });
    }
});
// POST /api/admin/buyer-requests/:id/trade/invoice — aggregation only (buyer invoice from ops)
router.post("/admin/buyer-requests/:id/trade/invoice", authenticateAdmin, async (req, res) => {
    try {
        const requestDoc = await BuyerRequest.findById(req.params.id);
        if (!requestDoc) {
            res.status(404).json({ success: false, message: "Buyer request not found." });
            return;
        }
        if (!isAggregationStyle(requestDoc)) {
            res.status(400).json({
                success: false,
                message: "Admin invoicing applies to aggregation trades only. Single-supplier requests are invoiced by the producer.",
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
        res.status(200).json({ success: true, data: requestDoc, message: "Invoice sent to buyer." });
    }
    catch (error) {
        console.error("Admin trade invoice error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to create invoice" });
    }
});
// PUT /api/admin/buyer-requests/:id/trade/invoice/mark-paid
// Admin-only emergency override for off-platform reconciliations.
router.put("/admin/buyer-requests/:id/trade/invoice/mark-paid", authenticateAdmin, async (req, res) => {
    try {
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
        if (!t.invoice?.sentAt) {
            res.status(400).json({ success: false, message: "Generate and send an invoice first." });
            return;
        }
        if (t.invoice.paidAt) {
            res.status(400).json({ success: false, message: "Invoice is already marked paid." });
            return;
        }
        t.invoice.paidAt = new Date();
        syncLegacyRequestStatusWithTrade(requestDoc);
        await requestDoc.save();
        void notifyProducersTradePaid(requestDoc);
        res.status(200).json({ success: true, data: requestDoc });
    }
    catch (error) {
        console.error("Admin mark invoice paid error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to mark invoice paid" });
    }
});
// PUT /api/admin/buyer-requests/:id/trade/fulfillment — admin override (allowed until transaction closed)
router.put("/admin/buyer-requests/:id/trade/fulfillment", authenticateAdmin, async (req, res) => {
    try {
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
            res.status(400).json({ success: false, message: "This transaction is closed and cannot be changed." });
            return;
        }
        const t = ensureTrade(requestDoc);
        if (t.awaitingProducerReassignment && next !== "cancelled") {
            res.status(400).json({
                success: false,
                message: "This paid cancellation is awaiting admin resolution (reassign or finalize cancellation) before further fulfillment updates.",
            });
            return;
        }
        if (isAggregationStyle(requestDoc)) {
            const lines = getActiveAllocations(requestDoc);
            const accepted = lines.filter((a) => String(a.producerResponse || "pending") === "accepted");
            const target = accepted.length ? accepted : lines;
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
        console.error("Admin trade fulfillment error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to update fulfillment" });
    }
});
// POST /api/admin/buyer-requests/:id/trade/issue-note — append internal note while buyer issue is open
router.post("/admin/buyer-requests/:id/trade/issue-note", authenticateAdmin, async (req, res) => {
    try {
        const text = String(req.body?.body || "").trim().slice(0, 4000);
        if (!text) {
            res.status(400).json({ success: false, message: "body is required." });
            return;
        }
        const requestDoc = await BuyerRequest.findById(req.params.id);
        if (!requestDoc) {
            res.status(404).json({ success: false, message: "Buyer request not found." });
            return;
        }
        const t = ensureTrade(requestDoc);
        if (!t.issuesNeedAdmin) {
            res.status(400).json({ success: false, message: "There is no open buyer issue to annotate." });
            return;
        }
        pushTradeIssueAdminNote(t, req, text);
        syncLegacyRequestStatusWithTrade(requestDoc);
        await requestDoc.save();
        res.status(200).json({ success: true, data: requestDoc });
    }
    catch (error) {
        console.error("Admin trade issue note error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to save note" });
    }
});
// PUT /api/admin/buyer-requests/:id/trade/resolve-issues
router.put("/admin/buyer-requests/:id/trade/resolve-issues", authenticateAdmin, async (req, res) => {
    try {
        const requestDoc = await BuyerRequest.findById(req.params.id);
        if (!requestDoc) {
            res.status(404).json({ success: false, message: "Buyer request not found." });
            return;
        }
        const t = ensureTrade(requestDoc);
        if (!t.issuesNeedAdmin) {
            res.status(400).json({ success: false, message: "No open buyer issue on this request." });
            return;
        }
        const closeOk = Boolean(req.body?.closeAsReceivedOk);
        const resolutionNote = String(req.body?.resolutionNote ?? req.body?.adminNotes ?? "").trim().slice(0, 4000);
        const refundBuyer = Boolean(req.body?.refundBuyer);
        const totalCents = Number(t.invoice?.totalCents || 0);
        let refundAmount = Math.round(Number(req.body?.refundAmountCents ?? totalCents));
        if (!Number.isFinite(refundAmount) || refundAmount < 1) {
            refundAmount = totalCents;
        }
        if (refundBuyer) {
            const noteForRefund = resolutionNote || String(req.body?.refundNote || "").trim().slice(0, 1000) || "Issue resolution — refund to buyer";
            const refundRes = await stripeRefundPaidTradeInvoice(requestDoc, refundAmount, noteForRefund, "admin_issue_resolution_refund");
            if (!refundRes.ok) {
                res.status(502).json({ success: false, message: refundRes.message });
                return;
            }
        }
        if (resolutionNote) {
            t.issueResolutionNote = resolutionNote;
        }
        t.issuesNeedAdmin = false;
        t.issuesResolvedAt = new Date();
        const author = tradeIssueNoteAuthor(req);
        if (author.authorId) {
            t.issuesResolvedBy = author.authorId;
        }
        if (closeOk) {
            t.buyerReceipt = "received_ok";
            t.buyerReceiptAt = new Date();
        }
        t.transactionClosed = true;
        t.transactionClosedAt = new Date();
        applyTradeClosureRules(requestDoc);
        await requestDoc.save();
        res.status(200).json({ success: true, data: requestDoc });
    }
    catch (error) {
        console.error("Admin resolve trade issues error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to resolve issue" });
    }
});
// GET /api/admin/accounts/payout-queue — completed with no issues, invoice paid, payout not completed
router.get("/admin/accounts/payout-queue", authenticateAdmin, async (_req, res) => {
    try {
        const rows = await BuyerRequest.find({
            "trade.buyerReceipt": "received_ok",
            "trade.invoice.paidAt": { $exists: true, $ne: null },
            "trade.producerDecision": "accepted",
        })
            .sort({ updatedAt: -1 })
            .lean();
        const queue = [];
        for (const r of rows) {
            const inv = r.trade?.invoice || {};
            if (isAggregationStyle(r)) {
                const active = (r.matchPlan?.allocations || []).filter((a) => Number(a?.allocatedKg || 0) > 0);
                const accepted = active.filter((a) => String(a.producerResponse || "pending") === "accepted");
                const acceptedGrosses = accepted.map((a) => Math.round(Number(a.unitPrice || 0) * Number(a.allocatedKg || 0) * 100));
                const acceptedTotal = acceptedGrosses.reduce((sum, g) => sum + g, 0);
                if (acceptedTotal <= 0)
                    continue;
                for (const a of accepted) {
                    const idx = accepted.indexOf(a);
                    const gross = acceptedGrosses[idx] || 0;
                    if (gross <= 0)
                        continue;
                    const ps = String(a?.payout?.status || "none");
                    if (!["none", "failed"].includes(ps))
                        continue;
                    if (String(a?.fulfillmentStatus || "none") !== "completed")
                        continue;
                    queue.push({
                        ...r,
                        payoutTarget: {
                            mode: "allocation",
                            producerId: String(a.producerId),
                            productId: String(a.productId),
                            producerName: a.producerName || "",
                            productName: a.productName || r.productName || "",
                            allocatedKg: Number(a.allocatedKg || 0),
                            grossShareCents: gross,
                            additionalFeesShareCents: 0,
                            payoutCents: gross,
                            payoutStatus: ps,
                        },
                    });
                }
                continue;
            }
            const payout = invoiceProducerPayoutCents(inv);
            const st = String(r.trade?.payout?.status || "none");
            if (payout > 0 && !["completed", "pending"].includes(st)) {
                queue.push({
                    ...r,
                    payoutTarget: {
                        mode: "trade",
                        producerId: String(r.producerId),
                        productId: String(r.productId),
                        producerName: "",
                        productName: r.productName || "",
                        allocatedKg: Number(r.volumeKg || 0),
                        grossShareCents: Number(inv.subtotalCents || 0),
                        additionalFeesShareCents: Math.max(0, Math.round(Number(inv.additionalFeesCents || 0))),
                        payoutCents: payout,
                        payoutStatus: st,
                    },
                });
            }
        }
        res.status(200).json({ success: true, data: queue });
    }
    catch (error) {
        console.error("Admin payout queue error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to load payout queue" });
    }
});
// GET /api/admin/accounts/payout-history — completed/failed/pending payout rows for audit trail
router.get("/admin/accounts/payout-history", authenticateAdmin, async (_req, res) => {
    try {
        const rows = await BuyerRequest.find({
            "trade.invoice.paidAt": { $exists: true, $ne: null },
            "trade.producerDecision": "accepted",
        })
            .sort({ updatedAt: -1 })
            .lean();
        const history = [];
        for (const r of rows) {
            const inv = r.trade?.invoice || {};
            if (isAggregationStyle(r)) {
                const active = (r.matchPlan?.allocations || []).filter((a) => Number(a?.allocatedKg || 0) > 0);
                const accepted = active.filter((a) => String(a.producerResponse || "pending") === "accepted");
                const acceptedGrosses = accepted.map((a) => Math.round(Number(a.unitPrice || 0) * Number(a.allocatedKg || 0) * 100));
                const acceptedTotal = acceptedGrosses.reduce((sum, g) => sum + g, 0);
                if (acceptedTotal <= 0)
                    continue;
                for (const a of accepted) {
                    const idx = accepted.indexOf(a);
                    const ps = String(a?.payout?.status || "none");
                    if (!["pending", "completed", "failed"].includes(ps))
                        continue;
                    const gross = acceptedGrosses[idx] || 0;
                    history.push({
                        ...r,
                        payoutTarget: {
                            mode: "allocation",
                            producerId: String(a.producerId),
                            productId: String(a.productId),
                            producerName: a.producerName || "",
                            productName: a.productName || r.productName || "",
                            allocatedKg: Number(a.allocatedKg || 0),
                            grossShareCents: gross,
                            additionalFeesShareCents: 0,
                            payoutCents: gross,
                            payoutStatus: ps,
                            initiatedAt: a?.payout?.initiatedAt,
                            stripeTransferId: a?.payout?.stripeTransferId,
                            errorMessage: a?.payout?.errorMessage,
                        },
                    });
                }
                continue;
            }
            const st = String(r.trade?.payout?.status || "none");
            if (["pending", "completed", "failed"].includes(st)) {
                history.push({
                    ...r,
                    payoutTarget: {
                        mode: "trade",
                        producerId: String(r.producerId),
                        productId: String(r.productId),
                        producerName: "",
                        productName: r.productName || "",
                        allocatedKg: Number(r.volumeKg || 0),
                        grossShareCents: Number(inv.subtotalCents || 0),
                        additionalFeesShareCents: Math.max(0, Math.round(Number(inv.additionalFeesCents || 0))),
                        payoutCents: invoiceProducerPayoutCents(inv),
                        payoutStatus: st,
                        initiatedAt: r.trade?.payout?.initiatedAt,
                        stripeTransferId: r.trade?.payout?.stripeTransferId,
                        errorMessage: r.trade?.payout?.errorMessage,
                    },
                });
            }
        }
        res.status(200).json({ success: true, data: history });
    }
    catch (error) {
        console.error("Admin payout history error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to load payout history" });
    }
});
// POST /api/admin/accounts/payout — { requestId, passcode, producerId?, productId?, amountCents? }
router.post("/admin/accounts/payout", authenticateAdmin, async (req, res) => {
    try {
        const requestId = String(req.body?.requestId || "").trim();
        const passcode = String(req.body?.passcode || "");
        const producerId = String(req.body?.producerId || "").trim();
        const productId = String(req.body?.productId || "").trim();
        const amountOverride = req.body?.amountCents !== undefined && req.body?.amountCents !== null && req.body?.amountCents !== ""
            ? Math.round(Number(req.body.amountCents))
            : undefined;
        const expected = process.env.ADMIN_PAYOUT_PASSCODE;
        if (!requestId) {
            res.status(400).json({ success: false, message: "requestId is required." });
            return;
        }
        if (!verifyPayoutPasscode(passcode, expected)) {
            res.status(403).json({ success: false, message: "Invalid passcode." });
            return;
        }
        const requestDoc = await BuyerRequest.findById(requestId);
        if (!requestDoc) {
            res.status(404).json({ success: false, message: "Buyer request not found." });
            return;
        }
        const t = ensureTrade(requestDoc);
        if (t.buyerReceipt !== "received_ok" || !t.invoice?.paidAt || t.producerDecision !== "accepted") {
            res.status(400).json({ success: false, message: "This request is not eligible for payout." });
            return;
        }
        if (isAggregationStyle(requestDoc)) {
            if (!producerId || !productId) {
                res.status(400).json({ success: false, message: "producerId and productId are required for aggregation payouts." });
                return;
            }
            const active = (requestDoc.matchPlan?.allocations || []).filter((a) => Number(a?.allocatedKg || 0) > 0);
            const accepted = active.filter((a) => String(a.producerResponse || "pending") === "accepted");
            const line = accepted.find((a) => String(a.producerId) === producerId && String(a.productId) === productId);
            if (!line) {
                res.status(404).json({ success: false, message: "Allocation line not found for payout." });
                return;
            }
            if (String(line.fulfillmentStatus || "none") !== "completed") {
                res.status(400).json({ success: false, message: "Producer line must be completed before payout." });
                return;
            }
            const ps = String(line.payout?.status || "none");
            if (ps === "completed") {
                res.status(400).json({ success: false, message: "Payout already completed for this producer line." });
                return;
            }
            if (ps === "pending") {
                res.status(400).json({ success: false, message: "A payout is already in progress for this producer line." });
                return;
            }
            const acceptedGrosses = accepted.map((a) => Math.round(Number(a.unitPrice || 0) * Number(a.allocatedKg || 0) * 100));
            const lineIdx = accepted.findIndex((a) => String(a.producerId) === producerId && String(a.productId) === productId);
            const gross = acceptedGrosses[lineIdx] || 0;
            const defaultPayout = gross;
            const payoutCents = amountOverride !== undefined ? amountOverride : defaultPayout;
            if (!Number.isFinite(payoutCents) || payoutCents <= 0) {
                res.status(400).json({ success: false, message: "Invalid payout amount." });
                return;
            }
            const producer = await User.findById(producerId).select("stripeConnectAccountId name email");
            const dest = String(producer?.stripeConnectAccountId || "").trim();
            if (!dest || !dest.startsWith("acct_")) {
                res.status(400).json({
                    success: false,
                    message: "Producer has no Stripe Connect account id on file (acct_...). Add stripeConnectAccountId to the user in the database.",
                });
                return;
            }
            line.payout = line.payout || { status: "none" };
            line.payout.status = "pending";
            line.payout.amountCents = payoutCents;
            line.payout.initiatedAt = new Date();
            await requestDoc.save();
            try {
                const transfer = await transferToConnectAccount({
                    amountCents: payoutCents,
                    destinationAccountId: dest,
                    metadata: {
                        buyerRequestId: String(requestDoc._id),
                        producerId: String(producerId),
                        productId: String(productId),
                    },
                });
                line.payout.status = "completed";
                line.payout.stripeTransferId = transfer.id;
                line.payout.errorMessage = undefined;
                await requestDoc.save();
                res.status(200).json({ success: true, data: requestDoc, transferId: transfer.id });
            }
            catch (err) {
                line.payout.status = "failed";
                line.payout.errorMessage = err?.message || "Stripe transfer failed";
                await requestDoc.save();
                res.status(502).json({ success: false, message: line.payout.errorMessage, data: requestDoc });
            }
            return;
        }
        const payoutCents = amountOverride !== undefined ? amountOverride : invoiceProducerPayoutCents(t.invoice || {});
        if (!Number.isFinite(payoutCents) || payoutCents <= 0) {
            res.status(400).json({ success: false, message: "Invalid invoice amounts for payout." });
            return;
        }
        if (t.payout?.status === "completed") {
            res.status(400).json({ success: false, message: "Payout already completed for this request." });
            return;
        }
        if (t.payout?.status === "pending") {
            res.status(400).json({ success: false, message: "A payout is already in progress for this request." });
            return;
        }
        const producer = await User.findById(requestDoc.producerId).select("stripeConnectAccountId name email");
        const dest = String(producer?.stripeConnectAccountId || "").trim();
        if (!dest || !dest.startsWith("acct_")) {
            res.status(400).json({
                success: false,
                message: "Producer has no Stripe Connect account id on file (acct_...). Add stripeConnectAccountId to the user in the database.",
            });
            return;
        }
        t.payout = t.payout || { status: "none" };
        t.payout.status = "pending";
        t.payout.amountCents = payoutCents;
        t.payout.initiatedAt = new Date();
        await requestDoc.save();
        try {
            const transfer = await transferToConnectAccount({
                amountCents: payoutCents,
                destinationAccountId: dest,
                metadata: {
                    buyerRequestId: String(requestDoc._id),
                    producerId: String(requestDoc.producerId),
                },
            });
            t.payout.status = "completed";
            t.payout.stripeTransferId = transfer.id;
            t.payout.errorMessage = undefined;
            await requestDoc.save();
            res.status(200).json({ success: true, data: requestDoc, transferId: transfer.id });
        }
        catch (err) {
            t.payout.status = "failed";
            t.payout.errorMessage = err?.message || "Stripe transfer failed";
            await requestDoc.save();
            res.status(502).json({
                success: false,
                message: t.payout.errorMessage,
                data: requestDoc,
            });
        }
    }
    catch (error) {
        console.error("Admin payout error:", error);
        res.status(500).json({ success: false, message: error.message || "Payout failed" });
    }
});
// GET /api/admin/producer/:id
router.get("/admin/producer/:id", authenticateAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) {
            res.status(404).json({ success: false, message: "Producer not found" });
            return;
        }
        const assessment = await Assessment.findOne({ userId: user._id }).select("-documents.data");
        const products = await Product.find({ userId: user._id }).select("-image.data");
        res.status(200).json({
            success: true,
            data: { user, assessment, products },
        });
    }
    catch (error) {
        console.error("Admin producer detail error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch producer" });
    }
});
// GET /api/admin/producer/:id/document/:docId - View/download a producer's document
// Also accepts ?token=... as a query param for opening in new tab
router.get("/admin/producer/:id/document/:docId", async (req, res, next) => {
    // Allow token from query string for direct browser viewing
    if (!req.headers.authorization && req.query.token) {
        req.headers.authorization = `Bearer ${req.query.token}`;
    }
    authenticateAdmin(req, res, next);
}, async (req, res) => {
    try {
        const assessment = await Assessment.findOne({ userId: req.params.id });
        if (!assessment) {
            res.status(404).json({ success: false, message: "Assessment not found" });
            return;
        }
        const doc = assessment.documents?.find((d) => d._id?.toString() === req.params.docId);
        if (!doc) {
            res.status(404).json({ success: false, message: "Document not found" });
            return;
        }
        res.setHeader("Content-Type", doc.type);
        res.setHeader("Content-Disposition", `inline; filename="${doc.name}"`);
        if (doc.size)
            res.setHeader("Content-Length", doc.size);
        res.send(doc.data);
    }
    catch (error) {
        console.error("Admin view document error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch document" });
    }
});
// PUT /api/admin/producer/:id/document/:docId/review - Approve, reject, or undo a review
router.put("/admin/producer/:id/document/:docId/review", authenticateAdmin, async (req, res) => {
    try {
        const { action, reason } = req.body;
        if (!action || !["approved", "rejected", "pending"].includes(action)) {
            res
                .status(400)
                .json({ success: false, message: "Action must be 'approved', 'rejected', or 'pending'" });
            return;
        }
        if (action === "rejected" && !reason) {
            res.status(400).json({ success: false, message: "Rejection reason is required" });
            return;
        }
        const assessment = await Assessment.findOne({ userId: req.params.id });
        if (!assessment) {
            res.status(404).json({ success: false, message: "Assessment not found" });
            return;
        }
        const doc = assessment.documents?.find((d) => d._id?.toString() === req.params.docId);
        if (!doc) {
            res.status(404).json({ success: false, message: "Document not found" });
            return;
        }
        doc.status = action;
        if (action === "rejected") {
            doc.rejectionReason = reason;
            doc.reviewedAt = new Date();
        }
        else if (action === "approved") {
            doc.rejectionReason = undefined;
            doc.reviewedAt = new Date();
        }
        else {
            // Undo review: return document to pending.
            doc.rejectionReason = undefined;
            doc.reviewedAt = undefined;
            // If the producer was verified based on documents, undo that too.
            if (assessment.verified) {
                assessment.verified = false;
                assessment.verifiedAt = undefined;
                assessment.verifiedBy = undefined;
            }
        }
        await assessment.save();
        res.status(200).json({
            success: true,
            message: `Document ${action}`,
            data: {
                documentId: req.params.docId,
                status: action,
                reason: action === "rejected" ? reason : undefined,
            },
        });
    }
    catch (error) {
        console.error("Admin review document error:", error);
        res.status(500).json({ success: false, message: "Failed to review document" });
    }
});
// PUT /api/admin/producer/:id/verify - Mark producer as verified (all docs must be approved)
router.put("/admin/producer/:id/verify", authenticateAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            res.status(404).json({ success: false, message: "Producer not found" });
            return;
        }
        const assessment = await Assessment.findOne({ userId: user._id });
        if (!assessment || !assessment.documents || assessment.documents.length === 0) {
            res.status(400).json({ success: false, message: "No documents found for this producer" });
            return;
        }
        const allApproved = assessment.documents.every((d) => d.status === "approved");
        if (!allApproved) {
            res.status(400).json({ success: false, message: "All documents must be approved before verifying a producer" });
            return;
        }
        // Set a verified flag on the assessment
        assessment.verified = true;
        assessment.verifiedAt = new Date();
        assessment.verifiedBy = req.user.email;
        await assessment.save();
        res.status(200).json({
            success: true,
            message: "Producer marked as verified",
        });
    }
    catch (error) {
        console.error("Admin verify producer error:", error);
        res.status(500).json({ success: false, message: "Failed to verify producer" });
    }
});
// ─── Product Review Endpoints ───────────────────────────────────────────────
// GET /api/admin/products - List all products across all producers
router.get("/admin/products", authenticateAdmin, async (req, res) => {
    try {
        const products = await Product.find({}).select("-image").sort({ createdAt: -1 }).lean();
        // Get producer info for each product
        const userIds = Array.from(new Set(products.map((p) => p.userId.toString())));
        const users = await User.find({ _id: { $in: userIds } }).select("name email businessName").lean();
        const userMap = new Map(users.map((u) => [u._id.toString(), u]));
        // Check which products have images
        const productIds = products.map((p) => p._id);
        const withImages = await Product.find({ _id: { $in: productIds }, "image.contentType": { $exists: true, $ne: null } }).select("_id").lean();
        const imageSet = new Set(withImages.map((p) => p._id.toString()));
        const data = products.map((p) => {
            const producer = userMap.get(p.userId.toString());
            const base = adminProductJson(p);
            return {
                ...base,
                hasImage: imageSet.has(p._id.toString()),
                producer: producer
                    ? { name: producer.name, email: producer.email, businessName: producer.businessName }
                    : null,
            };
        });
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        console.error("Admin products error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch products" });
    }
});
// GET /api/admin/products/:id - Get full product detail
router.get("/admin/products/:id", authenticateAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).select("-image").lean();
        if (!product) {
            res.status(404).json({ success: false, message: "Product not found" });
            return;
        }
        const producer = await User.findById(product.userId).select("name email businessName country").lean();
        // Check if has image
        const hasImage = await Product.exists({
            _id: req.params.id,
            "image.contentType": { $exists: true, $ne: null },
        });
        const payload = adminProductJson({ ...product });
        res.status(200).json({
            success: true,
            data: {
                ...payload,
                hasImage: !!hasImage,
                producer: producer || null,
            },
        });
    }
    catch (error) {
        console.error("Admin product detail error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch product" });
    }
});
// GET /api/admin/products/:id/image - Serve product image to admin
router.get("/admin/products/:id/image", async (req, res, next) => {
    if (!req.headers.authorization && req.query.token) {
        req.headers.authorization = `Bearer ${req.query.token}`;
    }
    authenticateAdmin(req, res, next);
}, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product || !product.image || !product.image.data) {
            res.status(404).json({ success: false, message: "Image not found" });
            return;
        }
        res.set("Content-Type", product.image.contentType);
        res.set("Cache-Control", "private, max-age=3600");
        res.send(product.image.data);
    }
    catch (error) {
        console.error("Admin product image error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch image" });
    }
});
// GET /api/admin/products/:id/compliance-documents/:docId/file - View compliance document (admin)
router.get("/admin/products/:id/compliance-documents/:docId/file", async (req, res, next) => {
    if (!req.headers.authorization && req.query.token) {
        req.headers.authorization = `Bearer ${req.query.token}`;
    }
    authenticateAdmin(req, res, next);
}, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            res.status(404).json({ success: false, message: "Product not found" });
            return;
        }
        const doc = (product.complianceDocuments || []).find((d) => d._id?.toString() === req.params.docId);
        if (!doc || !doc.data) {
            res.status(404).json({ success: false, message: "Document not found" });
            return;
        }
        res.setHeader("Content-Type", doc.type || "application/octet-stream");
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.name)}"`);
        if (doc.size)
            res.setHeader("Content-Length", String(doc.size));
        res.set("Cache-Control", "private, max-age=3600");
        res.send(doc.data);
    }
    catch (error) {
        console.error("Admin product compliance document error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch document" });
    }
});
// PUT /api/admin/products/:id/compliance-documents/:docId/review - Approve/reject/pending a compliance document
router.put("/admin/products/:id/compliance-documents/:docId/review", authenticateAdmin, async (req, res) => {
    try {
        const { action, reason } = req.body;
        if (!action || !["approved", "rejected", "pending"].includes(action)) {
            res
                .status(400)
                .json({ success: false, message: "Action must be 'approved', 'rejected', or 'pending'" });
            return;
        }
        if (action === "rejected" && !reason) {
            res.status(400).json({ success: false, message: "Rejection reason is required" });
            return;
        }
        const product = await Product.findById(req.params.id).select("-image");
        if (!product) {
            res.status(404).json({ success: false, message: "Product not found" });
            return;
        }
        const doc = (product.complianceDocuments || []).find((d) => d._id?.toString() === req.params.docId);
        if (!doc) {
            res.status(404).json({ success: false, message: "Document not found" });
            return;
        }
        doc.status = action;
        if (action === "rejected") {
            doc.rejectionReason = reason;
            doc.reviewedAt = new Date();
        }
        else if (action === "approved") {
            doc.rejectionReason = undefined;
            doc.reviewedAt = new Date();
        }
        else {
            doc.rejectionReason = undefined;
            doc.reviewedAt = undefined;
        }
        syncProductComplianceStatus(product);
        await product.save();
        res.status(200).json({
            success: true,
            message: `Document ${action}`,
            data: adminProductJson(product.toObject()),
        });
    }
    catch (error) {
        console.error("Admin product document review error:", error);
        res.status(500).json({ success: false, message: "Failed to review document" });
    }
});
// PUT /api/admin/products/:id/review - Approve or reject a product
router.put("/admin/products/:id/review", authenticateAdmin, async (req, res) => {
    try {
        const { action, reason } = req.body;
        if (!action || !["approved", "rejected"].includes(action)) {
            res.status(400).json({ success: false, message: "Action must be 'approved' or 'rejected'" });
            return;
        }
        if (action === "rejected" && !reason) {
            res.status(400).json({ success: false, message: "Rejection reason is required" });
            return;
        }
        if (action === "approved") {
            const existing = await Product.findById(req.params.id).select("-image");
            if (!existing) {
                res.status(404).json({ success: false, message: "Product not found" });
                return;
            }
            const docs = existing.complianceDocuments || [];
            if (docs.length >= 1) {
                const allApproved = docs.every((d) => d.status === "approved");
                if (!allApproved) {
                    res.status(400).json({
                        success: false,
                        message: "This product has compliance documents. Approve each document individually. The listing goes live only when every document is approved.",
                    });
                    return;
                }
            }
        }
        const update = {
            verification: action === "approved" ? "verified" : "rejected",
        };
        if (action === "approved") {
            update.readiness = "approved";
            update.rejectionReason = "";
        }
        else {
            update.rejectionReason = reason || "";
        }
        const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true }).select("-image");
        if (!product) {
            res.status(404).json({ success: false, message: "Product not found" });
            return;
        }
        res.status(200).json({
            success: true,
            message: `Product ${action}`,
            data: adminProductJson(product.toObject()),
        });
    }
    catch (error) {
        console.error("Admin review product error:", error);
        res.status(500).json({ success: false, message: "Failed to review product" });
    }
});
// DELETE /api/admin/products/:id - Delete a product
router.delete("/admin/products/:id", authenticateAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            res.status(404).json({ success: false, message: "Product not found" });
            return;
        }
        // Keep related aggregation and buyer-request records consistent.
        await AggregationCluster.updateMany({ "contributions.productId": product._id }, { $pull: { contributions: { productId: product._id } } });
        await BuyerRequest.deleteMany({ productId: product._id });
        res.status(200).json({
            success: true,
            message: "Product deleted",
            data: { id: req.params.id },
        });
    }
    catch (error) {
        console.error("Admin delete product error:", error);
        res.status(500).json({ success: false, message: "Failed to delete product" });
    }
});
export default router;
