'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { josefinSemiBold, josefinRegular } from '@/utils';
import {
  Home,
  Users,
  Layers,
  ArrowLeftRight,
  Zap,
  Users2,
  BarChart3,
  FileText,
  Settings,
  X,
} from 'lucide-react';

interface OpsSidebarProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  { label: 'Ops Home', href: '/ops', icon: Home },
  { label: 'Producers', href: '/ops/producers', icon: Users },
  { label: 'Products & Clusters', href: '/ops/products-clusters', icon: Layers },
  { label: 'Trade Operations', href: '/ops/trade-operations', icon: ArrowLeftRight },
  { label: 'Automation', href: '/ops/automation', icon: Zap },
  { label: 'Network Partners', href: '/ops/network-partners', icon: Users2 },
  { label: 'Insights', href: '/ops/insights', icon: BarChart3 },
  { label: 'Reports', href: '/ops/reports', icon: FileText },
  { label: 'Settings', href: '/ops/settings', icon: Settings },
];

export default function OpsSidebar({ open, onClose }: OpsSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/ops') return pathname === '/ops';
    return pathname.startsWith(href);
  };

  return (
    <>
      {open && (
        <div className='fixed inset-0 bg-black/50 z-40 lg:hidden' onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-orange z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}>
        {/* Logo */}
        <div className='flex items-center justify-between px-6 py-5 border-b border-white/20'>
          <h1 className={`text-xl text-white ${josefinSemiBold.className}`}>Kewve 2.0</h1>
          <button onClick={onClose} className='lg:hidden text-white/70 hover:text-white'>
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Menu */}
        <nav className='flex-1 overflow-y-auto py-4 px-3'>
          <p className={`text-xs uppercase text-white/50 tracking-wider px-3 mb-3 ${josefinSemiBold.className}`}>
            Kewve Ops Menu
          </p>
          <ul className='space-y-1'>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${josefinRegular.className} ${
                      active
                        ? 'bg-white/20 text-white font-semibold'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}>
                    <Icon className='w-[18px] h-[18px] shrink-0' />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className='px-6 py-4 border-t border-white/20'>
          <p className={`text-xs text-white/50 ${josefinRegular.className}`}>
            Kewve Operations
          </p>
        </div>
      </aside>
    </>
  );
}
