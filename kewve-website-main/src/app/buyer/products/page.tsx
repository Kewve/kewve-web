'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { josefinRegular, josefinSemiBold } from '@/utils';
import { aggregationAPI, productAPI } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { GDPR } from '@/lib/gdprCopy';
import { useAuth } from '@/contexts/AuthContext';
import { displayIdSuffix } from '@/lib/mongoId';

function eurFromCents(cents: number) {
  return `€${(Number(cents || 0) / 100).toFixed(2)}`;
}

function BuyerProductsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [products, setProducts] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [myClusterPurchases, setMyClusterPurchases] = useState<any[]>([]);
  const [checkoutCluster, setCheckoutCluster] = useState<any | null>(null);
  const [volumeKg, setVolumeKg] = useState('');
  const [market, setMarket] = useState('EU');
  const [timeline, setTimeline] = useState('ASAP');
  const [quote, setQuote] = useState<any | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await productAPI.getProducts({ catalog: 'buyer' });
        if (res.success) setProducts(res.data || []);
      } catch {
        setProducts([]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadClusters = async () => {
      try {
        const [res, mineRes] = await Promise.all([
          aggregationAPI.getBuyerClusters(),
          aggregationAPI.getMyPurchasedClusters(),
        ]);
        if (res.success) setClusters(res.data || []);
        if (mineRes.success) setMyClusterPurchases(mineRes.data || []);
      } catch {
        setClusters([]);
        setMyClusterPurchases([]);
      }
    };
    if (user) loadClusters();
  }, [user]);

  useEffect(() => {
    const ok = searchParams.get('cluster_checkout');
    const cid = searchParams.get('cluster_id');
    const sid = searchParams.get('session_id');
    if (ok !== 'success' || !cid || !sid) return;

    (async () => {
      try {
        const res = await aggregationAPI.syncClusterCheckout(cid, sid);
        if (res.success) {
          toast({
            title: 'Payment received',
            description: 'Your cluster order is confirmed. Suppliers will fulfil from the shared pool.',
          });

          // Notify admin about the successful cluster payment.
          try {
            await fetch('/api/admin-notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventType: 'cluster_checkout_paid',
                payload: {
                  userName: user?.name,
                  userEmail: user?.email,
                  clusterId: cid,
                  sessionId: sid,
                },
              }),
            });
          } catch (notifyErr) {
            console.warn('Admin notify (cluster_checkout_paid) failed:', notifyErr);
          }
        } else {
          toast({
            title: 'Could not confirm payment',
            description: 'If you were charged, contact support with your confirmation email.',
            variant: 'destructive',
          });
        }
      } catch (e: any) {
        toast({
          title: 'Sync failed',
          description: e?.message || 'Try refreshing or contact support.',
          variant: 'destructive',
        });
      } finally {
        router.replace('/buyer/products');
        try {
          const r = await aggregationAPI.getBuyerClusters();
          if (r.success) setClusters(r.data || []);
        } catch {
          /* ignore */
        }
      }
    })();
  }, [searchParams, router, toast]);

  useEffect(() => {
    if (!checkoutCluster) {
      setQuote(null);
      return;
    }
    const v = Number(volumeKg);
    if (!Number.isFinite(v) || v < 1) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    (async () => {
      try {
        const res = await aggregationAPI.getClusterQuote(checkoutCluster._id, {
          volumeKg: v,
          market,
          timeline,
        });
        if (!cancelled && res.success) setQuote(res.data);
        else if (!cancelled) setQuote(null);
      } catch {
        if (!cancelled) setQuote(null);
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkoutCluster, volumeKg, market, timeline]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(String(p.category).toLowerCase()));
    return ['all', ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const name = String(p.name || '').toLowerCase();
      const cat = String(p.category || '').toLowerCase();
      const inSearch = !search || name.includes(search.toLowerCase());
      const inCat = category === 'all' || cat === category;
      return inSearch && inCat;
    });
  }, [products, search, category]);

  const openCheckout = (cluster: any) => {
    setCheckoutCluster(cluster);
    setVolumeKg(String(Math.max(1, Math.floor(Number(cluster.minimumExportVolumeKg || 1)))));
    setMarket(cluster.targetMarket === 'UK' || cluster.targetMarket === 'EU' ? cluster.targetMarket : 'EU');
    setTimeline('ASAP');
    setQuote(null);
  };

  const payCluster = async () => {
    if (!checkoutCluster) return;
    const v = Number(volumeKg);
    if (!Number.isFinite(v) || v < 1) return;
    setPayLoading(true);
    try {
      const res = await aggregationAPI.createClusterCheckoutSession(checkoutCluster._id, {
        volumeKg: v,
        market,
        timeline,
      });
      if (res.success && res.url) {
        window.location.href = res.url;
        return;
      }
      toast({
        title: 'Checkout unavailable',
        description: res.message || 'Could not start payment.',
        variant: 'destructive',
      });
    } catch (e: any) {
      toast({
        title: 'Checkout failed',
        description: e?.message || 'Try again later.',
        variant: 'destructive',
      });
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <div className='max-w-6xl mx-auto space-y-5'>
      <h1 className={`text-4xl text-gray-900 ${josefinSemiBold.className}`}>Product Catalog</h1>

      <div className='bg-white rounded-xl border border-gray-500/50 p-4'>
        <div className='flex items-center justify-between mb-3'>
          <h2 className={`text-2xl text-gray-900 ${josefinSemiBold.className}`}>Aggregated Product Clusters</h2>
          <span className={`text-xs text-gray-500 ${josefinRegular.className}`}>{clusters.length} available</span>
        </div>
        <p className={`text-sm text-gray-600 mb-3 ${josefinRegular.className}`}>
          One payment covers the full cluster order. You won&apos;t see individual producer splits—fulfilment is
          coordinated internally after checkout.
        </p>
        {clusters.length === 0 ? (
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>No clusters available yet.</p>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3'>
            {clusters.map((cluster) => (
              <div key={cluster._id} className='border border-gray-200 rounded-lg p-3'>
                <h3 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>{cluster.productName}</h3>
                <p className={`text-xs text-gray-500 mt-1 ${josefinRegular.className}`}>
                  {cluster.targetMarket} • {Number(cluster.totalApprovedVolumeKg || 0).toLocaleString()} kg pooled
                </p>
                <p className={`text-xs text-gray-500 mt-1 capitalize ${josefinRegular.className}`}>
                  Status: {cluster.status}
                </p>
                <button
                  onClick={() => openCheckout(cluster)}
                  className={`mt-3 w-full border border-gray-500/60 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors ${josefinRegular.className}`}>
                  Pay for cluster
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {myClusterPurchases.length > 0 ? (
        <div className='bg-white rounded-xl border border-gray-500/50 p-4'>
          <div className='flex items-center justify-between mb-3'>
            <h2 className={`text-2xl text-gray-900 ${josefinSemiBold.className}`}>My Cluster Orders</h2>
            <span className={`text-xs text-gray-500 ${josefinRegular.className}`}>{myClusterPurchases.length} total</span>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            {myClusterPurchases.map((cluster: any) => {
              const receipt = String(cluster?.purchase?.buyerReceipt || 'none');
              const canReceipt =
                (cluster?.settlement?.entries || []).some((e: any) => String(e?.supplyStatus || '') === 'accepted') &&
                receipt === 'none';
              return (
                <div key={`mine-${cluster._id}`} className='border border-gray-200 rounded-lg p-3'>
                  <h3 className={`text-base text-gray-900 ${josefinSemiBold.className}`}>{cluster.productName}</h3>
                  <p className={`text-xs text-gray-500 mt-1 ${josefinRegular.className}`}>
                    {displayIdSuffix(cluster.clusterId)} · paid {cluster?.purchase?.paidAt ? new Date(cluster.purchase.paidAt).toLocaleString() : '—'}
                  </p>
                  <p className={`text-xs text-gray-600 mt-1 capitalize ${josefinRegular.className}`}>
                    Receipt: {receipt.replace(/_/g, ' ')}
                  </p>
                  {String(cluster?.purchase?.refund?.status || '') === 'completed' ? (
                    <p className={`text-xs text-emerald-700 mt-1 ${josefinRegular.className}`}>
                      Refunded {cluster?.purchase?.refund?.amountCents ? `(${eurFromCents(cluster.purchase.refund.amountCents)})` : ''}
                    </p>
                  ) : null}
                  {canReceipt ? (
                    <div className='mt-3 flex gap-2'>
                      <button
                        type='button'
                        onClick={async () => {
                          try {
                            const res = await aggregationAPI.submitClusterReceipt(cluster._id, { receipt: 'received_ok' });
                            setMyClusterPurchases((prev) => prev.map((c: any) => (c._id === cluster._id ? res.data : c)));
                          } catch (e: any) {
                            toast({ title: 'Could not confirm', description: e?.message || 'Try again later.', variant: 'destructive' });
                          }
                        }}
                        className='text-xs border border-gray-300 rounded-md px-2.5 py-1.5 hover:bg-gray-50'>
                        OK — no issues
                      </button>
                      <button
                        type='button'
                        onClick={async () => {
                          const notes = String(window.prompt('Describe the issue') || '').trim();
                          if (!notes) return;
                          try {
                            const res = await aggregationAPI.submitClusterReceipt(cluster._id, {
                              receipt: 'received_issues',
                              notes,
                            });
                            setMyClusterPurchases((prev) => prev.map((c: any) => (c._id === cluster._id ? res.data : c)));
                          } catch (e: any) {
                            toast({ title: 'Could not report issue', description: e?.message || 'Try again later.', variant: 'destructive' });
                          }
                        }}
                        className='text-xs border border-amber-300 text-amber-900 rounded-md px-2.5 py-1.5 hover:bg-amber-50'>
                        Issues
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {checkoutCluster ? (
        <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-xl border border-gray-200 p-5 w-full max-w-md shadow-lg'>
            <h3 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>{checkoutCluster.productName}</h3>
            <p className={`text-xs text-gray-500 mt-1 ${josefinRegular.className}`}>Single invoice · Cluster #{displayIdSuffix(checkoutCluster.clusterId)}</p>
            <div className='mt-4 space-y-3'>
              <div>
                <label className={`text-xs text-gray-600 ${josefinSemiBold.className}`}>Volume (kg)</label>
                <input
                  type='number'
                  min={1}
                  value={volumeKg}
                  onChange={(e) => setVolumeKg(e.target.value)}
                  className={`mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${josefinRegular.className}`}
                />
              </div>
              <div>
                <label className={`text-xs text-gray-600 ${josefinSemiBold.className}`}>Market</label>
                <select
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  className={`mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${josefinRegular.className}`}>
                  <option value='EU'>EU</option>
                  <option value='UK'>UK</option>
                  <option value='Both'>Both</option>
                </select>
              </div>
              <div>
                <label className={`text-xs text-gray-600 ${josefinSemiBold.className}`}>Timeline</label>
                <input
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  className={`mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${josefinRegular.className}`}
                />
              </div>
            </div>
            <div className='mt-4 min-h-[4rem] border border-gray-100 rounded-lg p-3 bg-gray-50'>
              {quoteLoading ? (
                <p className={`text-sm text-gray-500 flex items-center gap-2 ${josefinRegular.className}`}>
                  <Loader2 className='w-4 h-4 animate-spin' /> Calculating…
                </p>
              ) : quote ? (
                <div className={`text-sm text-gray-800 space-y-1 ${josefinRegular.className}`}>
                  <p>
                    Subtotal: <strong>{eurFromCents(quote.subtotalCents)}</strong>
                  </p>
                  <p className='text-xs text-gray-600'>
                    Platform fee ({quote.platformFeePercent}%): {eurFromCents(quote.platformFeeCents)}
                  </p>
                  <p className={`text-base ${josefinSemiBold.className}`}>Total due: {eurFromCents(quote.totalCents)}</p>
                </div>
              ) : (
                <p className={`text-sm text-amber-800 ${josefinRegular.className}`}>
                  Adjust volume to see pricing. If pricing fails, the cluster may not have enough approved capacity.
                </p>
              )}
            </div>
            <p className={`text-[11px] text-gray-500 mt-3 leading-snug ${josefinRegular.className}`}>{GDPR.paymentsCheckout}</p>
            <div className='mt-4 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setCheckoutCluster(null)}
                className='px-4 py-2 text-sm border border-gray-300 rounded-lg'>
                Cancel
              </button>
              <button
                type='button'
                disabled={payLoading || !quote}
                onClick={payCluster}
                className='px-4 py-2 text-sm bg-[#1a2e23] text-white rounded-lg disabled:opacity-50'>
                {payLoading ? 'Redirecting…' : 'Pay with Stripe'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className='grid grid-cols-1 md:grid-cols-[1fr_170px] gap-3'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search products...'
            className={`w-full bg-white border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm ${josefinRegular.className}`}
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={`bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm ${josefinRegular.className}`}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'all' ? 'Category' : c}
            </option>
          ))}
        </select>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
        {filtered.map((product) => (
          <div key={product._id} className='bg-white rounded-xl border border-gray-500/50 p-4'>
            <div className='flex justify-between items-start'>
              <h3 className={`text-2xl text-gray-900 ${josefinSemiBold.className}`}>{product.name || 'Untitled'}</h3>
              <span className={`text-xs px-2 py-1 border border-gray-400 rounded ${josefinRegular.className}`}>
                {String(product.category || 'uncategorized').toLowerCase()}
              </span>
            </div>
            <p className={`text-sm text-gray-500 mt-3 ${josefinRegular.className}`}>
              <span className='mr-1'>◌</span>Compliance:{' '}
              <span className='border border-green-300 bg-green-50 text-green-700 rounded px-2 py-0.5'>approved</span>
            </p>
            <Link
              href={`/buyer/products/${product._id}`}
              className={`block text-center w-full mt-3 border border-gray-500/60 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors ${josefinRegular.className}`}>
              View Details
            </Link>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className='bg-white rounded-xl border border-gray-300 p-6 text-center'>
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
            No approved products match your search/filter.
          </p>
        </div>
      )}
    </div>
  );
}

export default function BuyerProductsPage() {
  return (
    <Suspense
      fallback={
        <div className='max-w-6xl mx-auto py-24 flex justify-center'>
          <Loader2 className='w-8 h-8 animate-spin text-gray-400' />
        </div>
      }>
      <BuyerProductsInner />
    </Suspense>
  );
}
