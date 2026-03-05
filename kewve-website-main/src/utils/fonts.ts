import { DM_Sans, DM_Serif_Display } from 'next/font/google';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-dm-serif',
});

export const titleFont = dmSerifDisplay;
export const regalDisplay = dmSerifDisplay;

export const josefinSemiBold = DM_Sans({ weight: '600', subsets: ['latin'] });
export const josefinRegular = DM_Sans({ weight: '400', subsets: ['latin'] });
export const poppinsRegular = DM_Sans({ weight: '400', subsets: ['latin'] });

export { dmSans, dmSerifDisplay };
