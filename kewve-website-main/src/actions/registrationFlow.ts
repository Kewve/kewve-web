'use server';

import crypto from 'crypto';
import { sendEmail } from '@/utils/emailConfig';
import { createCheckoutSession, getCheckoutPricingPreview } from '@/actions/createCheckout';

interface RegistrationData {
  name: string;
  email: string;
  password: string;
  businessName?: string;
  country?: string;
  discountCode?: string;
}

interface RegistrationTokenPayload extends RegistrationData {
  exp: number;
}

const RAW_BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5000/api';
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const getTokenSecret = () =>
  process.env.REGISTRATION_TOKEN_SECRET ||
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.STRIPE_SECRET_KEY ||
  process.env.SMTP_PASS ||
  '';

const createRegistrationToken = (payload: RegistrationData) => {
  const secret = getTokenSecret();
  if (!secret) {
    throw new Error(
      'No token secret configured. Set REGISTRATION_TOKEN_SECRET (preferred), or provide JWT_SECRET/NEXTAUTH_SECRET.'
    );
  }

  const tokenPayload: RegistrationTokenPayload = {
    ...payload,
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
};

const verifyRegistrationToken = (token: string): { valid: true; payload: RegistrationTokenPayload } | { valid: false; error: string } => {
  const secret = getTokenSecret();
  if (!secret) {
    return { valid: false, error: 'Registration token secret is not configured.' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Invalid confirmation token.' };
  }

  const [encodedPayload, providedSignature] = parts;
  const expectedSignature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');

  if (providedSignature.length !== expectedSignature.length) {
    return { valid: false, error: 'Invalid confirmation token.' };
  }

  const signaturesMatch = crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature));
  if (!signaturesMatch) {
    return { valid: false, error: 'Invalid confirmation token.' };
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as RegistrationTokenPayload;
    if (!payload.exp || Date.now() > payload.exp) {
      return { valid: false, error: 'This confirmation link has expired. Please register again.' };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Invalid confirmation token payload.' };
  }
};

async function checkEmailExists(email: string): Promise<boolean> {
  const normalizedApiBase = RAW_BACKEND_URL.endsWith('/api') ? RAW_BACKEND_URL : `${RAW_BACKEND_URL}/api`;
  const response = await fetch(`${normalizedApiBase}/auth/check-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error('Unable to validate email address right now.');
  }

  const data = await response.json();
  return !!data?.data?.exists;
}

export async function requestRegistrationEmailConfirmation(registrationData: RegistrationData) {
  try {
    if (!registrationData.email || !registrationData.password || !registrationData.name) {
      return { success: false, error: 'Name, email, and password are required.' };
    }

    const exists = await checkEmailExists(registrationData.email);
    if (exists) {
      return { success: false, error: 'An account with this email already exists. Please log in instead.' };
    }

    const normalizedDiscountCode = registrationData.discountCode?.trim().toUpperCase() || '';
    if (normalizedDiscountCode) {
      const normalizedApiBase = RAW_BACKEND_URL.endsWith('/api') ? RAW_BACKEND_URL : `${RAW_BACKEND_URL}/api`;
      const validateRes = await fetch(`${normalizedApiBase}/discount-codes/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalizedDiscountCode }),
      });
      const validateData = await validateRes.json();
      if (!validateRes.ok || !validateData?.success) {
        return { success: false, error: 'Invalid or inactive discount code.' };
      }
    }

    const token = createRegistrationToken({
      name: registrationData.name,
      email: registrationData.email.toLowerCase().trim(),
      password: registrationData.password,
      businessName: registrationData.businessName,
      country: registrationData.country,
      discountCode: normalizedDiscountCode || undefined,
    });

    const confirmationUrl = `${BASE_URL}/register/confirm-email?token=${encodeURIComponent(token)}`;
    const firstName = registrationData.name.split(' ')[0] || registrationData.name;
    const footerImageSrc = 'cid:footer-image';

    await sendEmail({
      to: registrationData.email,
      subject: 'Confirm your email to continue with Kewve registration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #1a2e23; margin: 0 0 16px;">Confirm your email address</h2>
          <p style="color: #3d3935; font-size: 15px; line-height: 1.6;">Hi ${firstName},</p>
          <p style="color: #3d3935; font-size: 15px; line-height: 1.6;">
            Please confirm your email address to continue registration and proceed to payment for your Export Readiness Assessment.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${confirmationUrl}" style="display: inline-block; background-color: #ed722d; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600;">
              Confirm Email Address
            </a>
          </div>
          <p style="color: #666; font-size: 13px; line-height: 1.6;">
            This link expires in 24 hours. If you did not request this, you can ignore this email.
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

    return { success: true };
  } catch (error: any) {
    console.error('Registration confirmation email error:', error);
    return { success: false, error: error?.message || 'Failed to send confirmation email. Please try again.' };
  }
}

export async function validateRegistrationConfirmationToken(token: string) {
  const verified = verifyRegistrationToken(token);
  if (!verified.valid) {
    return { success: false, error: verified.error };
  }

  try {
    const exists = await checkEmailExists(verified.payload.email);
    if (exists) {
      return { success: false, error: 'This email is already registered. Please log in instead.' };
    }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Unable to validate email status.' };
  }

  return {
    success: true,
    data: {
      email: verified.payload.email,
      name: verified.payload.name,
      discountCode: verified.payload.discountCode || '',
    },
  };
}

export async function getCheckoutPricingPreviewFromConfirmationToken(token: string) {
  const verified = verifyRegistrationToken(token);
  if (!verified.valid) {
    return { success: false, error: verified.error };
  }

  return getCheckoutPricingPreview(verified.payload.discountCode);
}

export async function createCheckoutFromConfirmationToken(token: string) {
  const verified = verifyRegistrationToken(token);
  if (!verified.valid) {
    return { error: verified.error };
  }

  const payload = verified.payload;
  return createCheckoutSession({
    name: payload.name,
    email: payload.email,
    password: payload.password,
    businessName: payload.businessName,
    country: payload.country,
    discountCode: payload.discountCode,
  });
}

