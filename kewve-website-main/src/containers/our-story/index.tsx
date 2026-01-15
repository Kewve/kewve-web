'use client';

import { motion } from 'framer-motion';
import { titleFont, josefinRegular } from '@/utils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CTAButtons from '@/containers/CTAButtons';
import type { OurStoryPageDocumentData } from '../../../prismicio-types';
import { PrismicRichText } from '@prismicio/react';

function OurStory({ content }: { content: OurStoryPageDocumentData }) {
  return (
    <>
      <Header />
      <section className='landing-hero relative flex flex-col items-center py-16 lg:pt-24 overflow-x-hidden'>
        <div className='container spacing mx-auto'>
          <motion.p
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`${titleFont.className} block text-4xl lg:text-5xl xl:text-6xl font-bold text-white text-center max-w-full md:max-w-[30ch] mx-auto lg:mt-16`}>
            {content.page_title}
          </motion.p>
        </div>
      </section>
      <section className='bg-yellow'>
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'>
          <path
            fill='#ed722d'
            fill-opacity='1'
            d='M0,256L120,218.7C240,181,480,107,720,106.7C960,107,1200,181,1320,218.7L1440,256L1440,0L1320,0C1200,0,960,0,720,0C480,0,240,0,120,0L0,0Z'></path>
        </svg>
      </section>
      <section className='relative bg-yellow py-10 lg:py-0 lg:-mt-8 xl:-mt-16'>
        <div className='spacing container xl:w-[80%] mx-auto'>
          <div className='grid grid-cols-2 gap-x-6 items-center'>
            <div className='col-span-2 lg:col-span-1 order-2 lg:order-1'>
              <motion.h2
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                className={`text-3xl md:text-4xl xl:text-5xl font-bold text-black mb-4 text-center lg:text-left ${titleFont.className}`}>
                {content.section_heading}
              </motion.h2>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: 0.1 }}
                className={`text-xl lg:text-2xl text-black leading-normal max-w-full lg:max-w-[45ch] mb-6 text-center lg:text-left mx-auto lg:mx-0 rich-text ${josefinRegular.className}`}>
                <PrismicRichText field={content.section_description} />
              </motion.div>
              <CTAButtons
                className='mt-6'
                buyerText={content.buyer_cta?.toString()}
                supplierText={content.supplier_cta?.toString()}
              />
            </div>
            <div className='col-span-2 lg:col-span-1 order-1 lg:order-2'>
              <div className='relative'>
                <motion.img
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, amount: 1 }}
                  src={content.section_image.url || ''}
                  alt={content.section_image.alt || ''}
                  width={600}
                  height={400}
                  className='relative w-full h-auto aspect-square rounded-xl shadow-lg z-20'
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className='bg-orange'>
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 200'>
          <path
            fill='#eeb944'
            d='M0,256L120,218.7C240,181,480,107,720,106.7C960,107,1200,181,1320,218.7L1440,256L1440,0L1320,0C1200,0,960,0,720,0C480,0,240,0,120,0L0,0Z'></path>
        </svg>
      </section>
      <section className='bg-orange relative pb-10'>
        <Footer />
      </section>
    </>
  );
}

export default OurStory;
