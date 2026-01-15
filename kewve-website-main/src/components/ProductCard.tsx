'use client';
import Link from 'next/link';
import Image from 'next/image';
import { getRandomColor, titleFont } from '@/utils';
import type { ProductDocumentData } from '../../prismicio-types';

import { useRouter } from 'next/navigation';

interface ProductCardProps {
  id: string;
  product: ProductDocumentData;
}

function ProductCard({ id, product }: ProductCardProps) {
  const color = getRandomColor();
  const router = useRouter();

  return (
    <Link
      prefetch
      href={`/products/${id}`}
      key={product.name}
      className='block relative h-full w-full rounded-lg flex-shrink-0 px-8 py-6 cursor-pointer'
      style={{
        background: `linear-gradient(to bottom, #fafaf0 35%, ${color} 35%, ${color} 100%)`,
      }}>
      <Image
        src={product.image?.url ?? ''}
        width={product.image?.dimensions?.width ?? 600}
        height={product.image?.dimensions?.height ?? 600}
        alt={product.image?.alt ?? 'Product'}
        className='w-3/4 h-auto aspect-square object-contain mx-auto'
      />
      <div className='relative z-20 mt-6 flex flex-col items-center justify-center'>
        <h4 className={`${titleFont.className} text-xl font-bold text-black text-center uppercase mb-4`}>
          {product.name}
        </h4>
      </div>
    </Link>
  );
}

export default ProductCard;
