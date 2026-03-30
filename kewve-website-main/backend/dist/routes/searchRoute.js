import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { userHasRole } from "../utils/userRoles.js";
import { Product } from "../models/Product.js";
import { BuyerRequest } from "../models/BuyerRequest.js";
const router = Router();
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/** Unified search for logged-in buyers and producers (role-scoped). */
router.get("/search", authenticate, async (req, res) => {
    try {
        const user = req.user;
        const q = String(req.query.q || "").trim();
        const scopeRaw = String(req.query.scope || "all").toLowerCase();
        const scope = scopeRaw === "products" || scopeRaw === "trades" ? scopeRaw : "all";
        if (q.length < 2) {
            res.status(200).json({ success: true, data: { products: [], transactions: [] } });
            return;
        }
        const rx = new RegExp(escapeRegex(q), "i");
        const textMatch = {
            $or: [{ name: rx }, { category: rx }, { description: rx }],
        };
        /** Matches UI "Ref" (#c9ad): last 4 hex chars of ObjectId, or any substring of the id. */
        const idSubstringMatch = {
            $expr: {
                $regexMatch: {
                    input: { $toString: "$_id" },
                    regex: escapeRegex(q),
                    options: "i",
                },
            },
        };
        const reqTextMatch = {
            $or: [{ productName: rx }, { buyerName: rx }, { market: rx }, { category: rx }, idSubstringMatch],
        };
        const products = [];
        const seenProd = new Set();
        if (scope !== "trades" && userHasRole(user, "producer")) {
            const mine = await Product.find({ userId: user._id, ...textMatch })
                .select("name category")
                .sort({ updatedAt: -1 })
                .limit(8)
                .lean();
            for (const p of mine) {
                const id = String(p._id);
                if (seenProd.has(id))
                    continue;
                seenProd.add(id);
                products.push({ _id: id, name: p.name, category: p.category, kind: "mine" });
            }
        }
        if (scope !== "trades" && userHasRole(user, "buyer")) {
            const catalog = await Product.find({
                readiness: "approved",
                verification: "verified",
                ...textMatch,
            })
                .select("name category")
                .sort({ name: 1 })
                .limit(8)
                .lean();
            for (const p of catalog) {
                const id = String(p._id);
                if (seenProd.has(id))
                    continue;
                seenProd.add(id);
                products.push({ _id: id, name: p.name, category: p.category, kind: "catalog" });
            }
        }
        const transactions = [];
        const refSuffixFromId = (id) => {
            const hex = id.replace(/[^a-f0-9]/gi, "");
            return hex.length >= 4 ? hex.slice(-4) : hex;
        };
        if (scope !== "products" && userHasRole(user, "buyer")) {
            const rows = await BuyerRequest.find({
                buyerId: user._id,
                ...reqTextMatch,
            })
                .select("productName volumeKg status market")
                .sort({ updatedAt: -1 })
                .limit(10)
                .lean();
            for (const r of rows) {
                const id = String(r._id);
                transactions.push({
                    _id: id,
                    refSuffix: refSuffixFromId(id),
                    productName: r.productName,
                    volumeKg: r.volumeKg,
                    status: r.status,
                    market: r.market,
                    role: "buyer",
                });
            }
        }
        if (scope !== "products" && userHasRole(user, "producer")) {
            const rows = await BuyerRequest.find({
                $and: [
                    {
                        $or: [{ producerId: user._id }, { "matchPlan.allocations.producerId": user._id }],
                    },
                    reqTextMatch,
                ],
            })
                .select("productName volumeKg status market")
                .sort({ updatedAt: -1 })
                .limit(10)
                .lean();
            for (const r of rows) {
                const id = String(r._id);
                transactions.push({
                    _id: id,
                    refSuffix: refSuffixFromId(id),
                    productName: r.productName,
                    volumeKg: r.volumeKg,
                    status: r.status,
                    market: r.market,
                    role: "producer",
                });
            }
        }
        res.status(200).json({ success: true, data: { products, transactions } });
    }
    catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ success: false, message: error.message || "Search failed" });
    }
});
export default router;
