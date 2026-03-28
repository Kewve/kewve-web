'use server';

import { Resend } from 'resend';
import { FormSubmissionEmailTemplate } from '@/templates/FormSubmissionEmail';
import { sendEmail } from '@/utils/emailConfig';
import { formatInterestRole, normalizeInterestRole } from '@/utils/contactFormLabels';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const CONTACT_INBOX = process.env.CONTACT_EMAIL || 'abiola@kewve.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';

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
    const interestRaw = data.get('account_type')?.toString() || '';
    const interest = normalizeInterestRole(interestRaw);
    if (!interest) {
      return {
        message: 'Please choose whether you are interested as a buyer or a producer.',
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

    const parsedData = {
      email: data.get('email')?.toString() || '',
      first_name: data.get('firstName')?.toString() || '',
      last_name: data.get('lastName')?.toString() || '',
      phone: data.get('phone')?.toString().trim() || '',
      message: data.get('message')?.toString() || '',
      country: data.get('country')?.toString() || '',
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
