'use client';

import { AlertTriangle, Zap } from 'lucide-react';
import { josefinRegular, josefinSemiBold } from '@/utils';

export default function BuyerAutomationPage() {
  return (
    <div className='max-w-5xl mx-auto space-y-5'>
      <h1 className={`text-4xl text-gray-900 ${josefinSemiBold.className}`}>Automation</h1>

      <div className='bg-white rounded-xl border border-gray-500/50 p-5'>
        <div className='flex items-center gap-2 mb-3'>
          <Zap className='w-4 h-4 text-gray-700' />
          <h2 className={`text-2xl text-gray-900 ${josefinSemiBold.className}`}>Status Timeline</h2>
        </div>
        <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Trade status timeline will appear here once you have active orders.</p>
      </div>

      <div className='bg-white rounded-xl border border-gray-500/50 p-5'>
        <div className='flex items-center gap-2 mb-3'>
          <AlertTriangle className='w-4 h-4 text-gray-700' />
          <h2 className={`text-2xl text-gray-900 ${josefinSemiBold.className}`}>Risk Flags</h2>
        </div>
        <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Risk flags and alternative suggestions will appear here.</p>
      </div>
    </div>
  );
}

