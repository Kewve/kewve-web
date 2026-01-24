import { Toaster } from '@/components/ui/toaster';
import GoogleAnalytics from '@/components/GoogleAnaltyics';
import Providers from '@/components/providers/AuthProvider';
import type { Metadata } from 'next';

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
    <html lang='en'>
      <body>
        <Providers>
          {children}
          <Toaster />
          <GoogleAnalytics />
        </Providers>
      </body>
    </html>
  );
}
