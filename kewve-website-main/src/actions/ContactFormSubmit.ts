'use server';

import { Resend } from 'resend';
import { FormSubmissionEmailTemplate } from '@/templates/FormSubmissionEmail';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_Pex2Lpdm_768HkN8gFdEtTXsHaKyuf5Wx';
const resend = new Resend(RESEND_API_KEY);

export const formSubmissionAction = async (
  prevState: { message: string; error: boolean; submitted: boolean },
  data: FormData
) => {
  try {
    const parsedData = {
      email: data.get('email')?.toString() || '',
      first_name: data.get('firstName')?.toString() || '',
      last_name: data.get('lastName')?.toString() || '',
      message: data.get('message')?.toString() || '',
      country: data.get('country')?.toString() || '',
      account_type: data.get('account_type')?.toString() || '',
    };

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'kewveplatform@gmail.com',
      subject: 'New Contact Submission',
      react: FormSubmissionEmailTemplate({
        first_name: parsedData.first_name,
        last_name: parsedData.last_name,
        email: parsedData.email,
        account_type: parsedData.account_type,
        country: parsedData.country,
        message: parsedData.message,
      }),
    });

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
