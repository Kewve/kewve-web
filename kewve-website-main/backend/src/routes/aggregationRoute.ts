import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { userHasRole } from "../utils/userRoles.js";
import { authenticateAdmin } from "./adminRoute.js";
import { AggregationCluster } from "../models/AggregationCluster.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import {
  applyClusterPurchaseFromPaidSession,
  buildSettlementForCluster,
  tryPayoutClusterSettlementEntry,
} from "../utils/clusterSettlement.js";
import { countriesMatch, normalizeCountryLabel } from "../utils/countryMatch.js";
import { sendAdminNotificationEmail } from "../utils/adminMail.js";
import { displayIdSuffix } from "../utils/displayId.js";

const router = Router();

async function notifyAdminClusterEvent(subject: string, lines: string[]): Promise<void> {
  try {
    await sendAdminNotificationEmail({ subject, text: lines.join("\n") });
  } catch (err) {
    console.error("notifyAdminClusterEvent error:", err);
  }
}

function frontendBase(): string {
  return (process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0].trim().replace(/\/$/, "");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const recalcClusterStatus = (cluster: any) => {
  const approvedContributions = (cluster.contributions || []).filter((c: any) => c.status === "approved");
  const totalApprovedVolumeKg = approvedContributions.reduce((sum: number, c: any) => sum + Number(c.committedKg || 0), 0);
  cluster.totalApprovedVolumeKg = totalApprovedVolumeKg;

  if (cluster.purchase?.paidAt) {
    cluster.status = "closed";
    return;
  }

  if (cluster.status === "closed") return;
  if (totalApprovedVolumeKg >= Number(cluster.minimumExportVolumeKg || 0)) {
    cluster.status = "ready";
  } else if (approvedContributions.length > 0) {
    cluster.status = "pending";
  } else {
    cluster.status = "open";
  }
};

const clusterInvoiceIssued = (cluster: any): boolean => !!cluster?.purchase?.invoice?.sentAt;
const clusterLockedForSupplyChanges = (cluster: any): boolean => !!cluster?.purchase?.paidAt || clusterInvoiceIssued(cluster);

const generateClusterId = async (): Promise<string> => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  let attempts = 0;
  while (attempts < 5) {
    const randomPart = Math.floor(100 + Math.random() * 900);
    const candidate = `CLU-${datePart}-${randomPart}`;
    const exists = await AggregationCluster.exists({ clusterId: candidate });
    if (!exists) return candidate;
    attempts += 1;
  }
  // Fallback with timestamp-based suffix.
  return `CLU-${datePart}-${Date.now().toString().slice(-4)}`;
};

// Admin: list clusters
router.get("/admin/clusters", authenticateAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await AggregationCluster.find({}).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Admin list clusters error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch clusters" });
  }
});

// Admin: create cluster
router.post("/admin/clusters", authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      clusterId,
      productName,
      category,
      productForm,
      targetMarket,
      supplyCountry,
      minimumExportVolumeKg,
      availabilityWindow,
      specificationSummary,
    } = req.body || {};

    if (!productName || !category || !minimumExportVolumeKg) {
      res.status(400).json({ success: false, message: "productName, category and minimumExportVolumeKg are required." });
      return;
    }

    let finalClusterId = "";
    if (String(clusterId || "").trim()) {
      finalClusterId = String(clusterId).trim().toUpperCase();
      const existing = await AggregationCluster.findOne({ clusterId: finalClusterId });
      if (existing) {
        res.status(400).json({ success: false, message: "Cluster ID already exists." });
        return;
      }
    } else {
      finalClusterId = await generateClusterId();
    }

    const cluster = await AggregationCluster.create({
      clusterId: finalClusterId,
      productName: String(productName).trim(),
      category: String(category).trim(),
      productForm: String(productForm || "").trim(),
      targetMarket: ["UK", "EU", "Both"].includes(String(targetMarket)) ? targetMarket : "Both",
      supplyCountry: String(supplyCountry || "").trim(),
      minimumExportVolumeKg: Number(minimumExportVolumeKg),
      availabilityWindow: String(availabilityWindow || "").trim(),
      specificationSummary: String(specificationSummary || "").trim(),
      createdBy: ((req as any).user?.email || "admin").toString(),
    });

    res.status(201).json({ success: true, data: cluster });
  } catch (error) {
    console.error("Admin create cluster error:", error);
    res.status(500).json({ success: false, message: "Failed to create cluster" });
  }
});

// Admin: delete cluster
router.delete("/admin/clusters/:id", authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cluster = await AggregationCluster.findById(req.params.id);
    if (!cluster) {
      res.status(404).json({ success: false, message: "Cluster not found." });
      return;
    }
    if (cluster.purchase?.paidAt) {
      res.status(400).json({
        success: false,
        message: "Cannot delete a cluster with completed buyer payment.",
      });
      return;
    }
    await AggregationCluster.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Cluster deleted successfully." });
  } catch (error) {
    console.error("Admin delete cluster error:", error);
    res.status(500).json({ success: false, message: "Failed to delete cluster" });
  }
});

// Admin: update cluster status
router.put("/admin/clusters/:id/status", authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = String(req.body?.status || "");
    if (!["open", "pending", "ready", "closed"].includes(status)) {
      res.status(400).json({ success: false, message: "Invalid status." });
      return;
    }
    const cluster = await AggregationCluster.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!cluster) {
      res.status(404).json({ success: false, message: "Cluster not found." });
      return;
    }
    res.status(200).json({ success: true, data: cluster });
  } catch (error) {
    console.error("Admin update cluster status error:", error);
    res.status(500).json({ success: false, message: "Failed to update cluster status" });
  }
});

// Admin: approve/reject producer contribution
router.put("/admin/clusters/:id/contributions/:contributionId", authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const action = String(req.body?.action || "");
    if (!["approved", "rejected"].includes(action)) {
      res.status(400).json({ success: false, message: "Action must be approved or rejected." });
      return;
    }
    const notes = String(req.body?.notes || "").trim();
    if (action === "rejected" && !notes) {
      res.status(400).json({ success: false, message: "Rejection reason is required." });
      return;
    }

    const cluster = await AggregationCluster.findById(req.params.id);
    if (!cluster) {
      res.status(404).json({ success: false, message: "Cluster not found." });
      return;
    }

    const contribution = (cluster.contributions || []).find((c: any) => String(c._id) === req.params.contributionId);
    if (!contribution) {
      res.status(404).json({ success: false, message: "Contribution not found." });
      return;
    }

    contribution.status = action as any;
    contribution.notes = action === "rejected" ? notes : String(contribution.notes || "");
    recalcClusterStatus(cluster);
    await cluster.save();

    res.status(200).json({ success: true, data: cluster });
  } catch (error) {
    console.error("Admin review contribution error:", error);
    res.status(500).json({ success: false, message: "Failed to review contribution" });
  }
});

// Admin: add a producer contribution manually (ops tooling)
router.post("/admin/clusters/:id/contributions", authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { producerEmail, producerId, productId, productName, committedKg, status } = (req.body || {}) as Record<string, unknown>;
    const kgRaw = Number(committedKg || 0);
    if (!Number.isFinite(kgRaw) || kgRaw <= 0) {
      res.status(400).json({ success: false, message: "Committed volume must be greater than zero." });
      return;
    }
    const desiredStatus = ["pending", "approved", "rejected"].includes(String(status || "approved"))
      ? String(status || "approved")
      : "approved";

    const cluster = await AggregationCluster.findById(req.params.id);
    if (!cluster) {
      res.status(404).json({ success: false, message: "Cluster not found." });
      return;
    }
    if (clusterLockedForSupplyChanges(cluster)) {
      res.status(400).json({ success: false, message: "Cannot modify contributions after buyer payment." });
      return;
    }
    if (String(cluster.status || "").toLowerCase() === "closed") {
      res.status(400).json({ success: false, message: "Cluster is closed." });
      return;
    }

    const productIdStr = productId ? String(productId).trim() : "";

    // Preferred path: productId only — same rules as producer join (eligible product + category + supply + capacity).
    if (productIdStr) {
      const prod = await Product.findById(productIdStr)
        .select("name category monthlyCapacity userId readiness verification")
        .lean();
      if (!prod) {
        res.status(404).json({ success: false, message: "Product not found." });
        return;
      }
      if (String((prod as any).readiness || "") !== "approved" || String((prod as any).verification || "") !== "verified") {
        res.status(400).json({ success: false, message: "Product must be approved and verified to join a cluster." });
        return;
      }
      const user = await User.findById((prod as any).userId).lean();
      if (!user) {
        res.status(404).json({ success: false, message: "Producer not found for this product." });
        return;
      }
      if (!userHasRole(user as any, "producer")) {
        res.status(400).json({ success: false, message: "User is not a producer." });
        return;
      }

      if (String((prod as any).category || "").toLowerCase() !== String(cluster.category || "").toLowerCase()) {
        res.status(400).json({ success: false, message: "Product category does not match cluster category." });
        return;
      }

      const supply = String(cluster.supplyCountry || "").trim();
      if (supply && !countriesMatch((user as any).country, supply)) {
        res.status(400).json({
          success: false,
          message: `Only producers based in ${supply} may join this cluster. The producer’s profile country must match the cluster supply region.`,
        });
        return;
      }

      const maxKg = Number((prod as any).monthlyCapacity || 0);
      const safeCommittedKg = Math.min(kgRaw, maxKg);
      if (safeCommittedKg <= 0 || maxKg <= 0) {
        res.status(400).json({ success: false, message: "Product has no available capacity." });
        return;
      }

      const already = (cluster.contributions || []).some((c: any) => String(c.producerId) === String((user as any)._id));
      if (already) {
        res.status(400).json({ success: false, message: "Producer already has a contribution in this cluster." });
        return;
      }

      cluster.contributions.push({
        producerId: (user as any)._id,
        producerName: String((user as any).businessName || (user as any).name || (user as any).email || "Producer"),
        productId: (prod as any)._id,
        productName: String((prod as any).name || "Product"),
        committedKg: safeCommittedKg,
        availableCapacityKg: maxKg,
        status: desiredStatus as any,
        notes: "",
      } as any);
      recalcClusterStatus(cluster);
      await cluster.save();
      res.status(201).json({ success: true, data: cluster });
      return;
    }

    // Legacy: producer email/id + product name (exact match, case-insensitive; regex-safe).
    const user =
      producerId
        ? await User.findById(String(producerId)).lean()
        : producerEmail
          ? await User.findOne({ email: String(producerEmail).trim().toLowerCase() }).lean()
          : null;
    if (!user) {
      res.status(404).json({ success: false, message: "Producer not found." });
      return;
    }
    if (!userHasRole(user as any, "producer")) {
      res.status(400).json({ success: false, message: "User is not a producer." });
      return;
    }

    const nameTrim = String(productName || "").trim();
    if (!nameTrim) {
      res.status(400).json({ success: false, message: "Provide productId or product name." });
      return;
    }

    const prod =
      (await Product.findOne({
        userId: (user as any)._id,
        name: new RegExp(`^${escapeRegExp(nameTrim)}$`, "i"),
        readiness: "approved",
        verification: "verified",
      }).lean()) || null;

    if (!prod) {
      res.status(404).json({ success: false, message: "Product not found for this producer (approved + verified, exact name)." });
      return;
    }

    if (String((prod as any).category || "").toLowerCase() !== String(cluster.category || "").toLowerCase()) {
      res.status(400).json({ success: false, message: "Product category does not match cluster category." });
      return;
    }

    const supply = String(cluster.supplyCountry || "").trim();
    if (supply && !countriesMatch((user as any).country, supply)) {
      res.status(400).json({
        success: false,
        message: `Only producers based in ${supply} may join this cluster. The producer’s profile country must match the cluster supply region.`,
      });
      return;
    }

    const maxKg = Number((prod as any).monthlyCapacity || 0);
    const safeCommittedKg = Math.min(kgRaw, maxKg);
    if (safeCommittedKg <= 0 || maxKg <= 0) {
      res.status(400).json({ success: false, message: "Product has no available capacity." });
      return;
    }

    const already = (cluster.contributions || []).some((c: any) => String(c.producerId) === String((user as any)._id));
    if (already) {
      res.status(400).json({ success: false, message: "Producer already has a contribution in this cluster." });
      return;
    }

    cluster.contributions.push({
      producerId: (user as any)._id,
      producerName: String((user as any).businessName || (user as any).name || (user as any).email || "Producer"),
      productId: (prod as any)._id,
      productName: String((prod as any).name || "Product"),
      committedKg: safeCommittedKg,
      availableCapacityKg: maxKg,
      status: desiredStatus as any,
      notes: "",
    } as any);
    recalcClusterStatus(cluster);
    await cluster.save();

    res.status(201).json({ success: true, data: cluster });
  } catch (error) {
    console.error("Admin add contribution error:", error);
    res.status(500).json({ success: false, message: "Failed to add contribution" });
  }
});

// Admin: remove a producer contribution manually
router.delete(
  "/admin/clusters/:id/contributions/:contributionId",
  authenticateAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const cluster = await AggregationCluster.findById(req.params.id);
      if (!cluster) {
        res.status(404).json({ success: false, message: "Cluster not found." });
        return;
      }
      if (clusterLockedForSupplyChanges(cluster)) {
        res.status(400).json({ success: false, message: "Cannot modify contributions after buyer payment." });
        return;
      }
      const before = (cluster.contributions || []).length;
      cluster.contributions = (cluster.contributions || []).filter((c: any) => String(c._id) !== String(req.params.contributionId)) as any;
      if ((cluster.contributions || []).length === before) {
        res.status(404).json({ success: false, message: "Contribution not found." });
        return;
      }
      recalcClusterStatus(cluster);
      await cluster.save();
      res.status(200).json({ success: true, data: cluster });
    } catch (error) {
      console.error("Admin remove contribution error:", error);
      res.status(500).json({ success: false, message: "Failed to remove contribution" });
    }
  }
);

const SUPPLY_STATUSES = ["pending", "delivered", "verified", "accepted"] as const;

function parseClusterCustomDelivery(
  body: unknown
):
  | {
      ok: true;
      value: {
        line1: string;
        line2?: string;
        city: string;
        postalCode: string;
        country: string;
        phone?: string;
        company?: string;
      };
    }
  | { ok: false; message: string } {
  const b = body as Record<string, unknown>;
  const d = b?.address;
  if (!d || typeof d !== "object") {
    return { ok: false, message: "address is required for custom mode (line1, city, postalCode, country)." };
  }
  const o = d as Record<string, unknown>;
  const line1 = String(o.line1 ?? "").trim().slice(0, 500);
  const line2 = String(o.line2 ?? "").trim().slice(0, 500);
  const city = String(o.city ?? "").trim().slice(0, 200);
  const postalCode = String(o.postalCode ?? "").trim().slice(0, 64);
  const country = String(o.country ?? "").trim().slice(0, 120);
  const phone = String(o.phone ?? "").trim().slice(0, 80);
  const company = String(o.company ?? "").trim().slice(0, 200);
  if (!line1 || !city || !postalCode || !country) {
    return { ok: false, message: "Custom address needs line1, city, postalCode, and country." };
  }
  return { ok: true, value: { line1, line2, city, postalCode, country, phone, company } };
}

// Producer: mark own settlement line delivered (admin verifies / accepts for payout)
router.put(
  "/clusters/:clusterId/settlement/entries/:entryId/supply",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const authUser = req.user;
      if (!authUser || !userHasRole(authUser, "producer")) {
        res.status(403).json({ success: false, message: "Only producers can update their supply line." });
        return;
      }
      const supplyStatus = String(req.body?.supplyStatus || "").trim();
      if (supplyStatus !== "delivered") {
        res.status(400).json({
          success: false,
          message: "Producers may only mark supply as delivered. Admin verifies and accepts for payout.",
        });
        return;
      }

      const cluster = await AggregationCluster.findById(req.params.clusterId);
      if (!cluster || !cluster.settlement?.entries?.length) {
        res.status(404).json({ success: false, message: "Cluster settlement not found." });
        return;
      }
      if (!cluster.purchase?.paidAt) {
        res.status(400).json({ success: false, message: "Payment must be completed before updating supply." });
        return;
      }

      const entry = cluster.settlement.entries.find((e: any) => String(e._id) === req.params.entryId);
      if (!entry) {
        res.status(404).json({ success: false, message: "Settlement entry not found." });
        return;
      }
      if (String(entry.producerId) !== String(authUser._id)) {
        res.status(403).json({ success: false, message: "Not your settlement line." });
        return;
      }
      if (String(entry.supplyStatus || "pending") !== "pending") {
        res.status(400).json({
          success: false,
          message: "Only pending lines can be marked delivered by the producer.",
        });
        return;
      }

      entry.supplyStatus = "delivered";
      cluster.markModified("settlement");
      cluster.markModified("settlement.entries");
      await cluster.save();
      res.status(200).json({ success: true, data: await AggregationCluster.findById(cluster._id) });
    } catch (error: any) {
      console.error("Producer cluster supply update error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to update supply status" });
    }
  }
);

// Admin: update producer supply milestone on settlement ledger
router.put(
  "/admin/clusters/:clusterId/settlement/entries/:entryId/supply",
  authenticateAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const supplyStatus = String(req.body?.supplyStatus || "").trim();
      if (!SUPPLY_STATUSES.includes(supplyStatus as (typeof SUPPLY_STATUSES)[number])) {
        res.status(400).json({ success: false, message: "Invalid supplyStatus." });
        return;
      }

      const cluster = await AggregationCluster.findById(req.params.clusterId);
      if (!cluster || !cluster.settlement?.entries?.length) {
        res.status(404).json({ success: false, message: "Cluster settlement not found." });
        return;
      }

      const entry = cluster.settlement.entries.find((e: any) => String(e._id) === req.params.entryId);
      if (!entry) {
        res.status(404).json({ success: false, message: "Settlement entry not found." });
        return;
      }

      entry.supplyStatus = supplyStatus as (typeof SUPPLY_STATUSES)[number];
      cluster.markModified("settlement");
      cluster.markModified("settlement.entries");
      await cluster.save();

      if (supplyStatus === "accepted") {
        const payoutRes = await tryPayoutClusterSettlementEntry(String(cluster._id), req.params.entryId);
        if (!payoutRes.ok) {
          res.status(200).json({
            success: true,
            data: await AggregationCluster.findById(cluster._id),
            payoutWarning: payoutRes.message,
          });
          return;
        }
      }

      res.status(200).json({ success: true, data: await AggregationCluster.findById(cluster._id) });
    } catch (error: any) {
      console.error("Admin cluster supply update error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to update supply status" });
    }
  }
);

// Admin: retry Stripe transfer for one settlement line
router.post(
  "/admin/clusters/:clusterId/settlement/entries/:entryId/payout",
  authenticateAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await tryPayoutClusterSettlementEntry(req.params.clusterId, req.params.entryId);
      const cluster = await AggregationCluster.findById(req.params.clusterId);
      res.status(result.ok ? 200 : 400).json({
        success: result.ok,
        data: cluster,
        message: result.message,
      });
    } catch (error: any) {
      console.error("Admin cluster payout retry error:", error);
      res.status(500).json({ success: false, message: error.message || "Payout failed" });
    }
  }
);

// Admin: update payout amount for one settlement line before transfer
router.put(
  "/admin/clusters/:clusterId/settlement/entries/:entryId/payout-amount",
  authenticateAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const amountCents = Number(req.body?.amountCents);
      if (!Number.isFinite(amountCents) || amountCents < 0) {
        res.status(400).json({ success: false, message: "amountCents must be a non-negative number." });
        return;
      }

      const cluster = await AggregationCluster.findById(req.params.clusterId);
      if (!cluster || !cluster.settlement?.entries?.length) {
        res.status(404).json({ success: false, message: "Cluster settlement not found." });
        return;
      }

      const entry = cluster.settlement.entries.find((e: any) => String(e._id) === req.params.entryId);
      if (!entry) {
        res.status(404).json({ success: false, message: "Settlement entry not found." });
        return;
      }

      if (entry.payout?.status === "completed" || entry.payout?.status === "pending") {
        res.status(400).json({ success: false, message: "Cannot edit payout amount after transfer has started." });
        return;
      }

      const roundedAmountCents = Math.round(amountCents);
      const otherEntriesTotal = (cluster.settlement.entries || []).reduce((sum: number, row: any) => {
        if (String(row._id) === String(entry._id)) return sum;
        return sum + Number(row.netPayoutCents || 0);
      }, 0);
      const maxAllowed = Number(cluster.settlement.subtotalCents || 0);
      if (otherEntriesTotal + roundedAmountCents > maxAllowed) {
        res.status(400).json({
          success: false,
          message: `Total producer payouts cannot exceed settlement subtotal (${maxAllowed} cents).`,
        });
        return;
      }

      const gross = Number(entry.grossShareCents || 0);
      entry.netPayoutCents = roundedAmountCents;
      entry.adjustmentCents = roundedAmountCents - gross;
      entry.payout = {
        ...(entry.payout || { status: "none" }),
        status: "none",
        amountCents: undefined,
        stripeTransferId: undefined,
        initiatedAt: undefined,
        errorMessage: undefined,
      };
      cluster.markModified("settlement");
      cluster.markModified("settlement.entries");
      await cluster.save();

      res.status(200).json({ success: true, data: await AggregationCluster.findById(cluster._id) });
    } catch (error: any) {
      console.error("Admin cluster payout amount update error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to update payout amount" });
    }
  }
);

// Producer: list clusters with eligibility for producer products
router.get("/clusters/eligible", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const authUser = req.user;
    if (!authUser) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    if (!userHasRole(authUser, "producer")) {
      res.status(403).json({ success: false, message: "Only producers can view eligible clusters." });
      return;
    }

    const producerProducts = await Product.find({
      userId: authUser._id,
      readiness: "approved",
      verification: "verified",
    })
      .select("name category monthlyCapacity aggregation")
      .lean();

    const clusters = await AggregationCluster.find({ status: { $in: ["open", "pending", "ready"] } }).sort({ createdAt: -1 }).lean();

    const producerProfileCountry = normalizeCountryLabel(authUser.country);

    const data = clusters.map((cluster: any) => {
      const categoryMatch = producerProducts.filter(
        (p: any) => String(p.category || "").toLowerCase() === String(cluster.category || "").toLowerCase()
      );
      const ownContribution = (cluster.contributions || []).find((c: any) => String(c.producerId) === String(authUser._id));
      const contributionStatus = String(ownContribution?.status || "");
      const activeMembership = ownContribution && contributionStatus !== "rejected";

      if (!producerProfileCountry && !activeMembership) {
        return {
          ...cluster,
          eligible: false,
          ineligibleReason: "Add your country in Producer Settings (Profile) before joining aggregation clusters.",
          ownContribution,
          canRetry: contributionStatus === "rejected",
          matchingProducts: [],
        };
      }

      const supply = String(cluster.supplyCountry || "").trim();
      const producerCountryOk = !supply || countriesMatch(authUser.country, supply);
      const matchingProducts = producerCountryOk ? categoryMatch : [];

      const alreadyJoined = Boolean(ownContribution);
      const canRetry = ownContribution?.status === "rejected";
      let reason = "";
      if (!matchingProducts.length) {
        if (supply && categoryMatch.length && !producerCountryOk) {
          reason = `Producer profile country must match this cluster’s supply region (${supply})`;
        } else if (!categoryMatch.length) {
          reason = "No approved product in this category";
        } else {
          reason = "";
        }
      } else if (alreadyJoined && !canRetry) reason = ownContribution?.status === "pending" ? "Awaiting admin review" : "Already approved in cluster";
      else if (canRetry) reason = ownContribution?.notes ? `Rejected: ${ownContribution.notes}` : "Rejected. You can retry.";

      return {
        ...cluster,
        eligible: matchingProducts.length > 0 && (!alreadyJoined || canRetry),
        ineligibleReason: reason,
        ownContribution,
        canRetry,
        matchingProducts,
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Producer eligible clusters error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch eligible clusters" });
  }
});

// Producer: join cluster with a product contribution
router.post("/clusters/:id/join", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const authUser = req.user;
    if (!authUser) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    if (!userHasRole(authUser, "producer")) {
      res.status(403).json({ success: false, message: "Only producers can join clusters." });
      return;
    }

    if (!normalizeCountryLabel(authUser.country)) {
      res.status(400).json({
        success: false,
        message: "Add your country in Producer Settings (Profile) before joining a cluster.",
      });
      return;
    }

    const { productId, committedKg } = req.body || {};
    if (!productId || !committedKg) {
      res.status(400).json({ success: false, message: "productId and committedKg are required." });
      return;
    }

    const cluster = await AggregationCluster.findById(req.params.id);
    if (!cluster) {
      res.status(404).json({ success: false, message: "Cluster not found." });
      return;
    }

    if (clusterLockedForSupplyChanges(cluster)) {
      res.status(400).json({ success: false, message: "This cluster has already been purchased by a buyer." });
      return;
    }

    if (cluster.status === "closed") {
      res.status(400).json({ success: false, message: "Cluster is closed." });
      return;
    }

    const product = await Product.findOne({
      _id: productId,
      userId: authUser._id,
      readiness: "approved",
      verification: "verified",
    }).select("name category monthlyCapacity");

    if (!product) {
      res.status(404).json({ success: false, message: "Eligible product not found." });
      return;
    }

    if (String(product.category || "").toLowerCase() !== String(cluster.category || "").toLowerCase()) {
      res.status(400).json({ success: false, message: "Product category does not match cluster category." });
      return;
    }

    const supply = String(cluster.supplyCountry || "").trim();
    if (supply && !countriesMatch(authUser.country, supply)) {
      res.status(400).json({
        success: false,
        message: `Only producers based in ${supply} may join this cluster. Your profile country must match the cluster supply region.`,
      });
      return;
    }

    const requestedKg = Number(committedKg);
    if (!Number.isFinite(requestedKg) || requestedKg <= 0) {
      res.status(400).json({ success: false, message: "Committed volume must be greater than zero." });
      return;
    }

    const maxKg = Number(product.monthlyCapacity || 0);
    const safeCommittedKg = Math.min(requestedKg, maxKg);
    if (safeCommittedKg <= 0) {
      res.status(400).json({ success: false, message: "Product has no available capacity." });
      return;
    }

    const existingContribution = (cluster.contributions || []).find((c: any) => String(c.producerId) === String(authUser._id));
    if (existingContribution && existingContribution.status !== "rejected") {
      res.status(400).json({ success: false, message: "You already joined this cluster." });
      return;
    }

    if (existingContribution && existingContribution.status === "rejected") {
      existingContribution.producerName = authUser.name || "Producer";
      existingContribution.productId = product._id as any;
      existingContribution.productName = product.name || "Untitled Product";
      existingContribution.committedKg = safeCommittedKg;
      existingContribution.availableCapacityKg = maxKg;
      existingContribution.status = "pending";
      existingContribution.notes = "";
    } else {
      cluster.contributions.push({
        producerId: authUser._id,
        producerName: authUser.name || "Producer",
        productId: product._id as any,
        productName: product.name || "Untitled Product",
        committedKg: safeCommittedKg,
        availableCapacityKg: maxKg,
        status: "pending",
        notes: "",
      } as any);
    }

    recalcClusterStatus(cluster);
    await cluster.save();
    res.status(201).json({ success: true, data: cluster });
  } catch (error) {
    console.error("Producer join cluster error:", error);
    res.status(500).json({ success: false, message: "Failed to join cluster" });
  }
});

// Buyer: browse tradable clusters (ready, not yet purchased)
router.get("/buyer/clusters", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const authUser = req.user;
    if (!authUser) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    if (!userHasRole(authUser, "buyer")) {
      res.status(403).json({ success: false, message: "Only buyers can view clusters." });
      return;
    }
    const clusters = await AggregationCluster.find({ status: "ready" }).sort({ createdAt: -1 }).lean();
    const requestableClusters = clusters.filter(
      (cluster: any) => {
        const paid = !!cluster.purchase?.paidAt;
        const sent = !!cluster.purchase?.invoice?.sentAt;
        const ownedDraft = sent && String(cluster.purchase?.buyerId || "") === String(authUser._id);
        return (
          !paid &&
          (!sent || ownedDraft) &&
          (cluster.contributions || []).some((c: any) => c.status === "approved" && Number(c.committedKg || 0) > 0)
        );
      }
    );
    res.status(200).json({ success: true, data: requestableClusters });
  } catch (error) {
    console.error("Buyer clusters list error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch buyer clusters" });
  }
});

// Buyer: list my paid cluster purchases (active + closed + refunded)
router.get("/buyer/clusters/my-purchases", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const authUser = req.user;
    if (!authUser || !userHasRole(authUser, "buyer")) {
      res.status(403).json({ success: false, message: "Only buyers can view purchased clusters." });
      return;
    }
    const data = await AggregationCluster.find({
      "purchase.buyerId": authUser._id,
      "purchase.paidAt": { $exists: true, $ne: null },
    })
      .sort({ updatedAt: -1 })
      .lean();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Buyer purchased clusters list error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch purchased clusters" });
  }
});

// Buyer: quote for cluster checkout (single invoice — no producer breakdown in response)
router.get("/buyer/clusters/:id/quote", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const authUser = req.user;
    if (!authUser || !userHasRole(authUser, "buyer")) {
      res.status(403).json({ success: false, message: "Only buyers can quote clusters." });
      return;
    }

    const volumeKg = Number(req.query.volumeKg || 0);
    const market = String(req.query.market || "EU").trim() || "EU";
    const timeline = String(req.query.timeline || "ASAP").trim() || "ASAP";
    const additionalFeesCents = Math.max(0, Math.round(Number(req.query.additionalFeesCents || 0)));

    const cluster = await AggregationCluster.findById(req.params.id);
    if (!cluster || cluster.status !== "ready" || cluster.purchase?.paidAt) {
      res.status(400).json({ success: false, message: "This cluster is not available for purchase." });
      return;
    }

    const { settlement, error } = await buildSettlementForCluster(
      cluster,
      volumeKg,
      market,
      timeline,
      undefined,
      additionalFeesCents
    );
    if (error || !settlement) {
      res.status(400).json({ success: false, message: error || "Could not price this cluster." });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        clusterId: cluster.clusterId,
        productName: cluster.productName,
        volumeKg,
        currency: settlement.currency,
        subtotalCents: settlement.subtotalCents,
        additionalFeesCents: Number(settlement.additionalFeesCents || 0),
        platformFeePercent: settlement.platformFeePercent,
        platformFeeCents: settlement.platformFeeCents,
        totalCents: settlement.totalPaidCents,
      },
    });
  } catch (error: any) {
    console.error("Buyer cluster quote error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to quote cluster" });
  }
});

// Buyer: Stripe Checkout — invoice-first flow: create invoice record, then redirect to payment
router.post("/buyer/clusters/:id/checkout-session", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const authUser = req.user;
    if (!authUser || !userHasRole(authUser, "buyer")) {
      res.status(403).json({ success: false, message: "Only buyers can purchase clusters." });
      return;
    }

    const volumeKg = Number(req.body?.volumeKg || 0);
    const market = String(req.body?.market || "").trim();
    const timeline = String(req.body?.timeline || "").trim();
    const additionalFeesCents = Math.max(0, Math.round(Number(req.body?.additionalFeesCents || 0)));
    if (!volumeKg || !market || !timeline) {
      res.status(400).json({ success: false, message: "volumeKg, market and timeline are required." });
      return;
    }

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      res.status(503).json({ success: false, message: "Stripe is not configured." });
      return;
    }

    const cluster = await AggregationCluster.findById(req.params.id);
    if (!cluster || cluster.status !== "ready" || cluster.purchase?.paidAt) {
      res.status(400).json({ success: false, message: "This cluster is not available for purchase." });
      return;
    }
    if (clusterInvoiceIssued(cluster) && String(cluster.purchase?.buyerId || "") !== String(authUser._id)) {
      res.status(400).json({ success: false, message: "An invoice was already issued for this cluster." });
      return;
    }

    const { settlement, error } = await buildSettlementForCluster(
      cluster,
      volumeKg,
      market,
      timeline,
      undefined,
      additionalFeesCents
    );
    if (error || !settlement) {
      res.status(400).json({ success: false, message: error || "Could not price this cluster." });
      return;
    }

    const totalCents = settlement.totalPaidCents;
    if (!Number.isFinite(totalCents) || totalCents < 50) {
      res.status(400).json({ success: false, message: "Invalid checkout amount." });
      return;
    }

    const stripe = new Stripe(key);
    const base = frontendBase();
    const cid = String(cluster._id);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: authUser.email,
      line_items: [
        {
          price_data: {
            currency: settlement.currency,
            product_data: {
              name: `Kewve cluster — ${cluster.productName}`,
              description: `${volumeKg.toLocaleString()} kg · includes ${settlement.platformFeePercent}% platform fee`,
            },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${base}/buyer/products?cluster_checkout=success&cluster_id=${encodeURIComponent(cid)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/buyer/products?cluster_checkout=cancel&cluster_id=${encodeURIComponent(cid)}`,
      metadata: {
        type: "cluster_checkout",
        aggregationClusterId: cid,
        buyerId: String(authUser._id),
        volumeKg: String(volumeKg),
        market,
        timeline,
        additionalFeesCents: String(additionalFeesCents),
      },
    });

    if (!session.url) {
      res.status(500).json({ success: false, message: "Stripe did not return a checkout URL." });
      return;
    }

    const now = new Date();
    cluster.purchase = {
      buyerId: authUser._id as any,
      buyerName: authUser.name || "",
      buyerEmail: authUser.email || "",
      stripeCheckoutSessionId: session.id,
      volumeKg,
      market,
      timeline,
      invoice: {
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
    } as any;
    cluster.markModified("purchase");
    await cluster.save();

    res.status(200).json({ success: true, url: session.url, totalCents });
  } catch (error: any) {
    console.error("Cluster checkout session error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create checkout" });
  }
});

// Buyer: confirm payment after redirect (idempotent; same logic as webhook)
router.post("/buyer/clusters/:id/sync-checkout", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
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

    const cluster = await AggregationCluster.findById(req.params.id);
    if (!cluster) {
      res.status(404).json({ success: false, message: "Cluster not found." });
      return;
    }

    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.type !== "cluster_checkout" || String(session.metadata?.aggregationClusterId) !== String(cluster._id)) {
      res.status(400).json({ success: false, message: "This payment does not belong to this cluster." });
      return;
    }

    if (String(session.metadata?.buyerId || "") !== String(authUser._id)) {
      res.status(403).json({ success: false, message: "Forbidden." });
      return;
    }

    if (session.payment_status !== "paid") {
      res.status(400).json({ success: false, message: "Payment is not completed yet." });
      return;
    }

    const result = await applyClusterPurchaseFromPaidSession({ session });
    const fresh = await AggregationCluster.findById(cluster._id);
    res.status(200).json({ success: true, data: fresh, sync: result });
  } catch (error: any) {
    console.error("Cluster sync checkout error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to sync payment" });
  }
});

// Buyer: confirm cluster receipt/issues after delivery
router.put("/buyer/clusters/:id/receipt", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const authUser = req.user;
    if (!authUser || !userHasRole(authUser, "buyer")) {
      res.status(403).json({ success: false, message: "Only buyers can confirm cluster receipt." });
      return;
    }
    const receipt = String(req.body?.receipt || "").trim() as "received_ok" | "received_issues";
    if (receipt !== "received_ok" && receipt !== "received_issues") {
      res.status(400).json({ success: false, message: "receipt must be received_ok or received_issues." });
      return;
    }
    const cluster = await AggregationCluster.findById(req.params.id);
    if (!cluster?.purchase?.invoice?.sentAt) {
      res.status(404).json({ success: false, message: "Cluster invoice not found." });
      return;
    }
    if (String(cluster.purchase.buyerId) !== String(authUser._id)) {
      res.status(403).json({ success: false, message: "Forbidden." });
      return;
    }
    if (String(cluster.purchase.buyerReceipt || "none") !== "none") {
      res.status(400).json({ success: false, message: "Receipt already submitted." });
      return;
    }
    cluster.purchase.buyerReceipt = receipt;
    cluster.purchase.buyerReceiptAt = new Date();
    cluster.purchase.buyerReceiptNotes = String(req.body?.notes || "").trim().slice(0, 4000);
    cluster.purchase.issuesNeedAdmin = receipt === "received_issues";
    if (receipt === "received_ok") {
      cluster.status = "closed";
    }
    cluster.markModified("purchase");
    await cluster.save();
    if (receipt === "received_issues") {
      void notifyAdminClusterEvent(`[Kewve] Cluster buyer reported issues — ${cluster.clusterId}`, [
        "A buyer reported issues on a paid cluster order.",
        `Cluster: ${cluster.clusterId}`,
        `Product: ${cluster.productName}`,
        `Buyer: ${authUser.name || authUser.email || authUser._id}`,
        `Notes: ${cluster.purchase.buyerReceiptNotes || "—"}`,
      ]);
    }
    res.status(200).json({ success: true, data: cluster });
  } catch (error: any) {
    console.error("Buyer cluster receipt error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to record cluster receipt" });
  }
});

// Admin: resolve cluster buyer issues
router.put("/admin/clusters/:id/resolve-issues", authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cluster = await AggregationCluster.findById(req.params.id);
    if (!cluster || !cluster.purchase?.paidAt) {
      res.status(404).json({ success: false, message: "Paid cluster not found." });
      return;
    }
    if (!cluster.purchase.issuesNeedAdmin) {
      res.status(400).json({ success: false, message: "No open buyer issue on this cluster." });
      return;
    }
    const closeOk = Boolean(req.body?.closeAsReceivedOk);
    const notes = String(req.body?.adminNotes || "").trim().slice(0, 4000);
    cluster.purchase.issuesNeedAdmin = false;
    if (closeOk) {
      cluster.purchase.buyerReceipt = "received_ok" as any;
      cluster.purchase.buyerReceiptAt = new Date();
      cluster.purchase.buyerReceiptNotes = notes || cluster.purchase.buyerReceiptNotes || "";
      cluster.status = "closed";
    }
    cluster.markModified("purchase");
    await cluster.save();
    void notifyAdminClusterEvent(`[Kewve] Cluster issue resolved — ${displayIdSuffix(cluster.clusterId)}`, [
      "Admin resolved a cluster buyer issue.",
      `Cluster: ${displayIdSuffix(cluster.clusterId)}`,
      `Closed as received_ok: ${closeOk ? "yes" : "no"}`,
      `Notes: ${notes || "—"}`,
    ]);
    res.status(200).json({ success: true, data: cluster });
  } catch (error: any) {
    console.error("Admin resolve cluster issues error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to resolve cluster issues" });
  }
});

// Admin: refund paid cluster purchase
router.post("/admin/clusters/:id/refund", authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cluster = await AggregationCluster.findById(req.params.id);
    if (!cluster || !cluster.purchase?.paidAt) {
      res.status(404).json({ success: false, message: "Paid cluster not found." });
      return;
    }
    if (cluster.purchase.refund?.status === "completed") {
      res.status(400).json({ success: false, message: "Cluster purchase already refunded." });
      return;
    }
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      res.status(503).json({ success: false, message: "Stripe is not configured." });
      return;
    }
    const sessionId = String(cluster.purchase.stripeCheckoutSessionId || "").trim();
    if (!sessionId) {
      res.status(400).json({ success: false, message: "No Stripe checkout session on this purchase." });
      return;
    }
    const totalCents = Number(cluster.settlement?.totalPaidCents || 0);
    if (!Number.isFinite(totalCents) || totalCents <= 0) {
      res.status(400).json({ success: false, message: "Invalid paid total for refund." });
      return;
    }
    const amountRaw = Number(req.body?.amountCents || totalCents);
    const amountCents = Math.round(amountRaw);
    if (!Number.isFinite(amountCents) || amountCents < 1 || amountCents > totalCents) {
      res.status(400).json({ success: false, message: "amountCents must be between 1 and paid total." });
      return;
    }
    const note = String(req.body?.note || "").trim().slice(0, 1000);

    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent as Stripe.PaymentIntent | null)?.id;
    if (!paymentIntentId) {
      res.status(400).json({ success: false, message: "Could not resolve Stripe payment intent for this cluster purchase." });
      return;
    }

    const purchaseRefund = cluster.purchase.refund || ({ status: "none" } as any);
    purchaseRefund.status = "pending";
    purchaseRefund.amountCents = amountCents;
    purchaseRefund.note = note;
    purchaseRefund.errorMessage = undefined;
    cluster.purchase.refund = purchaseRefund as any;
    cluster.markModified("purchase");
    await cluster.save();

    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amountCents,
        metadata: {
          aggregationClusterId: String(cluster._id),
          type: "admin_cluster_refund",
        },
      });
      purchaseRefund.status = "completed";
      purchaseRefund.stripeRefundId = refund.id;
      purchaseRefund.refundedAt = new Date();
      purchaseRefund.errorMessage = undefined;
      cluster.purchase.refund = purchaseRefund as any;
      cluster.markModified("purchase");
      await cluster.save();
      void notifyAdminClusterEvent(`[Kewve] Cluster refund completed — ${displayIdSuffix(cluster.clusterId)}`, [
        "Cluster buyer refund succeeded.",
        `Cluster: ${displayIdSuffix(cluster.clusterId)}`,
        `Amount: ${amountCents} cents`,
        `Refund ID: ${displayIdSuffix(refund.id)}`,
        `Note: ${note || "—"}`,
      ]);
      res.status(200).json({ success: true, data: cluster, refundId: refund.id });
    } catch (err: any) {
      purchaseRefund.status = "failed";
      purchaseRefund.errorMessage = err?.message || "Stripe refund failed";
      cluster.purchase.refund = purchaseRefund as any;
      cluster.markModified("purchase");
      await cluster.save();
      void notifyAdminClusterEvent(`[Kewve] Cluster refund failed — ${displayIdSuffix(cluster.clusterId)}`, [
        "Cluster buyer refund failed.",
        `Cluster: ${displayIdSuffix(cluster.clusterId)}`,
        `Amount: ${amountCents} cents`,
        `Error: ${purchaseRefund.errorMessage || "Unknown error"}`,
      ]);
      res.status(502).json({ success: false, message: purchaseRefund.errorMessage, data: cluster });
    }
  } catch (error: any) {
    console.error("Admin cluster refund error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to refund cluster purchase" });
  }
});

// Admin: set delivery destination (buyer profile snapshot or custom address) — visible to producers
router.put("/admin/clusters/:id/delivery", authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const mode = String(req.body?.mode || "").trim();
    if (mode !== "buyer_profile" && mode !== "custom") {
      res.status(400).json({ success: false, message: "mode must be buyer_profile or custom." });
      return;
    }

    const cluster = await AggregationCluster.findById(req.params.id);
    if (!cluster) {
      res.status(404).json({ success: false, message: "Cluster not found." });
      return;
    }
    if (!clusterInvoiceIssued(cluster) && !cluster.purchase?.paidAt) {
      res.status(400).json({
        success: false,
        message: "Set delivery after an invoice is issued or the buyer has paid.",
      });
      return;
    }
    if (!cluster.purchase?.buyerId) {
      res.status(400).json({ success: false, message: "No purchase record on this cluster." });
      return;
    }

    const now = new Date();
    if (mode === "buyer_profile") {
      const buyer = await User.findById(cluster.purchase.buyerId).select("savedDeliveryAddress");
      const sa = buyer?.savedDeliveryAddress;
      const line1 = String(sa?.line1 || "").trim();
      const city = String(sa?.city || "").trim();
      const postalCode = String(sa?.postalCode || "").trim();
      const country = String(sa?.country || "").trim();
      if (!line1 || !city || !postalCode || !country) {
        res.status(400).json({
          success: false,
          message:
            "Buyer has no complete saved delivery address. Ask them to fill it under their profile, or use custom mode.",
        });
        return;
      }
      const line2 = String(sa?.line2 || "").trim();
      const phone = String(sa?.phone || "").trim();
      const company = String(sa?.company || "").trim();
      cluster.purchase.deliveryDestination = {
        mode: "buyer_profile",
        address: {
          line1,
          ...(line2 ? { line2 } : {}),
          city,
          postalCode,
          country,
          ...(phone ? { phone } : {}),
          ...(company ? { company } : {}),
        },
        setAt: now,
      } as any;
    } else {
      const parsed = parseClusterCustomDelivery(req.body);
      if (!parsed.ok) {
        res.status(400).json({ success: false, message: parsed.message });
        return;
      }
      const v = parsed.value;
      cluster.purchase.deliveryDestination = {
        mode: "custom",
        address: {
          line1: v.line1,
          ...(v.line2 ? { line2: v.line2 } : {}),
          city: v.city,
          postalCode: v.postalCode,
          country: v.country,
          ...(v.phone ? { phone: v.phone } : {}),
          ...(v.company ? { company: v.company } : {}),
        },
        setAt: now,
      } as any;
    }
    cluster.markModified("purchase");
    await cluster.save();
    res.status(200).json({ success: true, data: await AggregationCluster.findById(cluster._id) });
  } catch (error: any) {
    console.error("Admin cluster delivery error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to save delivery" });
  }
});

// Producer: settlement lines for clusters where this producer appears (after buyer paid)
router.get("/clusters/my-settlements", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const authUser = req.user;
    if (!authUser || !userHasRole(authUser, "producer")) {
      res.status(403).json({ success: false, message: "Only producers can view cluster settlements." });
      return;
    }

    const clusters = await AggregationCluster.find({
      "settlement.entries.producerId": authUser._id,
    })
      .sort({ updatedAt: -1 })
      .lean();

    const data = clusters.map((c: any) => ({
      _id: c._id,
      clusterId: c.clusterId,
      productName: c.productName,
      purchase: c.purchase,
      settlement: c.settlement
        ? {
            ...c.settlement,
            entries: (c.settlement.entries || []).filter((e: any) => String(e.producerId) === String(authUser._id)),
          }
        : undefined,
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Producer cluster settlements error:", error);
    res.status(500).json({ success: false, message: "Failed to load settlements" });
  }
});

export default router;

