import { createClient } from '@/prismicio';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { PrismicRichText } from '@prismicio/react';
import { titleFont, poppinsRegular } from '@/utils';

export default async function Blog({ params }: any) {
  const client = createClient();
  const blog = await client.getByUID('blog_post', params.slug, {
    fetchOptions: {
      next: { revalidate: 60 },
    },
    fetchLinks: ['author.name'],
  });

  return (
    <>
      <Header />
      <section className='landing-hero relative flex flex-col items-center pt-20 pb-6 lg:py-40 lg:pb-0 overflow-x-hidden'>
        <div className='container spacing mx-auto'>
          <h1
            className={`text-3xl md:text-4xl xl:text-6xl font-bold text-white text-center mb-4 max-w-full md:max-w-[24ch] mx-auto ${titleFont.className}`}>
            {blog.data.title}
          </h1>
          <p
            className={`text-base md:text-xl mb-2 text-white leading-normal max-w-full lg:max-w-[60ch] mx-auto text-center ${poppinsRegular.className}`}>
            A post by{' '}
            <span className='capitalize'>
              {/*@ts-ignore*/}
              {blog.data.author.data.name}
            </span>
          </p>
        </div>
      </section>
      <section className='bg-cream'>
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'>
          <path
            fill='#ed722d'
            fill-opacity='1'
            d='M0,256L120,218.7C240,181,480,107,720,106.7C960,107,1200,181,1320,218.7L1440,256L1440,0L1320,0C1200,0,960,0,720,0C480,0,240,0,120,0L0,0Z'></path>
        </svg>
      </section>
      <section className='bg-cream py-10 md:pt-0 md:pb-4 lg:-mt-8 xl:-mt-16'>
        <div className={`spacing container lg:w-[80%] xl:w-[60%] mx-auto ${poppinsRegular.className}`}>
          <Image
            src={blog.data.banner.url || ''}
            height={blog.data.banner.dimensions?.height}
            width={blog.data.banner.dimensions?.width}
            alt='Blog Banner'
            className='w-full h-auto max-h-[400px] lg:max-h-[600px] object-cover mb-6 rounded-2xl'
          />
          <div className='blog'>
            <PrismicRichText field={blog.data.content} />
          </div>
        </div>
      </section>
      <section className='bg-orange'>
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 200'>
          <path
            fill='#fafaf0'
            fill-opacity='1'
            d='M0,256L120,218.7C240,181,480,107,720,106.7C960,107,1200,181,1320,218.7L1440,256L1440,0L1320,0C1200,0,960,0,720,0C480,0,240,0,120,0L0,0Z'></path>
        </svg>
      </section>
      <section className='bg-orange relative pb-10'>
        <Footer />
      </section>
    </>
  );
}
