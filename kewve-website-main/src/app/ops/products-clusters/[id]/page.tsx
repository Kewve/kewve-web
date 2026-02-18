'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { titleFont, josefinSemiBold, josefinRegular } from '@/utils';
import { adminAPI } from '@/lib/api';
import {
  Loader2,
  ArrowLeft,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Tag,
  DollarSign,
  Truck,
  BarChart3,
  FileText,
  X,
} from 'lucide-react';

interface ProductDetail {
  _id: string;
  name: string;
  category: string;
  description: string;
  hsCode: string;
  minimumOrderQuantity: number;
  unitPrice: number;
  leadTime: number;
  monthlyCapacity: number;
  readiness: string;
  verification: string;
  aggregation: string;
  hasImage: boolean;
  createdAt: string;
  updatedAt: string;
  producer: {
    name: string;
    email: string;
    businessName?: string;
    country?: string;
  } | null;
}

const verificationConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Pending Review' },
  verified: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Rejected' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Rejection modal
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const loadProduct = useCallback(async () => {
    try {
      const res = await adminAPI.getProduct(productId);
      if (res.success) {
        setProduct(res.data);
      }
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await adminAPI.reviewProduct(productId, 'approved');
      if (res.success) {
        await loadProduct();
      }
    } catch (err) {
      console.error('Approve error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await adminAPI.reviewProduct(productId, 'rejected', rejectReason.trim());
      if (res.success) {
        setRejectModal(false);
        setRejectReason('');
        await loadProduct();
      }
    } catch (err) {
      console.error('Reject error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-24'>
        <Loader2 className='w-8 h-8 text-gray-400 animate-spin' />
      </div>
    );
  }

  if (!product) {
    return (
      <div className='max-w-4xl mx-auto space-y-6'>
        <button onClick={() => router.push('/ops/products-clusters')} className={`flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 ${josefinRegular.className}`}>
          <ArrowLeft className='w-4 h-4' /> Back to Products
        </button>
        <div className='bg-white rounded-xl border border-gray-200 p-12 text-center'>
          <p className={`text-gray-500 ${josefinRegular.className}`}>Product not found.</p>
        </div>
      </div>
    );
  }

  const vCfg = verificationConfig[product.verification] || verificationConfig.pending;
  const VIcon = vCfg.icon;

  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      {/* Back */}
      <button onClick={() => router.push('/ops/products-clusters')} className={`flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 ${josefinRegular.className}`}>
        <ArrowLeft className='w-4 h-4' /> Back to Products
      </button>

      {/* Header card */}
      <div className='bg-white rounded-xl border border-gray-200 p-6'>
        <div className='flex flex-col sm:flex-row gap-6'>
          {/* Image */}
          <div className='w-full sm:w-40 h-40 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0'>
            {product.hasImage ? (
              <img
                src={adminAPI.getProductImageUrl(product._id)}
                alt={product.name}
                className='w-full h-full object-cover'
              />
            ) : (
              <Package className='w-10 h-10 text-gray-300' />
            )}
          </div>

          {/* Info */}
          <div className='flex-1 min-w-0'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <h1 className={`text-2xl text-gray-900 ${titleFont.className}`}>
                  {product.name || 'Untitled Product'}
                </h1>
                <p className={`text-sm text-gray-500 mt-1 ${josefinRegular.className}`}>
                  {product.category || 'No category'}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1.5 border rounded-full px-3 py-1 text-xs shrink-0 ${vCfg.bg} ${vCfg.color}`}>
                <VIcon className='w-3.5 h-3.5' />
                {vCfg.label}
              </span>
            </div>

            {product.description && (
              <p className={`text-sm text-gray-600 mt-3 line-clamp-3 ${josefinRegular.className}`}>
                {product.description}
              </p>
            )}

            {/* Action buttons */}
            {product.verification === 'pending' && (
              <div className='flex items-center gap-3 mt-4'>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className={`inline-flex items-center gap-2 bg-green-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-green-700 transition-colors disabled:opacity-50 ${josefinSemiBold.className}`}>
                  {actionLoading ? <Loader2 className='w-4 h-4 animate-spin' /> : <CheckCircle2 className='w-4 h-4' />}
                  Approve Product
                </button>
                <button
                  onClick={() => { setRejectModal(true); setRejectReason(''); }}
                  disabled={actionLoading}
                  className={`inline-flex items-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-red-700 transition-colors disabled:opacity-50 ${josefinSemiBold.className}`}>
                  <XCircle className='w-4 h-4' />
                  Reject Product
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Producer info */}
      {product.producer && (
        <div className='bg-white rounded-xl border border-gray-200 p-5'>
          <div className='flex items-center gap-2 mb-3'>
            <User className='w-4 h-4 text-gray-500' />
            <h2 className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>Producer</h2>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <div>
              <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Name</p>
              <p className={`text-sm text-gray-900 mt-0.5 ${josefinSemiBold.className}`}>{product.producer.name}</p>
            </div>
            <div>
              <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Business</p>
              <p className={`text-sm text-gray-900 mt-0.5 ${josefinSemiBold.className}`}>{product.producer.businessName || '-'}</p>
            </div>
            <div>
              <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Email</p>
              <p className={`text-sm text-gray-900 mt-0.5 ${josefinRegular.className}`}>{product.producer.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Product details grid */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        {/* Pricing & Orders */}
        <div className='bg-white rounded-xl border border-gray-200 p-5'>
          <div className='flex items-center gap-2 mb-4'>
            <DollarSign className='w-4 h-4 text-gray-500' />
            <h2 className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>Pricing & Orders</h2>
          </div>
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Unit Price</p>
              <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>
                {product.unitPrice ? `$${product.unitPrice.toFixed(2)}` : '-'}
              </p>
            </div>
            <div className='flex items-center justify-between'>
              <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Min. Order Quantity</p>
              <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>
                {product.minimumOrderQuantity || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Capacity & Logistics */}
        <div className='bg-white rounded-xl border border-gray-200 p-5'>
          <div className='flex items-center gap-2 mb-4'>
            <Truck className='w-4 h-4 text-gray-500' />
            <h2 className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>Capacity & Logistics</h2>
          </div>
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Monthly Capacity</p>
              <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>
                {product.monthlyCapacity ? `${product.monthlyCapacity.toLocaleString()} units` : '-'}
              </p>
            </div>
            <div className='flex items-center justify-between'>
              <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Lead Time</p>
              <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>
                {product.leadTime ? `${product.leadTime} days` : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Classification */}
        <div className='bg-white rounded-xl border border-gray-200 p-5'>
          <div className='flex items-center gap-2 mb-4'>
            <Tag className='w-4 h-4 text-gray-500' />
            <h2 className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>Classification</h2>
          </div>
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Category</p>
              <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>{product.category || '-'}</p>
            </div>
            <div className='flex items-center justify-between'>
              <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>HS Code</p>
              <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>{product.hsCode || '-'}</p>
            </div>
            <div className='flex items-center justify-between'>
              <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Aggregation</p>
              <p className={`text-sm text-gray-900 capitalize ${josefinSemiBold.className}`}>
                {product.aggregation?.replace(/_/g, ' ') || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Status & Dates */}
        <div className='bg-white rounded-xl border border-gray-200 p-5'>
          <div className='flex items-center gap-2 mb-4'>
            <BarChart3 className='w-4 h-4 text-gray-500' />
            <h2 className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>Status & Dates</h2>
          </div>
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Readiness</p>
              <p className={`text-sm text-gray-900 capitalize ${josefinSemiBold.className}`}>{product.readiness}</p>
            </div>
            <div className='flex items-center justify-between'>
              <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Created</p>
              <p className={`text-sm text-gray-900 ${josefinRegular.className}`}>{formatDate(product.createdAt)}</p>
            </div>
            <div className='flex items-center justify-between'>
              <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Last Updated</p>
              <p className={`text-sm text-gray-900 ${josefinRegular.className}`}>{formatDate(product.updatedAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <div className='bg-white rounded-xl border border-gray-200 p-5'>
          <div className='flex items-center gap-2 mb-3'>
            <FileText className='w-4 h-4 text-gray-500' />
            <h2 className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>Description</h2>
          </div>
          <p className={`text-sm text-gray-700 whitespace-pre-wrap ${josefinRegular.className}`}>
            {product.description}
          </p>
        </div>
      )}

      {/* Rejection modal */}
      {rejectModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div className='fixed inset-0 bg-black/40' onClick={() => setRejectModal(false)} />
          <div className='relative bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md p-6 space-y-4'>
            <div className='flex items-center justify-between'>
              <h3 className={`text-lg text-gray-900 ${titleFont.className}`}>Reject Product</h3>
              <button onClick={() => setRejectModal(false)} className='text-gray-400 hover:text-gray-600'>
                <X className='w-5 h-5' />
              </button>
            </div>

            <p className={`text-sm text-gray-600 ${josefinRegular.className}`}>
              Rejecting <span className={josefinSemiBold.className}>{product.name || 'this product'}</span>. Please provide a reason:
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder='e.g. Missing product description, incorrect pricing, images not clear...'
              rows={3}
              className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none ${josefinRegular.className}`}
            />

            <div className='flex items-center justify-end gap-3'>
              <button
                onClick={() => setRejectModal(false)}
                className={`border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors ${josefinRegular.className}`}>
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim() || actionLoading}
                className={`inline-flex items-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-red-700 transition-colors disabled:opacity-50 ${josefinSemiBold.className}`}>
                {actionLoading ? <Loader2 className='w-4 h-4 animate-spin' /> : <XCircle className='w-4 h-4' />}
                Reject Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
