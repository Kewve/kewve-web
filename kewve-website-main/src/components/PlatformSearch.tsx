'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Search, X } from 'lucide-react';
import { josefinRegular, josefinSemiBold } from '@/utils';
import {
  searchAPI,
  type SearchProductHit,
  type SearchScope,
  type SearchTransactionHit,
} from '@/lib/api';

type Variant = 'producer' | 'buyer';

function productHref(p: SearchProductHit): string {
  if (p.kind === 'catalog') return `/buyer/products/${p._id}`;
  return `/dashboard/products/${p._id}`;
}

function transactionHref(t: SearchTransactionHit): string {
  if (t.role === 'buyer') return `/buyer/trade-operations/${t._id}`;
  return `/dashboard/trade-operations?requestId=${encodeURIComponent(t._id)}`;
}

/** Tighten results to what the current screen is about (trade vs catalog). */
function searchScopeFromPath(pathname: string | null): SearchScope {
  if (!pathname) return 'all';
  if (pathname.includes('/trade-operations')) return 'trades';
  if (/\/products(\/|$)/.test(pathname)) return 'products';
  return 'all';
}

function scopePlaceholder(scope: SearchScope): string {
  if (scope === 'trades') return 'Search ref, product, status…';
  if (scope === 'products') return 'Search products…';
  return 'Search products & trades…';
}

export default function PlatformSearch({
  variant,
  className = '',
}: {
  variant: Variant;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const scope = searchScopeFromPath(pathname);

  const [open, setOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<SearchProductHit[]>([]);
  const [transactions, setTransactions] = useState<SearchTransactionHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        setProducts([]);
        setTransactions([]);
        setError(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await searchAPI.search(trimmed, { scope });
        if (res.success && res.data) {
          setProducts(res.data.products || []);
          setTransactions(res.data.transactions || []);
        } else {
          setProducts([]);
          setTransactions([]);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Search failed');
        setProducts([]);
        setTransactions([]);
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

  const border =
    variant === 'buyer' ? 'border-gray-300 focus-within:border-orange/50' : 'border-gray-200 focus-within:border-orange/60';
  const iconTint = variant === 'buyer' ? 'text-gray-400' : 'text-gray-400';

  const hasResults = products.length > 0 || transactions.length > 0;
  const showPanel = open && query.trim().length >= 2;
  const placeholder = scopePlaceholder(scope);

  const closeMobile = () => {
    setMobileSheetOpen(false);
    setOpen(false);
  };

  const onNavigate = () => {
    setOpen(false);
    closeMobile();
  };

  const renderResultsPanel = (inSheet: boolean) => (
    <div
      className={
        inSheet
          ? 'flex-1 overflow-y-auto rounded-b-xl border-t border-gray-100 bg-white'
          : 'absolute left-0 right-0 top-full z-40 mt-1 max-h-[min(70vh,420px)] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg'
      }
      role='listbox'>
      {error ? (
        <p className={`px-3 py-2 text-sm text-red-600 ${josefinRegular.className}`}>{error}</p>
      ) : !loading && !hasResults ? (
        <p className={`px-3 py-3 text-sm text-gray-500 ${josefinRegular.className}`}>No matches.</p>
      ) : null}

      {products.length > 0 ? (
        <div className='border-b border-gray-100 py-1'>
          <p className={`px-3 py-1 text-[10px] uppercase tracking-wide text-gray-400 ${josefinSemiBold.className}`}>
            Products
          </p>
          <ul className='space-y-0.5'>
            {products.map((p) => (
              <li key={`p-${p._id}`}>
                <Link
                  href={productHref(p)}
                  onClick={onNavigate}
                  className={`block px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 ${josefinRegular.className}`}>
                  <span className='font-medium'>{p.name || 'Product'}</span>
                  {p.category ? <span className='ml-2 text-xs text-gray-500'>{p.category}</span> : null}
                  <span
                    className={`ml-2 rounded px-1.5 py-0.5 text-[10px] ${
                      p.kind === 'catalog' ? 'bg-emerald-50 text-emerald-800' : 'bg-orange/10 text-orange'
                    }`}>
                    {p.kind === 'catalog' ? 'Catalog' : 'My listing'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {transactions.length > 0 ? (
        <div className='py-1'>
          <p className={`px-3 py-1 text-[10px] uppercase tracking-wide text-gray-400 ${josefinSemiBold.className}`}>
            Trades
          </p>
          <ul className='space-y-0.5'>
            {transactions.map((t) => (
              <li key={`t-${t._id}`}>
                <Link
                  href={transactionHref(t)}
                  onClick={onNavigate}
                  className={`block px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 ${josefinRegular.className}`}>
                  <span className='font-mono text-xs text-gray-500'>#{t.refSuffix || '—'}</span>
                  <span className='ml-2 font-medium'>{t.productName || 'Trade'}</span>
                  {t.market ? <span className='ml-2 text-xs text-gray-500'>{t.market}</span> : null}
                  {t.status ? (
                    <span className='ml-2 text-xs capitalize text-gray-500'>{t.status.replace(/_/g, ' ')}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );

  const renderSearchField = (opts: { inSheet: boolean }) => {
    const { inSheet } = opts;
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border bg-white px-2.5 py-1.5 transition-colors ${border}`}>
        <Search className={`w-4 h-4 shrink-0 ${iconTint}`} aria-hidden />
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
              if (products[0]) router.push(productHref(products[0]));
              else if (transactions[0]) router.push(transactionHref(transactions[0]));
              onNavigate();
            }
          }}
          placeholder={placeholder}
          className={`min-w-0 flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none ${josefinRegular.className}`}
          aria-autocomplete='list'
          aria-expanded={showPanel}
        />
        {loading ? <Loader2 className='w-4 h-4 shrink-0 animate-spin text-gray-400' aria-hidden /> : null}
        {query ? (
          <button
            type='button'
            className='shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600'
            onClick={() => {
              setQuery('');
              setProducts([]);
              setTransactions([]);
            }}
            aria-label='Clear search'>
            <X className='w-4 h-4' />
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <>
      {/* Desktop / tablet: inline */}
      <div ref={rootRef} className={`relative hidden min-w-0 flex-1 max-w-md sm:flex sm:flex-col ${className}`}>
        {renderSearchField({ inSheet: false })}
        {showPanel ? renderResultsPanel(false) : null}
      </div>

      {/* Mobile: icon opens full-screen sheet */}
      <div className='flex shrink-0 md:hidden'>
        <button
          type='button'
          onClick={() => {
            setMobileSheetOpen(true);
            setOpen(true);
          }}
          className={`rounded-lg border p-2 transition-colors ${border} bg-white`}
          aria-label='Open search'>
          <Search className={`w-5 h-5 ${iconTint}`} />
        </button>
      </div>

      {mobileSheetOpen ? (
        <div className='fixed inset-0 z-[100] sm:hidden' role='dialog' aria-modal aria-label='Search'>
          <button
            type='button'
            className='absolute inset-0 bg-black/40'
            aria-label='Close search'
            onClick={closeMobile}
          />
          <div className='absolute inset-x-0 top-0 flex max-h-[100dvh] flex-col rounded-b-2xl bg-white shadow-xl'>
            <div className='flex items-center gap-2 border-b border-gray-100 px-3 py-3'>
              <div className='min-w-0 flex-1'>{renderSearchField({ inSheet: true })}</div>
              <button
                type='button'
                onClick={closeMobile}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 ${josefinRegular.className}`}>
                Done
              </button>
            </div>
            {query.trim().length >= 2 ? renderResultsPanel(true) : (
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
