'use client';

import { motion } from 'framer-motion';
import CTAButtons from '@/containers/CTAButtons';
import { PrismicNextImage } from '@prismicio/next';
import { titleFont, josefinRegular, josefinSemiBold, poppinsRegular } from '@/utils';
import type { HomePageDocumentData } from '../../../prismicio-types';

function DiscoverFlavours({ content }: { content: HomePageDocumentData }) {
  return (
    <section className='bg-yellow py-10 lg:py-0 lg:pb-4 lg:-mt-8 xl:-mt-16'>
      <div className='spacing container xl:w-[80%] mx-auto'>
        <div className='flex flex-col items-center mb-4 lg:mb-8 xl:mb-10'>
          <motion.h2
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            className={`text-3xl md:text-4xl xl:text-6xl text-black font-bold text-center mb-4 ${titleFont.className}`}>
            {content.second_section_title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.1 }}
            className={`text-xl lg:text-2xl text-black leading-normal max-w-full lg:max-w-[60ch] mx-auto text-center ${josefinRegular.className}`}>
            {content.second_section_description}
          </motion.p>
        </div>
        <div className='grid grid-cols-4 gap-4 mb-8 lg:mb-16'>
          <div className='col-span-2 xl:col-span-1'>
            <motion.img
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              src={content.show_case_image_1.url || ''}
              alt='Spices from Africa'
              width={640}
              height={400}
              className='w-full h-[300px] lg:h-[450px] aspect-square object-cover rounded-2xl'
            />
          </div>
          <div className='col-span-2 xl:col-span-1 mt-8'>
            <motion.img
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              src={content.show_case_image_2.url || ''}
              alt='Snacks from Africa'
              width={640}
              height={400}
              className='w-full h-[300px] lg:h-[450px] aspect-square object-cover rounded-2xl'
            />
          </div>
          <div className='col-span-2 xl:col-span-1'>
            <motion.img
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              src={content.show_case_image_3.url || ''}
              alt='Drinks from Africa'
              width={640}
              height={400}
              className='w-full h-[300px] lg:h-[450px] aspect-square object-cover object-left rounded-2xl'
            />
          </div>
          <div className='col-span-2 xl:col-span-1 mt-8'>
            <motion.img
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              src={content.show_case_image_4.url || ''}
              alt='Sauces from Africa'
              width={640}
              height={400}
              className='w-full h-[300px] lg:h-[450px] aspect-square object-cover object-left rounded-2xl'
            />
          </div>
        </div>
        <div className='grid grid-cols-3 gap-4 lg:gap-8 xl:gap-10'>
          {content.second_section_points.map((point) => {
            return (
              <motion.div
                key={point.heading}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                className='col-span-4 lg:col-span-1 text-center'>
                <PrismicNextImage field={point.icon} height={64} width={64} className='mb-4 mx-auto' />
                <h3 className={`text-xl lg:text-2xl text-black leading-tight mb-2 ${josefinSemiBold.className}`}>
                  {point.heading}
                </h3>
                <p className={`tex-lg lg:text-xl text-black leading-relaxed ${poppinsRegular.className}`}>
                  {point.description}
                </p>
              </motion.div>
            );
          })}
        </div>
        <div className='flex justify-center mt-8'>
          <CTAButtons
            buyerText={content.second_section_buyer_cta?.toString()}
            supplierText={content.second_section_supplier_cta?.toString()}
          />
        </div>
      </div>
    </section>
  );
}

export default DiscoverFlavours;
