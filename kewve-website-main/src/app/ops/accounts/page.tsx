'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { titleFont, josefinRegular, josefinSemiBold } from '@/utils';
import { adminAPI } from '@/lib/api';
import { buyerRequestRefSuffix } from '@/lib/mongoId';

function eur(cents: number) {
  return `€${(Number(cents || 0) / 100).toFixed(2)}`;
}

export default function OpsAccountsPage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalKey, setModalKey] = useState<string | null>(null);
  const [passcode, setPasscode] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setError('');
      const [queueRes, historyRes] = await Promise.all([adminAPI.getPayoutQueue(), adminAPI.getPayoutHistory()]);
      setQueue(queueRes.data || []);
      setHistory(historyRes.data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load payout data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selected = queue.find((row) => {
    const key = `${String(row._id)}:${String(row.payoutTarget?.producerId || '')}:${String(row.payoutTarget?.productId || '')}`;
    return key === modalKey;
  });

  const submitPayout = async () => {
    if (!selected) return;
    try {
      setSubmitting(true);
      setError('');
      const amountCents = Math.round(Number(amount) * 100);
      await adminAPI.initiateProducerPayout({
        requestId: String(selected._id),
        passcode,
        producerId: selected?.payoutTarget?.mode === 'allocation' ? String(selected.payoutTarget?.producerId || '') : undefined,
        productId: selected?.payoutTarget?.mode === 'allocation' ? String(selected.payoutTarget?.productId || '') : undefined,
        amountCents: Number.isFinite(amountCents) && amountCents > 0 ? amountCents : undefined,
      });
      setModalKey(null);
      setPasscode('');
      setAmount('');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Payout failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='max-w-5xl mx-auto space-y-6'>
      <h1 className={`text-2xl lg:text-3xl text-gray-900 ${titleFont.className}`}>Accounts &amp; payouts</h1>
      <p className={`text-sm text-gray-600 ${josefinRegular.className}`}>
        
       Admin payout code required to initiate payments.
      </p>

      <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
        <div className={`px-4 py-3 border-b border-gray-200 ${josefinSemiBold.className}`}>Payout queue</div>
        {loading ? (
          <div className='px-4 py-6 text-sm text-gray-500'>Loading…</div>
        ) : queue.length === 0 ? (
          <div className='px-4 py-6 text-sm text-gray-500'>No eligible payouts right now.</div>
        ) : (
          <div className='divide-y divide-gray-100'>
            <div className={`grid grid-cols-9 gap-2 px-4 py-2 text-[11px] text-gray-500 bg-gray-50 ${josefinSemiBold.className}`}>
              <span>Request</span>
              <span>Buyer</span>
              <span>Producer</span>
              <span>Product</span>
              <span>Volume</span>
              <span>Gross</span>
              <span>Extra fees</span>
              <span>Default payout</span>
              <span className='text-right'>Action</span>
            </div>
            {queue.map((row) => {
              const pt = row.payoutTarget || {};
              const rowKey = `${String(row._id)}:${String(pt.producerId || '')}:${String(pt.productId || '')}`;
              return (
                <div key={rowKey} className={`grid grid-cols-9 gap-2 px-4 py-3 text-sm text-gray-700 ${josefinRegular.className}`}>
                  <span>#{buyerRequestRefSuffix(row)}</span>
                  <span className='truncate'>{row.buyerName || '—'}</span>
                  <span className='truncate'>{pt.producerName || 'Producer'}</span>
                  <span className='truncate'>{pt.productName || row.productName || '—'}</span>
                  <span>{Number(pt.allocatedKg || 0)} kg</span>
                  <span title='Base producer gross'>{eur(Number(pt.grossShareCents || 0))}</span>
                  <span title='Additional-fees share'>{eur(Number(pt.additionalFeesShareCents || 0))}</span>
                  <span className='font-medium' title='Default payout'>{eur(Number(pt.payoutCents || 0))}</span>
                  <span className='text-right'>
                    <button
                      type='button'
                      onClick={() => {
                        setModalKey(rowKey);
                        setAmount((Number(pt.payoutCents || 0) / 100).toFixed(2));
                      }}
                      className='border border-gray-300 rounded px-2 py-1 text-xs hover:bg-gray-50'>
                      Payout…
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
        <div className={`px-4 py-3 border-b border-gray-200 ${josefinSemiBold.className}`}>Payout history</div>
        {loading ? (
          <div className='px-4 py-6 text-sm text-gray-500'>Loading…</div>
        ) : history.length === 0 ? (
          <div className='px-4 py-6 text-sm text-gray-500'>No payout history yet.</div>
        ) : (
          <div className='divide-y divide-gray-100'>
            <div className={`grid grid-cols-10 gap-2 px-4 py-2 text-[11px] text-gray-500 bg-gray-50 ${josefinSemiBold.className}`}>
              <span>Request</span>
              <span>Buyer</span>
              <span>Producer</span>
              <span>Product</span>
              <span>Volume</span>
              <span>Gross</span>
              <span>Extra fees</span>
              <span>Payout</span>
              <span>Status</span>
              <span className='text-right'>Initiated</span>
            </div>
            {history.map((row) => {
              const pt = row.payoutTarget || {};
              const status = String(pt.payoutStatus || 'none');
              const rowKey = `hist-${String(row._id)}:${String(pt.producerId || '')}:${String(pt.productId || '')}`;
              return (
                <div key={rowKey} className={`grid grid-cols-10 gap-2 px-4 py-3 text-sm text-gray-700 ${josefinRegular.className}`}>
                  <span>#{buyerRequestRefSuffix(row)}</span>
                  <span className='truncate'>{row.buyerName || '—'}</span>
                  <span className='truncate'>{pt.producerName || 'Producer'}</span>
                  <span className='truncate'>{pt.productName || row.productName || '—'}</span>
                  <span>{Number(pt.allocatedKg || 0)} kg</span>
                  <span>{eur(Number(pt.grossShareCents || 0))}</span>
                  <span>{eur(Number(pt.additionalFeesShareCents || 0))}</span>
                  <span>{eur(Number(pt.payoutCents || 0))}</span>
                  <span className='capitalize'>{status}</span>
                  <span className='text-xs text-gray-500 text-right'>
                    {pt.initiatedAt ? new Date(pt.initiatedAt).toLocaleString() : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error ? <p className={`text-sm text-red-600 ${josefinRegular.className}`}>{error}</p> : null}

      {modalKey && selected && (
        <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4'>
          <div className='bg-white w-full max-w-md rounded-lg border border-gray-200 p-4 shadow-lg'>
            <div className='flex items-center justify-between mb-3'>
              <h2 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>Confirm Stripe payout</h2>
              <button type='button' onClick={() => { setModalKey(null); setPasscode(''); setAmount(''); }} className='text-gray-500 hover:text-gray-800'>
                <X className='w-5 h-5' />
              </button>
            </div>
            <p className={`text-sm text-gray-600 mb-3 ${josefinRegular.className}`}>
              Request <span className='font-mono text-xs'>#{buyerRequestRefSuffix(selected)}</span> •{' '}
              <span className='font-medium'>{selected?.payoutTarget?.producerName || 'Producer'}</span>. Enter passcode and
              confirm payout amount.
            </p>
            <div className={`text-xs text-gray-600 mb-3 ${josefinRegular.className}`}>
              {selected?.payoutTarget?.mode === 'allocation' ? (
                <>
                  Product gross: {eur(Number(selected?.payoutTarget?.grossShareCents || 0))} • Pro-rata extra share:{' '}
                  {eur(Number(selected?.payoutTarget?.additionalFeesShareCents || 0))}
                </>
              ) : (
                <>
                  Product gross (payout excludes buyer additional fees):{' '}
                  {eur(Number(selected?.payoutTarget?.grossShareCents || 0))}
                </>
              )}
            </div>
            <input
              type='number'
              min='0'
              step='0.01'
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder='Payout amount (EUR)'
              className='w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3'
            />
            <input
              type='password'
              autoComplete='off'
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder='Passcode'
              className='w-full border border-gray-300 rounded px-3 py-2 text-sm mb-4'
            />
            <div className='flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => { setModalKey(null); setPasscode(''); setAmount(''); }}
                className='border border-gray-300 rounded px-3 py-2 text-sm'>
                Cancel
              </button>
              <button
                type='button'
                disabled={submitting || !passcode.trim() || !(Number(amount) > 0)}
                onClick={submitPayout}
                className='bg-brand-green text-white rounded px-3 py-2 text-sm disabled:opacity-50'>
                {submitting ? 'Processing…' : 'Initiate payout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
