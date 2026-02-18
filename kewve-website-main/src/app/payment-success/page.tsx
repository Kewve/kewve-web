'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { josefinSemiBold, josefinRegular, titleFont } from '@/utils';
import { setAuthToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { completeRegistration } from '@/actions/completeRegistration';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      setStatus('error');
      setErrorMessage('No payment session found.');
      return;
    }

    const handleSuccess = async () => {
      const result = await completeRegistration(sessionId);

      if (result.error) {
        setStatus('error');
        setErrorMessage(result.error);
        return;
      }

      if (result.success && result.token) {
        setAuthToken(result.token);
        await refreshUser();
        setStatus('success');

        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    };

    handleSuccess();
  }, [searchParams, router, refreshUser]);

  return (
    <div className='min-h-screen bg-gradient-to-br from-orange via-yellow to-orange flex items-center justify-center px-4'>
      <div className='w-full max-w-md'>
        <div className='bg-white rounded-lg shadow-lg p-8 text-center'>
          {status === 'loading' && (
            <>
              <Loader2 className='w-12 h-12 text-orange mx-auto mb-4 animate-spin' />
              <h1 className={`text-2xl font-bold text-gray-900 mb-2 ${titleFont.className}`}>
                Setting Up Your Account
              </h1>
              <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
                Payment verified. Creating your account...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className='w-12 h-12 text-green-500 mx-auto mb-4' />
              <h1 className={`text-2xl font-bold text-gray-900 mb-2 ${titleFont.className}`}>
                Welcome to Kewve!
              </h1>
              <p className={`text-sm text-gray-500 mb-4 ${josefinRegular.className}`}>
                Your account has been created and payment confirmed. Redirecting to your dashboard...
              </p>
              <Link
                href='/dashboard'
                className={`inline-flex items-center gap-2 text-sm text-orange hover:underline ${josefinSemiBold.className}`}>
                Go to Dashboard now
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className='w-12 h-12 text-red-500 mx-auto mb-4' />
              <h1 className={`text-2xl font-bold text-gray-900 mb-2 ${titleFont.className}`}>
                Something Went Wrong
              </h1>
              <p className={`text-sm text-gray-500 mb-6 ${josefinRegular.className}`}>
                {errorMessage}
              </p>
              <div className='flex flex-col gap-3'>
                <Link
                  href='/register'
                  className={`inline-block bg-black text-white rounded-full py-3 px-6 text-sm font-semibold transition-all hover:bg-muted-orange ${josefinSemiBold.className}`}>
                  Try Again
                </Link>
                <Link
                  href='/login'
                  className={`text-sm text-gray-500 hover:text-gray-700 ${josefinRegular.className}`}>
                  Already have an account? Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
