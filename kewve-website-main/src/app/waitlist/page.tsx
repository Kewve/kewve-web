'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { josefinRegular, josefinSemiBold } from '@/utils';

const REDIRECT_DELAY_MS = 1500;

export default function WaitlistPage() {
  const router = useRouter();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      router.replace('/export-readiness');
    }, REDIRECT_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [router]);

  return (
    <main className='min-h-screen bg-cream flex items-center justify-center px-6'>
      <div className='w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center'>
        <div className='flex justify-center mb-5'>
          <Loader2 className='w-8 h-8 animate-spin text-orange' />
        </div>

        <h1 className={`text-3xl text-gray-900 mb-3 ${josefinSemiBold.className}`}>Redirecting to Export Readiness</h1>

        <p className={`text-base text-gray-700 mb-4 ${josefinRegular.className}`}>
          We moved the waitlist experience to a new page so everything is in one place.
        </p>

        <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
          You will be redirected shortly. If it does not happen automatically, continue to{' '}
          <Link href='/export-readiness' className='text-orange underline hover:opacity-80'>
            Export Readiness
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
