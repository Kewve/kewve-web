'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { josefinRegular, josefinSemiBold, titleFont } from '@/utils';
import {
  createCheckoutFromConfirmationToken,
  getCheckoutPricingPreviewFromConfirmationToken,
  validateRegistrationConfirmationToken,
} from '@/actions/registrationFlow';

type Status = 'validating' | 'ready' | 'processing_payment' | 'error';
interface PricingPreviewData {
  standardAmountCents: number;
  baseAmountBeforeDiscount: number;
  finalAmount: number;
  promoDiscountAmount: number;
}

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('validating');
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [pricingPreview, setPricingPreview] = useState<PricingPreviewData | null>(null);

  const formatEuro = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  useEffect(() => {
    const queryToken = searchParams.get('token') || '';
    setToken(queryToken);

    if (!queryToken) {
      setStatus('error');
      setMessage('Missing confirmation token. Please register again.');
      return;
    }

    const validate = async () => {
      const [validationResult, previewResult] = await Promise.all([
        validateRegistrationConfirmationToken(queryToken),
        getCheckoutPricingPreviewFromConfirmationToken(queryToken),
      ]);
      if (!validationResult.success) {
        setStatus('error');
        setMessage(validationResult.error || 'Invalid confirmation link.');
        return;
      }

      setEmail(validationResult.data?.email || '');
      if (previewResult.success && 'data' in previewResult && previewResult.data) {
        setPricingPreview(previewResult.data as PricingPreviewData);
      }
      setStatus('ready');
    };

    validate();
  }, [searchParams]);

  const handleProceedToPayment = async () => {
    if (!token) return;

    setStatus('processing_payment');
    const result = await createCheckoutFromConfirmationToken(token);

    if (('error' in result && result.error) || !('url' in result) || !result.url) {
      setStatus('error');
      setMessage(('error' in result && result.error) || 'Unable to start payment. Please try again.');
      return;
    }

    window.location.href = result.url;
  };

  return (
    <div className='overflow-x-hidden min-h-screen flex flex-col'>
      <Header />
      <div className='flex-grow bg-gradient-to-br from-orange via-yellow to-orange flex items-center justify-center pt-24 lg:pt-32 pb-16 px-4'>
        <div className='w-full max-w-md'>
          <div className='bg-white rounded-lg shadow-lg p-8 text-center'>
            {status === 'validating' && (
              <>
                <Loader2 className='w-12 h-12 text-orange mx-auto mb-4 animate-spin' />
                <h1 className={`text-2xl font-bold text-black mb-2 ${titleFont.className}`}>Confirming your email</h1>
                <p className={`text-sm text-black/70 ${josefinRegular.className}`}>
                  Please wait while we validate your confirmation link.
                </p>
              </>
            )}

            {status === 'ready' && (
              <>
                <CheckCircle2 className='w-12 h-12 text-green-600 mx-auto mb-4' />
                <h1 className={`text-2xl font-bold text-black mb-2 ${titleFont.className}`}>Email confirmed</h1>
                <p className={`text-sm text-black/70 mb-5 ${josefinRegular.className}`}>
                  {email ? `Verified: ${email}` : 'Your email has been verified.'} You can proceed to payment.
                </p>

                <div className='rounded-md border-2 border-red-300 bg-red-50 px-4 py-3 mb-5'>
                  <p className={`text-sm font-bold text-red-800 ${josefinSemiBold.className}`}>
                    If products contain animal or seafood ingredients, they are not eligible for Kewve.
                  </p>
                </div>

                {pricingPreview && (
                  <div className='rounded-md border border-gray-200 bg-gray-50 px-4 py-3 mb-5 text-left'>
                    <p className={`text-sm text-black mb-2 ${josefinSemiBold.className}`}>Price preview</p>
                    <div className={`space-y-1 text-xs text-black/80 ${josefinRegular.className}`}>
                      <p>Base fee: {formatEuro(pricingPreview.standardAmountCents)}</p>
                      <p>
                        Discount code discount:{' '}
                        {pricingPreview.promoDiscountAmount > 0 ? `-${formatEuro(pricingPreview.promoDiscountAmount)}` : '€0.00'}
                      </p>
                      <p className={`text-sm text-black ${josefinSemiBold.className}`}>
                        Total payable: {formatEuro(pricingPreview.finalAmount)}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleProceedToPayment}
                  className={`w-full bg-black text-white border-2 border-black rounded-full py-3 px-6 text-base font-semibold transition-all hover:bg-muted-orange hover:border-muted-orange ${josefinSemiBold.className}`}>
                  Proceed to Payment
                </button>
              </>
            )}

            {status === 'processing_payment' && (
              <>
                <Loader2 className='w-12 h-12 text-orange mx-auto mb-4 animate-spin' />
                <h1 className={`text-2xl font-bold text-black mb-2 ${titleFont.className}`}>Starting payment</h1>
                <p className={`text-sm text-black/70 ${josefinRegular.className}`}>Redirecting you to secure checkout...</p>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className='w-12 h-12 text-red-600 mx-auto mb-4' />
                <h1 className={`text-2xl font-bold text-black mb-2 ${titleFont.className}`}>Unable to continue</h1>
                <p className={`text-sm text-black/70 mb-5 ${josefinRegular.className}`}>{message}</p>
                <Link
                  href='/register'
                  className={`inline-block bg-black text-white border-2 border-black rounded-full py-3 px-6 text-sm font-semibold transition-all hover:bg-muted-orange hover:border-muted-orange ${josefinSemiBold.className}`}>
                  Back to registration
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      <section className='bg-orange relative pb-10'>
        <Footer />
      </section>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense
      fallback={
        <div className='overflow-x-hidden min-h-screen flex flex-col'>
          <Header />
          <div className='flex-grow bg-gradient-to-br from-orange via-yellow to-orange flex items-center justify-center pt-24 lg:pt-32 pb-16 px-4'>
            <div className='w-full max-w-md'>
              <div className='bg-white rounded-lg shadow-lg p-8 text-center'>
                <Loader2 className='w-12 h-12 text-orange mx-auto mb-4 animate-spin' />
                <p className={`text-sm text-black/70 ${josefinRegular.className}`}>Loading...</p>
              </div>
            </div>
          </div>
          <section className='bg-orange relative pb-10'>
            <Footer />
          </section>
        </div>
      }>
      <ConfirmEmailContent />
    </Suspense>
  );
}

