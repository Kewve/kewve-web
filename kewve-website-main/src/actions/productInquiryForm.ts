'use server';

import { Resend } from 'resend';
import { FormProductInquiryTemplate } from '@/templates/ProductInquiryEmail';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_Pex2Lpdm_768HkN8gFdEtTXsHaKyuf5Wx';
const resend = new Resend(RESEND_API_KEY);

export const productInquiryAction = async (
  productName: string,
  prevState: { message: string; error: boolean; submitted: boolean },
  data: FormData
) => {
  console.log(productName, data);
  try {
    const parsedData = {
      email: data.get('email')?.toString() || '',
      name: data.get('name')?.toString() || '',
      phone_number: data.get('phone_number')?.toString() || '',
      country: data.get('country')?.toString() || '',
      company_name: data.get('company_name')?.toString() || '',
      quantity: data.get('quantity')?.toString() || '',
      delivery_date: data.get('delivery_date')?.toString() || '',
      target_price: data.get('target_price')?.toString() || '',
      info: data.get('info')?.toString() || '',
      request: data.get('request')?.toString() || '',
    };

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'kewveplatform@gmail.com',
      subject: 'Product Inquiry',
      react: FormProductInquiryTemplate({
        productName,
        ...parsedData,
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
