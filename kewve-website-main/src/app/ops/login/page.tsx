'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { titleFont, josefinSemiBold, josefinRegular } from '@/utils';
import { adminAPI } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await adminAPI.login({ email, password });
      if (response.success) {
        // Use replace to avoid back-button loop, and window.location for a full page load
        window.location.href = '/ops';
      } else {
        setError(response.message || 'Invalid credentials');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-[#f5f3ef] flex items-center justify-center px-4'>
      <div className='w-full max-w-sm'>
        <div className='text-center mb-8'>
          <h1 className={`text-2xl text-gray-900 mb-1 ${titleFont.className}`}>Kewve Ops</h1>
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Admin login</p>
        </div>

        <form onSubmit={handleSubmit} className='bg-white rounded-xl border border-gray-200 p-6 space-y-4'>
          {error && (
            <div className={`text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 ${josefinRegular.className}`}>
              {error}
            </div>
          )}

          <div>
            <label className={`block text-sm text-gray-700 mb-1.5 ${josefinRegular.className}`}>Email</label>
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent ${josefinRegular.className}`}
            />
          </div>

          <div>
            <label className={`block text-sm text-gray-700 mb-1.5 ${josefinRegular.className}`}>Password</label>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent ${josefinRegular.className}`}
            />
          </div>

          <button
            type='submit'
            disabled={loading}
            className={`w-full bg-[#1a2e23] text-white rounded-lg py-2.5 text-sm transition-colors hover:bg-[#243d2f] disabled:opacity-50 flex items-center justify-center gap-2 ${josefinSemiBold.className}`}>
            {loading && <Loader2 className='w-4 h-4 animate-spin' />}
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
