'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, ArrowLeftRight, FileText, ShoppingCart } from 'lucide-react';
import { josefinRegular, josefinSemiBold } from '@/utils';

export default function BuyerHomePage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'there';

  const statCards = [
    { label: 'Active Requests', value: 0, icon: ShoppingCart },
    { label: 'Orders In Progress', value: 0, icon: ArrowLeftRight },
    { label: 'Docs Completion', value: '0%', icon: FileText },
  ];

  return (
    <div className='max-w-6xl mx-auto space-y-5'>
      <h1 className={`text-4xl text-gray-900 ${josefinSemiBold.className}`}>Welcome, {firstName}</h1>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        {statCards.map((card) => (
          <div key={card.label} className='bg-white rounded-xl border border-gray-500/50 p-4'>
            <div className='flex items-center gap-3 mb-1'>
              <card.icon className='w-4 h-4 text-gray-500' />
              <p className={`text-4xl text-gray-900 leading-none ${josefinSemiBold.className}`}>{card.value}</p>
            </div>
            <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>{card.label}</p>
          </div>
        ))}
      </div>

      <div className='bg-white rounded-xl border border-gray-500/50 p-5'>
        <div className='flex items-center gap-2 mb-3'>
          <AlertTriangle className='w-4 h-4 text-[#d6a53a]' />
          <h2 className={`text-2xl text-gray-900 ${josefinSemiBold.className}`}>Alerts & Recommendations</h2>
        </div>
        <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
          No alerts. Create a sourcing request to start finding products.
        </p>
      </div>
    </div>
  );
}

