import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { titleFont, josefinRegular, josefinSemiBold } from '@/utils';
import { Clock, ArrowLeft } from 'lucide-react';

export default function ComingSoonPage() {
  return (
    <>
      <Header needsBackground />
      <section className='bg-cream pt-24 lg:pt-32 pb-16 lg:pb-24 min-h-[80vh] flex items-center'>
        <div className='max-w-2xl mx-auto px-6 text-center'>
          <div className='w-20 h-20 rounded-full bg-orange/10 flex items-center justify-center mx-auto mb-8'>
            <Clock className='w-10 h-10 text-orange' />
          </div>

          <h1 className={`text-4xl md:text-5xl lg:text-6xl text-black mb-4 ${titleFont.className}`}>
            Coming Soon
          </h1>

          <p className={`text-lg md:text-xl text-black-muted leading-relaxed mb-4 ${josefinRegular.className}`}>
            We&apos;re building something exciting. Our sourcing platform will connect you with verified, export-ready African food &amp; beverage producers.
          </p>

          <p className={`text-base text-black-muted/70 mb-10 ${josefinRegular.className}`}>
            Join the waitlist to be the first to know when we launch.
          </p>

          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Link
              href='/waitlist'
              className={`bg-orange text-white px-8 py-3.5 rounded-md text-base tracking-wide hover:bg-orange/90 transition-colors ${josefinSemiBold.className}`}>
              Join Waitlist
            </Link>
            <Link
              href='/'
              className={`flex items-center justify-center gap-2 border-2 border-black-muted text-black-muted px-8 py-3.5 rounded-md text-base tracking-wide hover:bg-black-muted hover:text-white transition-colors ${josefinSemiBold.className}`}>
              <ArrowLeft className='w-4 h-4' />
              Back to Home
            </Link>
          </div>
        </div>
      </section>
      <section className='bg-orange relative pb-10'>
        <Footer />
      </section>
    </>
  );
}
