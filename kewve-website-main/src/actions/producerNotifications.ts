'use server';

import { sendEmail } from '@/utils/emailConfig';

interface SendProducerRejectionEmailInput {
  producerEmail: string;
  producerName: string;
  itemType: 'product' | 'document';
  itemName: string;
  reason: string;
}

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export async function sendProducerRejectionEmail(input: SendProducerRejectionEmailInput) {
  try {
    const { producerEmail, producerName, itemType, itemName, reason } = input;
    if (!producerEmail || !itemName || !reason) {
      return { success: false, error: 'Missing required fields for notification email.' };
    }

    const firstName = (producerName || 'Producer').split(' ')[0];
    const footerImageSrc = 'cid:footer-image';
    const dashboardUrl = `${BASE_URL}/dashboard`;
    const itemLabel = itemType === 'product' ? 'product' : 'document';

    await sendEmail({
      to: producerEmail,
      subject: `Action required: ${itemLabel} rejected`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #1a2e23; margin: 0 0 16px;">${itemType === 'product' ? 'Product' : 'Document'} Rejected</h2>
          <p style="color: #3d3935; font-size: 15px; line-height: 1.6;">Hi ${firstName},</p>
          <p style="color: #3d3935; font-size: 15px; line-height: 1.6;">
            One of your ${itemLabel}s has been rejected during admin review.
          </p>
          <p style="color: #3d3935; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
            <strong>${itemType === 'product' ? 'Product' : 'Document'}:</strong> ${itemName}
          </p>
          <p style="color: #3d3935; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
            <strong>Reason:</strong> ${reason}
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; background-color: #ed722d; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600;">
              Go to Dashboard
            </a>
          </div>
          <p style="color: #666; font-size: 13px; line-height: 1.6;">
            Please review the reason and update your ${itemLabel} accordingly.
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
    console.error('Producer rejection email error:', error);
    return { success: false, error: error?.message || 'Failed to send producer rejection email.' };
  }
}

