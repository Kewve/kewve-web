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
  const [newDiscountPercent, setNewDiscountPercent] = useState('10');
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
    const parsedPercent = Number(newDiscountPercent);
    if (!code) return;
    if (!Number.isFinite(parsedPercent) || parsedPercent <= 0 || parsedPercent > 100) {
      toast({
        title: 'Invalid discount percent',
        description: 'Enter a discount percentage between 1 and 100.',
        variant: 'destructive',
      });
      return;
    }
    setCodeSaving(true);
    try {
      const res = await adminAPI.createDiscountCode({
        code,
        discountPercent: Number(parsedPercent.toFixed(2)),
      });
      if (res.success) {
        toast({
          title: 'Code created',
          description: `${code} is now active with ${Number(parsedPercent.toFixed(2))}% off.`,
        });
        setNewCode('');
        setNewDiscountPercent('10');
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
    <div className='max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-10'>
      <h1 className={`text-3xl font-bold text-gray-900 mb-2 ${titleFont.className}`}>Settings</h1>
      <p className={`text-sm text-gray-500 mb-8 ${josefinRegular.className}`}>Manage your ops profile and discount codes.</p>

      <div className='space-y-8'>
        <div className='bg-white rounded-xl border border-gray-200 p-6 sm:p-8'>
          <h2 className={`text-lg font-semibold text-gray-900 mb-5 ${josefinSemiBold.className}`}>Profile Information</h2>

          <div className='space-y-6'>
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

            <div className='pt-2'>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`bg-[#ed722d] text-white rounded-lg px-5 py-2.5 text-sm transition-colors hover:opacity-90 disabled:opacity-50 flex items-center gap-2 ${josefinSemiBold.className}`}>
                {saving && <Loader2 className='w-4 h-4 animate-spin' />}
                Save Changes
              </button>
            </div>
          </div>
        </div>

        <div className='bg-white rounded-xl border border-gray-200 p-6 sm:p-8'>
          <h2 className={`text-lg font-semibold text-gray-900 mb-2 ${josefinSemiBold.className}`}>Discount Codes</h2>
          <p className={`text-sm text-gray-500 mb-6 ${josefinRegular.className}`}>
            Create codes for assessment checkout. Toggle to activate or deactivate.
          </p>

          <div className='grid grid-cols-1 sm:grid-cols-[1fr_170px_auto] gap-3 sm:gap-4 mb-8'>
            <input
              type='text'
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder='Enter unique code (e.g. PARTNER15A)'
              className={`flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 uppercase focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent ${josefinRegular.className}`}
            />
            <div className='relative'>
              <input
                type='number'
                min={1}
                max={100}
                step='0.01'
                value={newDiscountPercent}
                onChange={(e) => setNewDiscountPercent(e.target.value)}
                placeholder='10'
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent ${josefinRegular.className}`}
              />
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 ${josefinRegular.className}`}>%</span>
            </div>
            <button
              onClick={handleCreateCode}
              disabled={codeSaving || !newCode.trim() || !newDiscountPercent.trim()}
              className={`bg-[#ed722d] text-white rounded-lg px-5 py-2.5 text-sm transition-colors hover:opacity-90 disabled:opacity-50 flex items-center gap-2 ${josefinSemiBold.className}`}>
              {codeSaving && <Loader2 className='w-4 h-4 animate-spin' />}
              Create Code
            </button>
          </div>

          {codesLoading ? (
            <div className='py-6 flex items-center gap-2 text-gray-500'>
              <Loader2 className='w-4 h-4 animate-spin' />
              <span className={josefinRegular.className}>Loading codes...</span>
            </div>
          ) : discountCodes.length === 0 ? (
            <p className={`text-sm text-gray-500 py-2 ${josefinRegular.className}`}>No discount codes yet.</p>
          ) : (
            <div className='space-y-3'>
              {discountCodes.map((code) => (
                <div
                  key={code._id}
                  className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border border-gray-200 rounded-lg px-4 py-3.5'>
                  <div className='space-y-1'>
                    <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>{code.code}</p>
                    <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>
                      {`${Number(code.discountPercent || 0)}% off`} · used {code.usageCount || 0} time(s)
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleCode(code._id)}
                    className={`text-xs px-3 py-2 rounded-lg border shrink-0 self-start sm:self-center ${
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
