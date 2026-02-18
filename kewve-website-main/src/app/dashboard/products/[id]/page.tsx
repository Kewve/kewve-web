'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { josefinSemiBold, josefinRegular } from '@/utils';
import { productAPI } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Check, Loader2, ImagePlus, X } from 'lucide-react';

const tabs = ['Identity', 'Commercial Specs', 'Compliance & Documentation', 'Capacity & Scalability'];

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isNew = params.id === 'new';
  const productId = isNew ? null : (params.id as string);

  const [activeTab, setActiveTab] = useState(0);
  const [completedTabs, setCompletedTabs] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<ProductFormData>(initialData);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productStatus, setProductStatus] = useState({
    readiness: 'draft',
    verification: 'pending',
    aggregation: 'not_eligible',
  });

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
            // Try to load product image
            try {
              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
              const token = localStorage.getItem('authToken');
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
    setCompletedTabs((prev) => { const next = new Set(Array.from(prev)); next.add(activeTab); return next; });
    setSaving(true);
    try {
      let savedProductId = productId;

      if (isNew) {
        const response = await productAPI.createProduct(formData);
        if (response.success) {
          savedProductId = response.data._id;
        }
      } else {
        await productAPI.updateProduct(productId!, formData);
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

      toast({
        title: isNew ? 'Product Created' : 'Product Updated',
        description: isNew ? 'Your product has been added successfully.' : 'Your product has been updated.',
      });
      router.push('/dashboard/products');
    } catch {
      toast({ title: 'Error', description: 'Failed to save product. Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
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
      <h1 className={`text-2xl lg:text-3xl text-gray-900 ${josefinSemiBold.className}`}>
        {isNew ? 'Add Product' : 'Edit Product'}
      </h1>

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
                  ? 'bg-[#1a2e23] text-white border-[#1a2e23]'
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
                  <label className={labelClassName}>Unit Price (cents)</label>
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

            {/* Tab 2: Compliance & Documentation */}
            {activeTab === 2 && (
              <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
                Compliance documentation upload and tracking will be available here. Link your
                verification documents to this product.
              </p>
            )}

            {/* Tab 3: Capacity & Scalability */}
            {activeTab === 3 && (
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
            disabled={saving || uploadingImage}
            className={`px-5 py-2.5 rounded-lg text-sm bg-[#1a2e23] text-white transition-colors hover:bg-[#243d2f] disabled:opacity-60 disabled:cursor-not-allowed ${josefinSemiBold.className}`}>
            {saving ? (uploadingImage ? 'Uploading image...' : 'Saving...') : 'Save Product'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className={`px-5 py-2.5 rounded-lg text-sm bg-[#1a2e23] text-white transition-colors hover:bg-[#243d2f] ${josefinSemiBold.className}`}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
