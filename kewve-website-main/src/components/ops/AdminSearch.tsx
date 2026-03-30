'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Search, X } from 'lucide-react';
import { josefinRegular, josefinSemiBold } from '@/utils';
import { adminAPI, type AdminSearchData, type AdminSearchScope } from '@/lib/api';

function scopeFromPath(pathname: string | null): AdminSearchScope {
  if (!pathname) return 'all';
  if (pathname.includes('/trade-operations')) return 'trades';
  if (pathname === '/ops/producers' || pathname === '/ops/producers/') return 'producers';
  return 'all';
}

function placeholder(scope: AdminSearchScope): string {
  if (scope === 'trades') return 'Search ref, buyer, product…';
  if (scope === 'producers') return 'Search producers…';
  if (scope === 'clusters') return 'Search clusters…';
  if (scope === 'products') return 'Search products…';
  return 'Search products, trades, clusters…';
}

export default function AdminSearch({ className = '' }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const scope = scopeFromPath(pathname);

  const [open, setOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AdminSearchData>({
    products: [],
    buyerRequests: [],
    clusters: [],
    producers: [],
  });
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        setData({ products: [], buyerRequests: [], clusters: [], producers: [] });
        setError(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await adminAPI.search(trimmed, { scope });
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setData({ products: [], buyerRequests: [], clusters: [], producers: [] });
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Search failed');
        setData({ products: [], buyerRequests: [], clusters: [], producers: [] });
      } finally {
        setLoading(false);
      }
    },
    [scope],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(query);
    }, 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (mobileSheetOpen) {
      sheetInputRef.current?.focus();
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileSheetOpen]);

  const hasResults =
    data.products.length > 0 ||
    data.buyerRequests.length > 0 ||
    data.clusters.length > 0 ||
    data.producers.length > 0;
  const showPanel = open && query.trim().length >= 2;

  const closeMobile = () => {
    setMobileSheetOpen(false);
    setOpen(false);
  };

  const onNavigate = () => {
    setOpen(false);
    closeMobile();
  };

  const firstHitHref = (): string | null => {
    if (data.products[0]) return `/ops/products-clusters/${data.products[0]._id}`;
    if (data.buyerRequests[0]) return `/ops/trade-operations?requestId=${encodeURIComponent(data.buyerRequests[0]._id)}`;
    if (data.clusters[0]) return `/ops/products-clusters?clusterId=${encodeURIComponent(data.clusters[0]._id)}`;
    if (data.producers[0]) return `/ops/producers/${data.producers[0]._id}`;
    return null;
  };

  const border = 'border-gray-200 focus-within:border-orange/60';

  const renderResults = (inSheet: boolean) => (
    <div
      className={
        inSheet
          ? 'flex-1 overflow-y-auto rounded-b-xl border-t border-gray-100 bg-white'
          : 'absolute left-0 right-0 top-full z-40 mt-1 max-h-[min(70vh,480px)] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg'
      }
      role='listbox'>
      {error ? (
        <p className={`px-3 py-2 text-sm text-red-600 ${josefinRegular.className}`}>{error}</p>
      ) : !loading && !hasResults ? (
        <p className={`px-3 py-3 text-sm text-gray-500 ${josefinRegular.className}`}>No matches.</p>
      ) : null}

      {data.products.length > 0 ? (
        <div className='border-b border-gray-100 py-1'>
          <p className={`px-3 py-1 text-[10px] uppercase tracking-wide text-gray-400 ${josefinSemiBold.className}`}>
            Products
          </p>
          <ul className='space-y-0.5'>
            {data.products.map((p) => (
              <li key={`p-${p._id}`}>
                <Link
                  href={`/ops/products-clusters/${p._id}`}
                  onClick={onNavigate}
                  className={`block px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 ${josefinRegular.className}`}>
                  <span className='font-medium'>{p.name || 'Product'}</span>
                  {p.category ? <span className='ml-2 text-xs text-gray-500'>{p.category}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.buyerRequests.length > 0 ? (
        <div className='border-b border-gray-100 py-1'>
          <p className={`px-3 py-1 text-[10px] uppercase tracking-wide text-gray-400 ${josefinSemiBold.className}`}>
            Trades
          </p>
          <ul className='space-y-0.5'>
            {data.buyerRequests.map((r) => (
              <li key={`r-${r._id}`}>
                <Link
                  href={`/ops/trade-operations?requestId=${encodeURIComponent(r._id)}`}
                  onClick={onNavigate}
                  className={`block px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 ${josefinRegular.className}`}>
                  <span className='font-mono text-xs text-gray-500'>#{r.refSuffix}</span>
                  <span className='ml-2 font-medium'>{r.productName || 'Request'}</span>
                  {r.buyerName ? <span className='ml-2 text-xs text-gray-500'>{r.buyerName}</span> : null}
                  {r.status ? (
                    <span className='ml-2 text-xs capitalize text-gray-500'>{String(r.status).replace(/_/g, ' ')}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.clusters.length > 0 ? (
        <div className='border-b border-gray-100 py-1'>
          <p className={`px-3 py-1 text-[10px] uppercase tracking-wide text-gray-400 ${josefinSemiBold.className}`}>
            Clusters
          </p>
          <ul className='space-y-0.5'>
            {data.clusters.map((c) => (
              <li key={`c-${c._id}`}>
                <Link
                  href={`/ops/products-clusters?clusterId=${encodeURIComponent(c._id)}`}
                  onClick={onNavigate}
                  className={`block px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 ${josefinRegular.className}`}>
                  <span className='font-medium'>{c.productName || 'Cluster'}</span>
                  {c.clusterId ? (
                    <span className='ml-2 font-mono text-xs text-gray-500'>{c.clusterId}</span>
                  ) : null}
                  {c.status ? <span className='ml-2 text-xs text-gray-500'>{c.status}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.producers.length > 0 ? (
        <div className='py-1'>
          <p className={`px-3 py-1 text-[10px] uppercase tracking-wide text-gray-400 ${josefinSemiBold.className}`}>
            Producers
          </p>
          <ul className='space-y-0.5'>
            {data.producers.map((u) => (
              <li key={`u-${u._id}`}>
                <Link
                  href={`/ops/producers/${u._id}`}
                  onClick={onNavigate}
                  className={`block px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 ${josefinRegular.className}`}>
                  <span className='font-medium'>{u.name || 'Producer'}</span>
                  {u.email ? <span className='ml-2 text-xs text-gray-500 truncate'>{u.email}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );

  const renderField = (inSheet: boolean) => (
    <div className={`flex items-center gap-2 rounded-lg border bg-white px-2.5 py-1.5 transition-colors ${border}`}>
      <Search className='w-4 h-4 shrink-0 text-gray-400' aria-hidden />
      <input
        ref={inSheet ? sheetInputRef : undefined}
        type='search'
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            if (inSheet) closeMobile();
            else (e.target as HTMLInputElement).blur();
          }
          if (e.key === 'Enter' && query.trim().length >= 2) {
            const href = firstHitHref();
            if (href) router.push(href);
            onNavigate();
          }
        }}
        placeholder={placeholder(scope)}
        className={`min-w-0 flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none ${josefinRegular.className}`}
        aria-expanded={showPanel}
      />
      {loading ? <Loader2 className='w-4 h-4 shrink-0 animate-spin text-gray-400' aria-hidden /> : null}
      {query ? (
        <button
          type='button'
          className='shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600'
          onClick={() => {
            setQuery('');
            setData({ products: [], buyerRequests: [], clusters: [], producers: [] });
          }}
          aria-label='Clear search'>
          <X className='w-4 h-4' />
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      <div
        ref={rootRef}
        className={`relative hidden min-w-0 flex-1 max-w-md sm:flex sm:flex-col ${className}`}>
        {renderField(false)}
        {showPanel ? renderResults(false) : null}
      </div>

      <div className='flex shrink-0 sm:hidden'>
        <button
          type='button'
          onClick={() => {
            setMobileSheetOpen(true);
            setOpen(true);
          }}
          className={`rounded-lg border p-2 transition-colors ${border} bg-white`}
          aria-label='Open search'>
          <Search className='w-5 h-5 text-gray-400' />
        </button>
      </div>

      {mobileSheetOpen ? (
        <div className='fixed inset-0 z-[100] sm:hidden' role='dialog' aria-modal aria-label='Search'>
          <button type='button' className='absolute inset-0 bg-black/40' aria-label='Close search' onClick={closeMobile} />
          <div className='absolute inset-x-0 top-0 flex max-h-[100dvh] flex-col rounded-b-2xl bg-white shadow-xl'>
            <div className='flex items-center gap-2 border-b border-gray-100 px-3 py-3'>
              <div className='min-w-0 flex-1'>{renderField(true)}</div>
              <button
                type='button'
                onClick={closeMobile}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 ${josefinRegular.className}`}>
                Done
              </button>
            </div>
            {query.trim().length >= 2 ? (
              renderResults(true)
            ) : (
              <p className={`px-4 py-6 text-sm text-gray-500 ${josefinRegular.className}`}>
                Type at least 2 characters to search.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
