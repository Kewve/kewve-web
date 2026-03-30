'use client';

import { BarChart3, Clock3, Boxes, ShieldCheck } from 'lucide-react';
import { josefinRegular, josefinSemiBold } from '@/utils';

const cards = [
  { title: 'Price Ranges', description: 'Market price benchmarks for product categories.', icon: BarChart3 },
  { title: 'Lead Time Benchmarks', description: 'Average lead times by origin country and product type.', icon: Clock3 },
  { title: 'Supply Availability', description: 'Current supply levels and forecast availability.', icon: Boxes },
  { title: 'Compliance Overview', description: 'Supplier compliance readiness across your sourcing requests.', icon: ShieldCheck },
];

export default function BuyerInsightsPage() {
  return (
    <div className='max-w-6xl mx-auto space-y-5'>
      <h1 className={`text-4xl text-gray-900 ${josefinSemiBold.className}`}>Insights</h1>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        {cards.map((card) => (
          <div key={card.title} className='bg-white rounded-xl border border-gray-500/50 p-4'>
            <div className='flex items-center gap-2 mb-3'>
              <card.icon className='w-4 h-4 text-gray-700' />
              <h2 className={`text-2xl text-gray-900 ${josefinSemiBold.className}`}>{card.title}</h2>
            </div>
            <div className='h-28 bg-[#f2f6fb] rounded-md flex items-center justify-center'>
              <p className={`text-sm text-gray-500 text-center px-4 ${josefinRegular.className}`}>{card.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

