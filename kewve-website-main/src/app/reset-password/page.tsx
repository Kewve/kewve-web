'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { titleFont, josefinRegular, josefinSemiBold } from '@/utils';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2 } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }

    if (password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
      } else {
        toast({ title: 'Error', description: result.message || 'Failed to reset password.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className='bg-white rounded-lg shadow-lg p-8 text-center'>
        <h1 className={`text-2xl font-bold text-black mb-4 ${titleFont.className}`}>Invalid Link</h1>
        <p className={`text-sm text-black/70 mb-6 ${josefinRegular.className}`}>
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <button
          onClick={() => router.push('/login')}
          className={`bg-black text-white rounded-full py-3 px-6 text-sm font-semibold hover:bg-muted-orange transition-all ${josefinSemiBold.className}`}>
          Back to Login
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className='bg-white rounded-lg shadow-lg p-8 text-center'>
        <CheckCircle2 className='w-12 h-12 text-green-500 mx-auto mb-4' />
        <h1 className={`text-2xl font-bold text-black mb-2 ${titleFont.className}`}>Password Reset</h1>
        <p className={`text-sm text-black/70 mb-6 ${josefinRegular.className}`}>
          Your password has been reset successfully. You can now log in with your new password.
        </p>
        <button
          onClick={() => router.push('/login')}
          className={`bg-black text-white rounded-full py-3 px-6 text-sm font-semibold hover:bg-muted-orange transition-all ${josefinSemiBold.className}`}>
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className='bg-white rounded-lg shadow-lg p-8'>
      <h1 className={`text-3xl font-bold text-black mb-2 ${titleFont.className}`}>
        Reset Password
      </h1>
      <p className={`text-sm text-black/70 mb-6 ${josefinRegular.className}`}>
        Enter your new password below.
      </p>

      <form onSubmit={handleSubmit} className='space-y-6'>
        <div>
          <Label htmlFor='password' className={`text-black mb-2 block ${josefinRegular.className}`}>
            New Password *
          </Label>
          <Input
            type='password'
            id='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className='bg-white border-gray-300'
            placeholder='At least 6 characters'
          />
        </div>

        <div>
          <Label htmlFor='confirmPassword' className={`text-black mb-2 block ${josefinRegular.className}`}>
            Confirm New Password *
          </Label>
          <Input
            type='password'
            id='confirmPassword'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className='bg-white border-gray-300'
            placeholder='Confirm your password'
          />
        </div>

        <button
          type='submit'
          disabled={loading}
          className={`w-full bg-black text-white border-2 border-black rounded-full py-3 px-6 text-base font-semibold transition-all text-center hover:bg-muted-orange hover:border-muted-orange disabled:opacity-50 disabled:cursor-not-allowed ${josefinSemiBold.className}`}>
          {loading ? (
            <span className='flex items-center justify-center gap-2'>
              <Loader2 className='w-4 h-4 animate-spin' />
              Resetting...
            </span>
          ) : (
            'Reset Password'
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className='overflow-x-hidden min-h-screen flex flex-col'>
      <Header />
      <div className='flex-grow bg-gradient-to-br from-orange via-yellow to-orange flex items-center justify-center pt-24 lg:pt-32 pb-16 px-4'>
        <div className='w-full max-w-md'>
          <Suspense fallback={
            <div className='bg-white rounded-lg shadow-lg p-8 flex items-center justify-center'>
              <Loader2 className='w-6 h-6 animate-spin text-gray-400' />
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
      <section className='bg-orange relative pb-10'>
        <Footer />
      </section>
    </div>
  );
}
