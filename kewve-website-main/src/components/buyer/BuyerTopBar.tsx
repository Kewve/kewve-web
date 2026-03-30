'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, Bell, ChevronDown, LogOut, ArrowRightLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { josefinRegular, josefinSemiBold } from '@/utils';
import { getClientAuthToken } from '@/lib/api';
import PlatformSearch from '@/components/PlatformSearch';
import { hasProducerAccess } from '@/lib/roleRouting';

interface BuyerTopBarProps {
  onMenuClick: () => void;
}

export default function BuyerTopBar({ onMenuClick }: BuyerTopBarProps) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const producerReady = hasProducerAccess(user);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AO';

  const startProducerCheckout = async () => {
    setCheckoutError(null);
    const token = getClientAuthToken();
    if (!token) {
      setCheckoutError('Please log in again to continue.');
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/buyer-producer-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          discountCode: discountCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.data?.url) {
        setCheckoutError(data.message || 'Could not start checkout.');
        return;
      }
      window.location.href = data.data.url as string;
    } catch {
      setCheckoutError('Something went wrong. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <>
      <header className='h-16 bg-white border-b border-gray-300 flex items-center justify-between gap-2 px-4 lg:px-6 min-w-0'>
        <div className='flex items-center gap-2 sm:gap-3 flex-wrap shrink-0 min-w-0'>
          <button onClick={onMenuClick} className='lg:hidden text-gray-600 hover:text-gray-900 p-1'>
            <Menu className='w-5 h-5' />
          </button>
          <span className={`text-xs px-3 py-1 rounded bg-gray-100 text-gray-700 ${josefinSemiBold.className}`}>
            Buyer
          </span>
          {producerReady ? (
            <Link
              href='/dashboard/export-readiness'
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-orange/40 text-orange hover:bg-orange/5 transition-colors ${josefinSemiBold.className}`}>
              <ArrowRightLeft className='w-3.5 h-3.5' />
              <span className='hidden sm:inline'>Producer dashboard</span>
              <span className='sm:hidden'>Producer</span>
            </Link>
          ) : (
            <button
              type='button'
              onClick={() => {
                setSwitchOpen(true);
                setCheckoutError(null);
              }}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-orange/40 text-orange hover:bg-orange/5 transition-colors ${josefinSemiBold.className}`}>
              <ArrowRightLeft className='w-3.5 h-3.5' />
              <span className='hidden sm:inline'>Producer dashboard</span>
              <span className='sm:hidden'>Producer</span>
            </button>
          )}
        </div>

        <PlatformSearch variant='buyer' className='min-w-0 flex-1 max-w-md min-w-[120px] mx-0.5 sm:mx-2' />

        <div className='flex items-center gap-4 shrink-0'>
          <button type='button' className='text-gray-500 hover:text-gray-700 p-1'>
            <Bell className='w-4 h-4' />
          </button>
          <div className='relative'>
            <button
              type='button'
              onClick={() => setDropdownOpen((p) => !p)}
              className='flex items-center gap-2 hover:opacity-80 transition-opacity'>
              <div className='w-7 h-7 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[10px] font-bold'>
                {initials}
              </div>
              <span className={`text-sm text-gray-700 hidden sm:block ${josefinSemiBold.className}`}>
                {user?.name || 'Abiola'}
              </span>
              <ChevronDown className='w-4 h-4 text-gray-400 hidden sm:block' />
            </button>

            {dropdownOpen && (
              <>
                <div className='fixed inset-0 z-10' onClick={() => setDropdownOpen(false)} />
                <div className='absolute right-0 top-full mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1'>
                  <div className='px-4 py-2 border-b border-gray-100'>
                    <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>{user?.name || 'Abiola'}</p>
                    <p className={`text-xs text-gray-500 truncate ${josefinRegular.className}`}>{user?.email || '-'}</p>
                  </div>
                  <button
                    type='button'
                    onClick={logout}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors ${josefinRegular.className}`}>
                    <LogOut className='w-4 h-4' />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {switchOpen && !producerReady && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40'>
          <div className='absolute inset-0' onClick={() => !checkoutLoading && setSwitchOpen(false)} aria-hidden />
          <div
            role='dialog'
            aria-modal
            aria-labelledby='producer-switch-title'
            className='relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200'>
            <h2 id='producer-switch-title' className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>
              Producer dashboard
            </h2>
            <p className={`mt-2 text-sm text-gray-600 ${josefinRegular.className}`}>
              The producer experience includes the export readiness assessment and supplier tools. Access requires 
              a one-time assessment payment.
            </p>
            <label className={`mt-4 block text-xs text-gray-500 ${josefinSemiBold.className}`}>
              Discount code (optional)
            </label>
            <input
              type='text'
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              placeholder='Enter code'
              disabled={checkoutLoading}
              className={`mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm ${josefinRegular.className}`}
            />
            {checkoutError && (
              <p className={`mt-2 text-sm text-red-600 ${josefinRegular.className}`}>{checkoutError}</p>
            )}
            <div className='mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end'>
              <button
                type='button'
                disabled={checkoutLoading}
                onClick={() => setSwitchOpen(false)}
                className={`px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 ${josefinRegular.className}`}>
                Cancel
              </button>
              <button
                type='button'
                disabled={checkoutLoading}
                onClick={startProducerCheckout}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm bg-orange text-white hover:opacity-90 disabled:opacity-60 ${josefinSemiBold.className}`}>
                {checkoutLoading ? (
                  <>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    Redirecting…
                  </>
                ) : (
                  'Continue to secure payment'
                )}
              </button>
            </div>
            <p className={`mt-4 text-xs text-gray-400 ${josefinRegular.className}`}>
              Prefer to stay on the buyer side?{' '}
              <button type='button' className='text-orange underline' onClick={() => setSwitchOpen(false)}>
                Close
              </button>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
