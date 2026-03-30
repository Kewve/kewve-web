'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, MessageSquare, X } from 'lucide-react';
import { GDPR } from '@/lib/gdprCopy';
import { josefinRegular, josefinSemiBold } from '@/utils';
import { buyerRequestAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const DESTINATION_MARKETS = [
  { value: '', label: 'Select destination market' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'EU', label: 'European Union' },
  { value: 'Both', label: 'UK & EU' },
] as const;

interface RequestRow {
  id: string;
  productId?: string;
  productName?: string;
  category: string;
  volume: string;
  market: string;
  timeline: string;
  packagingFormat?: string;
  otherInformation?: string;
  status: string;
  fulfillmentMode?: 'single' | 'aggregation';
  matchedProducerCount?: number;
  remainingVolumeKg?: number;
}

const emptyDelivery = {
  line1: '',
  line2: '',
  city: '',
  postalCode: '',
  country: '',
  phone: '',
  company: '',
};

export default function BuyerRequestsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    productId: '',
    productName: '',
    category: '',
    volume: '',
    market: '',
    timeline: '',
    packagingFormat: '',
    otherInformation: '',
  });
  const [delivery, setDelivery] = useState(emptyDelivery);
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [prefillApplied, setPrefillApplied] = useState(false);
  const [gdprSourcingConsent, setGdprSourcingConsent] = useState(false);
  const [infoPreviewForId, setInfoPreviewForId] = useState<string | null>(null);

  const hasRows = useMemo(() => rows.length > 0, [rows]);

  const loadRequests = async () => {
    try {
      setError('');
      const res = await buyerRequestAPI.list();
      const mapped = (res.data || []).map((item: any) => ({
        id: String(item._id),
        productId: item.productId ? String(item.productId) : undefined,
        productName: item.productName || '-',
        category: item.category || '-',
        volume: `${Number(item.volumeKg || 0)} kg`,
        market: item.market || '-',
        timeline: item.timeline || '-',
        packagingFormat: item.packagingFormat || '',
        otherInformation: item.otherInformation || '',
        status: item.status || 'pending',
        fulfillmentMode: item.fulfillmentMode,
        matchedProducerCount: Number(item?.matchPlan?.matchedProducerCount || 0),
        remainingVolumeKg: Number(item?.matchPlan?.remainingVolumeKg || 0),
      }));
      setRows(mapped);
    } catch (err: any) {
      setError(err?.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (prefillApplied) return;
    const productId = searchParams.get('productId') || '';
    const productName = searchParams.get('productName') || '';
    const category = searchParams.get('category') || '';
    if (!productId && !productName && !category) return;

    setForm((prev) => ({
      ...prev,
      productId,
      productName,
      category,
    }));
    setOpen(true);
    setPrefillApplied(true);
  }, [searchParams, prefillApplied]);

  useEffect(() => {
    if (!open) return;
    const s = user?.savedDeliveryAddress;
    if (s?.line1 && s.city && s.postalCode && s.country) {
      setUseSavedAddress(true);
      setDelivery({
        line1: s.line1 || '',
        line2: s.line2 || '',
        city: s.city || '',
        postalCode: s.postalCode || '',
        country: s.country || '',
        phone: s.phone || '',
        company: s.company || '',
      });
    } else {
      setUseSavedAddress(false);
      setDelivery(emptyDelivery);
    }
  }, [open, user?.savedDeliveryAddress]);

  const applySavedToDelivery = () => {
    const s = user?.savedDeliveryAddress;
    if (!s?.line1) return;
    setDelivery({
      line1: s.line1 || '',
      line2: s.line2 || '',
      city: s.city || '',
      postalCode: s.postalCode || '',
      country: s.country || '',
      phone: s.phone || '',
      company: s.company || '',
    });
  };

  const toggleSavedAddress = (checked: boolean) => {
    setUseSavedAddress(checked);
    if (checked && user?.savedDeliveryAddress?.line1) {
      applySavedToDelivery();
    } else if (!checked) {
      setDelivery(emptyDelivery);
    }
  };

  const submit = async () => {
    if (!form.category || !form.volume || !form.market || !form.timeline) return;
    if (!gdprSourcingConsent) {
      setFormError('Please confirm you agree to how we process your data for this request.');
      return;
    }
    if (!form.productId) {
      setFormError('Please start from a product detail page to request a specific product.');
      return;
    }
    const d = {
      line1: delivery.line1.trim(),
      line2: delivery.line2.trim(),
      city: delivery.city.trim(),
      postalCode: delivery.postalCode.trim(),
      country: delivery.country.trim(),
      phone: delivery.phone.trim(),
      company: delivery.company.trim(),
    };
    if (!d.line1 || !d.city || !d.postalCode || !d.country) {
      setFormError('Delivery address needs line 1, city, postal code, and country.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      setFormError('');
      await buyerRequestAPI.create({
        productId: form.productId,
        volumeKg: Number(form.volume),
        market: form.market,
        timeline: form.timeline,
        packagingFormat: form.packagingFormat,
        otherInformation: form.otherInformation,
        deliveryAddress: d,
      });

      // Notify admin about the newly created sourcing request.
      try {
        await fetch('/api/admin-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'buyer_request_submitted',
            payload: {
              userName: user?.name,
              userEmail: user?.email,
              productName: form.productName,
              category: form.category,
              volumeKg: form.volume,
              market: form.market,
              timeline: form.timeline,
              otherInformation: form.otherInformation,
              deliveryCountry: d.country,
            },
          }),
        });
      } catch (notifyErr) {
        console.warn('Admin notify (buyer_request_submitted) failed:', notifyErr);
      }

      setForm({
        productId: '',
        productName: '',
        category: '',
        volume: '',
        market: '',
        timeline: '',
        packagingFormat: '',
        otherInformation: '',
      });
      setDelivery(emptyDelivery);
      setUseSavedAddress(false);
      setOpen(false);
      setGdprSourcingConsent(false);
      setFormError('');
      await loadRequests();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeRequest = async (id: string) => {
    try {
      setUpdatingId(id);
      setError('');
      await buyerRequestAPI.updateStatus(id, 'closed');
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status: 'closed' } : row)));
    } catch (err: any) {
      setError(err?.message || 'Failed to close request.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className='max-w-6xl mx-auto space-y-5'>
      <div className='flex items-center justify-between'>
        <h1 className={`text-4xl text-gray-900 ${josefinSemiBold.className}`}>Sourcing Requests</h1>
        <button onClick={() => setOpen(true)} className={`inline-flex items-center gap-2 bg-brand-green text-white rounded-lg px-4 py-2 ${josefinSemiBold.className}`}>
          <Plus className='w-4 h-4' /> New Request
        </button>
      </div>

      <div className='bg-white rounded-xl border border-gray-500/50 overflow-hidden'>
        <div
          className={`grid px-4 py-3 text-sm text-gray-500 border-b border-gray-200 ${josefinSemiBold.className}`}
          style={{ gridTemplateColumns: '1fr 1fr 0.9fr 0.8fr 0.7fr 1.6fr 1fr 0.8fr 0.8fr' }}>
          <p>Product</p>
          <p>Category</p>
          <p>Volume</p>
          <p>Market</p>
          <p>Timeline</p>
          <p>Other info</p>
          <p>Matching</p>
          <p>Status</p>
          <p>Actions</p>
        </div>

        {loading ? (
          <div className='h-36 flex flex-col items-center justify-center text-gray-400'>
            <p className={`text-sm ${josefinRegular.className}`}>Loading requests...</p>
          </div>
        ) : hasRows ? (
          <div className='divide-y divide-gray-100'>
            {rows.map((r) => (
              <div
                key={r.id}
                className={`grid px-4 py-3 text-sm text-gray-700 ${josefinRegular.className}`}
                style={{ gridTemplateColumns: '1fr 1fr 0.9fr 0.8fr 0.7fr 1.6fr 1fr 0.8fr 0.8fr' }}>
                <p>{r.productName || '-'}</p>
                <p>{r.category}</p>
                <p>{r.volume}</p>
                <p>{r.market}</p>
                <p>{r.timeline}</p>
                <div className='min-w-0 pr-3'>
                  {String(r.otherInformation || '').trim() ? (
                    <>
                      <p className='truncate' title={r.otherInformation || ''}>
                        {r.otherInformation}
                      </p>
                      <button
                        type='button'
                        onClick={() => setInfoPreviewForId(r.id)}
                        className='mt-1 text-xs text-orange hover:underline'>
                        View full
                      </button>
                    </>
                  ) : (
                    <p>-</p>
                  )}
                </div>
                <p className='capitalize'>
                  {r.fulfillmentMode || '-'}
                  {r.matchedProducerCount ? ` (${r.matchedProducerCount})` : ''}
                  {r.remainingVolumeKg && r.remainingVolumeKg > 0 ? `, ${r.remainingVolumeKg} kg short` : ''}
                </p>
                <p className='capitalize'>{r.status}</p>
                <div>
                  {r.status !== 'closed' ? (
                    <button
                      disabled={updatingId === r.id}
                      onClick={() => closeRequest(r.id)}
                      className='border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-70'>
                      {updatingId === r.id ? 'Updating...' : 'Close'}
                    </button>
                  ) : (
                    <span className='text-xs text-gray-400'>-</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='h-36 flex flex-col items-center justify-center text-gray-400'>
            <MessageSquare className='w-8 h-8 mb-2' />
            <p className={`text-sm ${josefinRegular.className}`}>No sourcing requests yet.</p>
          </div>
        )}
      </div>
      {error ? <p className={`text-sm text-red-600 ${josefinRegular.className}`}>{error}</p> : null}

      {open && (
        <div className='fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/50'>
          <div className='flex min-h-full items-start justify-center p-4 sm:p-6'>
            <div
              role='dialog'
              aria-modal='true'
              aria-labelledby='buyer-request-modal-title'
              className='my-4 flex w-full max-w-md max-h-[min(calc(100dvh-2rem),720px)] flex-col rounded-lg border border-gray-200 bg-white shadow-lg'>
              <div className='flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 py-3'>
                <h2 id='buyer-request-modal-title' className={`text-xl sm:text-2xl text-gray-900 pr-2 ${josefinSemiBold.className}`}>
                  Create Sourcing Request
                </h2>
                <button
                  type='button'
                  onClick={() => {
                    setOpen(false);
                    setFormError('');
                  }}
                  className='shrink-0 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                  aria-label='Close'>
                  <X className='h-5 w-5' />
                </button>
              </div>

              <div className='min-h-0 flex-1 overflow-y-auto px-4 py-3'>
            <div className='space-y-3'>
              {!form.productId ? (
                <p className={`text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 ${josefinRegular.className}`}>
                  Choose a product from the catalog and click &quot;Request Product&quot; to create a request.
                </p>
              ) : null}
              <div>
                <label className={`text-sm text-gray-700 ${josefinSemiBold.className}`}>Product Name</label>
                <input
                  value={form.productName}
                  onChange={(e) => setForm((p) => ({ ...p, productName: e.target.value }))}
                  className={`w-full mt-1 border border-gray-300 rounded px-3 py-2 ${josefinRegular.className}`}
                />
              </div>
              <div>
                <label className={`text-sm text-gray-700 ${josefinSemiBold.className}`}>Product Category</label>
                <input
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className={`w-full mt-1 border border-gray-300 rounded px-3 py-2 ${josefinRegular.className}`}
                />
              </div>
              <div>
                <label className={`text-sm text-gray-700 ${josefinSemiBold.className}`}>Volume (kg)</label>
                <input
                  value={form.volume}
                  onChange={(e) => setForm((p) => ({ ...p, volume: e.target.value }))}
                  className={`w-full mt-1 border border-gray-300 rounded px-3 py-2 ${josefinRegular.className}`}
                />
                {formError ? (
                  <p className={`mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 ${josefinRegular.className}`}>
                    {formError}
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor='buyer-request-market' className={`text-sm text-gray-700 ${josefinSemiBold.className}`}>
                  Destination Market
                </label>
                <select
                  id='buyer-request-market'
                  value={form.market}
                  onChange={(e) => setForm((p) => ({ ...p, market: e.target.value }))}
                  className={`w-full mt-1 border border-gray-300 rounded px-3 py-2 bg-white ${josefinRegular.className}`}>
                  {DESTINATION_MARKETS.map((opt) => (
                    <option key={opt.value || 'placeholder'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`text-sm text-gray-700 ${josefinSemiBold.className}`}>Timeline(Days)</label>
                <input
                  value={form.timeline}
                  onChange={(e) => setForm((p) => ({ ...p, timeline: e.target.value }))}
                  className={`w-full mt-1 border border-gray-300 rounded px-3 py-2 ${josefinRegular.className}`}
                />
              </div>
              <div>
                <label className={`text-sm text-gray-700 ${josefinSemiBold.className}`}>Packaging Format</label>
                <input
                  value={form.packagingFormat}
                  onChange={(e) => setForm((p) => ({ ...p, packagingFormat: e.target.value }))}
                  className={`w-full mt-1 border border-gray-300 rounded px-3 py-2 ${josefinRegular.className}`}
                />
              </div>
              <div>
                <label className={`text-sm text-gray-700 ${josefinSemiBold.className}`}>Other Information</label>
                <textarea
                  value={form.otherInformation}
                  onChange={(e) => setForm((p) => ({ ...p, otherInformation: e.target.value }))}
                  maxLength={2000}
                  rows={4}
                  placeholder='Add any extra request details the producer and Kewve ops should know.'
                  className={`w-full mt-1 border border-gray-300 rounded px-3 py-2 ${josefinRegular.className}`}
                />
              </div>

              <div className='border-t border-gray-200 pt-3 mt-1'>
                <p className={`text-sm text-gray-800 mb-2 ${josefinSemiBold.className}`}>Delivery address</p>
                {user?.savedDeliveryAddress?.line1 ? (
                  <label className={`flex items-center gap-2 text-sm text-gray-700 mb-3 ${josefinRegular.className}`}>
                    <input
                      type='checkbox'
                      checked={useSavedAddress}
                      onChange={(e) => toggleSavedAddress(e.target.checked)}
                      className='rounded border-gray-300'
                    />
                    Prefill from saved address (Settings)
                  </label>
                ) : (
                  <p className={`text-xs text-gray-500 mb-2 ${josefinRegular.className}`}>
                    Save a default address in Settings to enable one-click prefill next time.
                  </p>
                )}
                <div className='space-y-2'>
                  <input
                    placeholder='Company (optional)'
                    value={delivery.company}
                    onChange={(e) => setDelivery((p) => ({ ...p, company: e.target.value }))}
                    className={`w-full border border-gray-300 rounded px-3 py-2 text-sm ${josefinRegular.className}`}
                  />
                  <input
                    placeholder='Address line 1'
                    value={delivery.line1}
                    onChange={(e) => setDelivery((p) => ({ ...p, line1: e.target.value }))}
                    className={`w-full border border-gray-300 rounded px-3 py-2 text-sm ${josefinRegular.className}`}
                  />
                  <input
                    placeholder='Address line 2 (optional)'
                    value={delivery.line2}
                    onChange={(e) => setDelivery((p) => ({ ...p, line2: e.target.value }))}
                    className={`w-full border border-gray-300 rounded px-3 py-2 text-sm ${josefinRegular.className}`}
                  />
                  <div className='grid grid-cols-2 gap-2'>
                    <input
                      placeholder='City'
                      value={delivery.city}
                      onChange={(e) => setDelivery((p) => ({ ...p, city: e.target.value }))}
                      className={`w-full border border-gray-300 rounded px-3 py-2 text-sm ${josefinRegular.className}`}
                    />
                    <input
                      placeholder='Postal code'
                      value={delivery.postalCode}
                      onChange={(e) => setDelivery((p) => ({ ...p, postalCode: e.target.value }))}
                      className={`w-full border border-gray-300 rounded px-3 py-2 text-sm ${josefinRegular.className}`}
                    />
                  </div>
                  <input
                    placeholder='Country'
                    value={delivery.country}
                    onChange={(e) => setDelivery((p) => ({ ...p, country: e.target.value }))}
                    className={`w-full border border-gray-300 rounded px-3 py-2 text-sm ${josefinRegular.className}`}
                  />
                  <input
                    placeholder='Phone (optional)'
                    value={delivery.phone}
                    onChange={(e) => setDelivery((p) => ({ ...p, phone: e.target.value }))}
                    className={`w-full border border-gray-300 rounded px-3 py-2 text-sm ${josefinRegular.className}`}
                  />
                </div>
              </div>
              </div>
              </div>

              <div className='px-4 pb-2'>
                <label className='flex items-start gap-2 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={gdprSourcingConsent}
                    onChange={(e) => setGdprSourcingConsent(e.target.checked)}
                    className='mt-1 h-4 w-4 rounded border-gray-400 text-brand-green focus:ring-brand-green accent-green-700 shrink-0'
                  />
                  <span className={`text-xs text-gray-600 leading-snug ${josefinRegular.className}`}>
                    {GDPR.buyerSourcingRequest} See our{' '}
                    <Link href='/privacy' className='text-orange underline font-semibold'>
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
              </div>

              <div className='shrink-0 border-t border-gray-100 px-4 py-3'>
                <button
                  type='button'
                  onClick={submit}
                  disabled={submitting || !form.productId || !gdprSourcingConsent}
                  className={`w-full bg-brand-green text-white rounded py-2.5 disabled:opacity-70 ${josefinSemiBold.className}`}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {infoPreviewForId ? (
        <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4'>
          <div className='w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-lg'>
            <div className='flex items-center justify-between border-b border-gray-100 px-4 py-3'>
              <h3 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>Other information</h3>
              <button
                type='button'
                onClick={() => setInfoPreviewForId(null)}
                className='rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                aria-label='Close'>
                <X className='h-5 w-5' />
              </button>
            </div>
            <div className='px-4 py-3 max-h-[55vh] overflow-y-auto'>
              <p className={`text-sm text-gray-800 whitespace-pre-wrap ${josefinRegular.className}`}>
                {rows.find((r) => r.id === infoPreviewForId)?.otherInformation || '-'}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

