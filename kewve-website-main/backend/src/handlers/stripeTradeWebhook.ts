import type { Request, Response } from "express";
import Stripe from "stripe";
import { markTradeInvoicePaidFromStripe } from "../utils/buyerRequestTrade.js";
import { applyClusterPurchaseFromPaidSession } from "../utils/clusterSettlement.js";

export async function stripeTradeWebhookHandler(req: Request, res: Response): Promise<void> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) {
    res.status(500).send("Stripe webhook not configured");
    return;
  }

  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    res.status(400).send("Missing stripe-signature");
    return;
  }

  const stripe = new Stripe(key);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err: any) {
    console.error("Stripe webhook signature error:", err?.message);
    res.status(400).send(`Webhook Error: ${err?.message || "invalid"}`);
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.type === "trade_invoice" && session.metadata?.buyerRequestId) {
      const id = String(session.metadata.buyerRequestId);
      const result = await markTradeInvoicePaidFromStripe({
        buyerRequestId: id,
        amountTotalCents: session.amount_total,
        currency: session.currency,
      });
      if (!result.applied && !result.alreadyPaid && result.skipReason) {
        console.warn("Trade invoice webhook skip:", id, result.skipReason);
      }
    } else if (session.metadata?.type === "cluster_checkout" && session.metadata?.aggregationClusterId) {
      const result = await applyClusterPurchaseFromPaidSession({ session });
      if (!result.applied && !result.alreadyPaid && result.skipReason) {
        console.warn("Cluster checkout webhook skip:", session.metadata.aggregationClusterId, result.skipReason);
      }
    }
  }

  res.json({ received: true });
}
