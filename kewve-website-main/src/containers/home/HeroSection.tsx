'use client';

import { motion } from 'framer-motion';
import { PrismicNextImage } from '@prismicio/next';
import { titleFont, josefinRegular, getRandomColor } from '@/utils';
import { InfiniteMovingCards } from '@/components/ui/InfiniteMovingCards';
import { ProductDocument, HomePageDocumentData } from '../../../prismicio-types';
import CTAButtons from '@/containers/CTAButtons';

interface HeroSectionProps {
  items: ProductDocument[];
  content: HomePageDocumentData;
}

function HeroSection({ items, content }: HeroSectionProps) {
  return (
    <section className='landing-hero relative min-h-[100vh] flex flex-col items-center pt-16 pb-10 lg:pt-40 lg:pb-6 overflow-x-hidden'>
      <div className='spacing relative z-10 mb-10'>
        <motion.h2
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-4xl sm:text-5xl md:text-text-7xl lg:text-8xl text-white text-center tracking-wide text-with-shadow ${titleFont.className}`}>
          {content.title}
        </motion.h2>
        <motion.h2
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`text-4xl sm:text-5xl md:text-text-7xl lg:text-8xl text-white text-center tracking-wide text-with-shadow ${titleFont.className}`}>
          {content.subtitle}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`text-xl lg:text-2xl text-white text-center max-w-[60ch] mx-auto my-6 ${josefinRegular.className}`}>
          {content.description}
        </motion.p>
        <div className='flex justify-center'>
          <CTAButtons
            className='mt-0'
            supplierText={content.supplier_cta?.toString()}
          />
        </div>
      </div>
      <InfiniteMovingCards>
        <>
          {items.map((item, idx) => {
            const color = getRandomColor();
            return (
              <div className='relative w-[333px] max-w-full flex-shrink-0 cursor-grab' key={item.data.name}>
                <div
                  aria-hidden='true'
                  className='user-select-none -z-1 pointer-events-none absolute -left-0.5 -top-0.5 h-[calc(100%_+_4px)] w-[calc(100%_+_4px)]'></div>
                <div
                  className='relative w-full h-[430px] flex items-center rounded-[200px]'
                  style={{ backgroundColor: color }}>
                  <PrismicNextImage
                    field={item.data.image}
                    className='w-3/4 h-auto aspect-square object-contain mx-auto pointer-events-none'
                  />
                </div>
                <div className='relative z-20 flex mt-6 flex-col items-center'>
                  <h4
                    className={`${titleFont.className} text-xl text-black font-bold tracking-wide text-center uppercase`}>
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

export default HeroSection;
