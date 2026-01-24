'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { titleFont, josefinRegular, josefinSemiBold } from '@/utils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

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
  const { register } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

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

    setLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        businessName: formData.businessName || undefined,
        country: formData.country || undefined,
      });
      toast({
        title: 'Success!',
        description: 'Your account has been created successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create account. Please try again.',
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
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className='bg-white border-gray-300'
                  placeholder='your@email.com'
                />
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
                disabled={loading}
                className={`w-full bg-black text-white border-2 border-black rounded-full py-3 px-6 text-base font-semibold transition-all text-center hover:bg-muted-orange hover:border-muted-orange disabled:opacity-50 disabled:cursor-not-allowed ${josefinSemiBold.className}`}>
                {loading ? 'Creating account...' : 'Create Account'}
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
