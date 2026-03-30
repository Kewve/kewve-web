'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardProgressProvider } from '@/contexts/DashboardProgressContext';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { Loader2 } from 'lucide-react';
import { josefinRegular } from '@/utils';
import { hasBuyerAccess, hasProducerAccess } from '@/lib/roleRouting';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login?redirect=/dashboard');
      return;
    }
    if (!loading && isAuthenticated && !hasProducerAccess(user)) {
      router.push(hasBuyerAccess(user) ? '/buyer' : '/login?redirect=/dashboard');
    }
  }, [loading, isAuthenticated, user, router]);

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-cream'>
        <div className='flex flex-col items-center gap-3'>
          <Loader2 className='w-8 h-8 text-orange animate-spin' />
          <p className={`text-sm text-black-muted ${josefinRegular.className}`}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!hasProducerAccess(user)) {
    return null;
  }

  return (
    <DashboardProgressProvider>
      <div className='min-h-screen bg-[#f5f3ef]'>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className='lg:ml-64 flex flex-col min-h-screen'>
          <TopBar onMenuClick={() => setSidebarOpen(true)} />

          <main className='flex-1 p-4 lg:p-6'>
            {children}
          </main>
        </div>
      </div>
    </DashboardProgressProvider>
  );
}
