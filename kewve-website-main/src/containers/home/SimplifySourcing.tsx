'use client';

import { motion } from 'framer-motion';
import CTAButtons from '@/containers/CTAButtons';
import { PrismicNextImage } from '@prismicio/next';
import { josefinRegular, poppinsRegular, josefinSemiBold, titleFont } from '@/utils';
import type { HomePageDocumentData } from '../../../prismicio-types';

function SimplifySourcing({ content }: { content: HomePageDocumentData }) {
  return (
    <section className='bg-muted-orange py-10 lg:py-0 lg:-mt-8 xl:-mt-16'>
      <div className='spacing container xl:w-[80%] mx-auto'>
        <div className='flex flex-col items-center mb-8 lg:mb-16 xl:mb-24'>
          <motion.h2
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            className={`text-3xl md:text-4xl xl:text-6xl text-center text-black font-bold mb-6 max-w-full md:max-w-[15ch] md:mx-auto ${titleFont.className}`}>
            {content.third_section_title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.1 }}
            className={`text-lg lg:text-2xl text-black leading-normal max-w-full lg:max-w-[60ch] mx-auto text-center ${josefinRegular.className}`}>
            {content.third_section_description}
          </motion.p>
        </div>
        <div className='grid grid-cols-2 gap-4 gap-y-8 items-center'>
          <div className='col-span-2 lg:col-span-1 order-2 lg:order-1'>
            {content.third_section_points.map((point) => {
              return (
                <motion.div
                  key={point.heading}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  className='mb-6 xl:mb-10 text-center lg:text-left'>
                  <PrismicNextImage field={point.icon} height={48} width={48} className='mb-4 mx-auto lg:mx-0' />
                  <h3 className={`text-xl lg:text-3xl text-black leading-tight mb-2 ${josefinSemiBold.className}`}>
                    {point.heading}
                  </h3>
                  <p
                    className={`text-base lg:text-xl text-black max-w-full lg:max-w-[45ch] leading-relaxed ${poppinsRegular.className}`}>
                    {point.description}
                  </p>
                </motion.div>
              );
            })}
            <div className='flex justify-center lg:justify-start mt-8'>
              <CTAButtons
                buyerText={content.third_section_buyer_cta?.toString()}
                supplierText={content.third_section_supplier_cta?.toString()}
              />
            </div>
          </div>
          <div className='col-span-2 lg:col-span-1 order-1 lg:order-2'>
            <div className='relative'>
              <motion.img
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 1 }}
                src={content.third_section_image.url || ''}
                alt={content.third_section_image.alt || ''}
                width={600}
                height={400}
                className='relative w-full h-auto aspect-square rounded-xl shadow-lg z-20'
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SimplifySourcing;
