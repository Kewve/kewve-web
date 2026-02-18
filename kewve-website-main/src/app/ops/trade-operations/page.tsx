'use client';

import { titleFont, josefinSemiBold, josefinRegular } from '@/utils';

const STAGES = ['Request', 'Match', 'Docs', 'Ship', 'Close'] as const;

export default function TradeOperationsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className={`text-2xl lg:text-3xl text-gray-900 ${titleFont.className}`}>
        Trade Operations
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {STAGES.map((stage) => (
          <div
            key={stage}
            className="bg-white rounded-xl border border-gray-200 p-5 min-h-32"
          >
            <h2 className={`text-base font-semibold text-gray-900 ${josefinSemiBold.className}`}>
              {stage}
            </h2>
            <div className={`mt-3 text-sm text-gray-500 ${josefinRegular.className}`}>
              {/* Placeholder for future data */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
