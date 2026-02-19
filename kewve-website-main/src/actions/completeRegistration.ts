'use server';

import Stripe from 'stripe';

export async function completeRegistration(sessionId: string) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
    const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5000/api';

    if (!process.env.STRIPE_SECRET_KEY) {
      return { error: 'Payment system is not configured.' };
    }

    // Verify the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return { error: 'Payment has not been completed.' };
    }

    const metadata = session.metadata;
    if (!metadata?.registration_email || !metadata?.registration_password || !metadata?.registration_name) {
      return { error: 'Registration data is missing from the payment session.' };
    }

    // Create the user via the backend API
    const registerResponse = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: metadata.registration_email,
        password: metadata.registration_password,
        name: metadata.registration_name,
        businessName: metadata.registration_businessName || undefined,
        country: metadata.registration_country || undefined,
      }),
    });

    const registerData = await registerResponse.json();

    if (!registerData.success) {
      // If user already exists, try to log them in instead (handles page refresh)
      if (registerData.message?.includes('already exists')) {
        const loginResponse = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: metadata.registration_email,
            password: metadata.registration_password,
          }),
        });

        const loginData = await loginResponse.json();

        if (loginData.success) {
          return {
            success: true,
            user: loginData.data.user,
            token: loginData.data.token,
          };
        }
      }

      return { error: registerData.message || 'Failed to create account.' };
    }

    return {
      success: true,
      user: registerData.data.user,
      token: registerData.data.token,
    };
  } catch (err: any) {
    console.error('Complete registration error:', err);
    return { error: 'Something went wrong. Please contact support.' };
  }
}
