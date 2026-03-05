'use client';

import { titleFont, josefinSemiBold, josefinRegular } from '@/utils';
import { Clock, Zap, FileText } from 'lucide-react';

export default function AutomationPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className={`text-2xl lg:text-3xl text-gray-900 ${titleFont.className}`}>
        Automation
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1 - SLA Timers */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-gray-500 shrink-0" />
            <h2 className={`text-lg font-semibold text-gray-900 ${josefinSemiBold.className}`}>
              SLA Timers
            </h2>
          </div>
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
            SLA timer configuration and monitoring will be available here.
          </p>
        </div>

        {/* Card 2 - Escalation Rules */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-gray-500 shrink-0" />
            <h2 className={`text-lg font-semibold text-gray-900 ${josefinSemiBold.className}`}>
              Escalation Rules
            </h2>
          </div>
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
            Configure escalation rules for overdue tasks and stalled trades.
          </p>
        </div>

        {/* Card 3 - Audit Trail */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-gray-500 shrink-0" />
            <h2 className={`text-lg font-semibold text-gray-900 ${josefinSemiBold.className}`}>
              Audit Trail
            </h2>
          </div>
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
            System activity log and audit trail will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
