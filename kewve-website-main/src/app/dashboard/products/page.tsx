'use client';

import { useState, useEffect } from 'react';
import { josefinSemiBold, josefinRegular } from '@/utils';
import { productAPI, assessmentAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, ImageOff, Lock } from 'lucide-react';

const VERIFICATION_CATEGORIES = [
  'biz-reg', 'tax-id', 'bank-stmt',
  'food-safety', 'export-license', 'phyto-cert',
  'prod-capacity', 'packaging', 'quality-ctrl',
];

function ProductThumbnail({ productId, name }: { productId: string; name: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadImage = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${apiUrl}/products/${productId}/image`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed');
        const blob = await res.blob();
        if (!cancelled) {
          setSrc(URL.createObjectURL(blob));
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    loadImage();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (failed || !src) {
    return (
      <div className='w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center'>
        <ImageOff className='w-4 h-4 text-gray-300' />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className='w-10 h-10 rounded-lg object-cover border border-gray-200'
    />
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allVerified, setAllVerified] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsRes, assessmentRes] = await Promise.allSettled([
          productAPI.getProducts(),
          assessmentAPI.getAssessment(),
        ]);

        if (productsRes.status === 'fulfilled' && productsRes.value.success) {
          setProducts(productsRes.value.data);
        }

        if (assessmentRes.status === 'fulfilled' && assessmentRes.value.success) {
          const docs = assessmentRes.value.data?.documents || [];
          const approvedCategories = new Set(
            docs
              .filter((d: any) => d.category && VERIFICATION_CATEGORIES.includes(d.category) && d.status === 'approved')
              .map((d: any) => d.category)
          );
          setAllVerified(approvedCategories.size >= VERIFICATION_CATEGORIES.length);
        }
      } catch {
        // defaults are fine
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const badgeClass = () => {
    return `text-xs px-2.5 py-1 rounded-full border border-gray-300 text-gray-600 ${josefinRegular.className}`;
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <div className='flex flex-col items-center gap-3'>
          <Loader2 className='w-6 h-6 text-gray-400 animate-spin' />
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-5xl mx-auto space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h1 className={`text-2xl lg:text-3xl text-gray-900 ${josefinSemiBold.className}`}>
          Products
        </h1>
        <div className='relative group'>
          <button
            onClick={() => allVerified && router.push('/dashboard/products/new')}
            disabled={!allVerified}
            className={`flex items-center gap-2 rounded-lg py-2.5 px-5 text-sm transition-colors ${josefinSemiBold.className} ${
              allVerified
                ? 'bg-[#1a2e23] text-white hover:bg-[#243d2f]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}>
            {allVerified ? <Plus className='w-4 h-4' /> : <Lock className='w-4 h-4' />}
            Add Product
          </button>
          {!allVerified && (
            <div className='absolute right-0 top-full mt-2 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10'>
              All verification documents must be approved before adding products.
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {products.length === 0 ? (
        <div className='bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center text-center'>
          <p className={`text-gray-500 mb-6 ${josefinRegular.className}`}>
            {allVerified
              ? 'No products added yet. Start by adding your first product.'
              : 'All verification documents must be approved before you can add products.'}
          </p>
          <div className='relative group'>
            <button
              onClick={() => allVerified && router.push('/dashboard/products/new')}
              disabled={!allVerified}
              className={`inline-flex items-center gap-2 rounded-lg py-2.5 px-5 text-sm transition-colors ${josefinSemiBold.className} ${
                allVerified
                  ? 'bg-[#1a2e23] text-white hover:bg-[#243d2f]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
              {allVerified ? <Plus className='w-4 h-4' /> : <Lock className='w-4 h-4' />}
              Add Product
            </button>
            {!allVerified && (
              <div className='absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10'>
                All verification documents must be approved before adding products.
              </div>
            )}
          </div>
          {!allVerified && (
            <button
              onClick={() => router.push('/dashboard/verification')}
              className={`text-sm text-orange hover:underline mt-4 ${josefinSemiBold.className}`}>
              Go to Verification →
            </button>
          )}
        </div>
      ) : (
        <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b border-gray-200'>
                  <th className={`text-left px-5 py-4 text-sm text-gray-500 font-normal w-16 ${josefinRegular.className}`}></th>
                  <th className={`text-left px-5 py-4 text-sm text-gray-500 font-normal ${josefinRegular.className}`}>Product Name</th>
                  <th className={`text-left px-5 py-4 text-sm text-gray-500 font-normal ${josefinRegular.className}`}>Category</th>
                  <th className={`text-left px-5 py-4 text-sm text-gray-500 font-normal ${josefinRegular.className}`}>Readiness</th>
                  <th className={`text-left px-5 py-4 text-sm text-gray-500 font-normal ${josefinRegular.className}`}>Verification</th>
                  <th className={`text-left px-5 py-4 text-sm text-gray-500 font-normal ${josefinRegular.className}`}>Aggregation</th>
                  <th className={`text-left px-5 py-4 text-sm text-gray-500 font-normal ${josefinRegular.className}`}>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {products.map((product) => (
                  <tr key={product._id} className='hover:bg-gray-50 transition-colors'>
                    <td className='px-5 py-3'>
                      {product.hasImage ? (
                        <ProductThumbnail productId={product._id} name={product.name} />
                      ) : (
                        <div className='w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center'>
                          <ImageOff className='w-4 h-4 text-gray-300' />
                        </div>
                      )}
                    </td>
                    <td className={`px-5 py-4 text-sm text-gray-900 ${josefinSemiBold.className}`}>
                      {product.name || '—'}
                    </td>
                    <td className={`px-5 py-4 text-sm text-gray-600 ${josefinRegular.className}`}>
                      {product.category || '—'}
                    </td>
                    <td className='px-5 py-4'>
                      <span className={badgeClass()}>
                        {product.readiness}
                      </span>
                    </td>
                    <td className='px-5 py-4'>
                      <span className={badgeClass()}>
                        {product.verification}
                      </span>
                    </td>
                    <td className='px-5 py-4'>
                      <span className={badgeClass()}>
                        {product.aggregation}
                      </span>
                    </td>
                    <td className='px-5 py-4'>
                      <button
                        onClick={() => router.push(`/dashboard/products/${product._id}`)}
                        className={`text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${josefinRegular.className}`}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
