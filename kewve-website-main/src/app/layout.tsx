import { Toaster } from '@/components/ui/toaster';
import GoogleAnalytics from '@/components/GoogleAnaltyics';
import Providers from '@/components/providers/AuthProvider';
import type { Metadata } from 'next';
import { dmSans, dmSerifDisplay } from '@/utils/fonts';

import './globals.css';

export const metadata: Metadata = {
  title: 'KEWVE',
  description: 'Love Africa! Taste Africa!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' className={`${dmSans.variable} ${dmSerifDisplay.variable}`}>
      <body className={dmSans.className}>
        <Providers>
          {children}
          <Toaster />
          <GoogleAnalytics />
        </Providers>
      </body>
    </html>
  );
}
