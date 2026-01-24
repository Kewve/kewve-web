'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { titleFont, josefinRegular, josefinSemiBold } from '@/utils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Handle redirect parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect) {
      // Store redirect URL for after login
      sessionStorage.setItem('redirectAfterLogin', redirect);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast({
        title: 'Success!',
        description: 'You have been logged in successfully.',
      });
      // Check for redirect
      const redirect = sessionStorage.getItem('redirectAfterLogin');
      if (redirect) {
        sessionStorage.removeItem('redirectAfterLogin');
        router.push(redirect);
      } else {
        router.push('/export-readiness/dashboard');
      }
    } catch (error: any) {
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
            <h1 className={`text-3xl font-bold text-black mb-2 ${titleFont.className}`}>
              Login
            </h1>
            <p className={`text-sm text-black/70 mb-6 ${josefinRegular.className}`}>
              Sign in to access your export readiness dashboard
            </p>

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

            <p className={`text-sm text-center mt-6 text-black/70 ${josefinRegular.className}`}>
              Don't have an account?{' '}
              <Link href='/register' className='text-black font-semibold hover:underline'>
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
      <section className='bg-orange relative pb-10'>
        <Footer />
      </section>
    </div>
  );
}
