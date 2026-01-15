'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useFormState, useFormStatus } from 'react-dom';
import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { formSubmissionAction } from '@/actions';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { titleFont, josefinRegular, josefinSemiBold } from '@/utils';
import { redirect } from 'next/navigation';
import { HomePageDocumentData } from '../../../prismicio-types';
import { PrismicNextImage, PrismicNextLink } from '@prismicio/next';

function ContactSection({ content }: { content: HomePageDocumentData }) {
  const { toast } = useToast();
  const { pending } = useFormStatus();
  const [state, action] = useFormState(formSubmissionAction, { message: '', error: false, submitted: false });

  useEffect(() => {
    if (state.submitted && state.error) {
      toast({ title: 'Bummer! something is not ring', description: state.message, variant: 'destructive' });
      redirect('/');
    }

    if (state.submitted && !state.error) {
      toast({ title: 'Yahoo!', description: state.message });
      redirect('/');
    }
  }, [state]);

  return (
    <section className='bg-yellow py-10 lg:pt-0 lg:pb-4 lg:-mt-8 xl:-mt-16'>
      <div className='spacing container xl:w-[80%] mx-auto'>
        <div className='flex flex-col items-center mb-4 lg:mb-8 xl:mb-14'>
          <motion.h2
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            className={`text-3xl md:text-4xl xl:text-6xl text-black font-bold text-center mb-4 ${titleFont.className}`}>
            {content.contact_us_heading}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.1 }}
            className={`text-xl lg:text-2xl text-black leading-normal max-w-full lg:max-w-[60ch] mx-auto text-center ${josefinRegular.className}`}>
            {content.contact_us_description}
          </motion.p>
        </div>
        <div className='grid grid-cols-6 gap-4 max-w-full xl:max-w-[60%] mx-auto'>
          <div className='col-span-6 lg:col-span-2'>
            {content.contact_us_points.map((point) => {
              return (
                <motion.div
                  key={point.title}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  className='mb-6 xl:mb-10 text-center lg:text-left'>
                  <PrismicNextLink field={point.url}>
                    <PrismicNextImage field={point.icon} width={36} height={36} className='mb-4 mx-auto lg:mx-0' />
                    <span className={`text-xl text-black leading-tight ${josefinSemiBold.className}`}>
                      {point.title}
                    </span>
                  </PrismicNextLink>
                </motion.div>
              );
            })}
          </div>
          <div className='col-span-6 lg:col-span-4 mt-6 lg:mt-0'>
            <form action={action} className='grid grid-cols-4 gap-4'>
              <div className='col-span-4'>
                <h4 className={`text-lg text-black mb-1 ${titleFont.className}`}>I am interested as?</h4>
                <RadioGroup name='account_type' defaultValue='buyer' required>
                  <div className='flex flex-wrap gap-4'>
                    <div className='flex flex-shrink-0 items-center space-x-2 cursor-pointer'>
                      <RadioGroupItem value='buyer' id='buyer' />
                      <Label htmlFor='buyer'>Buyer</Label>
                    </div>
                    <div className='flex flex-shrink-0 items-center space-x-2 cursor-pointer'>
                      <RadioGroupItem value='supplier' id='supplier' />
                      <Label htmlFor='supplier'>Supplier</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
              <div className='col-span-4'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='email'>Email</Label>
                  <Input type='email' name='email' id='email' placeholder='john@email.com' required />
                </div>
              </div>
              <div className='col-span-4 lg:col-span-2'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='firstName'>First name</Label>
                  <Input type='text' name='firstName' id='firstName' placeholder='John' required />
                </div>
              </div>
              <div className='col-span-4 lg:col-span-2'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='lastName'>Last name</Label>
                  <Input type='text' name='lastName' id='lastName' placeholder='Doe' required />
                </div>
              </div>
              <div className='col-span-4'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='lastName'>Message</Label>
                  <Textarea id='message' name='message' placeholder='Your message...' rows={3} />
                </div>
              </div>
              <div className='col-span-4'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='country'>Country/Region</Label>
                  <Input type='text' name='country' id='country' placeholder='Great Britain' />
                </div>
              </div>
              <button
                type='submit'
                disabled={pending}
                className={`col-span-4 block w-full md:w-fit bg-black border-2 border-black rounded-full py-3 px-6 min-w-[180px] text-base lg:text-lg  text-white transition-all text-center mt-2 hover:bg-muted-orange hover:border-muted-orange ${josefinSemiBold.className}`}>
                {pending ? 'Loading' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
