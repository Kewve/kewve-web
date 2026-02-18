'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { josefinSemiBold, josefinRegular } from '@/utils';
import { assessmentAPI } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { useDashboardProgress } from '@/contexts/DashboardProgressContext';
import {
  Upload,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileCheck,
  Settings2,
  Loader2,
  FileText,
  ArrowRight,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

type ReviewStatus = 'pending' | 'approved' | 'rejected';
type UploadStatus = 'not_uploaded' | 'uploading' | 'uploaded';

interface DocumentItem {
  id: string;
  label: string;
  uploadStatus: UploadStatus;
  reviewStatus: ReviewStatus;
  fileName?: string;
  rejectionReason?: string;
  reviewedAt?: string;
}

interface VerificationSection {
  title: string;
  icon: React.ElementType;
  documents: DocumentItem[];
}

const buildInitialSections = (): VerificationSection[] => [
  {
    title: 'Business Verification',
    icon: ShieldCheck,
    documents: [
      { id: 'biz-reg', label: 'Business registration certificate', uploadStatus: 'not_uploaded', reviewStatus: 'pending' },
      { id: 'tax-id', label: 'Tax identification number', uploadStatus: 'not_uploaded', reviewStatus: 'pending' },
      { id: 'bank-stmt', label: 'Business bank statement', uploadStatus: 'not_uploaded', reviewStatus: 'pending' },
    ],
  },
  {
    title: 'Compliance Verification',
    icon: FileCheck,
    documents: [
      { id: 'food-safety', label: 'Food safety certification (HACCP/ISO)', uploadStatus: 'not_uploaded', reviewStatus: 'pending' },
      { id: 'export-license', label: 'Export license', uploadStatus: 'not_uploaded', reviewStatus: 'pending' },
      { id: 'phyto-cert', label: 'Phytosanitary certificate', uploadStatus: 'not_uploaded', reviewStatus: 'pending' },
    ],
  },
  {
    title: 'Capability Verification',
    icon: Settings2,
    documents: [
      { id: 'prod-capacity', label: 'Production capacity evidence', uploadStatus: 'not_uploaded', reviewStatus: 'pending' },
      { id: 'packaging', label: 'Packaging format samples', uploadStatus: 'not_uploaded', reviewStatus: 'pending' },
      { id: 'quality-ctrl', label: 'Quality control documentation', uploadStatus: 'not_uploaded', reviewStatus: 'pending' },
    ],
  },
];

export default function VerificationPage() {
  const [sections, setSections] = useState<VerificationSection[]>(buildInitialSections());
  const [loadingDocs, setLoadingDocs] = useState(true);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const router = useRouter();
  const { toast } = useToast();
  const { refresh: refreshProgress } = useDashboardProgress();

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await assessmentAPI.getAssessment();
        if (response.success && response.data?.documents) {
          const docs = response.data.documents as any[];

          setSections((prev) =>
            prev.map((section) => ({
              ...section,
              documents: section.documents.map((doc) => {
                // Find the most recent doc matching this category
                const matchingDocs = docs.filter((d: any) => d.category === doc.id);
                const latest = matchingDocs.length > 0 ? matchingDocs[matchingDocs.length - 1] : null;

                if (latest) {
                  return {
                    ...doc,
                    uploadStatus: 'uploaded' as UploadStatus,
                    reviewStatus: (latest.status || 'pending') as ReviewStatus,
                    fileName: latest.name,
                    rejectionReason: latest.rejectionReason,
                    reviewedAt: latest.reviewedAt,
                  };
                }
                return doc;
              }),
            }))
          );
        }
      } catch {
        // Assessment may not exist yet
      } finally {
        setLoadingDocs(false);
      }
    };

    loadDocuments();
  }, []);

  const allDocs = sections.flatMap((s) => s.documents);
  const uploadedCount = allDocs.filter((d) => d.uploadStatus === 'uploaded').length;
  const approvedCount = allDocs.filter((d) => d.reviewStatus === 'approved').length;
  const rejectedCount = allDocs.filter((d) => d.reviewStatus === 'rejected').length;
  const totalCount = allDocs.length;

  const handleUploadClick = (docId: string) => {
    fileInputRefs.current[docId]?.click();
  };

  const handleFileChange = async (sectionIdx: number, docIdx: number, file: File) => {
    const docId = sections[sectionIdx].documents[docIdx].id;

    setSections((prev) => {
      const updated = [...prev];
      updated[sectionIdx] = {
        ...updated[sectionIdx],
        documents: updated[sectionIdx].documents.map((d, i) =>
          i === docIdx ? { ...d, uploadStatus: 'uploading' as UploadStatus } : d
        ),
      };
      return updated;
    });

    try {
      await assessmentAPI.uploadDocument(file, docId);

      setSections((prev) => {
        const updated = [...prev];
        updated[sectionIdx] = {
          ...updated[sectionIdx],
          documents: updated[sectionIdx].documents.map((d, i) =>
            i === docIdx
              ? {
                  ...d,
                  uploadStatus: 'uploaded' as UploadStatus,
                  reviewStatus: 'pending' as ReviewStatus,
                  fileName: file.name,
                  rejectionReason: undefined,
                  reviewedAt: undefined,
                }
              : d
          ),
        };
        return updated;
      });

      toast({
        title: 'Uploaded',
        description: `${file.name} uploaded successfully.`,
      });

      await refreshProgress();
    } catch (error: any) {
      setSections((prev) => {
        const updated = [...prev];
        updated[sectionIdx] = {
          ...updated[sectionIdx],
          documents: updated[sectionIdx].documents.map((d, i) =>
            i === docIdx ? { ...d, uploadStatus: d.fileName ? ('uploaded' as UploadStatus) : ('not_uploaded' as UploadStatus) } : d
          ),
        };
        return updated;
      });

      toast({
        title: 'Upload failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getOverallStatus = () => {
    if (rejectedCount > 0) return 'action_needed';
    if (approvedCount === totalCount && approvedCount > 0) return 'verified';
    if (uploadedCount === totalCount && uploadedCount > 0) return 'under_review';
    return 'pending';
  };

  const overallStatus = getOverallStatus();

  return (
    <div className='max-w-3xl mx-auto space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h1 className={`text-2xl lg:text-3xl text-gray-900 ${josefinSemiBold.className}`}>
          Verification
        </h1>
        <span
          className={`text-xs px-3 py-1 rounded-full border ${
            overallStatus === 'verified'
              ? 'border-green-300 text-green-700 bg-green-50'
              : overallStatus === 'action_needed'
                ? 'border-red-300 text-red-700 bg-red-50'
                : overallStatus === 'under_review'
                  ? 'border-amber-300 text-amber-700 bg-amber-50'
                  : 'border-gray-300 text-gray-600'
          } ${josefinSemiBold.className}`}>
          {overallStatus === 'verified'
            ? 'Verified'
            : overallStatus === 'action_needed'
              ? 'Action Needed'
              : overallStatus === 'under_review'
                ? 'Under Review'
                : 'Pending'}
        </span>
      </div>

      {/* Rejected Alert Banner */}
      {rejectedCount > 0 && (
        <div className='bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3'>
          <XCircle className='w-5 h-5 text-red-500 mt-0.5 shrink-0' />
          <div>
            <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>
              {rejectedCount} document{rejectedCount > 1 ? 's' : ''} rejected
            </p>
            <p className={`text-sm text-gray-600 mt-0.5 ${josefinRegular.className}`}>
              Some of your documents have been reviewed and rejected. Please check the reason below and re-upload the corrected documents.
            </p>
          </div>
        </div>
      )}

      {/* Status Banner */}
      {rejectedCount === 0 && (
        <div
          className={`${
            overallStatus === 'verified'
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow/10 border-yellow/30'
          } border rounded-xl px-5 py-4 flex items-start gap-3`}>
          {overallStatus === 'verified' ? (
            <CheckCircle2 className='w-5 h-5 text-green-600 mt-0.5 shrink-0' />
          ) : (
            <Clock className='w-5 h-5 text-yellow-dark mt-0.5 shrink-0' />
          )}
          <div>
            <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>
              {overallStatus === 'verified'
                ? 'Verification Complete'
                : overallStatus === 'under_review'
                  ? 'Documents Under Review'
                  : 'Verification In Progress'}
            </p>
            <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
              {overallStatus === 'verified'
                ? 'All your documents have been approved. You are verified. Start adding products.'
                : overallStatus === 'under_review'
                  ? 'All documents uploaded. Waiting for admin review.'
                  : `Upload required documents to complete your verification. ${uploadedCount}/${totalCount} uploaded.`}
            </p>
          </div>
        </div>
      )}

      {/* Summary counts */}
      <div className='grid grid-cols-3 gap-3'>
        <div className='bg-white rounded-xl border border-gray-200 p-4 text-center'>
          <p className={`text-lg text-green-600 ${josefinSemiBold.className}`}>{approvedCount}</p>
          <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Approved</p>
        </div>
        <div className='bg-white rounded-xl border border-gray-200 p-4 text-center'>
          <p className={`text-lg text-amber-600 ${josefinSemiBold.className}`}>{uploadedCount - approvedCount - rejectedCount}</p>
          <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Awaiting Review</p>
        </div>
        <div className='bg-white rounded-xl border border-gray-200 p-4 text-center'>
          <p className={`text-lg text-red-600 ${josefinSemiBold.className}`}>{rejectedCount}</p>
          <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Rejected</p>
        </div>
      </div>

      {/* Document Sections */}
      {sections.map((section, sectionIdx) => {
        const Icon = section.icon;
        return (
          <div key={section.title} className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
            {/* Section header */}
            <div className='flex items-center gap-2.5 px-5 pt-5 pb-3'>
              <Icon className='w-5 h-5 text-gray-700' />
              <h2 className={`text-base text-gray-900 ${josefinSemiBold.className}`}>
                {section.title}
              </h2>
            </div>

            {/* Document rows */}
            <div className='divide-y divide-gray-100'>
              {section.documents.map((doc, docIdx) => (
                <div key={doc.id} className='px-5 py-4'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3 min-w-0'>
                      {doc.reviewStatus === 'approved' ? (
                        <CheckCircle2 className='w-4 h-4 text-green-500 shrink-0' />
                      ) : doc.reviewStatus === 'rejected' ? (
                        <XCircle className='w-4 h-4 text-red-500 shrink-0' />
                      ) : doc.uploadStatus === 'uploaded' ? (
                        <Clock className='w-4 h-4 text-amber-500 shrink-0' />
                      ) : (
                        <FileText className='w-4 h-4 text-gray-300 shrink-0' />
                      )}
                      <div className='min-w-0'>
                        <p className={`text-sm text-gray-700 ${josefinRegular.className}`}>
                          {doc.label}
                        </p>
                        {doc.uploadStatus === 'uploaded' && doc.fileName && (
                          <p className={`text-xs text-gray-400 truncate ${josefinRegular.className}`}>
                            {doc.fileName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className='flex items-center gap-2 shrink-0 ml-4'>
                      {doc.uploadStatus === 'uploading' ? (
                        <div className={`flex items-center gap-2 text-xs text-gray-500 ${josefinRegular.className}`}>
                          <Loader2 className='w-4 h-4 animate-spin' />
                          Uploading...
                        </div>
                      ) : doc.reviewStatus === 'approved' ? (
                        <span className={`flex items-center gap-1.5 text-xs text-green-600 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 ${josefinSemiBold.className}`}>
                          <CheckCircle2 className='w-3.5 h-3.5' />
                          Approved
                        </span>
                      ) : doc.reviewStatus === 'rejected' ? (
                        <div className='flex items-center gap-2'>
                          <span className={`flex items-center gap-1.5 text-xs text-red-600 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 ${josefinSemiBold.className}`}>
                            <XCircle className='w-3.5 h-3.5' />
                            Rejected
                          </span>
                          <button
                            onClick={() => handleUploadClick(doc.id)}
                            disabled={loadingDocs}
                            className={`flex items-center gap-1.5 text-xs text-white bg-[#1a2e23] hover:bg-[#243d2f] transition-colors px-3 py-1.5 rounded-lg disabled:opacity-50 ${josefinSemiBold.className}`}>
                            <RefreshCw className='w-3.5 h-3.5' />
                            Re-upload
                          </button>
                        </div>
                      ) : doc.uploadStatus === 'uploaded' ? (
                        <span className={`flex items-center gap-1.5 text-xs text-amber-600 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 ${josefinSemiBold.className}`}>
                          <Clock className='w-3.5 h-3.5' />
                          Under Review
                        </span>
                      ) : (
                        <button
                          onClick={() => handleUploadClick(doc.id)}
                          disabled={loadingDocs}
                          className={`flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 ${josefinRegular.className}`}>
                          <Upload className='w-3.5 h-3.5' />
                          Upload
                        </button>
                      )}

                      {/* Hidden file input */}
                      <input
                        type='file'
                        ref={(el) => { fileInputRefs.current[doc.id] = el; }}
                        className='hidden'
                        accept='.pdf,.jpg,.jpeg,.png,.doc,.docx'
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileChange(sectionIdx, docIdx, file);
                            e.target.value = '';
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Rejection reason */}
                  {doc.reviewStatus === 'rejected' && doc.rejectionReason && (
                    <div className='mt-3 ml-7 flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5'>
                      <AlertTriangle className='w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0' />
                      <div>
                        <p className={`text-xs text-red-800 ${josefinSemiBold.className}`}>Reason for rejection:</p>
                        <p className={`text-xs text-red-700 mt-0.5 ${josefinRegular.className}`}>{doc.rejectionReason}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Next Steps */}
      <div className='bg-white rounded-xl border border-gray-200 p-6'>
        <h2 className={`text-xl text-gray-900 mb-4 ${josefinSemiBold.className}`}>Next Steps</h2>
        <button
          onClick={() => router.push('/dashboard/trade-profile')}
          className={`w-full bg-transparent border-2 border-gray-900 text-gray-900 rounded-lg py-3 px-4 font-semibold transition-all hover:bg-orange hover:border-orange hover:text-white flex items-center justify-center gap-2 mb-3 ${josefinSemiBold.className}`}>
          Complete Trade Profile
          <ArrowRight className='w-4 h-4' />
        </button>
        <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>
          Set up your trade profile to showcase your business capabilities and unlock trade opportunities.
        </p>
      </div>
    </div>
  );
}
