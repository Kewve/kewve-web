'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/lib/api';
import { titleFont, josefinSemiBold, josefinRegular } from '@/utils';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function OpsSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    if (user?.name) {
      const parts = user.name.split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      await authAPI.updateProfile({ name: fullName });
      await refreshUser();
      toast({ title: 'Saved', description: 'Profile updated successfully.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save changes.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className={`text-3xl font-bold text-gray-900 mb-6 ${titleFont.className}`}>Settings</h1>

      <div className='max-w-2xl'>
        <div className='bg-white rounded-xl border border-gray-200 p-6'>
          <h2 className={`text-lg font-semibold text-gray-900 mb-6 ${josefinSemiBold.className}`}>Profile Information</h2>

          <div className='space-y-5'>
            <div>
              <label className={`block text-sm text-gray-700 mb-1.5 ${josefinRegular.className}`}>First Name</label>
              <input
                type='text'
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent ${josefinRegular.className}`}
              />
            </div>

            <div>
              <label className={`block text-sm text-gray-700 mb-1.5 ${josefinRegular.className}`}>Last Name</label>
              <input
                type='text'
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent ${josefinRegular.className}`}
              />
            </div>

            <div>
              <label className={`block text-sm text-gray-700 mb-1.5 ${josefinRegular.className}`}>Email</label>
              <input
                type='email'
                value={user?.email || ''}
                disabled
                className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50 cursor-not-allowed ${josefinRegular.className}`}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className={`bg-[#1a2e23] text-white rounded-lg px-5 py-2.5 text-sm transition-colors hover:bg-[#243d2f] disabled:opacity-50 flex items-center gap-2 ${josefinSemiBold.className}`}>
              {saving && <Loader2 className='w-4 h-4 animate-spin' />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
