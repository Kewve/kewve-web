'use server';

import Stripe from 'stripe';

interface RegistrationData {
  name: string;
  email: string;
  password: string;
  businessName?: string;
  country?: string;
  discountCode?: string;
}

interface PricingComputation {
  standardAmountCents: number;
  baseAmountBeforeDiscount: number;
  finalAmount: number;
  totalDiscountAmount: number;
  earlyBirdDiscountAmount: number;
  promoDiscountAmount: number;
  normalizedDiscountCode: string;
  pricingTier: string;
}

const STANDARD_ASSESSMENT_PRICE_FALLBACK = 10000;

const getApiUrl = () => {
  const apiUrlRaw = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5000/api';
  return apiUrlRaw.endsWith('/api') ? apiUrlRaw : `${apiUrlRaw}/api`;
};

const computePricing = async (discountCode?: string): Promise<PricingComputation> => {
  const apiUrl = getApiUrl();
  const standardAmountCents = parseInt(process.env.ASSESSMENT_PRICE_CENTS || String(STANDARD_ASSESSMENT_PRICE_FALLBACK), 10);

  let baseAmountBeforeDiscount = standardAmountCents;
  let pricingTier = 'standard';
  try {
    const tierRes = await fetch(`${apiUrl}/pricing/assessment-tier`, { method: 'GET' });
    const tierData = await tierRes.json();
    if (tierRes.ok && tierData?.success && Number(tierData?.data?.unitAmountCents) > 0) {
      baseAmountBeforeDiscount = Number(tierData.data.unitAmountCents);
      pricingTier = String(tierData.data.tierLabel || 'standard');
    }
  } catch {
    // fallback to standard amount
  }

  let promoDiscountAmount = 0;
  let normalizedDiscountCode = '';
  if (discountCode?.trim()) {
    normalizedDiscountCode = discountCode.trim().toUpperCase();
    const validateRes = await fetch(`${apiUrl}/discount-codes/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: normalizedDiscountCode }),
    });
    const validateData = await validateRes.json();
    if (!validateRes.ok || !validateData.success) {
      throw new Error('Invalid or inactive discount code.');
    }
    const discountPercent = Number(validateData?.data?.discountPercent || 15);
    promoDiscountAmount = Math.round((baseAmountBeforeDiscount * discountPercent) / 100);
  }

  const finalAmount = Math.max(0, baseAmountBeforeDiscount - promoDiscountAmount);
  const totalDiscountAmount = Math.max(0, standardAmountCents - finalAmount);
  const earlyBirdDiscountAmount = Math.max(0, standardAmountCents - baseAmountBeforeDiscount);

  return {
    standardAmountCents,
    baseAmountBeforeDiscount,
    finalAmount,
    totalDiscountAmount,
    earlyBirdDiscountAmount,
    promoDiscountAmount,
    normalizedDiscountCode,
    pricingTier,
  };
};

export async function getCheckoutPricingPreview(discountCode?: string) {
  try {
    const pricing = await computePricing(discountCode);
    return {
      success: true,
      data: pricing,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Unable to calculate pricing preview.',
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

    // Check if email already exists before charging
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
      pricing = await computePricing(registrationData.discountCode);
    } catch (error: any) {
      return { error: error?.message || 'Unable to validate discount code at the moment.' };
    }
    const {
      standardAmountCents,
      baseAmountBeforeDiscount,
      finalAmount,
      totalDiscountAmount,
      earlyBirdDiscountAmount,
      promoDiscountAmount,
      normalizedDiscountCode,
      pricingTier,
    } = pricing;
    const hasVisibleDiscount = totalDiscountAmount > 0;

    let couponId: string | undefined;
    if (hasVisibleDiscount) {
      const discountParts: string[] = [];
      if (earlyBirdDiscountAmount > 0) discountParts.push('early-bird');
      if (promoDiscountAmount > 0) discountParts.push('discount code');
      const coupon = await stripe.coupons.create({
        duration: 'once',
        amount_off: totalDiscountAmount,
        currency: 'eur',
        name: `Assessment ${discountParts.join(' + ') || 'discount'}`.trim(),
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
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return { error: 'Unable to initiate payment. Please try again.' };
  }
}
