import Link from 'next/link';
import Image from 'next/image';
import React from 'react';
import { Josefin_Sans } from 'next/font/google';

const josefin = Josefin_Sans({ weight: '500', subsets: ['latin'] });

function Footer() {
  const footerLinkClassName = `text-sm lg:text-base text-center text-white underline ${josefin.className}`;

  return (
    <footer className='pt-10'>
      <div className='spacing container mx-auto flex flex-col'>
        <div>
          <div className='h-40 w-40 rounded-full bg-white mx-auto flex items-center justify-center'>
            <Image src='/logo-color.png' width={200} height={40} alt='Kewve logo' className='w-auto h-6 mx-auto' />
          </div>
        </div>
        <div className='flex flex-col lg:flex-row items-center justify-center gap-x-16 gap-y-3 my-8'>
          <Link href='/terms' className={footerLinkClassName}>
            Terms & Conditions
          </Link>
          <Link href='/privacy' className={footerLinkClassName}>
            Privacy Policy
          </Link>
          <Link href='/marketplace-terms' className={footerLinkClassName}>
            Marketplace Term & Conditions
          </Link>
        </div>
        <div className='flex justify-between items-center'>
          <span className={`text-sm lg:text-base text-white ${josefin.className}`}>
            &copy; KEWVE {new Date().getFullYear()}
          </span>
          <a href='https://www.thewebagency.io/' className={`text-sm lg:text-base text-white ${josefin.className}`}>
            Developed by The Web Agency
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
