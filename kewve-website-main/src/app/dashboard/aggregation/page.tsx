'use client';

import { josefinSemiBold, josefinRegular } from '@/utils';
import { Layers } from 'lucide-react';
import Link from 'next/link';

export default function AggregationPage() {
  return (
    <div className='max-w-3xl mx-auto space-y-6'>
      {/* Header */}
      <h1 className={`text-2xl lg:text-3xl text-gray-900 ${josefinSemiBold.className}`}>
        Aggregation
      </h1>

      {/* No Eligible Products */}
      <div className='bg-white rounded-xl border border-gray-200 p-8 text-center'>
        <Layers className='w-10 h-10 text-gray-300 mx-auto mb-4' />
        <h2 className={`text-base text-gray-900 mb-2 ${josefinSemiBold.className}`}>
          No Eligible Products
        </h2>
        <p className={`text-sm text-gray-500 max-w-md mx-auto mb-5 ${josefinRegular.className}`}>
          Products that meet cluster specifications will appear here. Complete your product listings and verification to become eligible.
        </p>
        <Link
          href='/dashboard/products'
          className={`inline-flex items-center px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors ${josefinRegular.className}`}>
          View Products
        </Link>
      </div>

      {/* Available Clusters */}
      <div className='bg-white rounded-xl border border-gray-200 p-6'>
        <h2 className={`text-base text-gray-900 mb-2 ${josefinSemiBold.className}`}>
          Available Clusters
        </h2>
        <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
          No clusters available at this time. Clusters are created by Kewve Ops to aggregate supply from multiple producers.
        </p>
      </div>
    </div>
  );
}
