'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { adminAPI } from '@/lib/api';
import OpsSidebar from '@/components/ops/OpsSidebar';
import OpsTopBar from '@/components/ops/OpsTopBar';
import { Loader2 } from 'lucide-react';
import { josefinRegular } from '@/utils';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Don't apply layout to the login page
  const isLoginPage = pathname === '/ops/login';

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    const checkAdmin = async () => {
      try {
        const response = await adminAPI.getMe();
        if (response.success && response.data.user.role === 'admin') {
          setAdmin(response.data.user);
        } else {
          router.push('/ops/login');
        }
      } catch {
        router.push('/ops/login');
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[#f5f3ef]'>
        <div className='flex flex-col items-center gap-3'>
          <Loader2 className='w-8 h-8 text-orange animate-spin' />
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <div className='min-h-screen bg-[#f5f3ef]'>
      <OpsSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className='lg:ml-64 flex flex-col min-h-screen'>
        <OpsTopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className='flex-1 p-4 lg:p-6'>{children}</main>
      </div>
    </div>
  );
}
