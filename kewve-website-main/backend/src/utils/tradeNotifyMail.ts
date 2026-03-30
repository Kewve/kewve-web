import { User } from "../models/User.js";
import type { BuyerRequestDocument } from "../models/BuyerRequest.js";
import { displayIdSuffix } from "./displayId.js";
import { sendTransactionalEmail } from "./smtpTransactional.js";

function frontendBase(): string {
  return (process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0].trim().replace(/\/$/, "");
}

function eur(cents: number): string {
  return `€${(Number(cents || 0) / 100).toFixed(2)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Primary + accepted allocation producers (aggregation); deduped by email. */
function producerUserIdsToNotify(doc: BuyerRequestDocument): string[] {
  const ids = new Set<string>();
  ids.add(String(doc.producerId));
  const allocs = doc.matchPlan?.allocations || [];
  const aggregation =
    doc.fulfillmentMode === "aggregation" || allocs.filter((a: any) => Number(a?.allocatedKg || 0) > 0).length > 1;
  if (aggregation) {
    for (const a of allocs) {
      if (Number(a?.allocatedKg || 0) <= 0) continue;
      if (String(a.producerResponse || "pending") === "accepted") {
        ids.add(String(a.producerId));
      }
    }
  }
  return Array.from(ids);
}

/** After invoice is issued — tell the buyer they can pay. */
export async function notifyBuyerInvoiceSent(doc: BuyerRequestDocument): Promise<void> {
  const to = String(doc.buyerEmail || "")
    .trim()
    .toLowerCase();
  if (!to) {
    console.warn("[tradeNotify] buyer invoice sent: no buyerEmail on request", String(doc._id));
    return;
  }
  const inv = doc.trade?.invoice;
  if (!inv?.sentAt || !inv.totalCents) return;

  const ref = displayIdSuffix(doc._id);
  const product = doc.productName || "your order";
  const total = eur(inv.totalCents);
  const buyerFirst = escapeHtml((doc.buyerName || "there").split(/\s+/)[0] || "there");
  const link = `${frontendBase()}/buyer/trade-operations`;

  const subject = `Kewve: Invoice ready — ${product}`;
  const text = [
    `Hi ${doc.buyerName || "buyer"},`,
    "",
    `An invoice is ready for ${product} (ref ${ref}).`,
    `Total due: ${total}`,
    "",
    `Pay securely from Trade operations: ${link}`,
    "",
    "— Kewve",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px 22px; color:#1a2e23;">
      <h2 style="margin: 0 0 14px; font-size: 18px;">Invoice ready</h2>
      <p style="margin: 0 0 10px; font-size: 15px; line-height: 1.6;">Hi ${buyerFirst},</p>
      <p style="margin: 0 0 10px; font-size: 15px; line-height: 1.6;">
        An invoice is ready for <strong>${escapeHtml(product)}</strong> (ref <strong>${escapeHtml(ref)}</strong>).
      </p>
      <p style="margin: 0 0 18px; font-size: 15px; line-height: 1.6;"><strong>Total due:</strong> ${escapeHtml(total)}</p>
      <p style="margin: 0 0 22px;">
        <a href="${escapeHtml(link)}" style="display: inline-block; background-color: #ed722d; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-size: 15px; font-weight: 600;">Open Trade operations</a>
      </p>
      <p style="margin: 0; font-size: 13px; color:#666;">This email was sent by Kewve.</p>
    </div>
  `;

  try {
    await sendTransactionalEmail({ to, subject, html, text });
  } catch (err) {
    console.error("[tradeNotify] notifyBuyerInvoiceSent failed:", err);
  }
}

/** After buyer payment is recorded — tell producer(s). */
export async function notifyProducersTradePaid(doc: BuyerRequestDocument): Promise<void> {
  const inv = doc.trade?.invoice;
  if (!inv?.paidAt || !inv.totalCents) return;

  const pids = producerUserIdsToNotify(doc);
  const users = await User.find({ _id: { $in: pids } })
    .select("email name")
    .lean();
  const seen = new Set<string>();
  const targets: { email: string; name: string }[] = [];
  for (const u of users) {
    const email = String((u as { email?: string }).email || "")
      .trim()
      .toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    targets.push({ email, name: String((u as { name?: string }).name || "Producer") });
  }
  if (!targets.length) {
    console.warn("[tradeNotify] notifyProducersTradePaid: no producer emails", String(doc._id));
    return;
  }

  const ref = displayIdSuffix(doc._id);
  const product = doc.productName || "order";
  const total = eur(inv.totalCents);
  const link = `${frontendBase()}/dashboard/trade-operations`;

  for (const t of targets) {
    const first = escapeHtml(t.name.split(/\s+/)[0] || "there");
    const subject = `Kewve: Payment received — ${product}`;
    const text = [
      `Hi ${t.name},`,
      "",
      `The buyer has paid for ${product} (ref ${ref}).`,
      `Amount: ${total}`,
      "",
      `View the trade in your dashboard: ${link}`,
      "",
      "— Kewve",
    ].join("\n");
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px 22px; color:#1a2e23;">
        <h2 style="margin: 0 0 14px; font-size: 18px;">Payment received</h2>
        <p style="margin: 0 0 10px; font-size: 15px; line-height: 1.6;">Hi ${first},</p>
        <p style="margin: 0 0 10px; font-size: 15px; line-height: 1.6;">
          The buyer has paid for <strong>${escapeHtml(product)}</strong> (ref <strong>${escapeHtml(ref)}</strong>).
        </p>
        <p style="margin: 0 0 18px; font-size: 15px; line-height: 1.6;"><strong>Amount:</strong> ${escapeHtml(total)}</p>
        <p style="margin: 0 0 22px;">
          <a href="${escapeHtml(link)}" style="display: inline-block; background-color: #ed722d; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-size: 15px; font-weight: 600;">Trade operations</a>
        </p>
        <p style="margin: 0; font-size: 13px; color:#666;">This email was sent by Kewve.</p>
      </div>
    `;
    try {
      await sendTransactionalEmail({ to: t.email, subject, html, text });
    } catch (err) {
      console.error("[tradeNotify] notifyProducersTradePaid failed for", t.email, err);
    }
  }
}
