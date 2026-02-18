'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { titleFont, josefinSemiBold, josefinRegular } from '@/utils';
import { adminAPI } from '@/lib/api';
import { Loader2, Eye } from 'lucide-react';

interface Producer {
  id: string;
  name: string;
  businessName?: string;
  country?: string;
  readiness: 'not_started' | 'in_progress' | 'completed';
  verification: string;
  products: number;
}

const readinessStyles: Record<string, string> = {
  not_started: 'border-gray-300 text-gray-600',
  in_progress: 'border-amber-300 text-amber-700',
  completed: 'border-green-300 text-green-700',
};

const verificationStyles: Record<string, string> = {
  pending: 'border-gray-300 text-gray-600',
  submitted: 'border-blue-300 text-blue-700',
  in_review: 'border-amber-300 text-amber-700',
  all_approved: 'border-emerald-300 text-emerald-700',
  action_needed: 'border-red-300 text-red-700',
  verified: 'border-green-300 text-green-700',
};

function StatusBadge({
  value,
  styles,
}: {
  value: string;
  styles: Record<string, string>;
}) {
  const className = styles[value] ?? 'border-gray-300 text-gray-600';
  const label = value.replace(/_/g, ' ');
  return (
    <span
      className={`inline-flex items-center border rounded-full px-3 py-0.5 text-xs capitalize ${className}`}
    >
      {label}
    </span>
  );
}

export default function ProducersPage() {
  const [loading, setLoading] = useState(true);
  const [producers, setProducers] = useState<Producer[]>([]);

  useEffect(() => {
    const loadProducers = async () => {
      try {
        const res = await adminAPI.getProducers();
        if (res.success && res.data) {
          setProducers(res.data);
        }
      } catch {
        setProducers([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducers();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className={`text-2xl lg:text-3xl text-gray-900 ${titleFont.className}`}>
        Producers
      </h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : producers.length === 0 ? (
          <div className="py-16 text-center">
            <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
              No producers found.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-sm text-gray-500 uppercase tracking-wider">
                <th className="text-left py-4 px-6 font-medium">Company</th>
                <th className="text-left py-4 px-6 font-medium">Country</th>
                <th className="text-left py-4 px-6 font-medium">Readiness</th>
                <th className="text-left py-4 px-6 font-medium">Verification</th>
                <th className="text-left py-4 px-6 font-medium">Products</th>
                <th className="text-left py-4 px-6 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {producers.map((producer) => (
                <tr
                  key={producer.id}
                  className="border-t border-gray-100 text-sm text-gray-900"
                >
                  <td className="py-4 px-6">
                    <span className={josefinSemiBold.className}>
                      {producer.businessName && producer.businessName !== '-'
                        ? producer.businessName
                        : producer.name}
                    </span>
                  </td>
                  <td className="py-4 px-6">{producer.country ?? '-'}</td>
                  <td className="py-4 px-6">
                    <StatusBadge value={producer.readiness} styles={readinessStyles} />
                  </td>
                  <td className="py-4 px-6">
                    <StatusBadge value={producer.verification} styles={verificationStyles} />
                  </td>
                  <td className="py-4 px-6">{producer.products ?? 0}</td>
                  <td className="py-4 px-6">
                    <Link
                      href={`/ops/producers/${producer.id}`}
                      className="inline-flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
