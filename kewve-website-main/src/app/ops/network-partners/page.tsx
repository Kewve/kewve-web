'use client';

import { titleFont, josefinSemiBold, josefinRegular } from '@/utils';
import { Plus, Users2 } from 'lucide-react';

export default function NetworkPartnersPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl lg:text-3xl text-gray-900 ${titleFont.className}`}>
          Network Partners
        </h1>
        <button
          type="button"
          className="flex items-center gap-2 bg-[#1a2e23] text-white rounded-lg px-4 py-2.5 text-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Partner
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className={`text-left py-4 px-6 text-sm text-gray-500 uppercase tracking-wider ${josefinSemiBold.className}`}>
                Name
              </th>
              <th className={`text-left py-4 px-6 text-sm text-gray-500 uppercase tracking-wider ${josefinSemiBold.className}`}>
                Type
              </th>
              <th className={`text-left py-4 px-6 text-sm text-gray-500 uppercase tracking-wider ${josefinSemiBold.className}`}>
                Country
              </th>
              <th className={`text-left py-4 px-6 text-sm text-gray-500 uppercase tracking-wider ${josefinSemiBold.className}`}>
                Status
              </th>
              <th className={`text-left py-4 px-6 text-sm text-gray-500 uppercase tracking-wider ${josefinSemiBold.className}`}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="py-16">
                <div className="flex flex-col items-center justify-center gap-3">
                  <Users2 className="w-12 h-12 text-gray-300" />
                  <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
                    No network partners added yet.
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
