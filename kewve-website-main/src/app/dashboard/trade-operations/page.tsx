'use client';

import { josefinSemiBold, josefinRegular } from '@/utils';
import { ArrowLeftRight } from 'lucide-react';

export default function TradeOperationsPage() {
  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      {/* Header */}
      <h1 className={`text-2xl lg:text-3xl text-gray-900 ${josefinSemiBold.className}`}>
        Trade Operations
      </h1>

      {/* Active Trade Requests */}
      <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
        <div className='px-5 pt-5 pb-3'>
          <h2 className={`text-base text-gray-900 ${josefinSemiBold.className}`}>
            Active Trade Requests
          </h2>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-gray-200'>
                <th className={`text-left px-5 py-3 text-sm text-gray-500 font-normal ${josefinRegular.className}`}>Request ID</th>
                <th className={`text-left px-5 py-3 text-sm text-gray-500 font-normal ${josefinRegular.className}`}>Product</th>
                <th className={`text-left px-5 py-3 text-sm text-gray-500 font-normal ${josefinRegular.className}`}>Volume</th>
                <th className={`text-left px-5 py-3 text-sm text-gray-500 font-normal ${josefinRegular.className}`}>Market</th>
                <th className={`text-left px-5 py-3 text-sm text-gray-500 font-normal ${josefinRegular.className}`}>Status</th>
                <th className={`text-left px-5 py-3 text-sm text-gray-500 font-normal ${josefinRegular.className}`}>Actions</th>
              </tr>
            </thead>
          </table>
        </div>

        <div className='py-10 text-center'>
          <ArrowLeftRight className='w-8 h-8 text-gray-300 mx-auto mb-3' />
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
            No active trade requests. Trade requests will appear when buyers express interest in your products.
          </p>
        </div>
      </div>
    </div>
  );
}
