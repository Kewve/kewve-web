'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { josefinRegular, josefinSemiBold } from '@/utils';
import {
  Home,
  ShoppingCart,
  ClipboardList,
  ArrowLeftRight,
  Zap,
  BarChart3,
  FileText,
  Settings,
  X,
} from 'lucide-react';

interface BuyerSidebarProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  { label: 'Home', href: '/buyer', icon: Home },
  { label: 'Products', href: '/buyer/products', icon: ShoppingCart },
  { label: 'Requests', href: '/buyer/requests', icon: ClipboardList },
  { label: 'Trade Operations', href: '/buyer/trade-operations', icon: ArrowLeftRight },
  { label: 'Automation', href: '/buyer/automation', icon: Zap },
  { label: 'Insights', href: '/buyer/insights', icon: BarChart3 },
  { label: 'Documents', href: '/buyer/documents', icon: FileText },
  { label: 'Settings', href: '/buyer/settings', icon: Settings },
];

export default function BuyerSidebar({ open, onClose }: BuyerSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/buyer') return pathname === '/buyer';
    return pathname.startsWith(href);
  };

  return (
    <>
      {open && <div className='fixed inset-0 bg-black/40 z-40 lg:hidden' onClick={onClose} />}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-orange z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className='flex items-center justify-between px-5 py-4 border-b border-gray-300'>
          <h1 className={`text-xl text-white ${josefinSemiBold.className}`}>Kewve </h1>
          <button onClick={onClose} className='lg:hidden text-white/70 hover:text-white'>
            <X className='w-5 h-5' />
          </button>
        </div>

        <nav className='flex-1 overflow-y-auto py-4 px-3'>
          <p className={`text-xs uppercase text-white/50 tracking-wider px-3 mb-3 ${josefinSemiBold.className}`}>
            Buyer Menu
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
                    className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                     active
                        ? 'bg-white/20 text-white font-semibold'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}>
                    <Icon className='w-4 h-4' />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className='px-5 py-3 border-t border-gray-300'>
         <p className={`text-xs text-white/50 ${josefinRegular.className}`}>African Food Trade</p>
        </div>
      </aside>
    </>
  );
}

