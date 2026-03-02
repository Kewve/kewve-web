import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCarousel from '@/containers/home/ProductCarousel';
import AuthAwareLink from '@/components/AuthAwareLink';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/prismicio';
import { filter } from '@prismicio/client';
import { titleFont, josefinRegular, josefinSemiBold } from '@/utils';
import { CheckCircle, ShieldCheck, BarChart3, TrendingUp, Globe } from 'lucide-react';

const howKewveWorksSteps = [
  { icon: CheckCircle, title: 'Prepare', description: 'Assess Your Business' },
  { icon: ShieldCheck, title: 'Improve', description: 'Get Step-by-Step Guidance' },
  { icon: BarChart3, title: 'Structure', description: 'Organise Your Supply' },
  { icon: Globe, title: 'Trade', description: 'Reach Global Markets' },
];

const features = [
  {
    icon: CheckCircle,
    title: 'Business & Product Review',
    description: 'A structured review of your business and products against export expectations.',
  },
  {
    icon: ShieldCheck,
    title: 'Export Requirement Checklists',
    description: 'Clear checklists showing standards, documents, and readiness requirements.',
  },
  {
    icon: BarChart3,
    title: 'Guidance to Fix Gaps',
    description: 'Step-by-step support to close readiness gaps and improve your export setup.',
  },
  {
    icon: TrendingUp,
    title: 'Readiness Score Report',
    description: 'A practical score report showing how close you are to being export-ready.',
  },
];

const joiningValues = [
  { icon: CheckCircle, title: 'Understand Buyer Expectations' },
  { icon: ShieldCheck, title: 'Increase Your Credibility' },
  { icon: BarChart3, title: 'Access New Opportunities' },
  { icon: TrendingUp, title: 'Build Sustainable Trade' },
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
    <div className='min-h-screen'>
      <Header needsBackground />

      {/* ── Hero Section ── */}
      <section className='bg-[#faf8f5]'>
        <div className='max-w-7xl mx-auto px-6 pt-20 pb-16 lg:pt-28 lg:pb-24'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center'>
            <div>
              <h1 className={`text-4xl sm:text-5xl lg:text-6xl text-[#1a1a1a] leading-[1.15] mb-6 ${titleFont.className}`}>
                African Food & Beverage, ready for global trade.
              </h1>
              <p className={`text-base sm:text-lg text-[#5a5a5a] leading-relaxed mb-8 max-w-[50ch] ${josefinRegular.className}`}>
                Kewve helps African food and beverage businesses prepare their products for export to the UK and EU, starting with readiness, standards, and structure.
              </p>
              <AuthAwareLink
                hrefGuest='/export-readiness'
                hrefAuth='/dashboard'
                className={`inline-block bg-brand-green text-white px-8 py-4 rounded-lg text-base sm:text-lg hover:opacity-90 transition-colors ${josefinSemiBold.className}`}
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
        </div>
      </section>

      {/* ── Wave: cream → orange ── */}
      <div className='bg-orange -mb-px'>
        <svg viewBox='0 0 1440 100' preserveAspectRatio='none' className='w-full h-[50px] sm:h-[70px] lg:h-[100px] block'>
          <path d='M0,60 C320,100 520,0 720,50 C920,100 1120,20 1440,60 L1440,0 L0,0 Z' fill='#faf8f5' />
        </svg>
      </div>

      {/* ── Product Carousel ── */}
      <section className='bg-white'>
        <ProductCarousel items={products} />
      </section>

      {/* ── Wave: orange → cream ── */}
      <div className='bg-[#faf8f5] -mt-px'>
        <svg viewBox='0 0 1440 100' preserveAspectRatio='none' className='w-full h-[50px] sm:h-[70px] lg:h-[100px] block'>
          <path d='M0,60 C320,100 520,0 720,50 C920,100 1120,20 1440,60 L1440,0 L0,0 Z' fill='#ed722d' />
        </svg>
      </div>

      {/* ── What Kewve Does ── */}
      <section className='bg-[#faf8f5]'>
        <div className='max-w-7xl mx-auto px-6 py-14 lg:py-20'>
          <div className='text-center mb-10 lg:mb-14'>
            <div className='flex items-center justify-center gap-3 sm:gap-5 mb-4'>
              <span className='h-px w-12 sm:w-20 bg-[#d6d0c8]' />
              <h2 className={`text-3xl sm:text-4xl text-[#1a1a1a] ${titleFont.className}`}>What Kewve Does</h2>
              <span className='h-px w-12 sm:w-20 bg-[#d6d0c8]' />
            </div>
          </div>
          <div className='max-w-3xl mx-auto p-1 sm:p-2'>
            <ul className='space-y-4'>
              <li className='flex items-start gap-3'>
                <CheckCircle className='h-5 w-5 text-orange mt-0.5 shrink-0' />
                <p className={`text-base sm:text-lg text-[#1a1a1a] leading-relaxed ${josefinRegular.className}`}>We help you become export-ready.</p>
              </li>
              <li className='flex items-start gap-3'>
                <CheckCircle className='h-5 w-5 text-orange mt-0.5 shrink-0' />
                <p className={`text-base sm:text-lg text-[#1a1a1a] leading-relaxed ${josefinRegular.className}`}>We organise supply into structured products.</p>
              </li>
              <li className='flex items-start gap-3'>
                <CheckCircle className='h-5 w-5 text-orange mt-0.5 shrink-0' />
                <p className={`text-base sm:text-lg text-[#1a1a1a] leading-relaxed ${josefinRegular.className}`}>We prepare you for UK &amp; EU trade.</p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Wave: cream → white ── */}
      <div className='bg-white -mb-px'>
        <svg viewBox='0 0 1440 100' preserveAspectRatio='none' className='w-full h-[40px] sm:h-[55px] lg:h-[70px] block'>
          <path d='M0,55 C360,105 1080,5 1440,55 L1440,0 L0,0 Z' fill='#faf8f5' />
        </svg>
      </div>

      {/* ── How Kewve Works ── */}
      <section className='bg-white'>
        <div className='max-w-7xl mx-auto px-6 py-14 lg:py-20'>
          <div className='text-center mb-10 lg:mb-12'>
            <div className='flex items-center justify-center gap-3 sm:gap-5 mb-4'>
              <span className='h-px w-12 sm:w-20 bg-[#d6d0c8]' />
              <h2 className={`text-3xl sm:text-4xl text-[#1a1a1a] ${titleFont.className}`}>How Kewve Works</h2>
              <span className='h-px w-12 sm:w-20 bg-[#d6d0c8]' />
            </div>
          </div>
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 max-w-5xl mx-auto'>
            {howKewveWorksSteps.map((step) => (
              <div key={step.title} className='bg-orange/10 border border-orange/20 rounded-xl px-4 py-5 text-center'>
                <div className='h-10 w-10 rounded-full bg-orange text-white flex items-center justify-center mx-auto mb-3'>
                  <step.icon className='h-5 w-5' />
                </div>
                <h3 className={`text-base text-[#1a1a1a] mb-1 ${josefinSemiBold.className}`}>{step.title}</h3>
                <p className={`text-xs sm:text-sm text-[#5a5a5a] ${josefinRegular.className}`}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Wave: cream → orange ── */}
      <div className='bg-orange -mb-px'>
        <svg viewBox='0 0 1440 100' preserveAspectRatio='none' className='w-full h-[50px] sm:h-[70px] lg:h-[100px] block'>
          <path d='M0,40 C360,100 1080,0 1440,60 L1440,0 L0,0 Z' fill='#faf8f5' />
        </svg>
      </div>

      {/* ── What You Are Paying For ── */}
      <section className='bg-orange py-14 lg:py-20'>
        <div className='max-w-7xl mx-auto px-6'>
          <div className='text-center mb-10 lg:mb-14'>
            <div className='flex items-center justify-center gap-3 sm:gap-5 mb-4'>
              <span className='h-px w-12 sm:w-20 bg-white/40' />
              <h2 className={`text-3xl sm:text-4xl text-white ${titleFont.className}`}>What You Are Paying For</h2>
              <span className='h-px w-12 sm:w-20 bg-white/40' />
            </div>
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
                  <p className={`text-xs sm:text-sm text-white/75 leading-relaxed ${josefinRegular.className}`}>
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
      <section className='bg-[#faf8f5]'>
        <div className='max-w-7xl mx-auto px-6 py-14 lg:py-20 text-center'>
          <div className='flex items-center justify-center gap-3 sm:gap-5 mb-4'>
            <span className='h-px w-12 sm:w-20 bg-[#d6d0c8]' />
            <h2 className={`text-3xl sm:text-4xl text-[#1a1a1a] leading-snug ${titleFont.className}`}>Value of Joining Kewve</h2>
            <span className='h-px w-12 sm:w-20 bg-[#d6d0c8]' />
          </div>
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 max-w-5xl mx-auto mb-8'>
            {joiningValues.map((value) => (
              <div key={value.title} className='bg-white rounded-xl border border-[#e9e3db] px-4 py-5'>
                <div className='h-10 w-10 rounded-full bg-orange text-white flex items-center justify-center mx-auto mb-3'>
                  <value.icon className='h-5 w-5' />
                </div>
                <p className={`text-sm text-[#1a1a1a] leading-snug ${josefinSemiBold.className}`}>{value.title}</p>
              </div>
            ))}
          </div>
          <p className={`text-base sm:text-lg text-[#5a5a5a] max-w-[55ch] mx-auto mb-8 ${josefinRegular.className}`}>Start with readiness. Trade with confidence.</p>
          <Link
            href='/export-readiness'
            className={`inline-block bg-brand-green text-white px-8 py-4 rounded-lg text-base sm:text-lg hover:opacity-90 transition-colors ${josefinSemiBold.className}`}
          >
            Begin Your Assessment
          </Link>
        </div>
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
