'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { josefinRegular, josefinSemiBold, titleFont } from '@/utils';
import { requestPasswordReset } from '@/actions/resetPassword';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter your account email.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await requestPasswordReset(email.trim());
      if (!result.success) {
        throw new Error(result.error || 'Could not send reset email.');
      }
      setSubmitted(true);
      toast({
        title: 'Check your email',
        description: 'If an account exists for that email, a reset link has been sent.',
      });
    } catch (error: any) {
      toast({
        title: 'Could not send reset link',
        description: error?.message || 'Please try again.',
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
            <h1 className={`text-3xl font-bold text-black mb-2 ${titleFont.className}`}>Forgot Password</h1>
            <p className={`text-sm text-black/70 mb-6 ${josefinRegular.className}`}>
              Enter the email linked to your producer or buyer account.
            </p>

            {submitted ? (
              <div className='rounded-lg border border-green-200 bg-green-50 p-4'>
                <p className={`text-sm text-green-800 ${josefinRegular.className}`}>
                  If an account exists for <span className={josefinSemiBold.className}>{email}</span>, we sent a reset link.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className='space-y-6'>
                <div>
                  <Label htmlFor='email' className={`text-black mb-2 block ${josefinRegular.className}`}>
                    Email address *
                  </Label>
                  <Input
                    id='email'
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className='bg-white border-gray-300'
                    placeholder='your@email.com'
                  />
                </div>

                <button
                  type='submit'
                  disabled={loading}
                  className={`w-full bg-black text-white border-2 border-black rounded-full py-3 px-6 text-base font-semibold transition-all text-center hover:bg-muted-orange hover:border-muted-orange disabled:opacity-50 disabled:cursor-not-allowed ${josefinSemiBold.className}`}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            )}

            <p className={`text-sm text-center mt-6 text-black/70 ${josefinRegular.className}`}>
              Remembered your password?{' '}
              <Link href='/login' className='text-black font-semibold hover:underline'>
                Back to login
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
