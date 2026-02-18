'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { josefinSemiBold, josefinRegular } from '@/utils';
import { useDashboardProgress } from '@/contexts/DashboardProgressContext';
import {
  Home,
  ClipboardCheck,
  ShieldCheck,
  Briefcase,
  Package,
  Layers,
  ArrowLeftRight,
  Zap,
  BarChart3,
  FileText,
  Settings,
  X,
  Lock,
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

type UnlockKey =
  | 'home'
  | 'exportReadiness'
  | 'verification'
  | 'documents'
  | 'tradeProfile'
  | 'products'
  | 'settings';

const menuItems: {
  label: string;
  href: string;
  icon: any;
  unlockKey: UnlockKey;
}[] = [
  { label: 'Home', href: '/dashboard', icon: Home, unlockKey: 'home' },
  { label: 'Export Readiness', href: '/dashboard/export-readiness', icon: ClipboardCheck, unlockKey: 'exportReadiness' },
  { label: 'Verification', href: '/dashboard/verification', icon: ShieldCheck, unlockKey: 'verification' },
  { label: 'Documents', href: '/dashboard/documents', icon: FileText, unlockKey: 'documents' },
  { label: 'Trade Profile', href: '/dashboard/trade-profile', icon: Briefcase, unlockKey: 'tradeProfile' },
  { label: 'Products', href: '/dashboard/products', icon: Package, unlockKey: 'products' },
  { label: 'Aggregation', href: '/dashboard/aggregation', icon: Layers, unlockKey: 'products' },
  { label: 'Trade Operations', href: '/dashboard/trade-operations', icon: ArrowLeftRight, unlockKey: 'products' },
  { label: 'Automation', href: '/dashboard/automation', icon: Zap, unlockKey: 'products' },
  { label: 'Insights', href: '/dashboard/insights', icon: BarChart3, unlockKey: 'products' },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, unlockKey: 'settings' },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { unlocked } = useDashboardProgress();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className='fixed inset-0 bg-black/50 z-40 lg:hidden'
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-orange z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}>
        {/* Logo */}
        <div className='flex items-center justify-between px-6 py-5 border-b border-white/20'>
          <h1 className={`text-xl text-white ${josefinSemiBold.className}`}>
            Kewve 2.0
          </h1>
          <button onClick={onClose} className='lg:hidden text-white/70 hover:text-white'>
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Menu */}
        <nav className='flex-1 overflow-y-auto py-4 px-3'>
          <p className={`text-xs uppercase text-white/50 tracking-wider px-3 mb-3 ${josefinSemiBold.className}`}>
            Producer Menu
          </p>
          <ul className='space-y-1'>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const isUnlocked = unlocked[item.unlockKey];

              if (!isUnlocked) {
                return (
                  <li key={item.href}>
                    <div
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-not-allowed ${josefinRegular.className} text-white/30`}>
                      <Icon className='w-[18px] h-[18px] shrink-0' />
                      <span className='flex-1'>{item.label}</span>
                      <Lock className='w-3.5 h-3.5 shrink-0' />
                    </div>
                  </li>
                );
              }

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
            African Food Trade
          </p>
        </div>
      </aside>
    </>
  );
}
