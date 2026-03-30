'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { josefinSemiBold, josefinRegular } from '@/utils';
import { authAPI } from '@/lib/api';
import { hasBuyerAccess } from '@/lib/roleRouting';
import { Menu, Bell, ChevronDown, LogOut, ArrowRightLeft, Loader2 } from 'lucide-react';
import PlatformSearch from '@/components/PlatformSearch';

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [buyerModalOpen, setBuyerModalOpen] = useState(false);
  const [buyerLoading, setBuyerLoading] = useState(false);
  const [buyerError, setBuyerError] = useState<string | null>(null);

  const buyerReady = hasBuyerAccess(user);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
  };

  const enableBuyerAndGo = async () => {
    setBuyerError(null);
    setBuyerLoading(true);
    try {
      const res = await authAPI.enableBuyerRole();
      if (!res.success) {
        setBuyerError((res as { message?: string }).message || 'Could not enable buyer access.');
        return;
      }
      await refreshUser();
      setBuyerModalOpen(false);
      router.push('/buyer');
    } catch (e: unknown) {
      setBuyerError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBuyerLoading(false);
    }
  };

  return (
    <>
      <header className='h-16 bg-white border-b border-gray-200 flex items-center justify-between gap-2 px-4 lg:px-6 min-w-0'>
        <div className='flex items-center gap-3 shrink-0 min-w-0'>
          <button
            onClick={onMenuClick}
            className='lg:hidden text-gray-600 hover:text-gray-900 p-1'>
            <Menu className='w-6 h-6' />
          </button>
          <span className={`bg-orange text-white text-xs px-3 py-1 rounded-full ${josefinSemiBold.className}`}>
            Producer
          </span>
          {buyerReady ? (
            <Link
              href='/buyer'
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors ${josefinSemiBold.className}`}>
              <ArrowRightLeft className='w-3.5 h-3.5' />
              <span className='hidden sm:inline'>Buyer dashboard</span>
              <span className='sm:hidden'>Buyer</span>
            </Link>
          ) : (
            <button
              type='button'
              onClick={() => {
                setBuyerModalOpen(true);
                setBuyerError(null);
              }}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors ${josefinSemiBold.className}`}>
              <ArrowRightLeft className='w-3.5 h-3.5' />
              <span className='hidden sm:inline'>Buyer dashboard</span>
              <span className='sm:hidden'>Buyer</span>
            </button>
          )}
        </div>

        <PlatformSearch variant='producer' className='min-w-0 flex-1 max-w-md min-w-[120px] mx-0.5 sm:mx-2' />

        <div className='flex items-center gap-4 shrink-0'>
          <button className='relative text-gray-500 hover:text-gray-700 p-1'>
            <Bell className='w-5 h-5' />
          </button>

          <div className='relative'>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className='flex items-center gap-2 hover:opacity-80 transition-opacity'>
              <div className='w-8 h-8 rounded-full bg-orange text-white flex items-center justify-center text-xs font-bold'>
                {initials}
              </div>
              <span className={`text-sm text-gray-700 hidden sm:block ${josefinSemiBold.className}`}>
                {user?.name || 'User'}
              </span>
              <ChevronDown className='w-4 h-4 text-gray-400 hidden sm:block' />
            </button>

            {dropdownOpen && (
              <>
                <div className='fixed inset-0 z-10' onClick={() => setDropdownOpen(false)} />
                <div className='absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1'>
                  <div className='px-4 py-2 border-b border-gray-100'>
                    <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>{user?.name}</p>
                    <p className={`text-xs text-gray-500 truncate ${josefinRegular.className}`}>{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
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

      {buyerModalOpen && !buyerReady && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40'>
          <div className='absolute inset-0' onClick={() => !buyerLoading && setBuyerModalOpen(false)} aria-hidden />
          <div
            role='dialog'
            aria-modal
            aria-labelledby='buyer-enable-title'
            className='relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200'>
            <h2 id='buyer-enable-title' className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>
              Buyer dashboard
            </h2>
            <p className={`mt-2 text-sm text-gray-600 ${josefinRegular.className}`}>
              Add buyer access to this account to browse verified products, clusters, and submit sourcing requests. No
              extra payment — we’ll use your existing email.
            </p>
            {buyerError && (
              <p className={`mt-2 text-sm text-red-600 ${josefinRegular.className}`}>{buyerError}</p>
            )}
            <div className='mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end'>
              <button
                type='button'
                disabled={buyerLoading}
                onClick={() => setBuyerModalOpen(false)}
                className={`px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 ${josefinRegular.className}`}>
                Cancel
              </button>
              <button
                type='button'
                disabled={buyerLoading}
                onClick={enableBuyerAndGo}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm bg-orange text-white hover:opacity-90 disabled:opacity-60 ${josefinSemiBold.className}`}>
                {buyerLoading ? (
                  <>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    Enabling…
                  </>
                ) : (
                  'Enable buyer access'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
