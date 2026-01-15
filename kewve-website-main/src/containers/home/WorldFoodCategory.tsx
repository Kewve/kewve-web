'use client';

import { motion } from 'framer-motion';
import CTAButtons from '@/containers/CTAButtons';
import { PrismicNextImage } from '@prismicio/next';
import { poppinsRegular, josefinSemiBold, titleFont, josefinRegular } from '@/utils';
import type { HomePageDocumentData } from '../../../prismicio-types';

function WorldFoodCategory({ content }: { content: HomePageDocumentData }) {
  return (
    <section className='relative bg-muted-orange py-10 lg:pt-40'>
      <div className='grid grid-cols-2 items-center gap-4 lg:gap-x-20'>
        <div className='col-span-2 lg:col-span-1'>
          <div className='bg-yellow py-14 px-4 lg:p-20 rounded-tl-[40px] rounded-tr-[40px] rounded-bl-[40px] rounded-br-[40px] lg:rounded-tr-[200px] lg:rounded-br-[200px] lg:rounded-tl-none lg:rounded-bl-none'>
            <div className='flex flex-col items-center lg:items-start mb-8'>
              <motion.h2
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                className={`text-3xl md:text-4xl xl:text-6xl text-black font-bold text-center lg:text-left mb-6 max-w-full md:max-w-[15ch] ${titleFont.className}`}>
                {content.fourth_section_title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: 0.2 }}
                className={`text-xl lg:text-2xl text-black leading-normal max-w-full lg:max-w-[50ch]  text-center lg:text-left ${josefinRegular.className}`}>
                {content.fourth_section_description}
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              className='bg-yellow-dark w-[80%] lg:w-[60%] h-auto rounded-3xl p-6 mx-auto lg:mx-0 mb-8'>
              <PrismicNextImage
                field={content.fourth_section_image}
                height={450}
                width={450}
                className='w-full h-full'
              />
            </motion.div>
            <div className='flex justify-center lg:justify-start'>
              <CTAButtons
                buyerText={content.fourth_section_buyer_cta?.toString()}
                supplierText={content.fourth_section_supplier_cta?.toString()}
                className='mt-2'
              />
            </div>
          </div>
        </div>
        <div className='col-span-2 lg:col-span-1 py-8 px-4 lg:p-20'>
          {content.fourth_section_points.map((point) => {
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
                  className={`tex-lg lg:text-xl text-black max-w-full lg:max-w-[55ch] leading-relaxed ${poppinsRegular.className}`}>
                  {point.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default WorldFoodCategory;
