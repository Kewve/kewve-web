'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { titleFont, josefinSemiBold, josefinRegular } from '@/utils';
import { adminAPI } from '@/lib/api';
import { Loader2, Eye, Package } from 'lucide-react';

interface ProductItem {
  _id: string;
  name: string;
  category: string;
  unitPrice: number;
  verification: 'pending' | 'verified' | 'rejected';
  readiness: 'draft' | 'pending' | 'approved';
  hasImage: boolean;
  createdAt: string;
  producer: {
    name: string;
    email: string;
    businessName?: string;
  } | null;
}

const verificationStyles: Record<string, string> = {
  pending: 'border-amber-300 text-amber-700 bg-amber-50',
  verified: 'border-green-300 text-green-700 bg-green-50',
  rejected: 'border-red-300 text-red-700 bg-red-50',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ProductsPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductItem[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminAPI.getProducts();
        if (res.success && res.data) {
          setProducts(res.data);
        }
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className='max-w-5xl mx-auto space-y-6'>
      <h1 className={`text-2xl lg:text-3xl text-gray-900 ${titleFont.className}`}>
        Products
      </h1>

      {/* Summary */}
      {!loading && products.length > 0 && (
        <div className='grid grid-cols-3 gap-3'>
          <div className='bg-white rounded-xl border border-gray-200 p-4 text-center'>
            <p className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>{products.length}</p>
            <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Total</p>
          </div>
          <div className='bg-white rounded-xl border border-gray-200 p-4 text-center'>
            <p className={`text-lg text-amber-600 ${josefinSemiBold.className}`}>
              {products.filter((p) => p.verification === 'pending').length}
            </p>
            <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Pending Review</p>
          </div>
          <div className='bg-white rounded-xl border border-gray-200 p-4 text-center'>
            <p className={`text-lg text-green-600 ${josefinSemiBold.className}`}>
              {products.filter((p) => p.verification === 'verified').length}
            </p>
            <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Approved</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
        {loading ? (
          <div className='flex items-center justify-center py-16'>
            <Loader2 className='w-8 h-8 text-gray-400 animate-spin' />
          </div>
        ) : products.length === 0 ? (
          <div className='py-16 text-center'>
            <Package className='w-10 h-10 text-gray-300 mx-auto mb-3' />
            <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>No products found.</p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='text-sm text-gray-500 uppercase tracking-wider'>
                  <th className='text-left py-4 px-5 font-medium'>Product</th>
                  <th className='text-left py-4 px-5 font-medium'>Producer</th>
                  <th className='text-left py-4 px-5 font-medium'>Category</th>
                  <th className='text-left py-4 px-5 font-medium'>Price</th>
                  <th className='text-left py-4 px-5 font-medium'>Status</th>
                  <th className='text-left py-4 px-5 font-medium'>Date</th>
                  <th className='text-left py-4 px-5 font-medium'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id} className='border-t border-gray-100 text-sm text-gray-900'>
                    <td className='py-4 px-5'>
                      <div className='flex items-center gap-3'>
                        {product.hasImage ? (
                          <img
                            src={adminAPI.getProductImageUrl(product._id)}
                            alt={product.name}
                            className='w-9 h-9 rounded-lg object-cover bg-gray-100'
                          />
                        ) : (
                          <div className='w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center'>
                            <Package className='w-4 h-4 text-gray-400' />
                          </div>
                        )}
                        <span className={josefinSemiBold.className}>{product.name || 'Untitled'}</span>
                      </div>
                    </td>
                    <td className={`py-4 px-5 ${josefinRegular.className}`}>
                      {product.producer?.businessName || product.producer?.name || '-'}
                    </td>
                    <td className={`py-4 px-5 ${josefinRegular.className}`}>{product.category || '-'}</td>
                    <td className={`py-4 px-5 ${josefinRegular.className}`}>
                      {product.unitPrice ? `$${product.unitPrice.toFixed(2)}` : '-'}
                    </td>
                    <td className='py-4 px-5'>
                      <span
                        className={`inline-flex items-center border rounded-full px-3 py-0.5 text-xs capitalize ${
                          verificationStyles[product.verification] ?? 'border-gray-300 text-gray-600'
                        }`}>
                        {product.verification}
                      </span>
                    </td>
                    <td className={`py-4 px-5 text-gray-500 ${josefinRegular.className}`}>
                      {formatDate(product.createdAt)}
                    </td>
                    <td className='py-4 px-5'>
                      <Link
                        href={`/ops/products-clusters/${product._id}`}
                        className='inline-flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 transition-colors'>
                        <Eye className='w-3.5 h-3.5' />
                        Review
                      </Link>
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
