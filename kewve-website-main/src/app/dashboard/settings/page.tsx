'use client';

import { useState, useEffect } from 'react';
import { josefinSemiBold, josefinRegular } from '@/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { authAPI } from '@/lib/api';
import { requestPasswordReset } from '@/actions/resetPassword';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (user) {
      const parts = (user.name || '').split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSaveChanges = async () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!fullName) {
      toast({ title: 'Error', description: 'Name cannot be empty.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await authAPI.updateProfile({ name: fullName });
      if (refreshUser) await refreshUser();
      toast({
        title: 'Saved',
        description: 'Your profile information has been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save changes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) return;
    setResetting(true);
    try {
      const result = await requestPasswordReset(email);
      if (result.success) {
        toast({
          title: 'Reset Link Sent',
          description: `A password reset link has been sent to ${email}.`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to send reset link.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setResetting(false);
    }
  };

  const inputClassName = `w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a2e23]/20 focus:border-[#1a2e23] transition-colors ${josefinRegular.className}`;
  const labelClassName = `block text-sm text-gray-900 mb-2 ${josefinSemiBold.className}`;

  return (
    <div className='max-w-2xl mx-auto space-y-6'>
      {/* Header */}
      <h1 className={`text-2xl lg:text-3xl text-gray-900 ${josefinSemiBold.className}`}>
        Settings
      </h1>

      {/* Profile Information */}
      <div className='bg-white rounded-xl border border-gray-200 p-6'>
        <h2 className={`text-base text-gray-900 mb-5 ${josefinSemiBold.className}`}>
          Profile Information
        </h2>

        <div className='space-y-4'>
          <div>
            <label className={labelClassName}>First Name</label>
            <input
              type='text'
              className={inputClassName}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClassName}>Last Name</label>
            <input
              type='text'
              className={inputClassName}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClassName}>Email</label>
            <input
              type='email'
              className={`${inputClassName} opacity-60 cursor-not-allowed`}
              value={email}
              disabled
            />
          </div>
        </div>

        <button
          onClick={handleSaveChanges}
          disabled={saving}
          className={`mt-5 bg-[#1a2e23] text-white rounded-lg py-2.5 px-5 text-sm transition-colors hover:bg-[#243d2f] disabled:opacity-60 ${josefinSemiBold.className}`}>
          {saving ? (
            <span className='flex items-center gap-2'>
              <Loader2 className='w-4 h-4 animate-spin' />
              Saving...
            </span>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>

      {/* Security */}
      <div className='bg-white rounded-xl border border-gray-200 p-6'>
        <h2 className={`text-base text-gray-900 mb-4 ${josefinSemiBold.className}`}>
          Security
        </h2>
        <button
          onClick={handleResetPassword}
          disabled={resetting}
          className={`text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 ${josefinRegular.className}`}>
          {resetting ? (
            <span className='flex items-center gap-2'>
              <Loader2 className='w-3.5 h-3.5 animate-spin' />
              Sending...
            </span>
          ) : (
            'Reset Password'
          )}
        </button>
      </div>
    </div>
  );
}
