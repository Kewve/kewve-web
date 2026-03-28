'use server';

import Stripe from 'stripe';
import { computeAssessmentPricing, getApiUrl, type PricingComputation } from '@/lib/assessmentPricing';

interface RegistrationData {
  name: string;
  email: string;
  password: string;
  businessName?: string;
  country?: string;
  discountCode?: string;
}

export async function getCheckoutPricingPreview(discountCode?: string) {
  try {
    const pricing = await computeAssessmentPricing(discountCode);
    return {
      success: true,
      data: pricing,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to calculate pricing preview.';
    return {
      success: false,
      error: message,
    };
  }
}

export async function createCheckoutSession(registrationData: RegistrationData) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
    const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const apiUrl = getApiUrl();

    if (!process.env.STRIPE_SECRET_KEY) {
      return { error: 'Payment system is not configured. Please contact support.' };
    }

    if (apiUrl) {
      try {
        const checkRes = await fetch(`${apiUrl}/auth/check-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: registrationData.email }),
        });
        const checkData = await checkRes.json();
        if (checkData.success && checkData.data?.exists) {
          return { error: 'An account with this email already exists. Please log in instead.' };
        }
      } catch {
        // Backend unreachable — proceed, the register endpoint has its own duplicate check
      }
    }

    let pricing: PricingComputation;
    try {
      pricing = await computeAssessmentPricing(registrationData.discountCode);
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
      customer_email: registrationData.email,
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
        registration_name: registrationData.name,
        registration_email: registrationData.email,
        registration_password: registrationData.password,
        registration_businessName: registrationData.businessName || '',
        registration_country: registrationData.country || '',
        registration_discountCode: normalizedDiscountCode,
        registration_priceTier: pricingTier,
        registration_baseAmountCents: String(baseAmountBeforeDiscount),
        registration_finalAmountCents: String(finalAmount),
        registration_totalDiscountAmountCents: String(totalDiscountAmount),
      },
      success_url: `${BASE_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/register`,
    });

    return { url: session.url };
  } catch (err: unknown) {
    console.error('Stripe checkout error:', err);
    return { error: 'Unable to initiate payment. Please try again.' };
  }
}
