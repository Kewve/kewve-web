'use client';

import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { josefinSemiBold } from '@/utils';

interface CTAButtonsProps {
  className?: string;
  supplierText?: string;
  buyerText?: string;
}

function CTAButtons({ className, supplierText = 'Become a supplier' }: CTAButtonsProps) {
  const router = useRouter();

  const handleSupplierClick = () => {
    router.push('/waitlist');
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        className={clsx('flex flex-wrap gap-4', className)}>
        <button
          className={`w-full md:w-fit bg-transparent border-2 border-black rounded-full py-3 px-6 lg:py-4 lg:px-8  text-lg lg:text-2xl text-black hover:bg-black hover:text-white transition-all text-center capitalize ${josefinSemiBold.className}`}
          onClick={handleSupplierClick}>
          {supplierText}
        </button>
      </motion.div>
    </div>
  );
}

export default CTAButtons;
