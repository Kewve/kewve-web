import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createClient } from '@/prismicio';
import { filter } from '@prismicio/client';
import DiscoverFlavours from '@/containers/home/DiscoverFlavours';
import SimplifySourcing from '@/containers/home/SimplifySourcing';
import WorldFoodCategory from '@/containers/home/WorldFoodCategory';
import IncreaseSales from '@/containers/home/IncreaseSales';
import HeroSection from '@/containers/home/HeroSection';
import ContactSection from '@/containers/home/ContactSection';

export default async function Home() {
  const client = createClient();

  const homePageContent = await client.getByType('home_page', { fetchOptions: { next: { revalidate: 10 } } });

  const products = await client.getAllByType('product', {
    filters: [filter.at('my.product.featured', true)],
    limit: 10,
    fetchOptions: {
      next: { revalidate: 60 },
    },
    orderings: [
      {
        field: 'my.product.published_on',
        direction: 'desc',
      },
    ],
  });

  return (
    <div className='overflow-x-hidden'>
      <Header />
      <HeroSection items={products} content={homePageContent.results[0].data} />
      <section className='bg-yellow'>
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'>
          <path
            fill='#ed722d'
            d='M0,256L120,218.7C240,181,480,107,720,106.7C960,107,1200,181,1320,218.7L1440,256L1440,0L1320,0C1200,0,960,0,720,0C480,0,240,0,120,0L0,0Z'></path>
        </svg>
      </section>
      <DiscoverFlavours content={homePageContent.results[0].data} />
      <section className='bg-muted-orange'>
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'>
          <path
            fill='#eeb944'
            d='M0,256L120,218.7C240,181,480,107,720,106.7C960,107,1200,181,1320,218.7L1440,256L1440,0L1320,0C1200,0,960,0,720,0C480,0,240,0,120,0L0,0Z'></path>
        </svg>
      </section>
      <SimplifySourcing content={homePageContent.results[0].data} />
      <WorldFoodCategory content={homePageContent.results[0].data} />
      <IncreaseSales content={homePageContent.results[0].data} />
      <section className='bg-yellow'>
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'>
          <path
            fill='#ed722d'
            d='M0,256L120,218.7C240,181,480,107,720,106.7C960,107,1200,181,1320,218.7L1440,256L1440,0L1320,0C1200,0,960,0,720,0C480,0,240,0,120,0L0,0Z'></path>
        </svg>
      </section>
      <ContactSection content={homePageContent.results[0].data} />
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
    </div>
  );
}
