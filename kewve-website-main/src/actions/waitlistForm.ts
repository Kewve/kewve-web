'use server';

import { sendEmail } from '@/utils/emailConfig';
import { getWaitlistConfirmationEmailHTML, getWaitlistAdminNotificationHTML } from '@/utils/emailTemplate';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kewveplatform@gmail.com';

export const submitWaitlistForm = async (
  prevState: { message: string; error: boolean; submitted: boolean },
  data: FormData
) => {
  try {
    const formData = {
      businessName: data.get('businessName')?.toString() || '',
      contactName: data.get('contactName')?.toString() || '',
      email: data.get('email')?.toString() || '',
      country: data.get('country')?.toString() || '',
      productCategory: data.get('productCategory')?.toString() || '',
      exportInterest: data.get('exportInterest')?.toString() || '',
    };

    const response = await fetch(`${BACKEND_URL}/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        message: result.message || 'Sorry, we could not process your request at the moment. Please try again.',
        error: true,
        submitted: true,
      };
    }

    // Send confirmation email to the user via SMTP
    try {
      // Extract first name from contactName 
      const firstName = formData.contactName.split(' ')[0] || formData.contactName;

      await sendEmail({
        to: formData.email,
        subject: "You're on the Kewve Export Readiness Waiting List",
        html: getWaitlistConfirmationEmailHTML({
          firstName: firstName,
          useCID: true, // Use embedded image via CID
        }),
        from: process.env.SMTP_FROM || 'abiola@kewve.com',
        attachFooterImage: true, // Attach footer image for inline display
      });
    } catch (emailError) {
      // Log email error but don't fail the submission
      console.error('Failed to send confirmation email:', emailError);
    }

    // Send notification email to admin
    try {
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: 'New Export Readiness Assessment Waitlist Submission',
        html: getWaitlistAdminNotificationHTML({
          businessName: formData.businessName,
          contactName: formData.contactName,
          email: formData.email,
          country: formData.country,
          productCategory: formData.productCategory,
          exportInterest: formData.exportInterest,
        }),
        from: process.env.SMTP_FROM || 'abiola@kewve.com',
      });
    } catch (adminEmailError) {
      // Log admin email error but don't fail the submission
      console.error('Failed to send admin notification email:', adminEmailError);
    }

    return {
      message: result.message || 'Thank you for joining our waitlist! We will be in touch soon.',
      error: false,
      submitted: true,
    };
  } catch (err) {
    return {
      message: 'Sorry, we could not process your request at the moment. Please try again.',
      error: true,
      submitted: true,
    };
  }
};


