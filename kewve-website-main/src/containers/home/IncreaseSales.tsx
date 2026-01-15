'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { poppinsRegular, josefinSemiBold, titleFont, josefinRegular } from '@/utils';
import CTAButtons from '@/containers/CTAButtons';
import type { HomePageDocumentData } from '../../../prismicio-types';
import { PrismicNextImage } from '@prismicio/next';

function IncreaseSales({ content }: { content: HomePageDocumentData }) {
  return (
    <section className='relative bg-muted-orange pb-10 lg:pt-40'>
      <div className='grid grid-cols-2 items-center gap-4 lg:gap-x-20'>
        <div className='col-span-2 lg:col-span-1 order-2 lg:order-1 py-8 px-4 lg:p-20'>
          {content.fifth_section_points.map((point) => {
            return (
              <motion.div
                key={point.heading}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                className='mb-6 xl:mb-10 text-center lg:text-left'>
                <PrismicNextImage field={point.icon} width={48} height={48} className='mb-4 mx-auto lg:mx-0' />
                <h3 className={`text-2xl lg:text-3xl text-black leading-tight mb-2 ${josefinSemiBold.className}`}>
                  {point.heading}
                </h3>
                <p
                  className={`text-lg lg:text-xl text-black max-w-full lg:max-w-[55ch] leading-relaxed ${poppinsRegular.className}`}>
                  {point.description}
                </p>
              </motion.div>
            );
          })}
        </div>
        <div className='col-span-2 lg:col-span-1 order-1 lg:order-2'>
          <div className='bg-yellow py-14 px-4 lg:py-20 lg:pl-40 lg:pr-20 rounded-tl-[40px] rounded-tr-[40px] rounded-bl-[40px] rounded-br-[40px] lg:rounded-tl-[200px] lg:rounded-bl-[200px] lg:rounded-tr-none lg:rounded-br-none'>
            <div className='flex flex-col items-center lg:items-start mb-8'>
              <motion.h2
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                className={`text-3xl md:text-4xl xl:text-6xl text-black font-bold text-center lg:text-left mb-6 ${titleFont.className}`}>
                {content.fifth_section_title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: 0.2 }}
                className={`text-xl lg:text-2xl text-black leading-normal max-w-full lg:max-w-[50ch]  text-center lg:text-left ${josefinRegular.className}`}>
                {content.fifth_section_description}
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              className='bg-yellow-dark w-[80%] lg:w-[60%] h-auto rounded-3xl p-6 mx-auto lg:mx-0 mb-8'>
              <PrismicNextImage field={content.fifth_section_image} className='w-full h-full' />
            </motion.div>
            <div className='flex justify-center lg:justify-start'>
              <CTAButtons
                className='mt-2'
                buyerText={content.fifth_section_buyer_cta?.toString()}
                supplierText={content.fifth_section_supplier_cta?.toString()}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default IncreaseSales;
