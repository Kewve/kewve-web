'use client';

import { titleFont, josefinSemiBold, josefinRegular } from '@/utils';
import { LayoutGrid, BarChart3, TrendingUp } from 'lucide-react';

export default function InsightsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className={`text-2xl lg:text-3xl text-gray-900 ${titleFont.className}`}>
        Insights
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 - Demand Heatmap */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <LayoutGrid className="w-5 h-5 text-gray-500 shrink-0" />
            <h2 className={`text-lg font-semibold text-gray-900 ${josefinSemiBold.className}`}>
              Demand Heatmap
            </h2>
          </div>
          <p className={`text-sm text-gray-500 mb-4 ${josefinRegular.className}`}>
            Geographic demand distribution across markets.
          </p>
          <div className="min-h-[120px]" />
        </div>

        {/* Card 2 - Bottleneck Analysis */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-gray-500 shrink-0" />
            <h2 className={`text-lg font-semibold text-gray-900 ${josefinSemiBold.className}`}>
              Bottleneck Analysis
            </h2>
          </div>
          <p className={`text-sm text-gray-500 mb-4 ${josefinRegular.className}`}>
            Identify pipeline bottlenecks and processing delays.
          </p>
          <div className="min-h-[120px]" />
        </div>

        {/* Card 3 - Conversion Funnel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-gray-500 shrink-0" />
            <h2 className={`text-lg font-semibold text-gray-900 ${josefinSemiBold.className}`}>
              Conversion Funnel
            </h2>
          </div>
          <p className={`text-sm text-gray-500 mb-4 ${josefinRegular.className}`}>
            Request to completed trade conversion rates.
          </p>
          <div className="min-h-[120px]" />
        </div>
      </div>
    </div>
  );
}
