'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import { josefinSemiBold } from '@/utils';
import { ProductDocument } from '../../prismicio-types';

interface ProductGridProps {
  items: ProductDocument[];
}

function ProductGrid({ items }: ProductGridProps) {
  const [products, setProducts] = useState<ProductDocument[]>([]);
  const searchParams = useSearchParams();

  useEffect(() => {
    const selectedBrand = searchParams.get('brand') || 'all';

    if (selectedBrand && selectedBrand !== 'all') {
      //@ts-ignore
      const filteredProducts = items.filter((product) => product.data.brand.uid === selectedBrand);
      setProducts(filteredProducts);
    } else {
      setProducts(items);
    }
  }, [searchParams, items]);

  return (
    <div className='grid grid-cols-12 gap-4 xl:gap-6'>
      {products.length > 0 &&
        products.map((product) => (
          <div key={product.uid} className='col-span-12 md:col-span-6 xl:col-span-4'>
            <ProductCard id={product.uid} product={product.data} />
          </div>
        ))}
      {products.length === 0 && (
        <div className='col-span-12 flex flex-col items-center'>
          <Image
            src='/images/empty.svg'
            width={300}
            height={300}
            alt='Empty Illustraion'
            className='mx-auto mb-4 lg:mb-8'
          />
          <h3 className={`text-xl font-bold text-black text-left mb-4 ${josefinSemiBold.className}`}>
            No products found for the selected brand
          </h3>
          <Link
            href='/products'
            scroll={false}
            className={`bg-black text-white rounded-full py-3 px-6 ${josefinSemiBold.className}`}>
            Reset Filter
          </Link>
        </div>
      )}
    </div>
  );
}

export default ProductGrid;
