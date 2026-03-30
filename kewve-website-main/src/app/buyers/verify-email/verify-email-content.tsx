'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { josefinRegular, josefinSemiBold, titleFont } from '@/utils';
import { sendBuyerWelcomeEmail } from '@/actions/buyerOnboarding';

export default function BuyerVerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('Verifying your email...');

  const apiUrl = useMemo(() => {
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) return 'http://localhost:5000/api';
      return `${origin}/api`;
    }
    return 'http://localhost:5000/api';
  }, []);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setSuccess(false);
        setMessage('Invalid verification link.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiUrl}/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();
        if (!response.ok || !data?.success) {
          setSuccess(false);
          setMessage(data?.message || 'Invalid or expired verification link.');
          setLoading(false);
          return;
        }

        const user = data?.data?.user;
        if (user?.name && user?.email) {
          await sendBuyerWelcomeEmail({ name: user.name, email: user.email });
        }

        setSuccess(true);
        setMessage('Email verified successfully. You can now log in to your buyer dashboard.');
      } catch {
        setSuccess(false);
        setMessage('Could not verify your email right now. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [apiUrl, token]);

  return (
    <div className='min-h-screen flex flex-col'>
      <Header />
      <div className='flex-1 bg-gradient-to-br from-orange via-yellow to-orange pt-24 lg:pt-32 pb-16 px-4'>
        <div className='max-w-lg mx-auto bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center'>
          <h1 className={`text-3xl text-gray-900 mb-3 ${titleFont.className}`}>Buyer Email Verification</h1>
          <p className={`text-sm text-gray-600 ${josefinRegular.className}`}>{loading ? 'Please wait...' : message}</p>

          {!loading && (
            <div className='mt-6'>
              <Link
                href='/login?redirect=/buyer'
                className={`inline-flex items-center justify-center bg-black text-white rounded-full px-6 py-3 hover:bg-muted-orange transition-colors ${josefinSemiBold.className}`}>
                {success ? 'Continue to Buyer Login' : 'Go to Login'}
              </Link>
            </div>
          )}
        </div>
      </div>
      <section className='bg-orange relative pb-10'>
        <Footer />
      </section>
    </div>
  );
}
