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
      const firstName = (metadata.registration_name || '').trim().split(/\s+/)[0] || 'there';
      const footerImageSrc = 'cid:footer-image';
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
      await sendEmail({
        to: metadata.registration_email,
        subject: 'Welcome to Kewve — Let’s get your products ready for global markets',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
            <p style="color: #3d3935; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
              Hello ${firstName},
            </p>
            <p style="color: #3d3935; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
              Welcome to <strong>Kewve</strong>, and thank you for completing your registration.
            </p>
            <p style="color: #3d3935; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
              We’re excited to have you join a growing community of African food producers preparing their products for international markets.
            </p>
            <p style="color: #3d3935; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
              Your first step is to complete the <strong>Export Readiness Assessment</strong>. This assessment will help you understand what is required to export your food products to markets such as the <strong>UK and Europe</strong>.
            </p>
            <p style="color: #3d3935; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
              Through the platform, you will:
            </p>
            <ul style="color: #3d3935; font-size: 15px; line-height: 1.7; margin: 0 0 16px 20px; padding: 0;">
              <li>Complete your <strong>Export Readiness Assessment</strong></li>
              <li>Receive a <strong>clear checklist of export requirements</strong></li>
              <li>Get <strong>guidance on preparing your business for global trade</strong></li>
              <li>Create your <strong>supplier profile and product catalogue for buyers</strong></li>
            </ul>
            <p style="color: #3d3935; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
              Once your assessment is completed, you will receive your <strong>Export Readiness Score and action checklist</strong>, which will guide the steps needed to prepare your business for international trade.
            </p>
            <p style="color: #3d3935; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
              You can log in and begin your assessment here:
            </p>
            <div style="margin: 0 0 18px; text-align: left;">
              <a
                href="${loginUrl}"
                style="display: inline-block; background-color: #ed722d; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-size: 14px; font-weight: 600;"
              >
                Login
              </a>
            </div>
            <p style="color: #3d3935; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
              If you have any questions along the way, feel free to reply to this email. We are happy to support you.
            </p>
            <p style="color: #3d3935; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
              We look forward to helping you prepare your products for global markets.
            </p>
            <div style="margin: 20px 0 0;">
              <p style="color: #3d3935; font-size: 15px; line-height: 1.6; margin: 0 0 2px;">Warm regards,</p>
              <p style="color: #3d3935; font-size: 15px; line-height: 1.6; margin: 0 0 2px;"><strong>Abiola Ofurhie</strong></p>
              <p style="color: #3d3935; font-size: 15px; line-height: 1.6; margin: 0 0 2px;">Founder, Kewve</p>
              <p style="color: #3d3935; font-size: 15px; line-height: 1.6; margin: 0;">www.kewve.com</p>
            </div>
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

    // Notify admin about successful registration completion
    try {
      const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
      if (ADMIN_EMAIL) {
        const firstName = (metadata.registration_name || '').trim().split(/\s+/)[0] || 'there';
        await sendEmail({
          to: ADMIN_EMAIL,
          subject: 'New registration completed — producer',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color:#1a2e23;">
              <h2 style="margin: 0 0 16px;">New registration completed</h2>
              <p style="margin: 0 0 10px; font-size: 15px; line-height: 1.6;">
                Hi Admin,
              </p>
              <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.6;">
                A producer has completed registration and payment.
              </p>
              <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Name:</strong> ${metadata.registration_name || firstName}</p>
              <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Email:</strong> ${metadata.registration_email}</p>
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6;"><strong>Country:</strong> ${metadata.registration_country || '—'}</p>
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color:#666;">
                Review their dashboard for assessment progress and document submissions.
              </p>
            </div>
          `,
          attachFooterImage: false,
        });
      }
    } catch (adminEmailError) {
      console.error('Admin notification email error:', adminEmailError);
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
