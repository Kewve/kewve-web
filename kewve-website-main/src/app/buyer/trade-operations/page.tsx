'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftRight, ExternalLink } from 'lucide-react';
import { josefinRegular, josefinSemiBold } from '@/utils';
import { buyerRequestAPI } from '@/lib/api';
import { asMongoIdString, buyerRequestRefSuffix } from '@/lib/mongoId';
import { useAuth } from '@/contexts/AuthContext';

function eur(cents: number) {
  return `€${(Number(cents || 0) / 100).toFixed(2)}`;
}

/** DB uses `none` before first shipment update; buyers see "Pending" (capitalized in UI). */
function buyerFulfillmentLabel(fulfillmentStatus: string | undefined): string {
  const s = String(fulfillmentStatus || 'none')
    .trim()
    .replace(/_/g, ' ');
  return s === 'none' ? 'pending' : s;
}

/** Six logical columns → five equal gutters (avoids 12-col track gutters looking uneven). */
const ORDERS_GRID =
  'grid min-w-[42rem] sm:min-w-[48rem] gap-x-5 gap-y-3 [grid-template-columns:minmax(0,0.88fr)_minmax(0,1fr)_minmax(0,0.82fr)_minmax(0,1.28fr)_minmax(0,0.68fr)_minmax(0,1fr)]';

export default function BuyerTradeOperationsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [issueNotes, setIssueNotes] = useState('');
  const [issueForId, setIssueForId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await buyerRequestAPI.list();
      setRows(res.data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const receipt = async (id: string, kind: 'received_ok' | 'received_issues') => {
    try {
      setBusy(id);
      setError('');
      const notes = kind === 'received_issues' ? issueNotes : undefined;
      const res = await buyerRequestAPI.buyerReceipt(id, { receipt: kind, notes });
      if (res?.data) {
        setRows((prev) => prev.map((r) => (r._id === id ? res.data : r)));
      } else {
        await load();
      }

      // Notify admin whenever buyer submits receipt / issue.
      try {
        await fetch('/api/admin-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: kind === 'received_issues' ? 'trade_issue_reported' : 'trade_receipt_submitted',
            payload: {
              userName: user?.name,
              userEmail: user?.email,
              buyerRequestId: id,
              receiptKind: kind,
              notes,
            },
          }),
        });
      } catch (notifyErr) {
        console.warn('Admin notify (trade receipt) failed:', notifyErr);
      }

      setIssueForId(null);
      setIssueNotes('');
    } catch (e: any) {
      setError(e?.message || 'Could not save receipt.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 space-y-6'>
      <div>
        <h1 className={`text-4xl text-gray-900 ${josefinSemiBold.className}`}>Trade Operations</h1>
        <p className={`text-sm text-gray-600 mt-3 max-w-3xl leading-relaxed ${josefinRegular.className}`}>
          <strong>Fulfillment</strong> shows shipment progress (starts as <strong>pending</strong> until the supplier
          updates it). When the status is <strong>delivered</strong> or <strong>completed</strong>, confirm receipt here: <strong>OK — no issues</strong> closes the transaction;{' '}
          <strong>Issues</strong> notifies Kewve admin.
        </p>
      </div>

      <div className='bg-white rounded-xl border border-gray-500/50 overflow-hidden shadow-sm'>
        <div className='px-5 sm:px-6 py-4 border-b border-gray-200'>
          <h2 className={`text-2xl text-gray-900 ${josefinSemiBold.className}`}>Orders</h2>
        </div>
        {loading ? (
          <div className='min-h-[7rem] flex items-center justify-center text-gray-400 text-sm py-8'>Loading…</div>
        ) : rows.length === 0 ? (
          <div className='min-h-[7rem] flex flex-col items-center justify-center text-gray-400 py-10 px-4'>
            <ArrowLeftRight className='w-8 h-8 mb-3' />
            <p className={`text-sm text-center ${josefinRegular.className}`}>No requests yet. Start from Products or Requests.</p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <div className={`${ORDERS_GRID} px-5 sm:px-6 py-3.5 text-sm text-gray-500 border-b border-gray-200 items-end ${josefinSemiBold.className}`}>
              <p>Ref</p>
              <p>Product</p>
              <p>Match</p>
              <p>Trade</p>
              <p>Invoice</p>
              <p>Fulfillment</p>
            </div>
            <div className='divide-y divide-gray-100'>
            {rows.map((row) => {
              const t = row.trade || {};
              const inv = t.invoice;
              const canReceipt =
                (t.fulfillmentStatus === 'delivered' || t.fulfillmentStatus === 'completed') &&
                t.buyerReceipt === 'none' &&
                !t.transactionClosed;
              const declined = t.producerDecision === 'declined';

              return (
                <div
                  key={row._id}
                  id={`trade-request-${asMongoIdString(row._id)}`}
                  className={`${ORDERS_GRID} px-5 sm:px-6 py-4 sm:py-5 text-sm text-gray-700 items-start ${josefinRegular.className}`}>
                  <p className='font-mono text-xs pt-0.5'>#{buyerRequestRefSuffix(row)}</p>
                  <p className='leading-snug min-w-0 break-words'>{row.productName || '—'}</p>
                  <p className='capitalize pt-0.5'>{row.status || '—'}</p>
                  <div className='text-xs space-y-2 min-w-0'>
                    {declined ? (
                      <p className='text-red-700'>
                        Declined{t.declinedReason ? `: ${t.declinedReason}` : ''}. You can submit a new request or choose
                        another producer.
                      </p>
                    ) : (
                      <>
                        {inv?.sentAt ? (
                          <p className='break-words'>
                            Total due: {eur(inv.totalCents)} (10% platform fee on product only)
                            {inv.paidAt ? ' · paid' : ' · unpaid'}
                          </p>
                        ) : (
                          <p>Invoice pending</p>
                        )}
                        {String(t.adminBuyerNote || '').trim() ? (
                          <p className='text-sky-800'>Update from Kewve: {String(t.adminBuyerNote)}</p>
                        ) : null}
                        {String(t.refund?.status || '') === 'completed' ? (
                          <p className='text-emerald-700'>
                            Refund processed{Number(t.refund?.amountCents || 0) > 0 ? `: ${eur(t.refund.amountCents)}` : ''}.
                          </p>
                        ) : null}
                        {t.issuesNeedAdmin ? <p className='text-amber-700'>Admin reviewing your issue report</p> : null}
                        {String(t.issueResolutionNote || '').trim() ? (
                          <p className='text-sky-900'>
                            Kewve: {String(t.issueResolutionNote).slice(0, 120)}
                            {String(t.issueResolutionNote).length > 120 ? '…' : ''}
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                  <div className='flex items-start pt-0.5 min-w-0'>
                    {row.trade?.invoice?.sentAt ? (
                      <Link
                        href={`/buyer/trade-operations/${row._id}`}
                        className='inline-flex items-center gap-1.5 text-xs text-brand-green hover:underline py-1 -my-1'>
                        View / pay
                        <ExternalLink className='w-3 h-3 shrink-0' />
                      </Link>
                    ) : (
                      <span className='text-xs text-gray-400'>—</span>
                    )}
                  </div>
                  <div className='flex flex-col gap-2.5 min-w-0'>
                    {declined ? (
                      <span className='text-xs text-gray-400 pt-0.5'>—</span>
                    ) : (
                      <>
                        <p className={`text-sm capitalize text-gray-900 leading-tight ${josefinSemiBold.className}`}>
                          {buyerFulfillmentLabel(t.fulfillmentStatus)}
                        </p>
                        {canReceipt ? (
                          <div className='flex flex-col gap-2'>
                            <button
                              type='button'
                              disabled={busy === row._id}
                              onClick={() => receipt(row._id, 'received_ok')}
                              className='text-xs border border-gray-300 rounded-md px-2.5 py-1.5 hover:bg-gray-50 disabled:opacity-50 w-fit'>
                              OK — no issues
                            </button>
                            <button
                              type='button'
                              disabled={busy === row._id}
                              onClick={() => setIssueForId(row._id)}
                              className='text-xs border border-amber-300 text-amber-900 rounded-md px-2.5 py-1.5 hover:bg-amber-50 disabled:opacity-50 w-fit'>
                              Issues
                            </button>
                          </div>
                        ) : t.buyerReceipt && t.buyerReceipt !== 'none' ? (
                          <p className='text-xs text-gray-600 leading-relaxed'>
                            Your confirmation:{' '}
                            <span className='capitalize'>{String(t.buyerReceipt).replace(/_/g, ' ')}</span>
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </div>

      {error ? <p className='text-sm text-red-600 mt-1'>{error}</p> : null}

      {issueForId && (
        <div className='fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 sm:p-6'>
          <div className='bg-white rounded-xl border border-gray-200 p-5 sm:p-6 max-w-md w-full shadow-lg'>
            <h3 className={`text-lg text-gray-900 mb-1 ${josefinSemiBold.className}`}>Report an issue</h3>
            <p className={`text-sm text-gray-600 mb-4 ${josefinRegular.className}`}>Describe the problem. Ops will be notified.</p>
            <textarea
              value={issueNotes}
              onChange={(e) => setIssueNotes(e.target.value)}
              rows={4}
              className='w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm mb-5'
              placeholder='What went wrong?'
            />
            <div className='flex justify-end gap-3'>
              <button type='button' onClick={() => { setIssueForId(null); setIssueNotes(''); }} className='text-sm border border-gray-300 rounded px-3 py-1'>
                Cancel
              </button>
              <button
                type='button'
                disabled={busy === issueForId}
                onClick={() => receipt(issueForId, 'received_issues')}
                className='text-sm bg-amber-600 text-white rounded px-3 py-1 disabled:opacity-50'>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
