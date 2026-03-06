'use client';

import { motion } from 'framer-motion';
import { titleFont, josefinRegular } from '@/utils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import type { OurStoryPageDocumentData } from '../../../prismicio-types';

function OurStory({ content }: { content: OurStoryPageDocumentData | null }) {
  const sectionHeadingClass = `text-3xl md:text-4xl xl:text-5xl font-bold text-black mb-4 text-center lg:text-left ${titleFont.className}`;
  const sectionImage = content?.section_image;

  const storyParagraphs = [
    'Kewve began with a simple belief: African food deserves a place on global supermarket shelves, not just in ethnic stores.',
    'African food is rich in flavour, heritage, and quality. Yet despite growing global demand, many African food and beverage businesses struggle to access international markets. Not because their products are not good enough, but because export requirements are complex, unclear, and difficult to navigate without the right support.',
    'Over time, we saw talented producers face repeated rejection, delays, and even product destruction simply due to missing information or misunderstood standards. At the same time, buyers in the UK and Europe wanted African food they could trust, source consistently, and scale with confidence.',
    'The problem was not demand. It was infrastructure.',
    'That gap is why Kewve exists.',
  ];

  const whyWeExistParagraphs = [
    'We believe Africa should export finished, compliant, and globally competitive food products, not just raw materials.',
    'Kewve builds the digital export infrastructure that makes this possible. We focus on readiness, standards, and structure - helping producers understand what global markets require, prepare their products properly, and organise supply in a way buyers can trust.',
    'This creates better outcomes for everyone: producers gain clarity and confidence, and buyers gain reliable access to African food & beverages built for trade.',
  ];

  const visionParagraphs = [
    'Our vision is a world where African food & beverages are traded globally with the same trust, consistency, and standards as any other major export region.',
    'We are building Africa\'s export infrastructure for food and beverages - turning fragmented supply into certified, scalable, and globally tradable products.',
    'Kewve is not about quick wins. It is about long-term impact, stronger producers, and Africa fully participating in global food trade on its own terms.',
  ];

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
            About Kewve
          </motion.p>
        </div>
      </section>
      <section className='bg-yellow -mt-[2px] -mb-[2px] overflow-hidden leading-none'>
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
                className={sectionHeadingClass}>
                Our Story
              </motion.h2>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: 0.1 }}
                className={`text-base lg:text-lg text-black leading-normal max-w-full lg:max-w-[60ch] mb-6 text-center lg:text-left mx-auto lg:mx-0 rich-text ${josefinRegular.className}`}>
                <div className='space-y-4'>
                  {storyParagraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>

                <div className='my-8'>
                  <svg className='w-full h-4' viewBox='0 0 100 10' preserveAspectRatio='none' aria-hidden='true'>
                    <path d='M0 6 Q50 1 100 6' fill='none' stroke='currentColor' strokeWidth='0.8' className='text-black/25' />
                  </svg>
                </div>

                <h2 className={sectionHeadingClass}>Why We Exist</h2>
                <div className='space-y-4'>
                  {whyWeExistParagraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>

                <div className='my-8'>
                  <svg className='w-full h-4' viewBox='0 0 100 10' preserveAspectRatio='none' aria-hidden='true'>
                    <path d='M0 6 Q50 1 100 6' fill='none' stroke='currentColor' strokeWidth='0.8' className='text-black/25' />
                  </svg>
                </div>

                <h2 className={sectionHeadingClass}>Our Vision</h2>
                <div className='space-y-4'>
                  {visionParagraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </motion.div>
            </div>
            <div className='col-span-2 lg:col-span-1 order-1 lg:order-2'>
              <div className='relative'>
                {sectionImage?.url ? (
                  <motion.img
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, amount: 1 }}
                    src={sectionImage.url}
                    alt={sectionImage.alt || 'Our Story image'}
                    width={600}
                    height={400}
                    className='relative w-full h-auto aspect-square rounded-xl shadow-lg z-20'
                  />
                ) : (
                  <div className='relative w-full aspect-square rounded-xl bg-black/10 z-20 flex items-center justify-center'>
                    <p className={`text-sm text-black/60 ${josefinRegular.className}`}>Image coming soon</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className='bg-orange -mb-[2px] overflow-hidden leading-none'>
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
