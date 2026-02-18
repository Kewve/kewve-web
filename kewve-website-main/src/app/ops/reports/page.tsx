'use client';

import { titleFont, josefinSemiBold, josefinRegular } from '@/utils';
import { FileText, Download } from 'lucide-react';

const REPORTS = [
  'Producer Overview',
  'Trade Pipeline Summary',
  'Cluster Performance',
  'Compliance Status',
];

export default function ReportsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className={`text-2xl lg:text-3xl text-gray-900 ${titleFont.className}`}>
        Reports
      </h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className={`text-lg font-semibold mb-4 ${josefinSemiBold.className}`}>
          Exportable Reports
        </h2>

        <ul className="divide-y divide-gray-100">
          {REPORTS.map((name) => (
            <li key={name} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                <span className={`text-sm text-gray-900 ${josefinRegular.className}`}>
                  {name}
                </span>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
