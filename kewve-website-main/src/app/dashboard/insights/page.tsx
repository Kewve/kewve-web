'use client';

import { josefinSemiBold, josefinRegular } from '@/utils';
import { BarChart3, CircleDot, TrendingUp, Settings } from 'lucide-react';

export default function InsightsPage() {
  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      {/* Header */}
      <h1 className={`text-2xl lg:text-3xl text-gray-900 ${josefinSemiBold.className}`}>
        Insights
      </h1>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* Demand by Category */}
        <div className='bg-white rounded-xl border border-gray-200 p-5 min-h-[180px] flex flex-col'>
          <div className='flex items-center gap-2 mb-auto'>
            <BarChart3 className='w-5 h-5 text-gray-500' />
            <h2 className={`text-base text-gray-900 ${josefinSemiBold.className}`}>Demand by Category</h2>
          </div>
          <p className={`text-sm text-gray-500 mt-auto ${josefinRegular.className}`}>
            See which product categories are most in demand from UK/EU buyers.
          </p>
        </div>

        {/* Format Preferences */}
        <div className='bg-white rounded-xl border border-gray-200 p-5 min-h-[180px] flex flex-col'>
          <div className='flex items-center gap-2 mb-auto'>
            <CircleDot className='w-5 h-5 text-gray-500' />
            <h2 className={`text-base text-gray-900 ${josefinSemiBold.className}`}>Format Preferences</h2>
          </div>
          <p className={`text-sm text-gray-500 mt-auto ${josefinRegular.className}`}>
            Popular packaging formats and specifications requested by buyers.
          </p>
        </div>

        {/* Readiness Gaps Trend */}
        <div className='bg-white rounded-xl border border-gray-200 p-5 min-h-[180px] flex flex-col'>
          <div className='flex items-center gap-2 mb-auto'>
            <TrendingUp className='w-5 h-5 text-gray-500' />
            <h2 className={`text-base text-gray-900 ${josefinSemiBold.className}`}>Readiness Gaps Trend</h2>
          </div>
          <p className={`text-sm text-gray-500 mt-auto ${josefinRegular.className}`}>
            Track your readiness score improvements over time.
          </p>
        </div>

        {/* Capacity Planning */}
        <div className='bg-white rounded-xl border border-gray-200 p-5 min-h-[180px] flex flex-col'>
          <div className='flex items-center gap-2 mb-auto'>
            <Settings className='w-5 h-5 text-gray-500' />
            <h2 className={`text-base text-gray-900 ${josefinSemiBold.className}`}>Capacity Planning</h2>
          </div>
          <p className={`text-sm text-gray-500 mt-auto ${josefinRegular.className}`}>
            Suggestions for optimizing your production capacity to meet demand.
          </p>
        </div>
      </div>
    </div>
  );
}
