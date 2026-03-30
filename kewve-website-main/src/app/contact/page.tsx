import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ContactForm from '@/components/ContactForm';
import { josefinRegular, titleFont } from '@/utils';

export default function ContactPage() {
  return (
    <div className='min-h-screen flex flex-col'>
      <Header needsBackground />
      <main className='flex-1 bg-[#faf8f5] pt-24 lg:pt-32 pb-16 px-4'>
        <div className='max-w-2xl mx-auto'>
          <h1 className={`text-3xl sm:text-4xl text-[#1a1a1a] text-center mb-2 ${titleFont.className}`}>Contact us</h1>
          <p className={`text-base text-[#5a5a5a] text-center mb-10 max-w-[55ch] mx-auto ${josefinRegular.className}`}>
            Send us a message and we&apos;ll get back to you as soon as we can.
          </p>
          <div className='bg-white rounded-xl border border-[#e9e3db] shadow-sm p-6 sm:p-8'>
            <ContactForm />
          </div>
        </div>
      </main>
      <section className='bg-orange relative pb-10'>
        <Footer />
      </section>
    </div>
  );
}
