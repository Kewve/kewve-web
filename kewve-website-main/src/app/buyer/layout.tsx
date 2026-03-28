'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { josefinRegular } from '@/utils';
import BuyerSidebar from '@/components/buyer/BuyerSidebar';
import BuyerTopBar from '@/components/buyer/BuyerTopBar';
import { hasBuyerAccess, hasProducerAccess } from '@/lib/roleRouting';

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login?redirect=/buyer');
      return;
    }
    if (!loading && isAuthenticated && !hasBuyerAccess(user)) {
      router.push(hasProducerAccess(user) ? '/dashboard' : '/login?redirect=/buyer');
    }
  }, [loading, isAuthenticated, user, router]);

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[#f7f7f7]'>
        <div className='flex flex-col items-center gap-3'>
          <Loader2 className='w-8 h-8 text-orange animate-spin' />
          <p className={`text-sm text-gray-600 ${josefinRegular.className}`}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!hasBuyerAccess(user)) return null;

  return (
    <div className='min-h-screen bg-[#f7f7f7]'>
      <BuyerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className='lg:ml-64 flex flex-col min-h-screen'>
        <BuyerTopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className='flex-1 p-4 lg:p-6'>{children}</main>
      </div>
    </div>
  );
}

