import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { josefinRegular, josefinSemiBold, titleFont } from '@/utils';

export default function BuyersLandingPage() {
  return (
    <div className='min-h-screen flex flex-col'>
      <Header />
      <div className='flex-1 bg-gradient-to-br from-orange via-yellow to-orange pt-24 lg:pt-32 pb-16 px-4'>
        <div className='max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center'>
          <h1 className={`text-4xl text-gray-900 mb-3 ${titleFont.className}`}>For Buyers</h1>
          <p className={`text-base text-gray-600 mb-8 ${josefinRegular.className}`}>
            Discover products, create sourcing requests, and manage trade operations from your dedicated buyer dashboard.
          </p>

          <div className='flex flex-col sm:flex-row items-center justify-center gap-3'>
            <Link
              href='/buyers/register'
              className={`inline-flex items-center justify-center w-full sm:w-auto bg-brand-green text-white rounded-lg px-6 py-3 hover:opacity-90 transition-colors ${josefinSemiBold.className}`}>
              Create Buyer Account
            </Link>
            <Link
              href='/login?redirect=/buyer'
              className={`inline-flex items-center justify-center w-full sm:w-auto border border-gray-300 text-gray-800 rounded-lg px-6 py-3 hover:bg-gray-50 transition-colors ${josefinSemiBold.className}`}>
              Buyer Login
            </Link>
          </div>
        </div>
      </div>
      <section className='bg-orange relative pb-10'>
        <Footer />
      </section>
    </div>
  );
}

