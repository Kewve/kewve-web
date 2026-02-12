'use client';

import Link from 'next/link';
import Image from 'next/image';
import { josefinSemiBold } from '@/utils';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  needsBackground?: boolean;
}

function Header({ needsBackground = false }: HeaderProps) {
  const router = useRouter();
  const { isAuthenticated, logout, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleRouteChange = (route: string) => () => {
    setMobileMenuOpen(false);
    router.push(route);
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  const headerLinkClassName = `relative z-10 flex text-sm lg:text-base text-white uppercase ${josefinSemiBold.className}  tracking-wide`;
  const headerMobileClassName = `text-2xl font-bol text-white uppercase outline-none tracking-wide ${josefinSemiBold.className}`;

  return (
    <>
      <header>
        <div
          className={`absolute w-full h-auto top-0 z-50 hidden lg:flex lg:justify-center lg:items-center py-4 px-6 lg:gap-4 xl:gap-8 2xl:gap-14 ${needsBackground ? 'bg-orange' : ''}`}>
          <Link prefetch href='/' className={headerLinkClassName}>
            Home
          </Link>
          <Link prefetch href='/our-story' className={headerLinkClassName}>
            Our Story
          </Link>
          <Link prefetch href='/' className='relative flex items-center justify-center shrink-0 mx-4 xl:mx-8'>
            <Image src='/logo-color.png' width={200} height={32} alt='Kewve logo' className='relative z-50 h-8 w-auto' />
            <div className='absolute left-1/2 -translate-x-1/2 -top-[110px] rounded-full bg-white h-48 w-52 z-0'></div>
          </Link>
          <Link prefetch href='/blog' className={headerLinkClassName}>
            Blog
          </Link>
          {!loading && (
            <>
              {isAuthenticated ? (
                <button onClick={handleLogout} className={`${headerLinkClassName} cursor-pointer hover:text-orange transition-colors relative z-10`}>
                  Logout
                </button>
              ) : (
                <Link prefetch href='/coming-soon' className={`${headerLinkClassName} bg-[#153b2e] px-4 py-2 rounded hover:bg-[#1a4a3a] transition-colors relative z-10`}>
                  Sign In
                </Link>
              )}
            </>
          )}
        </div>
        <div className='flex relative z-50 overflow-visible lg:hidden justify-between items-center bg-orange py-4 px-4'>
          <Link prefetch href='/' className='relative flex items-center shrink-0'>
            <Image src='/logo-color.png' width={200} height={28} alt='Kewve logo' className='relative z-50 h-7 w-auto' />
            <div className='absolute left-1/2 -translate-x-1/2 -top-[100px] rounded-full bg-white h-48 w-48 z-10'></div>
          </Link>
          <Menu className='text-white cursor-pointer h-8 w-auto' onClick={() => setMobileMenuOpen(true)} />
        </div>
      </header>
      <Sheet open={mobileMenuOpen} onOpenChange={() => setMobileMenuOpen(false)}>
        <SheetContent>
          <div className='flex flex-col items-center gap-6'>
            <button onClick={handleRouteChange('/')} className={headerMobileClassName}>
              Home
            </button>
            <button onClick={handleRouteChange('/our-story')} className={headerMobileClassName}>
              Our Story
            </button>
            <button onClick={handleRouteChange('/blog')} className={headerMobileClassName}>
              Blog
            </button>
            {!loading && (
              <>
                {isAuthenticated ? (
                  <button onClick={handleLogout} className={headerMobileClassName}>
                    Logout
                  </button>
                ) : (
                  <button onClick={handleRouteChange('/coming-soon')} className={headerMobileClassName}>
                    Sign In
                  </button>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default Header;
