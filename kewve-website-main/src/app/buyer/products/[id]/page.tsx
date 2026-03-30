'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import { josefinRegular, josefinSemiBold } from '@/utils';
import { productAPI } from '@/lib/api';

interface BuyerProduct {
  _id: string;
  name?: string;
  category?: string;
  description?: string;
  hsCode?: string;
  minimumOrderQuantity?: number;
  unitPrice?: number;
  leadTime?: number;
  monthlyCapacity?: number;
}

export default function BuyerProductDetailPage() {
  const params = useParams();
  const productId = String(params.id || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [product, setProduct] = useState<BuyerProduct | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!productId) {
        setError('Product not found.');
        setLoading(false);
        return;
      }

      try {
        const res = await productAPI.getProduct(productId, { catalog: 'buyer' });
        if (!res.success || !res.data) {
          setError('Product not found.');
          setProduct(null);
        } else {
          setProduct(res.data);
          setError('');
        }
      } catch {
        setError('Unable to load product details.');
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [productId]);

  useEffect(() => {
    let cancelled = false;
    const loadImage = async () => {
      if (!product?._id) {
        setImageSrc(null);
        setImageFailed(false);
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
        if (!token) {
          setImageSrc(null);
          setImageFailed(true);
          return;
        }

        const res = await fetch(`${apiUrl}/products/${product._id}/image?catalog=buyer`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Image not available');
        const blob = await res.blob();
        if (!cancelled) {
          setImageSrc(URL.createObjectURL(blob));
          setImageFailed(false);
        }
      } catch {
        if (!cancelled) {
          setImageSrc(null);
          setImageFailed(true);
        }
      }
    };

    loadImage();
    return () => {
      cancelled = true;
    };
  }, [product?._id]);

  return (
    <div className='max-w-5xl mx-auto space-y-5'>
      <Link href='/buyer/products' className={`inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 ${josefinRegular.className}`}>
        <ArrowLeft className='w-4 h-4' />
        Back to Catalog
      </Link>

      {loading ? (
        <div className='bg-white rounded-xl border border-gray-300 p-8'>
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Loading product details...</p>
        </div>
      ) : error || !product ? (
        <div className='bg-white rounded-xl border border-gray-300 p-8'>
          <p className={`text-sm text-red-600 ${josefinRegular.className}`}>{error || 'Product not found.'}</p>
        </div>
      ) : (
        <div className='bg-white rounded-xl border border-gray-300 p-6 space-y-5'>
          <div className='flex flex-col lg:flex-row gap-5'>
            <div className='w-full lg:w-64 h-52 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center'>
              {imageSrc && !imageFailed ? (
                <img
                  src={imageSrc}
                  alt={product.name || 'Product'}
                  className='w-full h-full object-cover'
                  onError={(e) => {
                    setImageFailed(true);
                  }}
                />
              ) : (
                <Package className='w-8 h-8 text-gray-300' />
              )}
            </div>

            <div className='flex-1'>
              <h1 className={`text-4xl text-gray-900 ${josefinSemiBold.className}`}>{product.name || 'Untitled Product'}</h1>
              <p className={`text-sm text-gray-500 mt-2 ${josefinRegular.className}`}>
                Category: {String(product.category || 'uncategorized').toLowerCase()}
              </p>
              <p className={`text-sm text-gray-500 mt-1 ${josefinRegular.className}`}>
                Compliance: <span className='border border-green-300 bg-green-50 text-green-700 rounded px-2 py-0.5'>approved</span>
              </p>
              <div className='mt-4'>
                <Link
                  href={`/buyer/requests?productId=${product._id}&productName=${encodeURIComponent(product.name || '')}&category=${encodeURIComponent(product.category || '')}`}
                  className={`inline-flex items-center justify-center bg-brand-green text-white rounded-lg px-4 py-2 text-sm hover:opacity-90 transition-opacity ${josefinSemiBold.className}`}>
                  Request Product
                </Link>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='border border-gray-200 rounded-lg p-4'>
              <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Unit Price</p>
              <p className={`text-2xl text-gray-900 mt-1 ${josefinSemiBold.className}`}>
                {product.unitPrice ? `€${Number(product.unitPrice).toFixed(2)}` : '-'}
              </p>
            </div>
            <div className='border border-gray-200 rounded-lg p-4'>
              <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Min. Order Quantity</p>
              <p className={`text-2xl text-gray-900 mt-1 ${josefinSemiBold.className}`}>
                {product.minimumOrderQuantity || '-'}
              </p>
            </div>
            <div className='border border-gray-200 rounded-lg p-4'>
              <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Lead Time</p>
              <p className={`text-2xl text-gray-900 mt-1 ${josefinSemiBold.className}`}>
                {product.leadTime ? `${product.leadTime} days` : '-'}
              </p>
            </div>
            <div className='border border-gray-200 rounded-lg p-4'>
              <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Monthly Capacity</p>
              <p className={`text-2xl text-gray-900 mt-1 ${josefinSemiBold.className}`}>
                {product.monthlyCapacity ? `${Number(product.monthlyCapacity).toLocaleString()} units` : '-'}
              </p>
            </div>
          </div>

          <div className='border border-gray-200 rounded-lg p-4'>
            <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Description</p>
            <p className={`text-sm text-gray-700 mt-1 ${josefinRegular.className}`}>
              {product.description || 'No description provided.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

