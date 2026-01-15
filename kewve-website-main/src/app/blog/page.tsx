import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createClient } from '@/prismicio';

import { josefinRegular, titleFont } from '@/utils';
import { BlogPostDocumentData } from '../../../prismicio-types';
import BlogCard from '@/components/BlogCard';

export default async function Blogs() {
  const client = createClient();

  const blogPageContent = await client.getByType('blogs_page', { fetchOptions: { next: { revalidate: 10 } } });

  const blogs = await client.getAllByType('blog_post', {
    fetchOptions: {
      next: { revalidate: 60 },
    },
    fetchLinks: ['author.name'],
    orderings: [
      {
        field: 'my.product.published_on',
        direction: 'desc',
      },
    ],
  });

  return (
    <>
      <Header />
      <section className='landing-hero relative flex flex-col items-center py-16 lg:pt-40 lg:pb-0 overflow-x-hidden'>
        <div className='container spacing mx-auto'>
          <h1
            className={`text-3xl md:text-4xl xl:text-6xl font-bold text-white text-center mb-4 ${titleFont.className}`}>
            {blogPageContent.results[0].data.title}
          </h1>
          <p
            className={`text-lg lg:text-2xl text-white leading-normal max-w-full lg:max-w-[60ch] mx-auto text-center ${josefinRegular.className}`}>
            {blogPageContent.results[0].data.description}
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
      <section className='bg-cream py-10 lg:py-0 lg:-mt-8 xl:-mt-16'>
        <div className='spacing container mx-auto'>
          <div className='grid grid-cols-12 gap-4 xl:gap-6'>
            {blogs.map((blog) => {
              const blogPost = blog.data as unknown as BlogPostDocumentData;
              return (
                <div className='col-span-12 md:col-span-6 lg:col-span-4' key={blog.uid}>
                  <BlogCard gridView key={blog.uid} uuid={blog.uid} post={blogPost} />
                </div>
              );
            })}
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
