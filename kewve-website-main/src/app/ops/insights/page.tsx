'use client';

import { useEffect, useMemo, useState } from 'react';
import { titleFont, josefinSemiBold, josefinRegular } from '@/utils';
import { adminAPI, type AssessmentDropoffAnalytics, type AssessmentDropoffRange } from '@/lib/api';
import { BarChart3, Loader2, TrendingUp } from 'lucide-react';

const RANGE_OPTIONS: Array<{ label: string; value: AssessmentDropoffRange }> = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
];

function fmtPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '-';
  return `${value.toFixed(2)}%`;
}

export default function InsightsPage() {
  const [range, setRange] = useState<AssessmentDropoffRange>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState<AssessmentDropoffAnalytics | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await adminAPI.getAssessmentDropoffAnalytics(range);
        if (res.success) setAnalytics(res.data);
        else setError('Could not load assessment analytics.');
      } catch (err: any) {
        setError(err?.message || 'Could not load assessment analytics.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [range]);

  const windowLabel = useMemo(() => {
    if (!analytics?.dateWindow?.from || !analytics?.dateWindow?.to) return '';
    const from = new Date(analytics.dateWindow.from).toLocaleDateString();
    const to = new Date(analytics.dateWindow.to).toLocaleDateString();
    return `${from} - ${to}`;
  }, [analytics?.dateWindow?.from, analytics?.dateWindow?.to]);

  return (
    <div className='max-w-5xl mx-auto space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className={`text-2xl lg:text-3xl text-gray-900 ${titleFont.className}`}>Insights</h1>
          {windowLabel && (
            <p className={`text-sm text-gray-500 mt-1 ${josefinRegular.className}`}>{windowLabel}</p>
          )}
        </div>
        <div className='flex items-center gap-2'>
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type='button'
              onClick={() => setRange(option.value)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                range === option.value
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              } ${josefinSemiBold.className}`}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className='bg-white rounded-xl border border-gray-200 p-8 flex items-center gap-3'>
          <Loader2 className='w-5 h-5 animate-spin text-gray-500' />
          <p className={`text-sm text-gray-600 ${josefinRegular.className}`}>Loading assessment drop-off...</p>
        </div>
      ) : error ? (
        <div className='bg-white rounded-xl border border-red-200 p-6'>
          <p className={`text-sm text-red-700 ${josefinRegular.className}`}>{error}</p>
        </div>
      ) : analytics ? (
        <>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <div className='bg-white rounded-xl border border-gray-200 p-6'>
              <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Started</p>
              <p className={`text-3xl text-gray-900 mt-1 ${josefinSemiBold.className}`}>{analytics.summary.totalStarted}</p>
            </div>
            <div className='bg-white rounded-xl border border-gray-200 p-6'>
              <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Completed</p>
              <p className={`text-3xl text-gray-900 mt-1 ${josefinSemiBold.className}`}>{analytics.summary.completed}</p>
            </div>
            <div className='bg-white rounded-xl border border-gray-200 p-6'>
              <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Completion Rate</p>
              <p className={`text-3xl text-gray-900 mt-1 ${josefinSemiBold.className}`}>{fmtPercent(analytics.summary.completionRate)}</p>
            </div>
          </div>

          <div className='bg-white rounded-xl border border-gray-200 p-6'>
            <div className='flex items-center gap-2 mb-4'>
              <TrendingUp className='w-5 h-5 text-gray-500 shrink-0' />
              <h2 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>
                Export Readiness Assessment Drop-off
              </h2>
            </div>
            <div className='space-y-3'>
              {analytics.stages.map((stage) => (
                <div key={stage.key} className='rounded-lg border border-gray-200 p-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>{stage.label}</p>
                    <p className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>{stage.count}</p>
                  </div>
                  <p className={`text-xs text-gray-500 mt-1 ${josefinRegular.className}`}>
                    {stage.conversionFromPrevious == null
                      ? 'This is the baseline stage for the funnel.'
                      : `Reached from previous stage: ${fmtPercent(stage.conversionFromPrevious)}. ${
                          stage.dropoffFromPrevious === 0
                            ? 'No users dropped off at this step.'
                            : `${stage.dropoffFromPrevious} user${stage.dropoffFromPrevious === 1 ? '' : 's'} dropped off before this step.`
                        }`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className='bg-white rounded-xl border border-gray-200 p-6'>
            <div className='flex items-center gap-2 mb-3'>
              <BarChart3 className='w-5 h-5 text-gray-500 shrink-0' />
              <h2 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>Biggest friction points</h2>
            </div>
            <p className={`text-sm text-gray-600 ${josefinRegular.className}`}>
              Focus on stages with the largest drop between consecutive steps to improve completion.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
