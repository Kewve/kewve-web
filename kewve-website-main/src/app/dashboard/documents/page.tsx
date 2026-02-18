'use client';

import { useState, useEffect, useRef } from 'react';
import { josefinSemiBold, josefinRegular } from '@/utils';
import { assessmentAPI } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import {
  Upload,
  Loader2,
  FileText,
  Trash2,
  Download,
} from 'lucide-react';

interface DocumentMeta {
  _id: string;
  name: string;
  type: string;
  size: number;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeLabel(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'Word';
  return 'File';
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadDocuments = async () => {
    try {
      const response = await assessmentAPI.getAssessment();
      if (response.success && response.data?.documents) {
        setDocuments(response.data.documents);
      }
    } catch {
      // No assessment / documents yet
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      await assessmentAPI.uploadDocument(file);
      toast({
        title: 'Uploaded',
        description: `${file.name} uploaded successfully.`,
      });
      await loadDocuments();
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    setDeletingId(docId);
    try {
      await assessmentAPI.deleteDocument(docId);
      toast({ title: 'Deleted', description: 'Document removed successfully.' });
      await loadDocuments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete document.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (doc: DocumentMeta) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${apiUrl}/assessment/documents/${doc._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Error', description: 'Failed to download document.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <div className='flex flex-col items-center gap-3'>
          <Loader2 className='w-6 h-6 text-gray-400 animate-spin' />
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h1 className={`text-2xl lg:text-3xl text-gray-900 ${josefinSemiBold.className}`}>
          Documents
        </h1>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`flex items-center gap-2 bg-[#1a2e23] text-white rounded-lg py-2.5 px-5 text-sm transition-colors hover:bg-[#243d2f] disabled:opacity-60 ${josefinSemiBold.className}`}>
          {uploading ? (
            <>
              <Loader2 className='w-4 h-4 animate-spin' />
              Uploading...
            </>
          ) : (
            <>
              <Upload className='w-4 h-4' />
              Upload Document
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type='file'
          accept='.pdf,.jpg,.jpeg,.png,.doc,.docx'
          className='hidden'
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleUpload(file);
              e.target.value = '';
            }
          }}
        />
      </div>

      {/* Table */}
      <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
        {documents.length === 0 ? (
          <div className='py-12 text-center'>
            <FileText className='w-10 h-10 text-gray-300 mx-auto mb-3' />
            <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
              No documents uploaded yet. Upload your compliance documents to get started.
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b border-gray-200'>
                  <th className={`text-left px-5 py-4 text-sm text-gray-500 font-normal ${josefinRegular.className}`}>Document</th>
                  <th className={`text-left px-5 py-4 text-sm text-gray-500 font-normal ${josefinRegular.className}`}>Type</th>
                  <th className={`text-left px-5 py-4 text-sm text-gray-500 font-normal ${josefinRegular.className}`}>Status</th>
                  <th className={`text-left px-5 py-4 text-sm text-gray-500 font-normal ${josefinRegular.className}`}>Expiry</th>
                  <th className={`text-left px-5 py-4 text-sm text-gray-500 font-normal ${josefinRegular.className}`}>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {documents.map((doc) => (
                  <tr key={doc._id} className='hover:bg-gray-50 transition-colors'>
                    <td className='px-5 py-4'>
                      <div className='flex items-center gap-3'>
                        <FileText className='w-5 h-5 text-gray-400 shrink-0' />
                        <span className={`text-sm text-gray-900 truncate max-w-[200px] ${josefinSemiBold.className}`}>
                          {doc.name}
                        </span>
                      </div>
                    </td>
                    <td className='px-5 py-4'>
                      <span className={`text-xs px-2.5 py-1 rounded-full border border-gray-300 text-gray-600 ${josefinRegular.className}`}>
                        {getFileTypeLabel(doc.type)}
                      </span>
                    </td>
                    <td className='px-5 py-4'>
                      <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${josefinRegular.className} ${
                        doc.status === 'approved'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : doc.status === 'rejected'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}>
                        {doc.status || 'pending'}
                      </span>
                    </td>
                    <td className={`px-5 py-4 text-sm text-gray-500 ${josefinRegular.className}`}>
                      —
                    </td>
                    <td className='px-5 py-4'>
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => handleDownload(doc)}
                          className='text-gray-500 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors'
                          title='Download'>
                          <Download className='w-4 h-4' />
                        </button>
                        <button
                          onClick={() => handleDelete(doc._id)}
                          disabled={deletingId === doc._id}
                          className='text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50'
                          title='Delete'>
                          {deletingId === doc._id ? (
                            <Loader2 className='w-4 h-4 animate-spin' />
                          ) : (
                            <Trash2 className='w-4 h-4' />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
