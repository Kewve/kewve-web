'use server';

import { Resend } from 'resend';
import { FormCompanyInterestTemplate } from '@/templates/FormCompanyInterestEmail';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_Pex2Lpdm_768HkN8gFdEtTXsHaKyuf5Wx';
const resend = new Resend(RESEND_API_KEY);

export const buyerInterestedForm = async (
  prevState: { message: string; error: boolean; submitted: boolean },
  data: FormData
) => {
  try {
    const parsedData = {
      email: data.get('email')?.toString() || '',
      first_name: data.get('first_name')?.toString() || '',
      last_name: data.get('last_name')?.toString() || '',
      account_type: data.get('account_type')?.toString() || '',
      company_name: data.get('company_name')?.toString() || '',
      phone_number: data.get('phone_number')?.toString() || '',
      website: data.get('website')?.toString() || '',
    };

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'kewveplatform@gmail.com',
      subject: `New ${parsedData.account_type} interest submitted!`,
      react: FormCompanyInterestTemplate({
        first_name: parsedData.first_name,
        last_name: parsedData.last_name,
        email: parsedData.email,
        account_type: parsedData.account_type,
        company_name: parsedData.company_name,
        phone_number: parsedData.phone_number,
        website: parsedData.website,
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
