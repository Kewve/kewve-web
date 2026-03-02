'use server';

import Stripe from 'stripe';
import { sendEmail } from '@/utils/emailConfig';

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
        discountCodeUsed: metadata.registration_discountCode || undefined,
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

    try {
      const footerImageSrc = 'cid:footer-image';
      await sendEmail({
        to: metadata.registration_email,
        subject: 'Welcome to Kewve',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="color: #1a2e23; margin: 0 0 16px;">Welcome to Kewve</h2>
            <p style="color: #3d3935; font-size: 15px; line-height: 1.6;">Hi ${metadata.registration_name},</p>
            <p style="color: #3d3935; font-size: 15px; line-height: 1.6;">
              Your payment was successful and your account is now active.
            </p>
            <p style="color: #3d3935; font-size: 15px; line-height: 1.6;">
              You can now complete your export readiness assessment and start your journey to UK and EU markets.
            </p>
            <p style="color: #666; font-size: 13px; margin-top: 24px;">
              If you need support, contact us at hello@kewve.com.
            </p>
            <div style="margin-top: 28px; text-align: center; padding-top: 16px; border-top: 1px solid #e5e7eb;">
              <img
                src="${footerImageSrc}"
                alt="Kewve Footer"
                style="max-width: 100%; height: auto; display: block; margin: 0 auto;"
              />
            </div>
          </div>
        `,
        attachFooterImage: true,
      });
    } catch (emailError) {
      console.error('Welcome email send error:', emailError);
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
