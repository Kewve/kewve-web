'use client';

import { FileText } from 'lucide-react';
import { josefinRegular, josefinSemiBold } from '@/utils';

export default function BuyerDocumentsPage() {
  return (
    <div className='max-w-6xl mx-auto space-y-5'>
      <h1 className={`text-4xl text-gray-900 ${josefinSemiBold.className}`}>Documents</h1>

      <div className='bg-white rounded-xl border border-gray-500/50 overflow-hidden'>
        <div className={`grid grid-cols-4 px-4 py-3 text-sm text-gray-500 border-b border-gray-200 ${josefinSemiBold.className}`}>
          <p>Document</p>
          <p>Type</p>
          <p>Date</p>
          <p>Actions</p>
        </div>
        <div className='h-28 flex flex-col items-center justify-center text-gray-400'>
          <FileText className='w-8 h-8 mb-2' />
          <p className={`text-sm ${josefinRegular.className}`}>No downloadable documents yet.</p>
        </div>
      </div>
    </div>
  );
}

