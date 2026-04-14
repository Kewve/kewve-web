'use server';

import { Resend } from 'resend';
import { headers } from 'next/headers';
import { FormSubmissionEmailTemplate } from '@/templates/FormSubmissionEmail';
import { sendEmail } from '@/utils/emailConfig';
import { formatInterestRole, normalizeInterestRole } from '@/utils/contactFormLabels';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const CONTACT_INBOX = process.env.CONTACT_EMAIL || 'abiola@kewve.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || '';
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

type RateLimitBucket = {
  count: number;
  windowStart: number;
};

const contactRateLimitStore = new Map<string, RateLimitBucket>();

function normalizeText(input: string, maxLen: number) {
  return input.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string) {
  if (!phone) return true;
  return /^[+0-9()\-\s]{7,25}$/.test(phone);
}

function getRequesterIp() {
  const h = headers();
  const forwardedFor = h.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || 'unknown';
  return h.get('x-real-ip') || 'unknown';
}

function isRateLimited(key: string) {
  const now = Date.now();
  const existing = contactRateLimitStore.get(key);
  if (!existing) {
    contactRateLimitStore.set(key, { count: 1, windowStart: now });
    return false;
  }
  if (now - existing.windowStart > RATE_LIMIT_WINDOW_MS) {
    contactRateLimitStore.set(key, { count: 1, windowStart: now });
    return false;
  }
  existing.count += 1;
  contactRateLimitStore.set(key, existing);
  return existing.count > RATE_LIMIT_MAX;
}

async function verifyTurnstileToken(token: string, ip: string) {
  if (!TURNSTILE_SECRET) return false;
  const body = new URLSearchParams();
  body.set('secret', TURNSTILE_SECRET);
  body.set('response', token);
  if (ip && ip !== 'unknown') {
    body.set('remoteip', ip);
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store',
  });

  if (!response.ok) return false;
  const result = (await response.json()) as { success?: boolean };
  return !!result.success;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function contactSubmissionHtml(parsed: {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  message: string;
  country: string;
  account_type: string;
}) {
  const rows = [
    ['First name', parsed.first_name],
    ['Last name', parsed.last_name],
    ['Email', parsed.email],
    ['Phone', parsed.phone],
    ['Interested as', formatInterestRole(parsed.account_type)],
    ['Country', parsed.country],
    ['Message', parsed.message],
  ];
  return `
    <div style="font-family: sans-serif; color: #1a1a1a;">
      <h1 style="font-size: 18px;">New contact submission</h1>
      ${rows
        .map(
          ([label, value]) =>
            `<p style="margin: 8px 0;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value || '')}</p>`
        )
        .join('')}
    </div>
  `;
}

export const formSubmissionAction = async (
  prevState: { message: string; error: boolean; submitted: boolean },
  data: FormData
) => {
  try {
    const requesterIp = getRequesterIp();
    const interestRaw = data.get('account_type')?.toString() || '';
    const interest = normalizeInterestRole(interestRaw);
    if (!interest) {
      return {
        message: 'Please choose whether you are interested as a buyer or a producer.',
        error: true,
        submitted: true,
      };
    }

    const honeypot = data.get('company_website')?.toString().trim() || '';
    if (honeypot) {
      return {
        message: 'Thanks for your interest. Please try submitting again.',
        error: false,
        submitted: true,
      };
    }

    const captchaToken = data.get('captchaToken')?.toString().trim() || '';
    if (!TURNSTILE_SECRET) {
      return {
        message: 'Contact form is temporarily unavailable. Please try again shortly.',
        error: true,
        submitted: true,
      };
    }
    if (!captchaToken) {
      return {
        message: 'Please complete the captcha check before submitting.',
        error: true,
        submitted: true,
      };
    }
    const captchaOk = await verifyTurnstileToken(captchaToken, requesterIp);
    if (!captchaOk) {
      return {
        message: 'Captcha verification failed. Please try again.',
        error: true,
        submitted: true,
      };
    }

    if (data.get('gdpr_consent') !== 'on') {
      return {
        message: 'Please confirm you understand how we use your information (Privacy Policy and GDPR).',
        error: true,
        submitted: true,
      };
    }

    const firstName = normalizeText(data.get('firstName')?.toString() || '', 100);
    const lastName = normalizeText(data.get('lastName')?.toString() || '', 100);
    const email = normalizeText(data.get('email')?.toString().toLowerCase() || '', 254);
    const phone = normalizeText(data.get('phone')?.toString() || '', 30);
    const country = normalizeText(data.get('country')?.toString() || '', 120);
    const message = normalizeText(data.get('message')?.toString() || '', 3000);

    if (!firstName || firstName.length < 2) {
      return {
        message: 'Please enter your first name.',
        error: true,
        submitted: true,
      };
    }
    if (!email || !isValidEmail(email)) {
      return {
        message: 'Please enter a valid email address.',
        error: true,
        submitted: true,
      };
    }
    if (!isValidPhone(phone)) {
      return {
        message: 'Please enter a valid phone number.',
        error: true,
        submitted: true,
      };
    }
    if (!message || message.length < 10) {
      return {
        message: 'Please add more detail so we can help you.',
        error: true,
        submitted: true,
      };
    }

    const rateKey = `${requesterIp}:${email}`;
    if (isRateLimited(rateKey)) {
      return {
        message: 'You have sent too many requests. Please wait a few minutes and try again.',
        error: true,
        submitted: true,
      };
    }

    const parsedData = {
      email,
      first_name: firstName,
      last_name: lastName,
      phone,
      message,
      country,
      account_type: interest,
    };

    if (resend) {
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: CONTACT_INBOX,
        subject: 'New Contact Submission',
        react: FormSubmissionEmailTemplate({
          first_name: parsedData.first_name,
          last_name: parsedData.last_name,
          email: parsedData.email,
          phone: parsedData.phone,
          account_type: parsedData.account_type,
          country: parsedData.country,
          message: parsedData.message,
        }),
      });

      if (ADMIN_EMAIL && ADMIN_EMAIL !== CONTACT_INBOX) {
        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: ADMIN_EMAIL,
          subject: 'Kewve: New Contact Submission (admin)',
          react: FormSubmissionEmailTemplate({
            first_name: parsedData.first_name,
            last_name: parsedData.last_name,
            email: parsedData.email,
            phone: parsedData.phone,
            account_type: parsedData.account_type,
            country: parsedData.country,
            message: parsedData.message,
          }),
        });
      }
    } else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await sendEmail({
        to: CONTACT_INBOX,
        subject: 'New Contact Submission',
        html: contactSubmissionHtml(parsedData),
      });

      if (ADMIN_EMAIL && ADMIN_EMAIL !== CONTACT_INBOX) {
        await sendEmail({
          to: ADMIN_EMAIL,
          subject: 'Kewve: New Contact Submission (admin)',
          html: contactSubmissionHtml(parsedData),
        });
      }
    } else {
      return {
        message: 'Contact form is not configured. Please try again later.',
        error: true,
        submitted: true,
      };
    }

    return {
      message:
        'Thank you for getting in touch with us! We will review your request and get back to you as soon as possible.',
      error: false,
      submitted: true,
    };
  } catch (err) {
    return {
      message: 'Sorry, we could not process you request at the moment. Please try again.',
      error: true,
      submitted: true,
    };
  }
};
