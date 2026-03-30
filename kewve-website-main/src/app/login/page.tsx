'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { titleFont, josefinRegular, josefinSemiBold } from '@/utils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { getDefaultPostLoginRoute } from '@/lib/roleRouting';

type LoginContext = 'buyer' | 'producer' | 'general';

function getLoginContext(redirect: string | null, portal: string | null): LoginContext {
  if (portal === 'buyer') return 'buyer';
  if (portal === 'producer') return 'producer';
  if (redirect?.startsWith('/buyer')) return 'buyer';
  if (redirect) return 'producer';
  return 'general';
}

const loginCopy: Record<
  LoginContext,
  { title: string; subtitle: string; badgeClass: string; badgeLabel: string }
> = {
  buyer: {
    title: 'Buyer login',
    subtitle: 'Sign in to your buyer workspace — product discovery, clusters, and sourcing requests.',
    badgeClass: 'bg-gray-100 text-gray-800 border border-gray-200',
    badgeLabel: 'Buyer portal',
  },
  producer: {
    title: 'Producer login',
    subtitle: 'Sign in to your export readiness dashboard, products, and supplier tools.',
    badgeClass: 'bg-orange/15 text-orange border border-orange/30',
    badgeLabel: 'Producer portal',
  },
  general: {
    title: 'Sign in',
    subtitle:
      'Same email and password for both experiences. After login we send you to the right dashboard for your account.',
    badgeClass: 'bg-black/5 text-black/70 border border-black/10',
    badgeLabel: 'Kewve account',
  },
};

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Keep sessionStorage in sync with the URL only. Stale ?redirect=/buyer was never cleared,
  // so producer logins kept sending expectedRole buyer until the tab storage was cleared.
  const redirectFromUrl = searchParams.get('redirect');
  const portalFromUrl = searchParams.get('portal');
  const loginContext = getLoginContext(redirectFromUrl, portalFromUrl);
  const copy = loginCopy[loginContext];

  useEffect(() => {
    if (redirectFromUrl) {
      sessionStorage.setItem('redirectAfterLogin', redirectFromUrl);
    } else {
      sessionStorage.removeItem('redirectAfterLogin');
    }
  }, [redirectFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirect = sessionStorage.getItem('redirectAfterLogin') || '';
      const expectedRole: 'buyer' | 'producer' | undefined =
        loginContext === 'buyer' ? 'buyer' : loginContext === 'producer' ? 'producer' : undefined;
      const loggedInUser = await login(email, password, expectedRole);
      toast({
        title: 'Success!',
        description: 'You have been logged in successfully.',
      });
      if (redirect) {
        sessionStorage.removeItem('redirectAfterLogin');
        router.push(redirect);
      } else {
        router.push(getDefaultPostLoginRoute(loggedInUser));
      }
    } catch (error: any) {
      const stored = sessionStorage.getItem('redirectAfterLogin') || '';
      if (stored.startsWith('/buyer')) {
        sessionStorage.removeItem('redirectAfterLogin');
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to log in. Please check your credentials.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='overflow-x-hidden min-h-screen flex flex-col'>
      <Header />
      <div className='flex-grow bg-gradient-to-br from-orange via-yellow to-orange flex items-center justify-center pt-24 lg:pt-32 pb-16 px-4'>
        <div className='w-full max-w-md'>
          <div className='bg-white rounded-lg shadow-lg p-8'>
            <div className='flex flex-wrap items-center gap-2 mb-2'>
              <h1 className={`text-3xl font-bold text-black ${titleFont.className}`}>{copy.title}</h1>
              <span
                className={`text-[10px] sm:text-xs uppercase tracking-wide px-2.5 py-1 rounded-full ${josefinSemiBold.className} ${copy.badgeClass}`}>
                {copy.badgeLabel}
              </span>
            </div>
            <p className={`text-sm text-black/70 mb-4 ${josefinRegular.className}`}>{copy.subtitle}</p>
            <div className={`mb-6 ${josefinRegular.className}`}>
              {loginContext === 'buyer' ? (
                <p className='text-xs text-black/50'>
                  Need the producer dashboard instead?{' '}
                  <Link href='/login?redirect=/dashboard' className='text-orange font-semibold hover:underline'>
                    Use producer login
                  </Link>
                </p>
              ) : loginContext === 'producer' ? (
                <p className='text-xs text-black/50'>
                  Here for sourcing as a buyer?{' '}
                  <Link href='/login?redirect=/buyer' className='text-orange font-semibold hover:underline'>
                    Use buyer login
                  </Link>
                </p>
              ) : (
                <div className='space-y-2.5'>
                  <p className={`text-sm text-black/70 ${josefinSemiBold.className}`}>Choose where you’re headed:</p>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                    <Link
                      href='/login?redirect=/buyer'
                      className={`inline-flex items-center justify-center rounded-lg border border-orange/40 bg-orange/10 px-4 py-2.5 text-sm text-orange hover:bg-orange/15 transition-colors ${josefinSemiBold.className}`}>
                      Buyer login
                    </Link>
                    <Link
                      href='/login?redirect=/dashboard'
                      className={`inline-flex items-center justify-center rounded-lg border border-orange/40 bg-orange/10 px-4 py-2.5 text-sm text-orange hover:bg-orange/15 transition-colors ${josefinSemiBold.className}`}>
                      Producer login
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className='space-y-6'>
              <div>
                <Label htmlFor='email' className={`text-black mb-2 block ${josefinRegular.className}`}>
                  Email address *
                </Label>
                <Input
                  type='email'
                  id='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className='bg-white border-gray-300'
                  placeholder='your@email.com'
                />
              </div>

              <div>
                <Label htmlFor='password' className={`text-black mb-2 block ${josefinRegular.className}`}>
                  Password *
                </Label>
                <Input
                  type='password'
                  id='password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className='bg-white border-gray-300'
                  placeholder='Enter your password'
                />
              </div>

              <button
                type='submit'
                disabled={loading}
                className={`w-full bg-black text-white border-2 border-black rounded-full py-3 px-6 text-base font-semibold transition-all text-center hover:bg-muted-orange hover:border-muted-orange disabled:opacity-50 disabled:cursor-not-allowed ${josefinSemiBold.className}`}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <p className={`text-xs text-center mt-4 text-black/55 ${josefinRegular.className}`}>
              How we handle your data is explained in our{' '}
              <Link href='/privacy' className='text-orange font-semibold underline hover:opacity-80'>
                Privacy Policy
              </Link>
              .
            </p>

            <div className={`mt-6 text-center ${josefinRegular.className}`}>
              <p className='text-sm text-black/70 mb-2'>Don&apos;t have an account?</p>
              {loginContext === 'buyer' ? (
                <Link
                  href='/buyers/register'
                  className={`inline-flex items-center justify-center rounded-lg border border-black/20 bg-black/5 px-4 py-2 text-sm text-black hover:bg-black/10 transition-colors ${josefinSemiBold.className}`}>
                  Register as a buyer
                </Link>
              ) : loginContext === 'producer' ? (
                <Link
                  href='/register'
                  className={`inline-flex items-center justify-center rounded-lg border border-black/20 bg-black/5 px-4 py-2 text-sm text-black hover:bg-black/10 transition-colors ${josefinSemiBold.className}`}>
                  Register as a producer
                </Link>
              ) : (
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                  <Link
                    href='/register'
                    className={`inline-flex items-center justify-center rounded-lg border border-black/20 bg-black/5 px-4 py-2 text-sm text-black hover:bg-black/10 transition-colors ${josefinSemiBold.className}`}>
                    Register as a producer
                  </Link>
                  <Link
                    href='/buyers/register'
                    className={`inline-flex items-center justify-center rounded-lg border border-black/20 bg-black/5 px-4 py-2 text-sm text-black hover:bg-black/10 transition-colors ${josefinSemiBold.className}`}>
                    Register as a buyer
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <section className='bg-orange relative pb-10'>
        <Footer />
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className='overflow-x-hidden min-h-screen flex flex-col'>
          <Header />
          <div className='flex-grow bg-gradient-to-br from-orange via-yellow to-orange flex items-center justify-center pt-24 lg:pt-32 pb-16 px-4'>
            <p className={`text-sm text-black/70 ${josefinRegular.className}`}>Loading…</p>
          </div>
          <section className='bg-orange relative pb-10'>
            <Footer />
          </section>
        </div>
      }>
      <LoginForm />
    </Suspense>
  );
}
