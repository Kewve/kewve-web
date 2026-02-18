'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { titleFont, josefinSemiBold, josefinRegular } from '@/utils';
import { adminAPI } from '@/lib/api';
import {
  Loader2,
  ArrowLeft,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ExternalLink,
  AlertTriangle,
  X,
} from 'lucide-react';

interface DocumentData {
  _id: string;
  name: string;
  type: string;
  size: number;
  category?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedAt?: string;
  uploadedAt: string;
}

interface ProducerData {
  user: {
    _id: string;
    name: string;
    email: string;
    businessName?: string;
    country?: string;
    createdAt: string;
  };
  assessment: {
    _id: string;
    documents: DocumentData[];
    verified?: boolean;
    verifiedAt?: string;
    verifiedBy?: string;
    [key: string]: any;
  } | null;
  products: any[];
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Pending Review' },
  approved: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Rejected' },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ProducerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const producerId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [producer, setProducer] = useState<ProducerData | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Rejection modal state
  const [rejectModal, setRejectModal] = useState<{ docId: string; docName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadProducer = useCallback(async () => {
    try {
      const res = await adminAPI.getProducer(producerId);
      if (res.success) {
        setProducer(res.data);
      }
    } catch {
      setProducer(null);
    } finally {
      setLoading(false);
    }
  }, [producerId]);

  useEffect(() => {
    loadProducer();
  }, [loadProducer]);

  const documents = producer?.assessment?.documents ?? [];
  const approvedCount = documents.filter((d) => d.status === 'approved').length;
  const rejectedCount = documents.filter((d) => d.status === 'rejected').length;
  const pendingCount = documents.filter((d) => d.status === 'pending').length;
  const allApproved = documents.length > 0 && approvedCount === documents.length;
  const isVerified = producer?.assessment?.verified === true;

  const handleApprove = async (docId: string) => {
    setActionLoading(docId);
    try {
      const res = await adminAPI.reviewDocument(producerId, docId, 'approved');
      if (res.success) {
        await loadProducer();
      }
    } catch (err: any) {
      console.error('Approve error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setActionLoading(rejectModal.docId);
    try {
      const res = await adminAPI.reviewDocument(producerId, rejectModal.docId, 'rejected', rejectReason.trim());
      if (res.success) {
        setRejectModal(null);
        setRejectReason('');
        await loadProducer();
      }
    } catch (err: any) {
      console.error('Reject error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerify = async () => {
    setVerifyLoading(true);
    try {
      const res = await adminAPI.verifyProducer(producerId);
      if (res.success) {
        await loadProducer();
      }
    } catch (err: any) {
      console.error('Verify error:', err);
    } finally {
      setVerifyLoading(false);
    }
  };

  const openDocument = (docId: string) => {
    const url = adminAPI.getDocumentUrl(producerId, docId);
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-24'>
        <Loader2 className='w-8 h-8 text-gray-400 animate-spin' />
      </div>
    );
  }

  if (!producer) {
    return (
      <div className='max-w-4xl mx-auto space-y-6'>
        <button onClick={() => router.push('/ops/producers')} className={`flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 ${josefinRegular.className}`}>
          <ArrowLeft className='w-4 h-4' /> Back to Producers
        </button>
        <div className='bg-white rounded-xl border border-gray-200 p-12 text-center'>
          <p className={`text-gray-500 ${josefinRegular.className}`}>Producer not found.</p>
        </div>
      </div>
    );
  }

  const { user, assessment, products } = producer;

  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      {/* Back link */}
      <button onClick={() => router.push('/ops/producers')} className={`flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 ${josefinRegular.className}`}>
        <ArrowLeft className='w-4 h-4' /> Back to Producers
      </button>

      {/* Producer info card */}
      <div className='bg-white rounded-xl border border-gray-200 p-6'>
        <div className='flex items-start justify-between'>
          <div>
            <h1 className={`text-2xl text-gray-900 ${titleFont.className}`}>
              {user.businessName || user.name}
            </h1>
            <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500 ${josefinRegular.className}`}>
              <span>{user.email}</span>
              {user.country && <span>{user.country}</span>}
              <span>Joined {formatDate(user.createdAt)}</span>
            </div>
          </div>

          {isVerified ? (
            <span className={`inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 rounded-full px-4 py-1.5 text-sm ${josefinSemiBold.className}`}>
              <ShieldCheck className='w-4 h-4' /> Verified
            </span>
          ) : allApproved ? (
            <button
              onClick={handleVerify}
              disabled={verifyLoading}
              className={`inline-flex items-center gap-2 bg-[#1a2e23] text-white rounded-lg px-5 py-2 text-sm hover:bg-[#243d2f] transition-colors disabled:opacity-50 ${josefinSemiBold.className}`}>
              {verifyLoading ? <Loader2 className='w-4 h-4 animate-spin' /> : <ShieldCheck className='w-4 h-4' />}
              Mark as Verified
            </button>
          ) : null}
        </div>

        {/* Summary stats row */}
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100'>
          <div>
            <p className={`text-xs text-gray-500 uppercase tracking-wider ${josefinRegular.className}`}>Documents</p>
            <p className={`text-lg text-gray-900 mt-0.5 ${josefinSemiBold.className}`}>{documents.length}</p>
          </div>
          <div>
            <p className={`text-xs text-gray-500 uppercase tracking-wider ${josefinRegular.className}`}>Approved</p>
            <p className={`text-lg text-green-600 mt-0.5 ${josefinSemiBold.className}`}>{approvedCount}</p>
          </div>
          <div>
            <p className={`text-xs text-gray-500 uppercase tracking-wider ${josefinRegular.className}`}>Rejected</p>
            <p className={`text-lg text-red-600 mt-0.5 ${josefinSemiBold.className}`}>{rejectedCount}</p>
          </div>
          <div>
            <p className={`text-xs text-gray-500 uppercase tracking-wider ${josefinRegular.className}`}>Pending</p>
            <p className={`text-lg text-amber-600 mt-0.5 ${josefinSemiBold.className}`}>{pendingCount}</p>
          </div>
        </div>

        {isVerified && assessment?.verifiedAt && (
          <div className={`mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 ${josefinRegular.className}`}>
            Verified on {formatDate(assessment.verifiedAt)} by {assessment.verifiedBy}
          </div>
        )}
      </div>

      {/* Products count */}
      <div className='bg-white rounded-xl border border-gray-200 p-5'>
        <div className='flex items-center justify-between'>
          <p className={`text-sm text-gray-700 ${josefinSemiBold.className}`}>Products Listed</p>
          <span className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>{products.length}</span>
        </div>
      </div>

      {/* Documents section */}
      <div className='space-y-3'>
        <h2 className={`text-lg text-gray-900 ${titleFont.className}`}>Submitted Documents</h2>

        {documents.length === 0 ? (
          <div className='bg-white rounded-xl border border-gray-200 p-12 text-center'>
            <FileText className='w-10 h-10 text-gray-300 mx-auto mb-3' />
            <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>No documents submitted yet.</p>
          </div>
        ) : (
          <div className='space-y-3'>
            {documents.map((doc) => {
              const cfg = statusConfig[doc.status];
              const Icon = cfg.icon;
              const isLoading = actionLoading === doc._id;

              return (
                <div key={doc._id} className='bg-white rounded-xl border border-gray-200 p-5'>
                  <div className='flex items-start gap-4'>
                    {/* File icon */}
                    <div className='w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0'>
                      <FileText className='w-5 h-5 text-gray-500' />
                    </div>

                    {/* File info */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-3'>
                        <p className={`text-sm text-gray-900 truncate ${josefinSemiBold.className}`}>{doc.name}</p>
                        <span className={`inline-flex items-center gap-1 border rounded-full px-2.5 py-0.5 text-xs ${cfg.bg} ${cfg.color}`}>
                          <Icon className='w-3 h-3' />
                          {cfg.label}
                        </span>
                      </div>
                      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500 ${josefinRegular.className}`}>
                        {doc.category && <span className='capitalize'>{doc.category.replace(/-/g, ' ')}</span>}
                        <span>{formatFileSize(doc.size)}</span>
                        <span>Uploaded {formatDate(doc.uploadedAt)}</span>
                        {doc.reviewedAt && <span>Reviewed {formatDate(doc.reviewedAt)}</span>}
                      </div>

                      {doc.status === 'rejected' && doc.rejectionReason && (
                        <div className={`mt-2 flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 ${josefinRegular.className}`}>
                          <AlertTriangle className='w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0' />
                          <p className='text-xs text-red-700'>{doc.rejectionReason}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className='flex items-center gap-2 flex-shrink-0'>
                      <button
                        onClick={() => openDocument(doc._id)}
                        className='inline-flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors'>
                        <ExternalLink className='w-3.5 h-3.5' />
                        View
                      </button>

                      {!isVerified && doc.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(doc._id)}
                            disabled={isLoading}
                            className={`inline-flex items-center gap-1.5 bg-green-600 text-white rounded-lg px-3 py-1.5 text-xs hover:bg-green-700 transition-colors disabled:opacity-50 ${josefinSemiBold.className}`}>
                            {isLoading ? <Loader2 className='w-3.5 h-3.5 animate-spin' /> : <CheckCircle2 className='w-3.5 h-3.5' />}
                            Approve
                          </button>
                          <button
                            onClick={() => { setRejectModal({ docId: doc._id, docName: doc.name }); setRejectReason(''); }}
                            disabled={isLoading}
                            className={`inline-flex items-center gap-1.5 bg-red-600 text-white rounded-lg px-3 py-1.5 text-xs hover:bg-red-700 transition-colors disabled:opacity-50 ${josefinSemiBold.className}`}>
                            <XCircle className='w-3.5 h-3.5' />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rejection reason modal */}
      {rejectModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div className='fixed inset-0 bg-black/40' onClick={() => setRejectModal(null)} />
          <div className='relative bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md p-6 space-y-4'>
            <div className='flex items-center justify-between'>
              <h3 className={`text-lg text-gray-900 ${titleFont.className}`}>Reject Document</h3>
              <button onClick={() => setRejectModal(null)} className='text-gray-400 hover:text-gray-600'>
                <X className='w-5 h-5' />
              </button>
            </div>

            <p className={`text-sm text-gray-600 ${josefinRegular.className}`}>
              Rejecting <span className={josefinSemiBold.className}>{rejectModal.docName}</span>. Please provide a reason:
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder='e.g. Document is expired, text is not legible, wrong document type...'
              rows={3}
              className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none ${josefinRegular.className}`}
            />

            <div className='flex items-center justify-end gap-3'>
              <button
                onClick={() => setRejectModal(null)}
                className={`border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors ${josefinRegular.className}`}>
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim() || actionLoading === rejectModal.docId}
                className={`inline-flex items-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-red-700 transition-colors disabled:opacity-50 ${josefinSemiBold.className}`}>
                {actionLoading === rejectModal.docId ? <Loader2 className='w-4 h-4 animate-spin' /> : <XCircle className='w-4 h-4' />}
                Reject Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
