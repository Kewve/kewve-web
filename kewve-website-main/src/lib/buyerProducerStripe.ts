import Stripe from 'stripe';
import { computeAssessmentPricing } from '@/lib/assessmentPricing';

export async function createBuyerProducerUpgradeStripeSession(params: {
  buyerId: string;
  buyerEmail: string;
  discountCode?: string;
}): Promise<{ url: string } | { error: string }> {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (!process.env.STRIPE_SECRET_KEY) {
    return { error: 'Payment system is not configured. Please contact support.' };
  }

  let pricing;
  try {
    pricing = await computeAssessmentPricing(params.discountCode);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to validate discount code at the moment.';
    return { error: message };
  }

  const {
    standardAmountCents,
    baseAmountBeforeDiscount,
    finalAmount,
    totalDiscountAmount,
    promoDiscountAmount,
    normalizedDiscountCode,
    pricingTier,
  } = pricing;
  const hasVisibleDiscount = totalDiscountAmount > 0;

  let couponId: string | undefined;
  if (hasVisibleDiscount) {
    const coupon = await stripe.coupons.create({
      duration: 'once',
      amount_off: totalDiscountAmount,
      currency: 'eur',
      name: promoDiscountAmount > 0 ? 'Assessment discount code' : 'Assessment discount',
    });
    couponId = coupon.id;
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    customer_email: params.buyerEmail.toLowerCase().trim(),
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Export Readiness Assessment',
            description:
              'Comprehensive export readiness evaluation with personalised action plan for UK & EU markets. Includes compliance review, readiness score, and buyer matching priority. Base fee €100; eligible discounts applied at checkout.',
          },
          unit_amount: standardAmountCents,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
    metadata: {
      buyer_upgrade: 'true',
      buyer_id: params.buyerId,
      registration_discountCode: normalizedDiscountCode,
      registration_priceTier: pricingTier,
      registration_baseAmountCents: String(baseAmountBeforeDiscount),
      registration_finalAmountCents: String(finalAmount),
      registration_totalDiscountAmountCents: String(totalDiscountAmount),
    },
    success_url: `${BASE_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&flow=buyer_upgrade`,
    cancel_url: `${BASE_URL}/buyer`,
  });

  if (!session.url) {
    return { error: 'Unable to start checkout. Please try again.' };
  }

  return { url: session.url };
}
