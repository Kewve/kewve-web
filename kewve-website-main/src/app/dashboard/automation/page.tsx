'use client';

import { josefinSemiBold, josefinRegular } from '@/utils';
import { Clock, Zap, Lightbulb } from 'lucide-react';

export default function AutomationPage() {
  return (
    <div className='max-w-3xl mx-auto space-y-6'>
      {/* Header */}
      <h1 className={`text-2xl lg:text-3xl text-gray-900 ${josefinSemiBold.className}`}>
        Automation
      </h1>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* Task Queue */}
        <div className='bg-white rounded-xl border border-gray-200 p-5'>
          <div className='flex items-center gap-2 mb-3'>
            <Clock className='w-5 h-5 text-gray-500' />
            <h2 className={`text-base text-gray-900 ${josefinSemiBold.className}`}>Task Queue</h2>
          </div>
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
            No automated tasks pending. Tasks will appear here when you have active trades.
          </p>
        </div>

        {/* Alerts */}
        <div className='bg-white rounded-xl border border-gray-200 p-5'>
          <div className='flex items-center gap-2 mb-3'>
            <Zap className='w-5 h-5 text-gray-500' />
            <h2 className={`text-base text-gray-900 ${josefinSemiBold.className}`}>Alerts</h2>
          </div>
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
            No deadline reminders at this time.
          </p>
        </div>
      </div>

      {/* AI Suggestions */}
      <div className='bg-white rounded-xl border border-gray-200 p-5'>
        <div className='flex items-center gap-2 mb-3'>
          <Lightbulb className='w-5 h-5 text-gray-500' />
          <h2 className={`text-base text-gray-900 ${josefinSemiBold.className}`}>AI Suggestions</h2>
        </div>
        <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
          Next best action recommendations will appear here based on your trade activity and readiness status.
        </p>
      </div>
    </div>
  );
}
