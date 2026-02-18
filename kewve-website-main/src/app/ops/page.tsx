'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { titleFont, josefinSemiBold, josefinRegular } from '@/utils';
import { adminAPI } from '@/lib/api';
import {
  Users,
  ShieldCheck,
  Package,
  FileText,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface Stats {
  totalProducers: number;
  verifiedProducers: number;
  totalProducts: number;
  totalAssessments: number;
  pendingDocs: number;
  totalDocs: number;
  approvedDocs: number;
  rejectedDocs: number;
}

export default function OpsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await adminAPI.getStats();
        if (res.success && res.data) {
          setStats(res.data);
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const statCards = [
    {
      label: 'Total Producers',
      value: stats?.totalProducers ?? 0,
      icon: Users,
      href: '/ops/producers',
    },
    {
      label: 'Verified Producers',
      value: stats?.verifiedProducers ?? 0,
      icon: ShieldCheck,
      href: '/ops/producers',
    },
    {
      label: 'Total Products',
      value: stats?.totalProducts ?? 0,
      icon: Package,
      href: '/ops/producers',
    },
    {
      label: 'Assessments Completed',
      value: stats?.totalAssessments ?? 0,
      icon: FileText,
      href: '/ops/producers',
    },
  ];

  const hasAlerts =
    stats && (stats.pendingDocs > 0 || stats.rejectedDocs > 0);

  return (
    <div className='max-w-5xl mx-auto space-y-6'>
      <h1 className={`text-2xl lg:text-3xl text-gray-900 ${titleFont.className}`}>
        Ops Dashboard
      </h1>

      {/* Stat Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className='bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors'>
              <div className='flex items-center gap-4'>
                <div className='w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0'>
                  <Icon className='w-5 h-5 text-gray-500' />
                </div>
                <div>
                  {loading ? (
                    <Loader2 className='w-6 h-6 text-gray-300 animate-spin' />
                  ) : (
                    <p className={`text-3xl text-gray-900 ${josefinSemiBold.className}`}>
                      {card.value}
                    </p>
                  )}
                  <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
                    {card.label}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Document Review Summary */}
      {!loading && stats && stats.totalDocs > 0 && (
        <div className='bg-white rounded-xl border border-gray-200 p-6'>
          <h2 className={`text-lg text-gray-900 mb-4 ${josefinSemiBold.className}`}>
            Document Review
          </h2>
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
            <div className='flex items-center gap-3'>
              <div className='w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center'>
                <FileText className='w-4 h-4 text-gray-500' />
              </div>
              <div>
                <p className={`text-xl text-gray-900 ${josefinSemiBold.className}`}>{stats.totalDocs}</p>
                <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Total</p>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <div className='w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center'>
                <Clock className='w-4 h-4 text-amber-500' />
              </div>
              <div>
                <p className={`text-xl text-amber-600 ${josefinSemiBold.className}`}>{stats.pendingDocs}</p>
                <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Pending</p>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <div className='w-9 h-9 rounded-full bg-green-50 flex items-center justify-center'>
                <CheckCircle2 className='w-4 h-4 text-green-500' />
              </div>
              <div>
                <p className={`text-xl text-green-600 ${josefinSemiBold.className}`}>{stats.approvedDocs}</p>
                <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Approved</p>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <div className='w-9 h-9 rounded-full bg-red-50 flex items-center justify-center'>
                <XCircle className='w-4 h-4 text-red-500' />
              </div>
              <div>
                <p className={`text-xl text-red-600 ${josefinSemiBold.className}`}>{stats.rejectedDocs}</p>
                <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Rejected</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      <div className='bg-white rounded-xl border border-gray-200 p-6'>
        <div className='flex items-center gap-2 mb-3'>
          <AlertTriangle className='w-5 h-5 text-amber-500' />
          <h2 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>Alerts</h2>
        </div>

        {loading ? (
          <div className='flex items-center gap-2'>
            <Loader2 className='w-4 h-4 text-gray-300 animate-spin' />
            <p className={`text-sm text-gray-400 ${josefinRegular.className}`}>Loading...</p>
          </div>
        ) : hasAlerts ? (
          <div className='space-y-3'>
            {stats!.pendingDocs > 0 && (
              <Link
                href='/ops/producers'
                className='flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors'>
                <div className='flex items-center gap-3'>
                  <Clock className='w-4 h-4 text-amber-600' />
                  <p className={`text-sm text-gray-900 ${josefinRegular.className}`}>
                    <span className={josefinSemiBold.className}>{stats!.pendingDocs}</span> document{stats!.pendingDocs !== 1 ? 's' : ''} awaiting review
                  </p>
                </div>
                <ArrowRight className='w-4 h-4 text-gray-400' />
              </Link>
            )}
            {stats!.rejectedDocs > 0 && (
              <Link
                href='/ops/producers'
                className='flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors'>
                <div className='flex items-center gap-3'>
                  <XCircle className='w-4 h-4 text-red-500' />
                  <p className={`text-sm text-gray-900 ${josefinRegular.className}`}>
                    <span className={josefinSemiBold.className}>{stats!.rejectedDocs}</span> document{stats!.rejectedDocs !== 1 ? 's' : ''} rejected — waiting for producer re-upload
                  </p>
                </div>
                <ArrowRight className='w-4 h-4 text-gray-400' />
              </Link>
            )}
          </div>
        ) : (
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
            No alerts. System is operating normally.
          </p>
        )}
      </div>
    </div>
  );
}
