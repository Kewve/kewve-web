'use server';

import { sendEmail } from '@/utils/emailConfig';

interface BuyerOnboardingInput {
  name: string;
  email: string;
}

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export async function sendBuyerVerificationEmail({
  name,
  email,
  verificationToken,
}: BuyerOnboardingInput & { verificationToken: string }) {
  try {
    if (!name || !email || !verificationToken) {
      return { success: false, error: 'Name, email, and verification token are required.' };
    }

    const firstName = name.split(' ')[0] || name;
    const footerImageSrc = 'cid:footer-image';
    const verifyEmailUrl = `${BASE_URL}/buyers/verify-email?token=${encodeURIComponent(verificationToken)}`;

    await sendEmail({
      to: email,
      subject: 'Verify your email for Kewve Buyers',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #1a2e23; margin: 0 0 16px;">Verify your buyer email</h2>
          <p style="color: #3d3935; font-size: 15px; line-height: 1.6;">Hi ${firstName},</p>
          <p style="color: #3d3935; font-size: 15px; line-height: 1.6;">
            Welcome to Kewve Buyers. Please verify your email to activate login and access your buyer dashboard.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${verifyEmailUrl}" style="display: inline-block; background-color: #ed722d; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #666; font-size: 13px; line-height: 1.6;">
            This link expires in 24 hours. If you did not create this account, please ignore this email and contact hello@kewve.com.
          </p>
          <div style="margin-top: 28px; text-align: center; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <img src="${footerImageSrc}" alt="Kewve Footer" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />
          </div>
        </div>
      `,
      attachFooterImage: true,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Buyer verification email error:', error);
    return { success: false, error: error?.message || 'Could not send buyer verification email.' };
  }
}

export async function sendBuyerWelcomeEmail({ name, email }: BuyerOnboardingInput) {
  try {
    if (!name || !email) {
      return { success: false, error: 'Name and email are required.' };
    }

    const firstName = name.split(' ')[0] || name;
    const footerImageSrc = 'cid:footer-image';
    const buyerPortalUrl = `${BASE_URL}/login?redirect=/buyer`;

    await sendEmail({
      to: email,
      subject: 'Welcome to Kewve Buyers',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #1a2e23; margin: 0 0 16px;">Welcome to Kewve Buyers</h2>
          <p style="color: #3d3935; font-size: 15px; line-height: 1.6;">Hi ${firstName},</p>
          <p style="color: #3d3935; font-size: 15px; line-height: 1.6;">
            Your buyer account is now set up. You can sign in to your buyer dashboard to explore products, create requests, and manage trade operations.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${buyerPortalUrl}" style="display: inline-block; background-color: #ed722d; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600;">
              Go to Buyer Dashboard
            </a>
          </div>
          <p style="color: #666; font-size: 13px; line-height: 1.6;">
            Need support? Contact us at hello@kewve.com.
          </p>
          <div style="margin-top: 28px; text-align: center; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <img src="${footerImageSrc}" alt="Kewve Footer" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />
          </div>
        </div>
      `,
      attachFooterImage: true,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Buyer welcome email error:', error);
    return { success: false, error: error?.message || 'Could not send buyer welcome email.' };
  }
}

