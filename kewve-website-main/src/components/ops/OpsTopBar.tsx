'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { josefinSemiBold, josefinRegular } from '@/utils';
import { adminAPI, removeAdminToken } from '@/lib/api';
import { Menu, Bell, ChevronDown, LogOut } from 'lucide-react';

interface OpsTopBarProps {
  onMenuClick: () => void;
}

export default function OpsTopBar({ onMenuClick }: OpsTopBarProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [admin, setAdmin] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    adminAPI.getMe().then((res) => {
      if (res.success) setAdmin(res.data.user);
    }).catch(() => {});
  }, []);

  const initials = admin?.name
    ? admin.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';

  const handleLogout = () => {
    setDropdownOpen(false);
    removeAdminToken();
    router.push('/ops/login');
  };

  return (
    <header className='h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6'>
      <div className='flex items-center gap-3'>
        <button onClick={onMenuClick} className='lg:hidden text-gray-600 hover:text-gray-900 p-1'>
          <Menu className='w-6 h-6' />
        </button>
        <span className={`bg-orange text-white text-xs px-3 py-1 rounded-full ${josefinSemiBold.className}`}>
          Ops
        </span>
      </div>

      <div className='flex items-center gap-4'>
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
              {admin?.name || 'Admin'}
            </span>
            <ChevronDown className='w-4 h-4 text-gray-400 hidden sm:block' />
          </button>

          {dropdownOpen && (
            <>
              <div className='fixed inset-0 z-10' onClick={() => setDropdownOpen(false)} />
              <div className='absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1'>
                <div className='px-4 py-2 border-b border-gray-100'>
                  <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>{admin?.name || 'Admin'}</p>
                  <p className={`text-xs text-gray-500 truncate ${josefinRegular.className}`}>{admin?.email}</p>
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
  );
}
