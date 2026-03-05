'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI, adminAPI } from '@/lib/api';
import { titleFont, josefinSemiBold, josefinRegular } from '@/utils';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function OpsSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [codeSaving, setCodeSaving] = useState(false);
  const [codesLoading, setCodesLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [newCode, setNewCode] = useState('');
  const [discountCodes, setDiscountCodes] = useState<any[]>([]);

  useEffect(() => {
    if (user?.name) {
      const parts = user.name.split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
    }
  }, [user]);

  useEffect(() => {
    const loadAdminProfile = async () => {
      try {
        const res = await adminAPI.getMe();
        if (res.success && res.data?.user) {
          setAdminEmail(res.data.user.email || '');
          if (!user?.name && res.data.user.name) {
            const parts = String(res.data.user.name).split(' ');
            setFirstName(parts[0] || '');
            setLastName(parts.slice(1).join(' ') || '');
          }
        }
      } catch {
        setAdminEmail('');
      }
    };

    loadAdminProfile();
  }, [user?.name]);

  const loadDiscountCodes = async () => {
    setCodesLoading(true);
    try {
      const res = await adminAPI.getDiscountCodes();
      if (res.success) {
        setDiscountCodes(res.data || []);
      }
    } catch {
      setDiscountCodes([]);
    } finally {
      setCodesLoading(false);
    }
  };

  useEffect(() => {
    loadDiscountCodes();
  }, []);

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

  const handleCreateCode = async () => {
    const code = newCode.trim().toUpperCase();
    if (!code) return;
    setCodeSaving(true);
    try {
      const res = await adminAPI.createDiscountCode({ code, discountPercent: 15 });
      if (res.success) {
        toast({ title: 'Code created', description: `${code} is now active with 15% discount.` });
        setNewCode('');
        await loadDiscountCodes();
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create code.', variant: 'destructive' });
    } finally {
      setCodeSaving(false);
    }
  };

  const handleToggleCode = async (id: string) => {
    try {
      const res = await adminAPI.toggleDiscountCode(id);
      if (res.success) {
        await loadDiscountCodes();
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update code.', variant: 'destructive' });
    }
  };

  return (
    <div>
      <h1 className={`text-3xl font-bold text-gray-900 mb-6 ${titleFont.className}`}>Settings</h1>

      <div className='max-w-3xl space-y-6'>
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
                value={adminEmail || user?.email || ''}
                disabled
                className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50 cursor-not-allowed ${josefinRegular.className}`}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className={`bg-[#ed722d] text-white rounded-lg px-5 py-2.5 text-sm transition-colors hover:opacity-90 disabled:opacity-50 flex items-center gap-2 ${josefinSemiBold.className}`}>
              {saving && <Loader2 className='w-4 h-4 animate-spin' />}
              Save Changes
            </button>
          </div>
        </div>

        <div className='bg-white rounded-xl border border-gray-200 p-6'>
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 ${josefinSemiBold.className}`}>Discount Codes (15% off)</h2>

          <div className='flex flex-col sm:flex-row gap-3 mb-5'>
            <input
              type='text'
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder='Enter unique code (e.g. PARTNER15A)'
              className={`flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 uppercase focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent ${josefinRegular.className}`}
            />
            <button
              onClick={handleCreateCode}
              disabled={codeSaving || !newCode.trim()}
              className={`bg-[#ed722d] text-white rounded-lg px-5 py-2.5 text-sm transition-colors hover:opacity-90 disabled:opacity-50 flex items-center gap-2 ${josefinSemiBold.className}`}>
              {codeSaving && <Loader2 className='w-4 h-4 animate-spin' />}
              Create Code
            </button>
          </div>

          {codesLoading ? (
            <div className='py-4 flex items-center gap-2 text-gray-500'>
              <Loader2 className='w-4 h-4 animate-spin' />
              <span className={josefinRegular.className}>Loading codes...</span>
            </div>
          ) : discountCodes.length === 0 ? (
            <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>No discount codes yet.</p>
          ) : (
            <div className='space-y-2'>
              {discountCodes.map((code) => (
                <div key={code._id} className='flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2'>
                  <div>
                    <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>{code.code}</p>
                    <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>
                      {code.discountPercent}% off · used {code.usageCount || 0} time(s)
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleCode(code._id)}
                    className={`text-xs px-3 py-1.5 rounded-lg border ${
                      code.isActive
                        ? 'border-amber-300 text-amber-700 bg-amber-50'
                        : 'border-green-300 text-green-700 bg-green-50'
                    } ${josefinSemiBold.className}`}>
                    {code.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
