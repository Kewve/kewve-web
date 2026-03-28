import Stripe from "stripe";
export function getStripe() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key)
        return null;
    return new Stripe(key);
}
export async function transferToConnectAccount(params) {
    const stripe = getStripe();
    if (!stripe) {
        throw new Error("STRIPE_SECRET_KEY is not configured on the server.");
    }
    return stripe.transfers.create({
        amount: params.amountCents,
        currency: "eur",
        destination: params.destinationAccountId,
        metadata: params.metadata || {},
    });
}
