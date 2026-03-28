'use server';

import Stripe from 'stripe';

export async function completeBuyerProducerUpgrade(sessionId: string) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
    const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5000/api';
    const apiUrl = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;
    const internalSecret = process.env.INTERNAL_BUYER_UPGRADE_SECRET;

    if (!process.env.STRIPE_SECRET_KEY) {
      return { error: 'Payment system is not configured.' };
    }

    if (!internalSecret) {
      return { error: 'Server upgrade is not configured. Please contact support.' };
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return { error: 'Payment has not been completed.' };
    }

    const metadata = session.metadata;
    if (metadata?.buyer_upgrade !== 'true' || !metadata?.buyer_id) {
      return { error: 'This payment is not a buyer-to-producer upgrade.' };
    }

    const customerEmail =
      session.customer_email ||
      (typeof session.customer_details?.email === 'string' ? session.customer_details.email : null);
    if (!customerEmail) {
      return { error: 'Could not verify payer email for this session.' };
    }

    const discountCode = metadata.registration_discountCode?.trim() || undefined;

    const registerResponse = await fetch(`${apiUrl}/auth/upgrade-buyer-from-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify({
        buyerId: metadata.buyer_id,
        customerEmail,
        discountCode,
      }),
    });

    const registerData = await registerResponse.json();

    if (!registerData.success) {
      return { error: registerData.message || 'Failed to complete upgrade.' };
    }

    return {
      success: true,
      user: registerData.data.user,
      token: registerData.data.token,
    };
  } catch (err: unknown) {
    console.error('completeBuyerProducerUpgrade error:', err);
    return { error: 'Something went wrong. Please contact support.' };
  }
}
