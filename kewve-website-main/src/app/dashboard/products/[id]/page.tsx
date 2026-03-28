'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { josefinSemiBold, josefinRegular } from '@/utils';
import { productAPI } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { GDPR } from '@/lib/gdprCopy';
import {
  ArrowLeft,
  Check,
  Loader2,
  ImagePlus,
  X,
  FileText,
  Upload,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const tabs = ['Identity', 'Commercial Specs', 'Capacity & Scalability', 'Compliance & Documentation'];

const categories = [
  'Grains & Cereals',
  'Spices & Herbs',
  'Seeds & Nuts',
  'Oils & Fats',
  'Beverages',
  'Fresh Produce',
  'Processed Food',
  'Others',
];

interface ProductFormData {
  name: string;
  category: string;
  description: string;
  hsCode: string;
  minimumOrderQuantity: string;
  unitPrice: string;
  leadTime: string;
  monthlyCapacity: string;
}

const initialData: ProductFormData = {
  name: '',
  category: '',
  description: '',
  hsCode: '',
  minimumOrderQuantity: '',
  unitPrice: '',
  leadTime: '',
  monthlyCapacity: '',
};

export default function ProductFormPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const complianceInputRef = useRef<HTMLInputElement>(null);

  const isNew = params.id === 'new';
  const productId = isNew ? null : (params.id as string);

  const [activeTab, setActiveTab] = useState(0);
  const [completedTabs, setCompletedTabs] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<ProductFormData>(initialData);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productStatus, setProductStatus] = useState({
    readiness: 'draft',
    verification: 'pending',
    aggregation: 'not_eligible',
  });
  const [complianceDocs, setComplianceDocs] = useState<
    Array<{
      _id: string;
      name: string;
      status: string;
      rejectionReason?: string;
      uploadedAt?: string;
    }>
  >([]);
  const [uploadingCompliance, setUploadingCompliance] = useState(false);
  const [newComplianceFiles, setNewComplianceFiles] = useState<File[]>([]);
  const [complianceInputVersion, setComplianceInputVersion] = useState(0);

  // Load existing product
  useEffect(() => {
    if (!isNew && productId) {
      const loadProduct = async () => {
        try {
          const response = await productAPI.getProduct(productId);
          if (response.success && response.data) {
            const p = response.data;
            setFormData({
              name: p.name || '',
              category: p.category || '',
              description: p.description || '',
              hsCode: p.hsCode || '',
              minimumOrderQuantity: String(p.minimumOrderQuantity || ''),
              unitPrice: String(p.unitPrice || ''),
              leadTime: String(p.leadTime || ''),
              monthlyCapacity: String(p.monthlyCapacity || ''),
            });
            setProductStatus({
              readiness: p.readiness || 'draft',
              verification: p.verification || 'pending',
              aggregation: p.aggregation || 'not_eligible',
            });
            setComplianceDocs(
              Array.isArray(p.complianceDocuments)
                ? p.complianceDocuments.map((d: { _id: string }) => ({
                    ...d,
                    _id: String(d._id),
                  }))
                : []
            );
            // Try to load product image
            try {
              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
              const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
              const imgRes = await fetch(`${apiUrl}/products/${productId}/image`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (imgRes.ok) {
                const blob = await imgRes.blob();
                setImagePreview(URL.createObjectURL(blob));
              }
            } catch {
              // No image, that's fine
            }
          }
        } catch {
          toast({ title: 'Error', description: 'Failed to load product.', variant: 'destructive' });
        } finally {
          setLoading(false);
        }
      };
      loadProduct();
    }
  }, [isNew, productId]);

  const updateField = (field: keyof ProductFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNext = () => {
    setCompletedTabs((prev) => { const next = new Set(Array.from(prev)); next.add(activeTab); return next; });
    if (activeTab < tabs.length - 1) {
      setActiveTab(activeTab + 1);
    }
  };

  const handlePrevious = () => {
    if (activeTab > 0) {
      setActiveTab(activeTab - 1);
    }
  };

  const handleTabClick = (index: number) => {
    if (index <= activeTab || completedTabs.has(index) || completedTabs.has(index - 1) || index === 0) {
      setActiveTab(index);
    }
  };

  const handleSave = async () => {
    const name = formData.name.trim();
    const category = formData.category.trim();
    const description = formData.description.trim();
    const minimumOrderQuantity = Number(formData.minimumOrderQuantity || 0);
    const unitPrice = Number(formData.unitPrice || 0);
    const leadTime = Number(formData.leadTime || 0);
    const monthlyCapacity = Number(formData.monthlyCapacity || 0);

    if (!name) {
      toast({ title: 'Missing Product Name', description: 'Please enter a product name.', variant: 'destructive' });
      setActiveTab(0);
      return;
    }
    if (!category) {
      toast({ title: 'Missing Category', description: 'Please select a category.', variant: 'destructive' });
      setActiveTab(0);
      return;
    }
    if (!description) {
      toast({ title: 'Missing Description', description: 'Please provide a product description.', variant: 'destructive' });
      setActiveTab(0);
      return;
    }
    if (!Number.isFinite(minimumOrderQuantity) || minimumOrderQuantity <= 0) {
      toast({ title: 'Invalid Minimum Order Quantity', description: 'Minimum order quantity must be greater than zero.', variant: 'destructive' });
      setActiveTab(1);
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      toast({ title: 'Invalid Unit Price', description: 'Unit price must be greater than zero.', variant: 'destructive' });
      setActiveTab(1);
      return;
    }
    if (!Number.isFinite(leadTime) || leadTime <= 0) {
      toast({ title: 'Invalid Lead Time', description: 'Lead time must be greater than zero.', variant: 'destructive' });
      setActiveTab(1);
      return;
    }
    if (!Number.isFinite(monthlyCapacity) || monthlyCapacity <= 0) {
      toast({ title: 'Invalid Monthly Capacity', description: 'Monthly capacity must be greater than zero.', variant: 'destructive' });
      setActiveTab(2);
      return;
    }
    if (isNew && newComplianceFiles.length === 0) {
      toast({
        title: 'Compliance documents required',
        description: 'Upload at least one compliance document before saving a new product.',
        variant: 'destructive',
      });
      setActiveTab(2);
      return;
    }

    setCompletedTabs((prev) => { const next = new Set(Array.from(prev)); next.add(activeTab); return next; });
    setSaving(true);
    try {
      let savedProductId = productId;

      if (isNew) {
        const response = await productAPI.createProductWithCompliance(formData, newComplianceFiles);
        if (!response.success || !response.data?._id) {
          throw new Error('Failed to create product');
        }
        savedProductId = response.data._id;
        if (response.data) {
          applyProductPayload(response.data);
        }
        const createdDocsCount = Array.isArray(response.data?.complianceDocuments)
          ? response.data.complianceDocuments.length
          : 0;
        // Fallback: if backend did not persist docs during create, upload them immediately.
        if (newComplianceFiles.length > 0 && createdDocsCount === 0) {
          setUploadingCompliance(true);
          const uploadRes = await productAPI.uploadComplianceDocuments(savedProductId, newComplianceFiles);
          if (uploadRes.success && uploadRes.data) {
            applyProductPayload(uploadRes.data);
          }
        }
      } else {
        const updateResponse = await productAPI.updateProduct(productId!, formData);
        if (updateResponse?.success && productStatus.verification === 'rejected') {
          setProductStatus((prev) => ({
            ...prev,
            verification: 'pending',
            readiness: 'pending',
          }));
        }
      }

      // Upload image if one was selected
      if (imageFile && savedProductId) {
        setUploadingImage(true);
        try {
          await productAPI.uploadImage(savedProductId, imageFile);
        } catch {
          toast({ title: 'Warning', description: 'Product saved but image upload failed.', variant: 'destructive' });
        }
        setUploadingImage(false);
      }

      // New-product compliance docs are submitted in the create request.

      toast({
        title: isNew ? 'Product Created' : 'Product Updated',
        description: isNew
          ? 'Your product and compliance documents have been submitted for review.'
          : productStatus.verification === 'rejected'
            ? 'Your product has been resubmitted for admin review.'
            : 'Your product has been updated.',
      });

      // Notify admin that a product was submitted/updated.
      try {
        await fetch('/api/admin-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'product_submitted',
            payload: {
              userName: user?.name,
              userEmail: user?.email,
              productName: formData.name,
              category: formData.category,
            },
          }),
        });
      } catch (notifyErr) {
        console.warn('Admin notify (product_submitted) failed:', notifyErr);
      }

      if (savedProductId) {
        router.push(`/dashboard/products/${savedProductId}`);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save product. Please try again.', variant: 'destructive' });
    } finally {
      setUploadingCompliance(false);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isNew || !productId) return;
    const confirmed = window.confirm('Delete this product? This action cannot be undone.');
    if (!confirmed) return;
    setDeleting(true);
    try {
      await productAPI.deleteProduct(productId);
      toast({ title: 'Product Deleted', description: 'The product has been removed.' });
      router.push('/dashboard/products');
    } catch {
      toast({ title: 'Error', description: 'Failed to delete product.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const applyProductPayload = (payload: {
    readiness?: string;
    verification?: string;
    complianceDocuments?: Array<Record<string, unknown>>;
  }) => {
    if (payload.readiness !== undefined && payload.verification !== undefined) {
      setProductStatus((s) => ({
        ...s,
        readiness: payload.readiness as string,
        verification: payload.verification as string,
      }));
    }
    if (Array.isArray(payload.complianceDocuments)) {
      setComplianceDocs(
        payload.complianceDocuments.map((d) => {
          const row = d as { _id: unknown; name?: string; status?: string; rejectionReason?: string; uploadedAt?: string };
          return {
            _id: String(row._id),
            name: String(row.name ?? ''),
            status: String(row.status ?? 'pending'),
            rejectionReason: row.rejectionReason,
            uploadedAt: row.uploadedAt,
          };
        })
      );
    }
  };

  const handleComplianceFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    if (isNew) {
      // Do NOT persist to backend while still on the "new product" page.
      // We queue files locally; the backend create/upload happens only on "Save Product".
      const picked = Array.from(files);
      setNewComplianceFiles((prev) => [...prev, ...picked]);
      // Reset both ref and event target so the same file can be picked again reliably.
      if (complianceInputRef.current) complianceInputRef.current.value = '';
      if (e.target) (e.target as HTMLInputElement).value = '';
      setComplianceInputVersion((v) => v + 1);
      toast({
        title: 'Document queued',
        description: `${picked.length} file${picked.length === 1 ? '' : 's'} added. They will upload when you save.`,
      });
      return;
    }
    if (!productId) return;
    setUploadingCompliance(true);
    try {
      const res = await productAPI.uploadComplianceDocuments(productId, Array.from(files));
      if (res.success && res.data) {
        applyProductPayload(res.data);
      }
      toast({ title: 'Document(s) uploaded', description: 'Each file is reviewed by admin before the product can go live.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not upload document.';
      toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
    } finally {
      setUploadingCompliance(false);
      if (complianceInputRef.current) complianceInputRef.current.value = '';
      setComplianceInputVersion((v) => v + 1);
    }
  };

  const handleRemoveNewComplianceFile = (idx: number) => {
    setNewComplianceFiles((prev) => prev.filter((_, i) => i !== idx));
    setComplianceInputVersion((v) => v + 1);
  };

  const handleDeleteComplianceDoc = async (docId: string) => {
    if (!productId || !window.confirm('Remove this document?')) return;
    try {
      const res = await productAPI.deleteComplianceDocument(productId, docId);
      if (res.success && res.data) {
        applyProductPayload(res.data);
        toast({ title: 'Document removed' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove document.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const openComplianceDoc = (docId: string) => {
    if (!productId) return;
    window.open(productAPI.getComplianceDocumentUrl(productId, docId), '_blank', 'noopener,noreferrer');
  };

  const docStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
      approved: { label: 'Approved', className: 'text-green-700 bg-green-50 border-green-200', Icon: CheckCircle2 },
      rejected: { label: 'Rejected', className: 'text-red-700 bg-red-50 border-red-200', Icon: XCircle },
      pending: { label: 'Pending review', className: 'text-amber-700 bg-amber-50 border-amber-200', Icon: Clock },
    };
    const m = map[status] || map.pending;
    const I = m.Icon;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${m.className} ${josefinRegular.className}`}>
        <I className='w-3 h-3' />
        {m.label}
      </span>
    );
  };

  const isLastTab = activeTab === tabs.length - 1;

  const inputClassName = `w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a2e23]/20 focus:border-[#1a2e23] transition-colors ${josefinRegular.className}`;
  const textareaClassName = `${inputClassName} resize-y min-h-[100px]`;
  const labelClassName = `block text-sm text-gray-900 mb-2 ${josefinSemiBold.className}`;

  const statusBadge = (value: string) => (
    <span className={`text-xs px-2.5 py-1 rounded-full border border-gray-300 text-gray-600 capitalize ${josefinRegular.className}`}>
      {value.replace('_', ' ')}
    </span>
  );

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <div className='flex flex-col items-center gap-3'>
          <Loader2 className='w-6 h-6 text-gray-400 animate-spin' />
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      {/* Header */}
      <button
        type='button'
        onClick={() => router.push('/dashboard/products')}
        className={`inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 ${josefinRegular.className}`}>
        <ArrowLeft className='w-4 h-4' />
        Back to Products
      </button>
      <h1 className={`text-2xl lg:text-3xl text-gray-900 ${josefinSemiBold.className}`}>
        {isNew ? 'Add Product' : 'Edit Product'}
      </h1>
      {!isNew && (
        <div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`px-4 py-2 rounded-lg text-sm border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 ${josefinRegular.className}`}>
            {deleting ? 'Deleting...' : 'Delete Product'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className='flex flex-wrap gap-2'>
        {tabs.map((tab, index) => {
          const isActive = index === activeTab;
          const isCompleted = completedTabs.has(index);

          return (
            <button
              key={tab}
              onClick={() => handleTabClick(index)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm border transition-colors ${josefinRegular.className} ${
                isActive
                  ? 'bg-[#ed722d] text-white border-[#ed722d]'
                  : isCompleted
                    ? 'bg-white text-gray-700 border-gray-300'
                    : 'bg-white text-gray-500 border-gray-200'
              }`}>
              {isCompleted && !isActive && <Check className='w-4 h-4' />}
              {tab}
            </button>
          );
        })}
      </div>

      {/* Form + Market Fit */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Form Card */}
        <div className='lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 lg:p-8'>
          <h2 className={`text-lg text-gray-900 mb-6 ${josefinSemiBold.className}`}>
            {tabs[activeTab]}
          </h2>

          <div className='space-y-5'>
            {/* Tab 0: Identity */}
            {activeTab === 0 && (
              <>
                {/* Image Upload */}
                <div>
                  <label className={labelClassName}>Product Image</label>
                  {imagePreview ? (
                    <div className='relative w-full h-48 rounded-lg overflow-hidden border border-gray-200 bg-gray-50'>
                      <img
                        src={imagePreview}
                        alt='Product preview'
                        className='w-full h-full object-cover'
                      />
                      <button
                        onClick={handleRemoveImage}
                        className='absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1.5 shadow transition-colors'>
                        <X className='w-4 h-4 text-gray-600' />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className='w-full h-48 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 bg-gray-50 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer'>
                      <ImagePlus className='w-8 h-8 text-gray-400' />
                      <span className={`text-sm text-gray-500 ${josefinRegular.className}`}>
                        Click to upload image
                      </span>
                      <span className={`text-xs text-gray-400 ${josefinRegular.className}`}>
                        JPEG, PNG or WebP (max 5MB)
                      </span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept='image/jpeg,image/png,image/jpg,image/webp'
                    onChange={handleImageSelect}
                    className='hidden'
                  />
                </div>

                <div>
                  <label className={labelClassName}>Product Name</label>
                  <input
                    type='text'
                    className={inputClassName}
                    placeholder='e.g. Organic Shea Butter'
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Category</label>
                  <select
                    className={inputClassName}
                    value={formData.category}
                    onChange={(e) => updateField('category', e.target.value)}>
                    <option value=''>Select category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>Description</label>
                  <textarea
                    className={textareaClassName}
                    placeholder='Describe your product'
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClassName}>HS Code</label>
                  <input
                    type='text'
                    className={inputClassName}
                    placeholder='e.g. 1515.90'
                    value={formData.hsCode}
                    onChange={(e) => updateField('hsCode', e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Tab 1: Commercial Specs */}
            {activeTab === 1 && (
              <>
                <div>
                  <label className={labelClassName}>Minimum Order Quantity (kg)</label>
                  <input
                    type='number'
                    className={inputClassName}
                    placeholder='0'
                    min='0'
                    value={formData.minimumOrderQuantity}
                    onChange={(e) => updateField('minimumOrderQuantity', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Unit Price</label>
                  <input
                    type='number'
                    className={inputClassName}
                    placeholder='0'
                    min='0'
                    value={formData.unitPrice}
                    onChange={(e) => updateField('unitPrice', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Lead Time (days)</label>
                  <input
                    type='number'
                    className={inputClassName}
                    placeholder='0'
                    min='0'
                    value={formData.leadTime}
                    onChange={(e) => updateField('leadTime', e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Tab 2: Capacity & Scalability */}
            {activeTab === 2 && (
              <div>
                <label className={labelClassName}>Monthly Capacity (kg)</label>
                <input
                  type='number'
                  className={inputClassName}
                  placeholder='0'
                  min='0'
                  value={formData.monthlyCapacity}
                  onChange={(e) => updateField('monthlyCapacity', e.target.value)}
                />
              </div>
            )}

            {/* Tab 3: Compliance & Documentation */}
            {activeTab === 3 && (
              <div className='space-y-4'>
                <p className={`text-sm text-gray-600 ${josefinRegular.className}`}>
                  Upload certificates, specs, or other compliance files for this product. You can add many files (PDF,
                  images, or Word). The product appears to buyers only after{' '}
                  <span className={josefinSemiBold.className}>every</span> file has been approved by admin.
                </p>
                <div className='rounded-lg border border-gray-200 bg-gray-50/90 px-4 py-3'>
                  <p className={`text-xs sm:text-sm text-gray-700 leading-relaxed ${josefinRegular.className}`}>
                    {GDPR.documentUpload} See our{' '}
                    <Link href='/privacy' className='text-[#ed722d] underline font-semibold hover:opacity-80'>
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
                <div>
                  <input
                    key={`compliance-input-${complianceInputVersion}`}
                    ref={complianceInputRef}
                    type='file'
                    multiple
                    accept='.pdf,.doc,.docx,image/jpeg,image/png,image/jpg'
                    className='hidden'
                    onChange={handleComplianceFiles}
                  />
                  <button
                    type='button'
                    onClick={() => {
                      if (complianceInputRef.current) complianceInputRef.current.value = '';
                      complianceInputRef.current?.click();
                    }}
                    disabled={uploadingCompliance}
                    className={`inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-60 ${josefinSemiBold.className}`}>
                    {uploadingCompliance ? (
                      <Loader2 className='w-4 h-4 animate-spin' />
                    ) : (
                      <Upload className='w-4 h-4' />
                    )}
                    {uploadingCompliance ? 'Uploading…' : isNew ? 'Add documents to this product' : 'Upload documents'}
                  </button>
                  <p className={`mt-2 text-xs text-gray-500 ${josefinRegular.className}`}>
                    Max 10MB per file. PDF, JPEG, PNG, Word.
                  </p>
                </div>
                {isNew ? (
                  newComplianceFiles.length === 0 ? (
                    <div className='rounded-lg border border-dashed border-amber-300 bg-amber-50/70 px-4 py-8 text-center'>
                      <FileText className='w-8 h-8 text-amber-400 mx-auto mb-2' />
                      <p className={`text-sm text-amber-900 ${josefinRegular.className}`}>
                        Add at least one compliance document before saving this new product.
                      </p>
                    </div>
                  ) : (
                    <ul className='space-y-3'>
                      {newComplianceFiles.map((file, idx) => (
                        <li
                          key={`${file.name}-${file.size}-${idx}`}
                          className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3'>
                          <div className='flex items-start gap-3 min-w-0'>
                            <FileText className='w-5 h-5 text-gray-400 shrink-0 mt-0.5' />
                            <div className='min-w-0'>
                              <p className={`text-sm text-gray-900 truncate ${josefinSemiBold.className}`}>{file.name}</p>
                              <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>
                                {(file.size / (1024 * 1024)).toFixed(2)} MB · will upload on Save
                              </p>
                            </div>
                          </div>
                          <button
                            type='button'
                            onClick={() => handleRemoveNewComplianceFile(idx)}
                            className={`inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 ${josefinRegular.className}`}>
                            <Trash2 className='w-3.5 h-3.5' />
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )
                ) : complianceDocs.length === 0 ? (
                  <div className='rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-8 text-center'>
                    <FileText className='w-8 h-8 text-gray-300 mx-auto mb-2' />
                    <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>No documents yet.</p>
                  </div>
                ) : (
                  <ul className='space-y-3'>
                    {complianceDocs.map((doc) => (
                      <li
                        key={doc._id}
                        className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3'>
                        <div className='flex items-start gap-3 min-w-0'>
                          <FileText className='w-5 h-5 text-gray-400 shrink-0 mt-0.5' />
                          <div className='min-w-0'>
                            <p className={`text-sm text-gray-900 truncate ${josefinSemiBold.className}`}>{doc.name}</p>
                            <div className='mt-1 flex flex-wrap items-center gap-2'>
                              {docStatusBadge(doc.status)}
                              {doc.status === 'rejected' && doc.rejectionReason && (
                                <span className={`text-xs text-red-600 ${josefinRegular.className}`}>{doc.rejectionReason}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className='flex items-center gap-2 shrink-0'>
                          <button
                            type='button'
                            onClick={() => openComplianceDoc(doc._id)}
                            className={`text-sm text-[#ed722d] hover:underline ${josefinRegular.className}`}>
                            View
                          </button>
                          <button
                            type='button'
                            onClick={() => handleDeleteComplianceDoc(doc._id)}
                            className={`inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 ${josefinRegular.className}`}>
                            <Trash2 className='w-3.5 h-3.5' />
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Market Fit Sidebar */}
        <div className='bg-white rounded-xl border border-gray-200 p-5 h-fit'>
          <h3 className={`text-base text-gray-900 mb-4 ${josefinSemiBold.className}`}>Market Fit</h3>
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className={`text-sm text-gray-600 ${josefinRegular.className}`}>Readiness</span>
              {statusBadge(productStatus.readiness)}
            </div>
            <div className='flex items-center justify-between'>
              <span className={`text-sm text-gray-600 ${josefinRegular.className}`}>Verification</span>
              {statusBadge(productStatus.verification)}
            </div>
            <div className='flex items-center justify-between'>
              <span className={`text-sm text-gray-600 ${josefinRegular.className}`}>Aggregation</span>
              {statusBadge(productStatus.aggregation)}
            </div>
          </div>
        </div>
      </div>

      <div className='rounded-lg border border-gray-200 bg-amber-50/80 px-4 py-3'>
        <p className={`text-xs sm:text-sm text-gray-700 leading-relaxed ${josefinRegular.className}`}>
          {GDPR.productCatalogue} See our{' '}
          <Link href='/privacy' className='text-[#ed722d] underline font-semibold hover:opacity-80'>
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className='flex items-center justify-between'>
        <button
          onClick={handlePrevious}
          disabled={activeTab === 0}
          className={`px-5 py-2.5 rounded-lg text-sm border border-gray-300 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed ${josefinRegular.className}`}>
          Previous
        </button>

        {isLastTab ? (
          <button
            onClick={handleSave}
            disabled={saving || uploadingImage || uploadingCompliance}
            className={`px-5 py-2.5 rounded-lg text-sm bg-[#ed722d] text-white transition-colors hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed ${josefinSemiBold.className}`}>
            {saving
              ? uploadingCompliance
                ? 'Uploading documents...'
                : uploadingImage
                  ? 'Uploading image...'
                  : 'Saving...'
              : 'Save Product'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className={`px-5 py-2.5 rounded-lg text-sm bg-[#ed722d] text-white transition-colors hover:opacity-90 ${josefinSemiBold.className}`}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
