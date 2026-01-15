import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createClient } from '@/prismicio';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { josefinRegular, josefinSemiBold, titleFont } from '@/utils';
import Link from 'next/link';
import Image from 'next/image';
import ProductCard from '@/components/ProductCard';

export const revalidate = 0;

export default async function Products({ searchParams }: any) {
  const params = new URLSearchParams(searchParams);
  const selectedBrand = params.get('brand') || 'all';
  const selectedCategory = params.get('category') || '';
  const client = createClient();
  const productCategories = [
    'Prepared Foods',
    'Ambient Food',
    'Dry Ingredients',
    'Beverages',
    'Health & Wellbeing Products',
    'Kitchen Essentials',
  ];

  const productPageContent = await client.getByType('products_page', { fetchOptions: { next: { revalidate: 10 } } });

  const products = await client.getAllByType('product', {
    fetchOptions: {
      next: { revalidate: 60 },
    },
    fetchLinks: ['brand'],
    orderings: [
      {
        field: 'my.product.published_on',
        direction: 'desc',
      },
    ],
  });

  const brands = await client.getAllByType('brand', {
    fetchOptions: {
      next: { revalidate: 60 },
    },
  });

  const filteredProducts = () => {
    if (selectedBrand && selectedBrand !== 'all') {
      //@ts-ignore
      const filteredProducts = products.filter((product) => product.data.brand.uid === selectedBrand);
      return filteredProducts;
    }

    if (selectedCategory) {
      const filteredProducts = products.filter((product) => product.data.category === selectedCategory);
      return filteredProducts;
    }

    return products;
  };

  return (
    <>
      <Header />
      <section className='landing-hero relative flex flex-col items-center py-16 lg:pt-24 overflow-x-hidden'>
        <div className='container spacing mx-auto lg:mt-16'>
          <h1
            className={`text-3xl md:text-4xl xl:text-6xl font-bold text-white text-center mb-4 max-w-full md:max-w-[15ch] md:mx-auto ${titleFont.className}`}>
            {productPageContent.results[0].data.title}
          </h1>
          <p
            className={`text-xl lg:text-2xl text-white leading-normal max-w-full lg:max-w-[60ch] mx-auto text-center ${josefinRegular.className}`}>
            {productPageContent.results[0].data.description}
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
            <div className='col-span-12 md:col-span-3 xl:col-span-2 md:border-r md:border-gray-200'>
              <aside>
                <div className='mb-6'>
                  <h3 className={`text-xl font-bold text-black text-left mb-4 xl:mb-6 ${josefinSemiBold.className}`}>
                    Filter by Category
                  </h3>
                  <div className='max-h-[500px] overflow-scroll'>
                    <RadioGroup defaultValue={selectedCategory} value={selectedCategory}>
                      {productCategories.map((category) => (
                        <Link
                          href={`?category=${category}`}
                          key={category}
                          scroll={false}
                          className='flex flex-shrink-0 items-center space-x-4 mb-4 cursor-pointer'>
                          <RadioGroupItem value={category} id={category} />
                          <Label htmlFor={category}>{category}</Label>
                        </Link>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
                <h3 className={`text-xl font-bold text-black text-left mb-4 xl:mb-6 ${josefinSemiBold.className}`}>
                  Filter by Brand
                </h3>
                <div className='max-h-[500px] overflow-scroll'>
                  <RadioGroup defaultValue={selectedBrand} value={selectedBrand}>
                    <Link
                      href='/products'
                      key='All Brands'
                      scroll={false}
                      className='flex items-center space-x-4 mb-4 cursor-pointer'>
                      <RadioGroupItem value='all' id='all-brands' />
                      <Label htmlFor='all brands'>All Brands</Label>
                    </Link>
                    {brands.map((brand) => (
                      <Link
                        href={`?brand=${brand.uid}`}
                        key={brand.uid}
                        scroll={false}
                        className='flex flex-shrink-0 items-center space-x-4 mb-4 cursor-pointer'>
                        <RadioGroupItem value={brand.uid} id={brand.uid} />
                        <Label htmlFor={brand.uid}>{brand.data.name}</Label>
                      </Link>
                    ))}
                  </RadioGroup>
                </div>
              </aside>
            </div>
            <div className='col-span-12 md:col-span-9 xl:col-span-10'>
              <div className='grid grid-cols-12 gap-4 xl:gap-6'>
                {filteredProducts().length > 0 &&
                  filteredProducts().map((product) => (
                    <div key={product.uid} className='col-span-12 md:col-span-6 xl:col-span-4'>
                      <ProductCard id={product.uid} product={product.data} />
                    </div>
                  ))}
                {filteredProducts().length === 0 && (
                  <div className='col-span-12 flex flex-col items-center'>
                    <Image
                      src='/images/empty.svg'
                      width={300}
                      height={300}
                      alt='Empty Illustraion'
                      className='mx-auto mb-4 lg:mb-8'
                    />
                    <h3 className={`text-xl font-bold text-black text-left mb-4 ${josefinSemiBold.className}`}>
                      No results found
                    </h3>
                    <Link
                      href='/products'
                      scroll={false}
                      className={`bg-black text-white rounded-full py-3 px-6 ${josefinSemiBold.className}`}>
                      Reset Filter
                    </Link>
                  </div>
                )}
              </div>
            </div>
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
