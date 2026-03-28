'use client';

import { useEffect, useMemo, useState } from 'react';
import { josefinSemiBold, josefinRegular } from '@/utils';
import { CheckCircle2, Layers, Wallet } from 'lucide-react';
import Link from 'next/link';
import { aggregationAPI } from '@/lib/api';
import { displayIdSuffix } from '@/lib/mongoId';
import { useAuth } from '@/contexts/AuthContext';

type ClusterRow = {
  _id: string;
  clusterId?: string;
  productName?: string;
  targetMarket?: string;
  supplyCountry?: string;
  minimumExportVolumeKg?: number;
  status?: string;
  eligible?: boolean;
  ineligibleReason?: string;
  canRetry?: boolean;
  ownContribution?: {
    status?: string;
    committedKg?: number;
    productName?: string;
    notes?: string;
  };
  matchingProducts?: { _id?: string; monthlyCapacity?: number }[];
};

function isApprovedJoined(c: ClusterRow) {
  return c.ownContribution?.status === 'approved';
}

export default function AggregationPage() {
  const { user } = useAuth();
  const [clusters, setClusters] = useState<ClusterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadClusters = async () => {
    try {
      setError('');
      const res = await aggregationAPI.getProducerEligibleClusters();
      setClusters(res.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load clusters.');
      setClusters([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClusters();
  }, []);

  const approvedJoined = useMemo(() => clusters.filter(isApprovedJoined), [clusters]);
  const eligible = useMemo(() => clusters.filter((c) => c.eligible && !isApprovedJoined(c)), [clusters]);
  const allAvailable = useMemo(() => clusters.filter((c) => !isApprovedJoined(c) && !c.eligible), [clusters]);

  const needsProfileCountry = Boolean(user && (typeof user.country !== 'string' || user.country.trim().length === 0));

  const joinCluster = async (cluster: ClusterRow) => {
    const selectedProduct = (cluster.matchingProducts || [])[0];
    if (!selectedProduct?._id) return;
    const defaultVolume = Math.min(
      Number(selectedProduct.monthlyCapacity || 0),
      Number(cluster.minimumExportVolumeKg || 0)
    );
    try {
      setJoiningId(cluster._id);
      setError('');
      await aggregationAPI.joinCluster(cluster._id, {
        productId: selectedProduct._id,
        committedKg: defaultVolume > 0 ? defaultVolume : 1,
      });
      await loadClusters();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join cluster.');
    } finally {
      setJoiningId(null);
    }
  };

  const ClusterMeta = ({ cluster }: { cluster: ClusterRow }) => (
    <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
      {displayIdSuffix(cluster.clusterId)}
      {' · '}
      Target {cluster.targetMarket}
      {cluster.supplyCountry ? ` · ${cluster.supplyCountry}` : ''}
      {' · '}
      {Number(cluster.minimumExportVolumeKg || 0).toLocaleString()} kg
    </p>
  );

  return (
    <div className='max-w-3xl mx-auto space-y-8'>
      <div>
        <h1 className={`text-2xl lg:text-3xl text-gray-900 ${josefinSemiBold.className}`}>Aggregation</h1>
        <p className={`text-sm text-gray-600 mt-1 ${josefinRegular.className}`}>
          Join buyer-led volume clusters that match your verified listings. Payouts after a cluster is purchased live under{' '}
          <Link href='/dashboard/accounts' className='text-brand-green font-semibold hover:underline inline-flex items-center gap-1'>
            <Wallet className='w-3.5 h-3.5' />
            Accounts
          </Link>
          .
        </p>
      </div>

      {error ? <p className={`text-sm text-red-600 ${josefinRegular.className}`}>{error}</p> : null}

      {needsProfileCountry ? (
        <div
          className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 ${josefinRegular.className}`}>
          <span className={josefinSemiBold.className}>Country required for clusters.</span>{' '}
          Add your country under{' '}
          <Link href='/dashboard/settings' className='text-brand-green font-semibold underline underline-offset-2'>
            Settings → Profile
          </Link>{' '}
          so we can match you to supply regions. It saves to your account and persists after refresh.
        </div>
      ) : null}

      {/* 1. Eligible — primary action */}
      <section className='bg-white rounded-xl border border-gray-200 p-6'>
        <h2 className={`text-base text-gray-900 mb-1 ${josefinSemiBold.className}`}>Open for you</h2>
        <p className={`text-sm text-gray-500 mb-4 ${josefinRegular.className}`}>
          Category and country match your profile; you can request to join with your approved product.
        </p>
        {loading ? (
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Loading…</p>
        ) : eligible.length === 0 ? (
          <div className='text-center py-8 border border-dashed border-gray-200 rounded-lg bg-gray-50/40'>
            <Layers className='w-9 h-9 text-gray-300 mx-auto mb-3' />
            <p className={`text-sm text-gray-600 max-w-md mx-auto ${josefinRegular.className}`}>
              Nothing open right now. Add or verify products in matching categories and keep your profile country accurate.
            </p>
            <Link
              href='/dashboard/products'
              className={`inline-flex mt-4 px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 ${josefinRegular.className}`}>
              Products
            </Link>
          </div>
        ) : (
          <div className='space-y-3'>
            {eligible.map((cluster) => (
              <div
                key={cluster._id}
                className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border border-gray-200 rounded-lg p-4'>
                <div>
                  <h3 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>{cluster.productName}</h3>
                  <ClusterMeta cluster={cluster} />
                  {cluster.canRetry ? (
                    <p className={`text-xs text-red-600 mt-2 ${josefinRegular.className}`}>
                      {cluster.ineligibleReason || 'You can retry joining.'}
                    </p>
                  ) : null}
                </div>
                <button
                  type='button'
                  onClick={() => joinCluster(cluster)}
                  disabled={joiningId === cluster._id}
                  className={`shrink-0 self-start bg-brand-green text-white rounded-lg px-4 py-2 text-sm hover:opacity-90 disabled:opacity-70 ${josefinSemiBold.className}`}>
                  {joiningId === cluster._id ? 'Submitting…' : cluster.canRetry ? 'Retry' : 'Join'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Approved memberships */}
      <section className='bg-white rounded-xl border border-gray-200 p-6'>
        <h2 className={`text-base text-gray-900 mb-1 ${josefinSemiBold.className}`}>Your memberships</h2>
        <p className={`text-sm text-gray-500 mb-4 ${josefinRegular.className}`}>
          Admin-approved contributions count toward cluster volume.
        </p>
        {loading ? (
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Loading…</p>
        ) : approvedJoined.length === 0 ? (
          <p className={`text-sm text-gray-500 py-4 ${josefinRegular.className}`}>No approved memberships yet.</p>
        ) : (
          <div className='space-y-3'>
            {approvedJoined.map((cluster) => (
              <div
                key={cluster._id}
                className='border border-emerald-200 bg-emerald-50/35 rounded-lg p-4 flex flex-wrap gap-2 items-start justify-between'>
                <div>
                  <div className='flex flex-wrap items-center gap-2 mb-1'>
                    <span
                      className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-600 text-white ${josefinSemiBold.className}`}>
                      Approved
                    </span>
                  </div>
                  <h3 className={`text-base text-gray-900 ${josefinSemiBold.className}`}>{cluster.productName}</h3>
                  <ClusterMeta cluster={cluster} />
                  <p className={`text-sm text-gray-800 mt-2 ${josefinRegular.className}`}>
                    Your offer:{' '}
                    <span className={josefinSemiBold.className}>
                      {Number(cluster.ownContribution?.committedKg || 0).toLocaleString()} kg
                    </span>
                    {cluster.ownContribution?.productName ? (
                      <>
                        {' '}
                        · <span className={josefinSemiBold.className}>{cluster.ownContribution.productName}</span>
                      </>
                    ) : null}
                  </p>
                  <p className={`text-xs text-gray-600 mt-1 capitalize ${josefinRegular.className}`}>
                    Cluster: {cluster.status || '—'}
                  </p>
                </div>
                <CheckCircle2 className='w-5 h-5 text-emerald-600 shrink-0 hidden sm:block' aria-hidden />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Other clusters (pending / ineligible) */}
      <section className='bg-white rounded-xl border border-gray-200 p-6'>
        <h2 className={`text-base text-gray-900 mb-1 ${josefinSemiBold.className}`}>More clusters</h2>
        <p className={`text-sm text-gray-500 mb-4 ${josefinRegular.className}`}>
          Pending review or not a match — see why below.
        </p>
        {loading ? (
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Loading…</p>
        ) : allAvailable.length === 0 ? (
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Nothing else to show.</p>
        ) : (
          <div className='space-y-3'>
            {allAvailable.map((cluster) => {
              const pending = cluster.ownContribution?.status === 'pending';
              return (
                <div key={cluster._id} className='border border-gray-200 rounded-lg p-4'>
                  <div className='flex flex-wrap items-center gap-2 mb-1'>
                    <h3 className={`text-base text-gray-900 ${josefinSemiBold.className}`}>{cluster.productName}</h3>
                    {pending ? (
                      <span
                        className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 ${josefinSemiBold.className}`}>
                        Pending
                      </span>
                    ) : null}
                  </div>
                  <ClusterMeta cluster={cluster} />
                  <p className={`text-sm text-gray-600 mt-2 ${josefinRegular.className}`}>
                    {cluster.ineligibleReason || 'You do not meet the requirements to join yet.'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
