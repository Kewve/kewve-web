'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GDPR } from '@/lib/gdprCopy';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { authAPI } from '@/lib/api';
import { josefinRegular, josefinSemiBold, titleFont } from '@/utils';
import { sendBuyerVerificationEmail } from '@/actions/buyerOnboarding';

export default function BuyerRegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [acceptedPrivacyGdpr, setAcceptedPrivacyGdpr] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    country: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }

    if (formData.password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }

    if (!acceptedPrivacyGdpr) {
      toast({
        title: 'Consent required',
        description: 'Please confirm your agreement to how we collect and use your information.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'buyer',
        businessName: formData.businessName || undefined,
        country: formData.country || undefined,
      });

      if (!response.success) {
        throw new Error('Could not create buyer account.');
      }

      const verificationToken = response.data?.emailVerificationToken;
      if (!verificationToken) {
        throw new Error('Could not start email verification. Please try again.');
      }

      const emailResult = await sendBuyerVerificationEmail({
        name: formData.name,
        email: formData.email,
        verificationToken,
      });

      if (!emailResult.success) {
        console.warn('Buyer verification email failed:', emailResult.error);
      }

      toast({
        title: 'Check your email',
        description: 'We sent a verification link. Please verify your email before logging in.',
      });
      router.push('/login?redirect=/buyer');
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex flex-col'>
      <Header />
      <div className='flex-1 bg-gradient-to-br from-orange via-yellow to-orange pt-24 lg:pt-32 pb-16 px-4'>
        <div className='max-w-md mx-auto bg-white rounded-xl shadow-lg border border-gray-200 p-8'>
          <h1 className={`text-3xl text-gray-900 mb-2 ${titleFont.className}`}>Create Buyer Account</h1>
          <p className={`text-sm text-gray-600 mb-6 ${josefinRegular.className}`}>
            Sign up to access your buyer dashboard and sourcing tools.
          </p>

          <form onSubmit={handleSubmit} className='space-y-5'>
            <div>
              <Label htmlFor='name' className={`text-black mb-2 block ${josefinRegular.className}`}>
                Full Name *
              </Label>
              <Input
                id='name'
                type='text'
                required
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                className='bg-white border-gray-300'
                placeholder='Your full name'
              />
            </div>

            <div>
              <Label htmlFor='email' className={`text-black mb-2 block ${josefinRegular.className}`}>
                Email Address *
              </Label>
              <Input
                id='email'
                type='email'
                required
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                className='bg-white border-gray-300'
                placeholder='your@email.com'
              />
            </div>

            <div>
              <Label htmlFor='businessName' className={`text-black mb-2 block ${josefinRegular.className}`}>
                Business Name (Optional)
              </Label>
              <Input
                id='businessName'
                type='text'
                value={formData.businessName}
                onChange={(e) => setFormData((p) => ({ ...p, businessName: e.target.value }))}
                className='bg-white border-gray-300'
                placeholder='Your business name'
              />
            </div>

            <div>
              <Label htmlFor='country' className={`text-black mb-2 block ${josefinRegular.className}`}>
                Country (Optional)
              </Label>
              <Input
                id='country'
                type='text'
                value={formData.country}
                onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
                className='bg-white border-gray-300'
                placeholder='Your country'
              />
            </div>

            <div>
              <Label htmlFor='password' className={`text-black mb-2 block ${josefinRegular.className}`}>
                Password *
              </Label>
              <Input
                id='password'
                type='password'
                required
                value={formData.password}
                onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                className='bg-white border-gray-300'
                placeholder='At least 6 characters'
              />
            </div>

            <div>
              <Label htmlFor='confirmPassword' className={`text-black mb-2 block ${josefinRegular.className}`}>
                Confirm Password *
              </Label>
              <Input
                id='confirmPassword'
                type='password'
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
                className='bg-white border-gray-300'
                placeholder='Confirm your password'
              />
            </div>

            <label className='flex items-start gap-3 cursor-pointer'>
              <input
                type='checkbox'
                checked={acceptedPrivacyGdpr}
                onChange={(e) => setAcceptedPrivacyGdpr(e.target.checked)}
                className='mt-1 h-4 w-4 rounded border-gray-300 accent-[#ed722d] shrink-0'
              />
              <span className={`text-sm text-gray-800 ${josefinRegular.className}`}>
                {(() => {
                  const [before, after] = GDPR.registration.split('Privacy Policy');
                  return (
                    <>
                      {before}
                      <Link href='/privacy' className='text-orange underline font-semibold'>
                        Privacy Policy
                      </Link>
                      {after}
                    </>
                  );
                })()}
              </span>
            </label>

            <button
              type='submit'
              disabled={loading || !acceptedPrivacyGdpr}
              className={`w-full bg-black text-white border-2 border-black rounded-full py-3 px-6 text-base transition-all hover:bg-muted-orange hover:border-muted-orange disabled:opacity-50 ${josefinSemiBold.className}`}>
              {loading ? 'Creating account...' : 'Create Buyer Account'}
            </button>
          </form>

          <p className={`text-sm text-center mt-6 text-black/70 ${josefinRegular.className}`}>
            Already have a buyer account?{' '}
            <Link href='/login?redirect=/buyer' className='text-black font-semibold hover:underline'>
              Login here
            </Link>
          </p>
        </div>
      </div>
      <section className='bg-orange relative pb-10'>
        <Footer />
      </section>
    </div>
  );
}

