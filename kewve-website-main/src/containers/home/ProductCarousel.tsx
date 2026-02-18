'use client';

import { titleFont, getRandomColor } from '@/utils';
import { InfiniteMovingCards } from '@/components/ui/InfiniteMovingCards';
import { PrismicNextImage } from '@prismicio/next';
import { ProductDocument } from '../../../prismicio-types';

interface ProductCarouselProps {
  items: ProductDocument[];
}

function ProductCarousel({ items }: ProductCarouselProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className='bg-orange py-6 lg:py-10 overflow-hidden'>
      <InfiniteMovingCards>
        <>
          {items.map((item) => {
            const color = getRandomColor();
            return (
              <div className='relative w-[280px] sm:w-[333px] max-w-full flex-shrink-0 cursor-grab' key={item.data.name}>
                <div
                  aria-hidden='true'
                  className='user-select-none -z-1 pointer-events-none absolute -left-0.5 -top-0.5 h-[calc(100%_+_4px)] w-[calc(100%_+_4px)]'
                />
                <div
                  className='relative w-full h-[360px] sm:h-[430px] flex items-center rounded-[200px]'
                  style={{ backgroundColor: color }}>
                  <PrismicNextImage
                    field={item.data.image}
                    className='w-3/4 h-auto aspect-square object-contain mx-auto pointer-events-none'
                  />
                </div>
                <div className='relative z-20 flex mt-6 flex-col items-center'>
                  <h4
                    className={`${titleFont.className} text-lg sm:text-xl text-white font-bold tracking-wide text-center uppercase`}>
                    {item.data.name}
                  </h4>
                </div>
              </div>
            );
          })}
        </>
      </InfiniteMovingCards>
    </section>
  );
}

export default ProductCarousel;
