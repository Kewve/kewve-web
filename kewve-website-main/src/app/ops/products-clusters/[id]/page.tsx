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
  Euro,
  Truck,
  BarChart3,
  FileText,
  X,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ComplianceDocRow {
  _id: string;
  name: string;
  status: string;
  rejectionReason?: string;
  reviewedAt?: string;
}

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
  complianceDocuments?: ComplianceDocRow[];
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

const docStatusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Pending' },
  approved: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Approved' },
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
  const { toast } = useToast();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [docActionId, setDocActionId] = useState<string | null>(null);

  // Rejection modal
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [docRejectModal, setDocRejectModal] = useState<{ docId: string; name: string } | null>(null);
  const [docRejectReason, setDocRejectReason] = useState('');

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
    if (!product) return;
    const docs = product.complianceDocuments || [];
    const allDocsApproved =
      docs.length > 0 && docs.every((d) => d.status === 'approved');
    if (docs.length > 0 && !allDocsApproved) {
      window.alert(
        'You must approve every compliance document before you can approve this product. Scroll to Compliance & Documentation and approve each file.'
      );
      return;
    }

    setActionLoading(true);
    try {
      const res = await adminAPI.reviewProduct(productId, 'approved');
      if (res.success) {
        await loadProduct();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not approve product.';
      toast({ title: 'Cannot approve', description: msg, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const openComplianceDoc = (docId: string) => {
    const url = adminAPI.getProductComplianceDocumentUrl(productId, docId);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDocApprove = async (docId: string) => {
    setDocActionId(docId);
    try {
      const res = await adminAPI.reviewProductComplianceDocument(productId, docId, 'approved');
      if (res.success) {
        await loadProduct();
        toast({ title: 'Document approved' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update document.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setDocActionId(null);
    }
  };

  const handleDocPending = async (docId: string) => {
    setDocActionId(docId);
    try {
      const res = await adminAPI.reviewProductComplianceDocument(productId, docId, 'pending');
      if (res.success) {
        await loadProduct();
        toast({ title: 'Review reset to pending' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update document.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setDocActionId(null);
    }
  };

  const handleDocRejectSubmit = async () => {
    if (!docRejectModal || !docRejectReason.trim()) return;
    setDocActionId(docRejectModal.docId);
    try {
      const res = await adminAPI.reviewProductComplianceDocument(
        productId,
        docRejectModal.docId,
        'rejected',
        docRejectReason.trim()
      );
      if (res.success) {
        await loadProduct();
        toast({ title: 'Document rejected' });
        setDocRejectModal(null);
        setDocRejectReason('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject document.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setDocActionId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await adminAPI.reviewProduct(productId, 'rejected', rejectReason.trim());
      if (res.success) {
        if (product?.producer?.email) {
          await fetch('/api/producer-rejection-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              producerEmail: product.producer.email,
              producerName: product.producer.name || 'Producer',
              itemType: 'product',
              itemName: product.name || 'Product',
              reason: rejectReason.trim(),
            }),
          });
        }
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

  const handleDeleteProduct = async () => {
    const confirmed = window.confirm(`Delete "${product?.name || 'this product'}"? This cannot be undone.`);
    if (!confirmed) return;
    setDeleting(true);
    try {
      const res = await adminAPI.deleteProduct(productId);
      if (res.success) {
        router.push('/ops/products-clusters');
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
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

  const complianceDocs = product.complianceDocuments || [];
  const allComplianceApproved =
    complianceDocs.length > 0 && complianceDocs.every((d) => d.status === 'approved');
  const needDocReview = complianceDocs.length > 0 && !allComplianceApproved;

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
            <div className='flex items-center gap-3 mt-4'>
              <button
                onClick={handleDeleteProduct}
                disabled={deleting || actionLoading}
                className={`inline-flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-2 text-sm hover:bg-red-100 transition-colors disabled:opacity-50 ${josefinSemiBold.className}`}>
                {deleting ? <Loader2 className='w-4 h-4 animate-spin' /> : <XCircle className='w-4 h-4' />}
                {deleting ? 'Deleting...' : 'Delete Product'}
              </button>
            {product.verification === 'pending' && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className={`inline-flex items-center gap-2 bg-brand-green text-white rounded-lg px-4 py-2 text-sm hover:opacity-90 transition-colors disabled:opacity-50 ${josefinSemiBold.className}`}>
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
              </>
            )}
            </div>
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
            <Euro className='w-4 h-4 text-gray-500' />
            <h2 className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>Pricing & Orders</h2>
          </div>
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Unit Price</p>
              <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>
                {product.unitPrice ? `€${product.unitPrice.toFixed(2)}` : '-'}
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

      {/* Compliance documents */}
      {complianceDocs.length > 0 && (
        <div className='bg-white rounded-xl border border-gray-200 p-5'>
          <div className='flex items-center gap-2 mb-4'>
            <FileText className='w-4 h-4 text-gray-500' />
            <h2 className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>Compliance & Documentation</h2>
          </div>
          <div className='space-y-3'>
            {complianceDocs.map((doc) => {
              const cfg = docStatusConfig[doc.status] || docStatusConfig.pending;
              const DIcon = cfg.icon;
              const isBusy = docActionId === doc._id;
              return (
                <div
                  key={doc._id}
                  className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/80 px-4 py-3'>
                  <div className='flex items-start gap-3 min-w-0'>
                    <FileText className='w-5 h-5 text-gray-400 shrink-0 mt-0.5' />
                    <div className='min-w-0'>
                      <p className={`text-sm text-gray-900 truncate ${josefinSemiBold.className}`}>{doc.name}</p>
                      <div className='mt-1 flex flex-wrap items-center gap-2'>
                        <span className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-xs ${cfg.bg} ${cfg.color}`}>
                          <DIcon className='w-3 h-3' />
                          {cfg.label}
                        </span>
                        {doc.status === 'rejected' && doc.rejectionReason && (
                          <span className={`text-xs text-red-600 ${josefinRegular.className}`}>{doc.rejectionReason}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className='flex flex-wrap items-center gap-2 shrink-0'>
                    <button
                      type='button'
                      onClick={() => openComplianceDoc(doc._id)}
                      className={`text-sm text-[#ed722d] hover:underline ${josefinRegular.className}`}>
                      View
                    </button>
                    {doc.status !== 'approved' && (
                      <button
                        type='button'
                        onClick={() => handleDocApprove(doc._id)}
                        disabled={isBusy}
                        className={`inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs text-green-800 hover:bg-green-100 disabled:opacity-50 ${josefinSemiBold.className}`}>
                        {isBusy ? <Loader2 className='w-3 h-3 animate-spin' /> : <CheckCircle2 className='w-3 h-3' />}
                        Approve
                      </button>
                    )}
                    {doc.status !== 'rejected' && (
                      <button
                        type='button'
                        onClick={() => {
                          setDocRejectModal({ docId: doc._id, name: doc.name });
                          setDocRejectReason('');
                        }}
                        disabled={isBusy}
                        className={`inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-800 hover:bg-red-100 disabled:opacity-50 ${josefinSemiBold.className}`}>
                        <XCircle className='w-3 h-3' />
                        Reject
                      </button>
                    )}
                    {doc.status !== 'pending' && (
                      <button
                        type='button'
                        onClick={() => handleDocPending(doc._id)}
                        disabled={isBusy}
                        className={`inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 ${josefinRegular.className}`}>
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Document reject modal */}
      {docRejectModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div className='fixed inset-0 bg-black/40' onClick={() => setDocRejectModal(null)} />
          <div className='relative bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md p-6 space-y-4'>
            <div className='flex items-center justify-between'>
              <h3 className={`text-lg text-gray-900 ${titleFont.className}`}>Reject document</h3>
              <button onClick={() => setDocRejectModal(null)} className='text-gray-400 hover:text-gray-600'>
                <X className='w-5 h-5' />
              </button>
            </div>
            <p className={`text-sm text-gray-600 ${josefinRegular.className}`}>
              Rejecting <span className={josefinSemiBold.className}>{docRejectModal.name}</span>. Reason:
            </p>
            <textarea
              value={docRejectReason}
              onChange={(e) => setDocRejectReason(e.target.value)}
              placeholder='e.g. Illegible scan, wrong certificate...'
              rows={3}
              className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none ${josefinRegular.className}`}
            />
            <div className='flex items-center justify-end gap-3'>
              <button
                onClick={() => setDocRejectModal(null)}
                className={`border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors ${josefinRegular.className}`}>
                Cancel
              </button>
              <button
                onClick={handleDocRejectSubmit}
                disabled={!docRejectReason.trim() || docActionId !== null}
                className={`inline-flex items-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-red-700 transition-colors disabled:opacity-50 ${josefinSemiBold.className}`}>
                {docActionId ? <Loader2 className='w-4 h-4 animate-spin' /> : <XCircle className='w-4 h-4' />}
                Reject document
              </button>
            </div>
          </div>
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
