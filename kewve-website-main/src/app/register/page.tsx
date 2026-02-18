'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { titleFont, josefinRegular, josefinSemiBold } from '@/utils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { createCheckoutSession } from '@/actions/createCheckout';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    country: '',
  });
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const { toast } = useToast();

  const checkEmailExists = async (email: string) => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setEmailError('');
      return;
    }
    setCheckingEmail(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiUrl}/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success && data.data?.exists) {
        setEmailError('An account with this email already exists.');
      } else {
        setEmailError('');
      }
    } catch {
      setEmailError('');
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (emailError) {
      toast({
        title: 'Error',
        description: emailError,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      toast({
        title: 'Redirecting to payment...',
        description: 'Your account will be created after payment is confirmed.',
      });

      const result = await createCheckoutSession({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        businessName: formData.businessName || undefined,
        country: formData.country || undefined,
      });

      if (result.error) {
        toast({
          title: 'Payment Error',
          description: result.error,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
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
              Create Account
            </h1>
            <p className={`text-sm text-black/70 mb-6 ${josefinRegular.className}`}>
              Register to start your export readiness assessment
            </p>

            <form onSubmit={handleSubmit} className='space-y-6'>
              <div>
                <Label htmlFor='name' className={`text-black mb-2 block ${josefinRegular.className}`}>
                  Full Name *
                </Label>
                <Input
                  type='text'
                  id='name'
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className='bg-white border-gray-300'
                  placeholder='Your full name'
                />
              </div>

              <div>
                <Label htmlFor='email' className={`text-black mb-2 block ${josefinRegular.className}`}>
                  Email address *
                </Label>
                <Input
                  type='email'
                  id='email'
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (emailError) setEmailError('');
                  }}
                  onBlur={(e) => checkEmailExists(e.target.value)}
                  required
                  className={`bg-white ${emailError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                  placeholder='your@email.com'
                />
                {checkingEmail && (
                  <p className={`text-xs text-gray-500 mt-1 ${josefinRegular.className}`}>
                    Checking email...
                  </p>
                )}
                {emailError && !checkingEmail && (
                  <p className={`text-xs text-red-600 mt-1 ${josefinRegular.className}`}>
                    {emailError}{' '}
                    <Link href='/login' className='underline font-semibold'>
                      Log in here
                    </Link>
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor='businessName' className={`text-black mb-2 block ${josefinRegular.className}`}>
                  Business Name (Optional)
                </Label>
                <Input
                  type='text'
                  id='businessName'
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className='bg-white border-gray-300'
                  placeholder='Your business name'
                />
              </div>

              <div>
                <Label htmlFor='country' className={`text-black mb-2 block ${josefinRegular.className}`}>
                  Country (Optional)
                </Label>
                <Input
                  type='text'
                  id='country'
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className='bg-white border-gray-300'
                  placeholder='Your country'
                />
              </div>

              <div>
                <Label htmlFor='password' className={`text-black mb-2 block ${josefinRegular.className}`}>
                  Password *
                </Label>
                <Input
                  type='password'
                  id='password'
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className='bg-white border-gray-300'
                  placeholder='At least 6 characters'
                />
              </div>

              <div>
                <Label htmlFor='confirmPassword' className={`text-black mb-2 block ${josefinRegular.className}`}>
                  Confirm Password *
                </Label>
                <Input
                  type='password'
                  id='confirmPassword'
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  className='bg-white border-gray-300'
                  placeholder='Confirm your password'
                />
              </div>

              <button
                type='submit'
                disabled={loading || !!emailError || checkingEmail}
                className={`w-full bg-black text-white border-2 border-black rounded-full py-3 px-6 text-base font-semibold transition-all text-center hover:bg-muted-orange hover:border-muted-orange disabled:opacity-50 disabled:cursor-not-allowed ${josefinSemiBold.className}`}>
                {loading ? 'Redirecting to payment...' : 'Proceed to Payment'}
              </button>
            </form>

            <p className={`text-sm text-center mt-6 text-black/70 ${josefinRegular.className}`}>
              Already have an account?{' '}
              <Link href='/login' className='text-black font-semibold hover:underline'>
                Login here
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
