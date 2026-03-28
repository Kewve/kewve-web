export interface PricingComputation {
  standardAmountCents: number;
  baseAmountBeforeDiscount: number;
  finalAmount: number;
  totalDiscountAmount: number;
  /** Always 0 — early-bird tier pricing removed; only promo codes reduce price. */
  earlyBirdDiscountAmount: number;
  promoDiscountAmount: number;
  normalizedDiscountCode: string;
  /** Always "standard" — tier-based early-bird pricing removed. */
  pricingTier: string;
}

const STANDARD_ASSESSMENT_PRICE_FALLBACK = 10000;

export const getApiUrl = () => {
  const apiUrlRaw = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5000/api';
  return apiUrlRaw.endsWith('/api') ? apiUrlRaw : `${apiUrlRaw}/api`;
};

export async function computeAssessmentPricing(discountCode?: string): Promise<PricingComputation> {
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
    const discountPercent = Number(validateData?.data?.discountPercent || 0);
    const discountAmountCentsFromApi = Number(validateData?.data?.discountAmountCents || 0);
    const discountAmountEurosFromApi = Number(validateData?.data?.discountAmountEuros || 0);

    if (discountPercent > 0) {
      promoDiscountAmount = Math.round((baseAmountBeforeDiscount * discountPercent) / 100);
    } else if (discountAmountCentsFromApi > 0) {
      promoDiscountAmount = Math.round(discountAmountCentsFromApi);
    } else if (discountAmountEurosFromApi > 0) {
      promoDiscountAmount = Math.round(discountAmountEurosFromApi * 100);
    }
  }

  promoDiscountAmount = Math.min(baseAmountBeforeDiscount, Math.max(0, promoDiscountAmount));
  const finalAmount = Math.max(0, baseAmountBeforeDiscount - promoDiscountAmount);
  const totalDiscountAmount = Math.max(0, standardAmountCents - finalAmount);
  const earlyBirdDiscountAmount = 0;

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
}
