import { Suspense } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { josefinRegular, titleFont } from '@/utils';
import BuyerVerifyEmailContent from './verify-email-content';

function VerifyEmailFallback() {
  return (
    <div className='min-h-screen flex flex-col'>
      <Header />
      <div className='flex-1 bg-gradient-to-br from-orange via-yellow to-orange pt-24 lg:pt-32 pb-16 px-4'>
        <div className='max-w-lg mx-auto bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center'>
          <h1 className={`text-3xl text-gray-900 mb-3 ${titleFont.className}`}>Buyer Email Verification</h1>
          <p className={`text-sm text-gray-600 ${josefinRegular.className}`}>Please wait...</p>
        </div>
      </div>
      <section className='bg-orange relative pb-10'>
        <Footer />
      </section>
    </div>
  );
}

export default function BuyerVerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <BuyerVerifyEmailContent />
    </Suspense>
  );
}
