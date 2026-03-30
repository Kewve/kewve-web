'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { josefinRegular, josefinSemiBold } from '@/utils';
import { GDPR } from '@/lib/gdprCopy';
import { buyerRequestAPI } from '@/lib/api';
import { buyerRequestRefSuffix } from '@/lib/mongoId';
import { useAuth } from '@/contexts/AuthContext';

function eur(cents: number) {
  return `€${(Number(cents || 0) / 100).toFixed(2)}`;
}

function BuyerInvoiceContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const { user } = useAuth();
  const [row, setRow] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      const res = await buyerRequestAPI.getById(id);
      setRow(res.data);
    } catch (e: any) {
      setError(e?.message || 'Could not load this request.');
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    const sessionId = searchParams.get('session_id');
    if (checkout !== 'success' || !sessionId || !id) return;

    let cancelled = false;
    (async () => {
      try {
        setSyncMsg('Confirming payment…');
        const res = await buyerRequestAPI.syncTradeCheckout(id, sessionId);
        if (!cancelled && res.data) setRow(res.data);
        if (!cancelled) {
          // Notify admin that buyer payment was recorded.
          try {
            await fetch('/api/admin-notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventType: 'trade_payment_recorded',
                payload: {
                  userName: user?.name,
                  userEmail: user?.email,
                  buyerRequestId: id,
                  productName: res.data?.productName,
                  market: res.data?.market,
                  paidAt: res.data?.trade?.invoice?.paidAt,
                },
              }),
            });
          } catch (notifyErr) {
            console.warn('Admin notify (trade_payment_recorded) failed:', notifyErr);
          }

          setSyncMsg(
            res.sync?.alreadyPaid || res.sync?.applied
              ? 'Payment recorded. Thank you.'
              : 'Payment received; if status does not update, refresh in a moment.'
          );
        }
      } catch (e: any) {
        if (!cancelled) setSyncMsg(e?.message || 'Could not confirm payment automatically. Refresh or contact support.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, id]);

  const startPay = async () => {
    if (!id) return;
    try {
      setPayBusy(true);
      setError('');
      const res = await buyerRequestAPI.createTradeCheckoutSession(id);
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      setError(res.message || 'Could not start checkout.');
    } catch (e: any) {
      setError(e?.message || 'Could not start checkout.');
    } finally {
      setPayBusy(false);
    }
  };

  const inv = row?.trade?.invoice;
  const cancelledCheckout = searchParams.get('checkout') === 'cancel';
  const hasInvoice = !!(inv?.sentAt || inv?.generatedAt);

  return (
    <div className='max-w-2xl mx-auto space-y-6 px-4 py-6'>
      <Link
        href='/buyer/trade-operations'
        className={`inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 ${josefinRegular.className}`}>
        <ArrowLeft className='w-4 h-4' />
        Back to trade operations
      </Link>

      <div className='flex items-start gap-3'>
        <FileText className='w-8 h-8 text-gray-400 shrink-0 mt-1' />
        <div>
          <h1 className={`text-3xl text-gray-900 ${josefinSemiBold.className}`}>Invoice</h1>
          <p className={`text-sm text-gray-600 mt-1 ${josefinRegular.className}`}>
            Pay Kewve securely by card. Funds are collected by Kewve; your producer is paid out after the order completes
            with no issues.
          </p>
        </div>
      </div>

      {loading ? (
        <div className='flex items-center gap-2 text-gray-500'>
          <Loader2 className='w-5 h-5 animate-spin' />
          Loading…
        </div>
      ) : null}

      {error ? <p className='text-sm text-red-600'>{error}</p> : null}
      {cancelledCheckout ? <p className='text-sm text-amber-800'>Checkout was cancelled. You can pay when you&apos;re ready.</p> : null}
      {syncMsg ? <p className='text-sm text-green-800'>{syncMsg}</p> : null}

      {row && !loading ? (
        <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
          <div className='px-5 py-4 border-b border-gray-100'>
            <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Request</p>
            <p className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>{row.productName || 'Product'}</p>
            <p className={`text-sm text-gray-600 mt-1 ${josefinRegular.className}`}>
              {Number(row.volumeKg || 0)} kg · {row.market || '—'} · Ref #{buyerRequestRefSuffix(row)}
            </p>
          </div>

          {String(row.trade?.buyerReceiptNotes || '').trim() || String(row.trade?.issueResolutionNote || '').trim() ? (
            <div className='px-5 py-4 border-b border-amber-100 bg-amber-50/40 space-y-3'>
              <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>Issue &amp; resolution</p>
              {String(row.trade?.buyerReceiptNotes || '').trim() ? (
                <div>
                  <p className={`text-xs text-gray-500 ${josefinSemiBold.className}`}>Your report</p>
                  <p className={`text-sm text-gray-800 whitespace-pre-wrap ${josefinRegular.className}`}>
                    {row.trade.buyerReceiptNotes}
                  </p>
                </div>
              ) : null}
              {String(row.trade?.issueResolutionNote || '').trim() ? (
                <div>
                  <p className={`text-xs text-gray-500 ${josefinSemiBold.className}`}>Update from Kewve</p>
                  <p className={`text-sm text-gray-800 whitespace-pre-wrap ${josefinRegular.className}`}>
                    {row.trade.issueResolutionNote}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {hasInvoice ? (
            <div className='px-5 py-4 space-y-3'>
              <div className='flex justify-between text-sm'>
                <span className='text-gray-600'>Product subtotal</span>
                <span>{eur(inv.subtotalCents)}</span>
              </div>
              {Number(inv.additionalFeesCents) > 0 ? (
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-600'>{inv.additionalFeesNote?.trim() || 'Additional fees'}</span>
                  <span>{eur(inv.additionalFeesCents)}</span>
                </div>
              ) : null}
              <div className='flex justify-between text-sm'>
                <span className='text-gray-600'>Platform fee ({inv.platformFeePercent ?? 10}% of product)</span>
                <span>{eur(inv.platformFeeCents)}</span>
              </div>
              <div className='flex justify-between text-base border-t border-gray-100 pt-3'>
                <span className={`text-gray-900 ${josefinSemiBold.className}`}>Total due to Kewve</span>
                <span className={`text-gray-900 ${josefinSemiBold.className}`}>{eur(inv.totalCents)}</span>
              </div>
              {inv.paidAt ? (
                <p className={`text-sm text-green-800 ${josefinRegular.className}`}>
                  Paid on {new Date(inv.paidAt).toLocaleString()}
                </p>
              ) : (
                <>
                  <p className={`text-[11px] text-gray-500 mb-2 leading-snug ${josefinRegular.className}`}>{GDPR.paymentsCheckout}</p>
                  <button
                    type='button'
                    disabled={payBusy || row.trade?.producerDecision === 'declined'}
                    onClick={startPay}
                    className='w-full sm:w-auto bg-brand-green text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50'>
                    {payBusy ? 'Redirecting to Stripe…' : `Pay ${eur(inv.totalCents)} with card`}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className={`px-5 py-8 text-sm text-gray-500 text-center ${josefinRegular.className}`}>
              The producer has not issued an invoice yet. You&apos;ll be able to view and pay here once it&apos;s sent.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function BuyerInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className='max-w-2xl mx-auto px-4 py-12 flex items-center gap-2 text-gray-500'>
          <Loader2 className='w-5 h-5 animate-spin' />
          Loading…
        </div>
      }>
      <BuyerInvoiceContent />
    </Suspense>
  );
}
