'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { submitWaitlistForm } from '@/actions';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { titleFont, josefinRegular, josefinSemiBold } from '@/utils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { PrismicNextImage } from '@prismicio/next';
import { createClient } from '@/prismicio';
import { Loader2 } from 'lucide-react';

const productCategories = [
  'Prepared Foods',
  'Ambient Food',
  'Dry Ingredients',
  'Beverages',
  'Health & Wellbeing Products',
  'Kitchen Essentials',
  'Other',
];

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type='submit'
      disabled={pending}
      className={`w-full bg-black text-white border-2 border-black rounded-full py-3 px-6 text-base lg:text-lg font-semibold transition-all text-center hover:bg-muted-orange hover:border-muted-orange disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${josefinSemiBold.className}`}>
      {pending ? (
        <>
          <Loader2 className='w-5 h-5 animate-spin' />
          Submitting...
        </>
      ) : (
        'Join Waitlist'
      )}
    </button>
  );
}

interface WaitlistFormProps {
  showcaseImage?: any;
}

function WaitlistForm({ showcaseImage }: WaitlistFormProps) {
  const { toast } = useToast();
  const [state, action] = useFormState(submitWaitlistForm, { message: '', error: false, submitted: false });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.submitted && state.error) {
      toast({ title: 'Error', description: state.message, variant: 'destructive' });
    }

    if (state.submitted && !state.error) {
      toast({ title: 'Success!', description: state.message });
      // Clear the form after successful submission
      if (formRef.current) {
        formRef.current.reset();
      }
    }
  }, [state, toast]);

  return (
    <div id='waitlist-form' className='min-h-screen flex'>
      {/* Left Column - Form */}
      <div className='w-full lg:w-1/2 bg-gradient-to-br from-orange via-yellow to-orange p-8 lg:p-12 xl:p-16 flex flex-col justify-center pt-24 lg:pt-32'>
        <div className='max-w-md mx-auto w-full'>
          <h1 className={`text-3xl md:text-4xl lg:text-5xl text-white font-bold mb-4 text-with-shadow ${titleFont.className}`}>
           ERA(Export Readiness Assessment) Interest Form
          </h1>
          <p className={`text-lg md:text-xl text-black/95 mb-2 ${josefinRegular.className}`}>
We're launching an Export Readiness Assessment to help African food and beverage producers prepare for global buyers.

 
          </p>
          <p className={`text-base text-black/90 mb-8 ${josefinRegular.className}`}>
           Join the waiting list to get early access and priority onboarding.
          </p>

          <h2 className={`text-xl md:text-2xl text-black/95 mb-3 font-semibold ${josefinSemiBold.className}`}>Register Your Interest Form</h2>
          <p className={`text-base text-black/90 mb-10 ${josefinRegular.className}`}>Tell us a bit about your business and we'll notify you when onboarding opens</p>

          <form ref={formRef} action={action} className='space-y-10'>
            <div>
              <Label htmlFor='businessName' className='text-black mb-2 block'>
                Business name *
              </Label>
              <Input
                type='text'
                name='businessName'
                id='businessName'
                placeholder='Your business name'
                required
                className='bg-white/90 border-white focus:bg-white'
              />
            </div>

            <div>
              <Label htmlFor='contactName' className='text-black mb-2 block'>
                Contact name *
              </Label>
              <Input
                type='text'
                name='contactName'
                id='contactName'
                placeholder='Your name'
                required
                className='bg-white/90 border-white focus:bg-white'
              />
            </div>

            <div>
              <Label htmlFor='email' className='text-black mb-2 block'>
                Email address *
              </Label>
              <Input
                type='email'
                name='email'
                id='email'
                placeholder='email@example.com'
                required
                className='bg-white/90 border-white focus:bg-white'
              />
            </div>

            <div>
              <Label htmlFor='country' className='text-black mb-2 block'>
                Country *
              </Label>
              <Input
                type='text'
                name='country'
                id='country'
                placeholder='Your country'
                required
                className='bg-white/90 border-white focus:bg-white'
              />
            </div>

            <div>
              <Label htmlFor='productCategory' className='text-black mb-2 block'>
                Product category *
              </Label>
              <select
                name='productCategory'
                id='productCategory'
                required
                className='flex h-10 w-full rounded-md border border-white bg-white/90 px-3 py-2 text-black text-sm ring-offset-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'>
                <option value=''>Select a category</option>
                {productCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className='text-black mb-3 block'>Are you interested in exporting? *</Label>
              <RadioGroup name='exportInterest' required className='flex gap-6'>
                <div className='flex items-center space-x-2 cursor-pointer'>
                  <RadioGroupItem value='Yes' id='yes' className='border-white data-[state=checked]:bg-white' />
                  <Label htmlFor='yes' className='text-black cursor-pointer'>
                    Yes
                  </Label>
                </div>
                <div className='flex items-center space-x-2 cursor-pointer'>
                  <RadioGroupItem
                    value='Exploring'
                    id='exploring'
                    className='border-white data-[state=checked]:bg-white'
                  />
                  <Label htmlFor='exploring' className='text-black cursor-pointer'>
                    Exploring
                  </Label>
                </div>
                <div className='flex items-center space-x-2 cursor-pointer'>
                  <RadioGroupItem
                    value='No'
                    id='no'
                    className='border-white data-[state=checked]:bg-white'
                  />
                  <Label htmlFor='no' className='text-black cursor-pointer'>
                    No
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <p className={`text-sm text-black/80 ${josefinRegular.className}`}>
              You may withdraw your consent at any time. Learn more on our{' '}
              <a href='/privacy' className='underline hover:text-white'>
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href='/terms' className='underline hover:text-white'>
                T&Cs
              </a>
              .
            </p>

            <SubmitButton />
          </form>
        </div>
      </div>

      {/* Right Column - Image */}
      <div className='hidden lg:block lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-orange via-yellow to-orange'>
        {showcaseImage ? (
          <div className='absolute inset-0 flex items-center justify-center p-8'>
            <div className='relative w-full h-full max-w-2xl'>
              <PrismicNextImage
                field={showcaseImage as any}
                className='object-contain w-full h-full'
                priority
              />
            </div>
          </div>
        ) : (
          <div className='absolute inset-0 flex items-center justify-center p-8'>
            <div className='relative w-full h-full max-w-lg'>
              <img
                src='/images/empty.svg'
                alt='African food products'
                className='object-contain w-full h-full'
              />
            </div>
          </div>
        )}
        <div className='absolute inset-0 bg-gradient-to-br from-orange/20 via-yellow/20 to-orange/20 z-10' />
      </div>
    </div>
  );
}

function InfoSection() {
  return (
    <section className='bg-yellow py-12 lg:py-16'>
      <div className='spacing container xl:w-[80%] mx-auto'>
        <div className='max-w-4xl mx-auto'>
          {/* What Is the Kewve Export Readiness Assessment? */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            className='mb-12'>
            <h2 className={`text-3xl md:text-4xl lg:text-5xl text-black font-bold mb-4 ${titleFont.className}`}>
              What Is the Kewve Export Readiness Assessment?
            </h2>
            <p className={`text-lg md:text-xl text-black mb-6 ${josefinRegular.className}`}>
              The Export Readiness Assessment helps African producers understand exactly what is required to sell internationally.
            </p>
            <p className={`text-base md:text-lg text-black mb-4 ${josefinRegular.className}`}>
              It evaluates:
            </p>
            <ul className={`space-y-2 text-base md:text-lg text-black ml-6 list-disc ${josefinRegular.className}`}>
              <li>Food safety & compliance readiness</li>
              <li>Packaging and labelling for export markets</li>
              <li>Production capacity and scalability</li>
              <li>International pricing and commercial readiness</li>
              <li>Logistics and shipping preparedness</li>
            </ul>
          </motion.div>

          {/* Why Join the Waiting List? */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.1 }}
            className='mb-12'>
            <h2 className={`text-3xl md:text-4xl lg:text-5xl text-black font-bold mb-4 ${titleFont.className}`}>
              Why Join the Waiting List?
            </h2>
            <p className={`text-base md:text-lg text-black mb-4 ${josefinRegular.className}`}>
              Producers on the waiting list will:
            </p>
            <ul className={`space-y-2 text-base md:text-lg text-black ml-6 list-disc mb-6 ${josefinRegular.className}`}>
              <li>Get early access to the Export Readiness Assessment</li>
              <li>Be prioritised for buyer sourcing opportunities</li>
              <li>Be considered for product showcasing at international food expos</li>
              <li>Receive updates on compliance, export requirements and launch timelines</li>
            </ul>
            <p className={`text-base md:text-lg text-black ${josefinRegular.className}`}>
              Joining the waiting list is free and does not commit you to anything.
            </p>
          </motion.div>

          {/* Transparency & Trust */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.2 }}
            className='mb-8'>
            <h2 className={`text-3xl md:text-4xl lg:text-5xl text-black font-bold mb-4 ${titleFont.className}`}>
              Transparency & Trust
            </h2>
            <p className={`text-base md:text-lg text-black ${josefinRegular.className}`}>
              Kewve does not guarantee sales or purchase orders. Our role is to prepare producers for international trade and connect them to buyers through structured, compliant export infrastructure.
            </p>
          </motion.div>

          {/* Call-to-Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.3 }}
            className='flex justify-center mt-8'>
            <a
              href='#waitlist-form'
              className={`bg-black text-white border-2 border-black rounded-full py-3 px-8 text-base lg:text-lg font-semibold transition-all text-center hover:bg-muted-orange hover:border-muted-orange ${josefinSemiBold.className}`}>
              Join the Export Readiness Waiting List
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default async function WaitlistPage() {
  const client = createClient();
  const homePageContent = await client.getByType('home_page', { 
    fetchOptions: { next: { revalidate: 10 } } 
  });

  const showcaseImage = homePageContent.results[0]?.data?.show_case_image_4;

  return (
    <div className='overflow-x-hidden min-h-screen flex flex-col'>
      <Header />
      <div className='flex-grow'>
        <WaitlistForm showcaseImage={showcaseImage} />
        <InfoSection />
      </div>
      <section className='bg-orange relative pb-10'>
        <Footer />
      </section>
    </div>
  );
}
