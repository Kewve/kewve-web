import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { userHasRole } from "../utils/userRoles.js";
import { User } from "../models/User.js";
import { getStripe } from "../services/stripePayout.js";
const router = Router();
function frontendBase() {
    return (process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0].trim().replace(/\/$/, "");
}
function stripeErrorMessage(err) {
    const e = err;
    return String(e?.raw?.message || e?.message || "");
}
/** DB acct_ was created in the opposite mode vs STRIPE_SECRET_KEY (test vs live). */
function stripeConnectModeMismatchError(err) {
    const msg = stripeErrorMessage(err).toLowerCase();
    return msg.includes("test mode") && msg.includes("live mode");
}
/**
 * Saved acct_ is from another Stripe platform, was deleted, or never belonged to this secret key.
 * accountLinks.create surfaces: "not connected to your platform or does not exist".
 */
function stripeConnectAccountNotOnThisPlatformError(err) {
    const msg = stripeErrorMessage(err).toLowerCase();
    return (msg.includes("not connected to your platform") ||
        (msg.includes("account link") && msg.includes("does not exist")));
}
function stripeConnectShouldResetStoredAccountAfterLinkError(err) {
    return stripeConnectModeMismatchError(err) || stripeConnectAccountNotOnThisPlatformError(err);
}
async function createExpressAccountAndSave(stripe, user) {
    const country = (process.env.STRIPE_CONNECT_DEFAULT_COUNTRY || "GB").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) {
        throw new Error("STRIPE_CONNECT_DEFAULT_COUNTRY must be a 2-letter ISO country code (e.g. GB, IE, NL).");
    }
    const account = await stripe.accounts.create({
        type: "express",
        country,
        email: user.email,
        metadata: {
            kewveUserId: String(user._id),
        },
        capabilities: {
            transfers: { requested: true },
        },
    });
    user.stripeConnectAccountId = account.id;
    await user.save({ validateBeforeSave: false });
    return account.id;
}
// POST /api/stripe/connect — create Express account (if needed) + Account Link for onboarding
router.post("/stripe/connect", authenticate, async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser || !userHasRole(authUser, "producer")) {
            res.status(403).json({ success: false, message: "Only producers can connect Stripe payouts." });
            return;
        }
        const stripe = getStripe();
        if (!stripe) {
            res.status(503).json({ success: false, message: "Stripe is not configured on the server." });
            return;
        }
        const user = await User.findById(authUser._id);
        if (!user) {
            res.status(404).json({ success: false, message: "User not found." });
            return;
        }
        let accountId = String(user.stripeConnectAccountId || "").trim();
        if (!accountId.startsWith("acct_")) {
            try {
                accountId = await createExpressAccountAndSave(stripe, user);
            }
            catch (e) {
                const message = e?.message || "Failed to create Stripe Connect account.";
                if (message.includes("STRIPE_CONNECT_DEFAULT_COUNTRY")) {
                    res.status(500).json({ success: false, message });
                    return;
                }
                throw e;
            }
        }
        const base = frontendBase();
        const returnUrl = `${base}/dashboard/settings?stripe_connect=return`;
        const refreshUrl = `${base}/dashboard/settings?stripe_connect=refresh`;
        const createLink = (acct) => stripe.accountLinks.create({
            account: acct,
            refresh_url: refreshUrl,
            return_url: returnUrl,
            type: "account_onboarding",
        });
        let accountLink;
        try {
            accountLink = await createLink(accountId);
        }
        catch (linkErr) {
            if (!stripeConnectShouldResetStoredAccountAfterLinkError(linkErr)) {
                throw linkErr;
            }
            await User.updateOne({ _id: user._id }, { $unset: { stripeConnectAccountId: "" } });
            user.stripeConnectAccountId = undefined;
            accountId = await createExpressAccountAndSave(stripe, user);
            accountLink = await createLink(accountId);
            console.warn("[stripe/connect] Replaced invalid or mismatched Connect account id; user should complete onboarding again.");
        }
        res.status(200).json({
            success: true,
            url: accountLink.url,
            accountId,
        });
    }
    catch (error) {
        console.error("Stripe Connect onboarding error:", error);
        res.status(500).json({
            success: false,
            message: error?.message || "Failed to start Stripe Connect onboarding.",
        });
    }
});
// GET /api/stripe/connect/status — retrieve Connect account state from Stripe
router.get("/stripe/connect/status", authenticate, async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser || !userHasRole(authUser, "producer")) {
            res.status(403).json({ success: false, message: "Only producers can check Connect status." });
            return;
        }
        const user = await User.findById(authUser._id);
        const accountId = String(user?.stripeConnectAccountId || "").trim();
        if (!accountId.startsWith("acct_")) {
            res.status(200).json({
                success: true,
                data: {
                    hasAccount: false,
                    accountId: null,
                    detailsSubmitted: false,
                    chargesEnabled: false,
                    payoutsEnabled: false,
                },
            });
            return;
        }
        const stripe = getStripe();
        if (!stripe) {
            res.status(503).json({ success: false, message: "Stripe is not configured." });
            return;
        }
        try {
            const acct = await stripe.accounts.retrieve(accountId);
            res.status(200).json({
                success: true,
                data: {
                    hasAccount: true,
                    accountId,
                    detailsSubmitted: !!acct.details_submitted,
                    chargesEnabled: !!acct.charges_enabled,
                    payoutsEnabled: !!acct.payouts_enabled,
                },
            });
        }
        catch (retrieveErr) {
            if (stripeConnectModeMismatchError(retrieveErr) ||
                stripeConnectAccountNotOnThisPlatformError(retrieveErr)) {
                res.status(200).json({
                    success: true,
                    data: {
                        hasAccount: false,
                        accountId,
                        detailsSubmitted: false,
                        chargesEnabled: false,
                        payoutsEnabled: false,
                        stripeModeMismatch: true,
                    },
                });
                return;
            }
            throw retrieveErr;
        }
    }
    catch (error) {
        console.error("Stripe Connect status error:", error);
        res.status(500).json({
            success: false,
            message: error?.message || "Failed to load Connect account status.",
        });
    }
});
export default router;
