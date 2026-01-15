'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useFormState } from 'react-dom';
import { useFormStatus } from 'react-dom';
import { redirect } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ProductCard from '@/components/ProductCard';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { titleFont, poppinsRegular, josefinSemiBold, josefinRegular } from '@/utils/fonts';
import type { ProductDocument, ProductDocumentData } from '../../prismicio-types';
import { productInquiryAction } from '@/actions';

interface ProductDetailProps {
  id: string;
  product: ProductDocumentData;
  products: ProductDocument[];
}

function ProductDetail({ id, product, products }: ProductDetailProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const { toast } = useToast();
  const { pending } = useFormStatus();
  const [state, action] = useFormState(productInquiryAction.bind(null, product.name as string), {
    message: '',
    error: false,
    submitted: false,
  });

  const handleOpenModal = () => {
    setModalOpen(true);
  };

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
    <>
      <section className='relative bg-orange pt-16 pb-10 lg:pt-40 lg:pb-6'>
        <div className='spacing lg:max-w-[80%] xl:max-w-[65%] lg:mx-auto'>
          <div className='grid grid-cols-2 gap-x-4 gap-y-8 items-center'>
            <div className='col-span-2 lg:col-span-1 order-2 lg:order-1'>
              <motion.h1
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white text-center lg:text-left ${titleFont.className}`}>
                {product.name}
              </motion.h1>
              <motion.h6
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className={`${josefinSemiBold.className} text-xl text-center lg:text-left text-white mt-6 mb-4`}>
                Minimum Order Quantity: {product.moq}
              </motion.h6>
              <motion.p
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className={`text-base text-white leading-relaxed max-w-full lg:max-w-[45ch] text-center lg:text-left mb-6 ${poppinsRegular.className}`}>
                {product.short_description}
              </motion.p>
              <div className='flex justify-center lg:justify-start'>
                <button
                  onClick={handleOpenModal}
                  className={`bg-black rounded-full py-3 px-6 text-xl text-white text-center lg:text-left ${josefinSemiBold.className}`}>
                  Inquire Price
                </button>
              </div>
            </div>
            <div className='col-span-2 lg:col-span-1 order-1 lg:order-2'>
              <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Image
                  src={product.image?.url ?? ''}
                  width={product.image?.dimensions?.width ?? 600}
                  height={product.image?.dimensions?.height ?? 600}
                  alt={product.image?.alt ?? 'Product'}
                  className='w-[200px] lg:w-[300px] h-full mx-auto object-cover mb-4'
                />
              </motion.div>
            </div>
          </div>
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
      {products.length > 0 && (
        <section className='bg-cream lg:-mt-20 xl:-mt-28 py-10 lg:py-0'>
          <div className='spacing container xl:w-[80%] mx-auto'>
            <div className='flex flex-col items-center mb-8 xl:mb-12'>
              <h2
                className={`text-2xl md:text-3xl xl:text-4xl text-black font-bold text-center mb-4 ${titleFont.className}`}>
                Recommended Products For You
              </h2>
            </div>
            <div className='grid grid-cols-12 gap-4 xl:gap-6'>
              {products.map((product) => (
                <div key={product.uid} className='col-span-12 md:col-span-6 xl:col-span-4'>
                  <ProductCard id={product.uid} product={product.data} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      <Dialog open={modalOpen} onOpenChange={() => setModalOpen(false)}>
        <DialogContent className='max-h-[750px] overflow-y-scroll'>
          <div className='grid gap-4 py-4 mt-4'>
            <p className={`${josefinRegular.className} text-black`}>
              Once you&apos;ve submitted, we will get back to you with offers from Suppliers.
            </p>
            <form action={action} className='grid grid-cols-4 gap-4'>
              <div className='col-span-4'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='name'>
                    Full Name <span className='text-red-600'>*</span>
                  </Label>
                  <Input type='text' name='name' id='name' required />
                </div>
              </div>
              <div className='col-span-4'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='email'>
                    Email <span className='text-red-600'>*</span>
                  </Label>
                  <Input type='email' name='email' id='email' required />
                </div>
              </div>
              <div className='col-span-4'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='phone_number'>
                    Phone Number <span className='text-red-600'>*</span>
                  </Label>
                  <Input type='text' name='phone_number' id='phone_number' required />
                </div>
              </div>
              <div className='col-span-4 lg:col-span-2'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='country'>Delivery Country</Label>
                  <Input type='text' name='country' id='country' />
                </div>
              </div>
              <div className='col-span-4 lg:col-span-2'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='company_name'>Company name</Label>
                  <Input type='text' name='company_name' id='company_name' />
                </div>
              </div>
              <div className='col-span-4 lg:col-span-2'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='quantity'>Quantity Required</Label>
                  <Input type='text' name='quantity' id='quantity' />
                </div>
              </div>
              <div className='col-span-4 lg:col-span-2'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='delivery_date'>Desired Delivery Date</Label>
                  <Input type='date' name='delivery_date' id='delivery_date' />
                </div>
              </div>
              <div className='col-span-4'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='target_price'>Target Price</Label>
                  <Input type='text' name='target_price' id='target_price' />
                </div>
              </div>
              <div className='col-span-4'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='info'>Additional Information</Label>
                  <Textarea rows={2} name='info' id='info' />
                </div>
              </div>
              <div className='col-span-4'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='request'>Special Request</Label>
                  <Textarea rows={2} name='request' id='request' />
                </div>
              </div>
              <button
                type='submit'
                disabled={pending}
                className={`col-span-4 block w-full md:w-fit bg-black border-2 border-black rounded-full py-3 px-6 min-w-[180px] text-base lg:text-lg  text-white transition-all text-center mt-2 hover:bg-muted-orange hover:border-muted-orange ${josefinSemiBold.className}`}>
                {pending ? 'Submitting...' : 'Submit'}
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ProductDetail;
