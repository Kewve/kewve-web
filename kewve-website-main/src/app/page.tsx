import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCarousel from '@/containers/home/ProductCarousel';
import AuthAwareLink from '@/components/AuthAwareLink';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/prismicio';
import { filter } from '@prismicio/client';
import { titleFont, josefinRegular, josefinSemiBold, poppinsRegular } from '@/utils';
import { CheckCircle, ShieldCheck, BarChart3, TrendingUp, Globe } from 'lucide-react';

const features = [
  {
    icon: CheckCircle,
    iconBg: 'bg-orange/10',
    iconColor: 'text-orange',
    title: 'Export Readiness',
    description: 'Get your products ready for UK & EU markets, meeting all necessary documentation standards.',
  },
  {
    icon: ShieldCheck,
    iconBg: 'bg-orange/10',
    iconColor: 'text-orange',
    title: 'Certified Supply',
    description: 'Work with verified, export-ready producers that meet your exact specifications and capacity needs.',
  },
  {
    icon: BarChart3,
    iconBg: 'bg-[#153b2e]/10',
    iconColor: 'text-[#153b2e]',
    title: 'Trade Operations',
    description: 'Quotes, orders, documentation and shipment coordination handled in one structured workflow.',
  },
  {
    icon: TrendingUp,
    iconBg: 'bg-orange/10',
    iconColor: 'text-orange',
    title: 'Market Intelligence',
    description: 'Track supply performance and market trends to make better sourcing and trade decisions.',
  },
  {
    icon: Globe,
    iconBg: 'bg-[#153b2e]/10',
    iconColor: 'text-[#153b2e]',
    title: 'UK & EU Market Access',
    description: 'Guidance and support to navigate regulatory, compliance, and logistical requirements.',
  },
  {
    icon: Globe,
    iconBg: 'bg-orange/10',
    iconColor: 'text-orange',
    title: 'UK & EU Market Access',
    description: 'Guidance and support to navigate regulatory, compliance, and logistical requirements.',
  },
];

export default async function Home() {
  const client = createClient();

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
    <div className='bg-[#faf8f5] min-h-screen'>
      <Header needsBackground />

      {/* ── Hero Section ── */}
      <section className='max-w-7xl mx-auto px-6 pt-20 pb-16 lg:pt-28 lg:pb-24'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center'>
          <div>
            <h1 className={`text-4xl sm:text-5xl lg:text-6xl text-[#1a1a1a] leading-[1.15] mb-6 ${titleFont.className}`}>
              African F&B, built for global trade.
            </h1>
            <p className={`text-base sm:text-lg text-[#5a5a5a] leading-relaxed mb-8 max-w-[50ch] ${josefinRegular.className}`}>
              Kewve is digital export infrastructure designed to prepare and structure food &amp; beverage for UK and EU markets.
            </p>
            <AuthAwareLink
              hrefGuest='/export-readiness'
              hrefAuth='/dashboard'
              className={`inline-block bg-[#153b2e] text-white px-8 py-4 rounded-lg text-base sm:text-lg hover:bg-[#1a4a3a] transition-colors ${josefinSemiBold.className}`}
            >
              Start Your Trading Journey
            </AuthAwareLink>
          </div>
          <div className='relative h-[280px] sm:h-[360px] lg:h-[460px] rounded-2xl overflow-hidden'>
            <Image
              src='https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80'
              alt='African grains and spices'
              fill
              className='object-cover'
              priority
              sizes='(max-width: 1024px) 100vw, 50vw'
            />
          </div>
        </div>
      </section>

      {/* ── Wave: cream → orange ── */}
      <div className='bg-orange -mb-px'>
        <svg viewBox='0 0 1440 100' preserveAspectRatio='none' className='w-full h-[50px] sm:h-[70px] lg:h-[100px] block'>
          <path d='M0,60 C320,100 520,0 720,50 C920,100 1120,20 1440,60 L1440,0 L0,0 Z' fill='#faf8f5' />
        </svg>
      </div>

      {/* ── Product Carousel ── */}
      <ProductCarousel items={products} />

      {/* ── Wave: orange → cream ── */}
      <div className='bg-[#faf8f5] -mt-px'>
        <svg viewBox='0 0 1440 100' preserveAspectRatio='none' className='w-full h-[50px] sm:h-[70px] lg:h-[100px] block'>
          <path d='M0,60 C320,100 520,0 720,50 C920,100 1120,20 1440,60 L1440,0 L0,0 Z' fill='#ed722d' />
        </svg>
      </div>

      {/* ── How Kewve Works ── */}
      <section className='max-w-7xl mx-auto px-6 py-14 lg:py-20'>
        <div className='text-center mb-10 lg:mb-14'>
          <h2 className={`text-3xl sm:text-4xl text-[#1a1a1a] mb-4 ${titleFont.className}`}>
            How Kewve Works
          </h2>
          <p className={`text-base sm:text-lg text-[#5a5a5a] max-w-[60ch] mx-auto ${josefinRegular.className}`}>
            We simplify and support every step of the African F&B export journey.
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto'>
          {/* Export Card */}
          <div className='bg-white rounded-2xl p-7 sm:p-8 shadow-sm border border-gray-100 flex flex-col'>
            <div className='h-16 w-16 sm:h-20 sm:w-20 bg-orange/10 rounded-2xl flex items-center justify-center mb-5'>
              <span className='text-3xl sm:text-4xl' role='img' aria-label='grains'>🌾</span>
            </div>
            <h3 className={`text-lg sm:text-xl text-[#1a1a1a] mb-2 ${josefinSemiBold.className}`}>
              Export African F&B
            </h3>
            <p className={`text-sm sm:text-base text-[#5a5a5a] leading-relaxed mb-6 flex-1 ${poppinsRegular.className}`}>
              Get your products ready for UK &amp; EU markets.
            </p>
            <AuthAwareLink
              hrefGuest='/export-readiness'
              hrefAuth='/dashboard'
              className={`inline-block w-fit border-2 border-orange text-orange px-5 py-2.5 rounded-lg text-sm hover:bg-orange hover:text-white transition-colors ${josefinSemiBold.className}`}
            >
              Start with Readiness
            </AuthAwareLink>
          </div>

          {/* Source Card */}
          <div className='bg-white rounded-2xl p-7 sm:p-8 shadow-sm border border-gray-100 flex flex-col'>
            <div className='h-16 w-16 sm:h-20 sm:w-20 bg-[#153b2e]/10 rounded-2xl flex items-center justify-center mb-5'>
              <span className='text-3xl sm:text-4xl' role='img' aria-label='packages'>📦</span>
            </div>
            <h3 className={`text-lg sm:text-xl text-[#1a1a1a] mb-2 ${josefinSemiBold.className}`}>
              Source African F&B
            </h3>
            <p className={`text-sm sm:text-base text-[#5a5a5a] leading-relaxed mb-6 flex-1 ${poppinsRegular.className}`}>
              Work with verified, export ready producers that meet your exact specifications.
            </p>
            <Link
              href='/waitlist'
              className={`inline-block w-fit border-2 border-[#2d2d2d] text-[#2d2d2d] px-5 py-2.5 rounded-lg text-sm hover:bg-[#2d2d2d] hover:text-white transition-colors ${josefinSemiBold.className}`}
            >
              Request Supply
            </Link>
          </div>
        </div>
      </section>

      {/* ── Wave: cream → orange ── */}
      <div className='bg-orange -mb-px'>
        <svg viewBox='0 0 1440 100' preserveAspectRatio='none' className='w-full h-[50px] sm:h-[70px] lg:h-[100px] block'>
          <path d='M0,40 C360,100 1080,0 1440,60 L1440,0 L0,0 Z' fill='#faf8f5' />
        </svg>
      </div>

      {/* ── What Kewve Handles For You ── */}
      <section className='bg-orange py-14 lg:py-20'>
        <div className='max-w-7xl mx-auto px-6'>
          <div className='text-center mb-10 lg:mb-14'>
            <h2 className={`text-3xl sm:text-4xl text-white mb-4 ${titleFont.className}`}>
              What Kewve Handles For You
            </h2>
            <p className={`text-base sm:text-lg text-white/80 max-w-[60ch] mx-auto ${josefinRegular.className}`}>
              We simplify and support every step of the African F&B export journey.
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6 max-w-5xl mx-auto'>
            {features.map((feature, idx) => (
              <div key={idx} className='bg-white/15 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-white/20 flex items-start gap-4'>
                <div className='h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-xl flex items-center justify-center bg-white/20'>
                  <feature.icon className='h-5 w-5 sm:h-6 sm:w-6 text-white' />
                </div>
                <div>
                  <h3 className={`text-base sm:text-lg text-white mb-1.5 ${josefinSemiBold.className}`}>
                    {feature.title}
                  </h3>
                  <p className={`text-xs sm:text-sm text-white/75 leading-relaxed ${poppinsRegular.className}`}>
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Wave: orange → cream ── */}
      <div className='bg-[#faf8f5] -mt-px'>
        <svg viewBox='0 0 1440 100' preserveAspectRatio='none' className='w-full h-[50px] sm:h-[70px] lg:h-[100px] block'>
          <path d='M0,60 C320,100 520,0 720,50 C920,100 1120,20 1440,60 L1440,0 L0,0 Z' fill='#ed722d' />
        </svg>
      </div>

      {/* ── Bottom CTA ── */}
      <section className='max-w-7xl mx-auto px-6 py-14 lg:py-20 text-center'>
        <h2 className={`text-3xl sm:text-4xl text-[#1a1a1a] mb-4 leading-snug ${titleFont.className}`}>
          Start with <span className='text-orange italic'>readiness</span>. Trade with confidence.
        </h2>
        <p className={`text-base sm:text-lg text-[#5a5a5a] max-w-[55ch] mx-auto mb-8 ${josefinRegular.className}`}>
          Get a readiness score and clear next steps tailored for UK &amp; EU export.
        </p>
        <Link
          href='/export-readiness'
          className={`inline-block bg-[#153b2e] text-white px-8 py-4 rounded-lg text-base sm:text-lg hover:bg-[#1a4a3a] transition-colors ${josefinSemiBold.className}`}
        >
          Take the Assessment
        </Link>
      </section>

      {/* ── Wave: cream → orange ── */}
      <div className='bg-orange -mb-px'>
        <svg viewBox='0 0 1440 100' preserveAspectRatio='none' className='w-full h-[50px] sm:h-[70px] lg:h-[100px] block'>
          <path d='M0,40 C360,100 1080,0 1440,60 L1440,0 L0,0 Z' fill='#faf8f5' />
        </svg>
      </div>

      {/* ── Footer ── */}
      <section className='bg-orange relative pb-10'>
        <Footer />
      </section>
    </div>
  );
}
