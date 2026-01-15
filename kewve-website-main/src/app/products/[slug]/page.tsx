import { createClient } from '@/prismicio';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductDetail from '@/components/ProductDetail';
import { filter } from '@prismicio/client';

export default async function ProductDetailPage({ params }: any) {
  const client = createClient();
  const product = await client.getByUID('product', params.slug);
  const products = await client.getAllByType('product', {
    limit: 3,
    filters: [filter.at('my.product.category', String(product.data.category))],
  });

  return (
    <>
      <Header />
      <ProductDetail id={product.uid} product={product.data} products={products} />
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
