'use server';

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const ASSESSMENT_PRICE = parseInt(process.env.ASSESSMENT_PRICE_CENTS || '9900', 10);

interface RegistrationData {
  name: string;
  email: string;
  password: string;
  businessName?: string;
  country?: string;
}

export async function createCheckoutSession(registrationData: RegistrationData) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { error: 'Payment system is not configured. Please contact support.' };
    }

    // Check if email already exists before charging
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const checkRes = await fetch(`${apiUrl}/auth/check-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: registrationData.email }),
    });
    const checkData = await checkRes.json();
    if (checkData.success && checkData.data?.exists) {
      return { error: 'An account with this email already exists. Please log in instead.' };
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
                'Comprehensive export readiness evaluation with personalised action plan for UK & EU markets. Includes compliance review, readiness score, and buyer matching priority.',
            },
            unit_amount: ASSESSMENT_PRICE,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        registration_name: registrationData.name,
        registration_email: registrationData.email,
        registration_password: registrationData.password,
        registration_businessName: registrationData.businessName || '',
        registration_country: registrationData.country || '',
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
