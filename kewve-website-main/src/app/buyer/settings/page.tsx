'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { josefinRegular, josefinSemiBold } from '@/utils';

const emptyDelivery = {
  line1: '',
  line2: '',
  city: '',
  postalCode: '',
  country: '',
  phone: '',
  company: '',
};

export default function BuyerSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [profileCountry, setProfileCountry] = useState('');
  const [delivery, setDelivery] = useState(emptyDelivery);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const parts = (user.name || '').split(' ');
    setFirstName(parts[0] || '');
    setLastName(parts.slice(1).join(' ') || '');
    setEmail(user.email || '');
    setProfileCountry(typeof user.country === 'string' ? user.country : '');
    const s = user.savedDeliveryAddress;
    if (s?.line1) {
      setDelivery({
        line1: s.line1 || '',
        line2: s.line2 || '',
        city: s.city || '',
        postalCode: s.postalCode || '',
        country: s.country || '',
        phone: s.phone || '',
        company: s.company || '',
      });
    } else {
      setDelivery(emptyDelivery);
    }
  }, [user]);

  const save = async () => {
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!name) {
      toast({ title: 'Error', description: 'Name cannot be empty.', variant: 'destructive' });
      return;
    }
    const d = {
      line1: delivery.line1.trim(),
      line2: delivery.line2.trim(),
      city: delivery.city.trim(),
      postalCode: delivery.postalCode.trim(),
      country: delivery.country.trim(),
      phone: delivery.phone.trim(),
      company: delivery.company.trim(),
    };
    const hasAnyDelivery = d.line1 || d.city || d.postalCode || d.country || d.line2 || d.phone || d.company;
    if (hasAnyDelivery && (!d.line1 || !d.city || !d.postalCode || !d.country)) {
      toast({
        title: 'Delivery address incomplete',
        description: 'Fill line1, city, postal code, and country — or clear all delivery fields.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await authAPI.updateProfile({
        name,
        country: profileCountry.trim(),
        ...(hasAnyDelivery ? { savedDeliveryAddress: d } : { savedDeliveryAddress: null }),
      });
      await refreshUser();
      toast({ title: 'Saved', description: 'Profile and delivery details updated.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to save.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='max-w-3xl mx-auto space-y-5'>
      <h1 className={`text-4xl text-gray-900 ${josefinSemiBold.className}`}>Settings</h1>

      <div className='bg-white rounded-xl border border-gray-500/50 p-5'>
        <h2 className={`text-2xl text-gray-900 mb-4 ${josefinSemiBold.className}`}>Profile Information</h2>
        <div className='space-y-3'>
          <div>
            <label className={`block text-sm text-gray-700 mb-1 ${josefinSemiBold.className}`}>First Name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={`w-full border border-gray-200 rounded px-3 py-2 ${josefinRegular.className}`}
            />
          </div>
          <div>
            <label className={`block text-sm text-gray-700 mb-1 ${josefinSemiBold.className}`}>Last Name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={`w-full border border-gray-200 rounded px-3 py-2 ${josefinRegular.className}`}
            />
          </div>
          <div>
            <label className={`block text-sm text-gray-700 mb-1 ${josefinSemiBold.className}`}>Email</label>
            <input value={email} disabled className={`w-full border border-gray-200 bg-gray-50 rounded px-3 py-2 text-gray-500 ${josefinRegular.className}`} />
          </div>
          <div>
            <label className={`block text-sm text-gray-700 mb-1 ${josefinSemiBold.className}`}>Country (optional)</label>
            <input
              value={profileCountry}
              onChange={(e) => setProfileCountry(e.target.value)}
              className={`w-full border border-gray-200 rounded px-3 py-2 ${josefinRegular.className}`}
              placeholder='e.g. Ireland'
            />
            <p className={`text-xs text-gray-500 mt-1 ${josefinRegular.className}`}>
              Your country on file for your account. This is separate from the shipping country in default delivery below.
            </p>
          </div>
        </div>
      </div>

      <div className='bg-white rounded-xl border border-gray-500/50 p-5'>
        <h2 className={`text-2xl text-gray-900 mb-2 ${josefinSemiBold.className}`}>Default delivery details</h2>
        <p className={`text-sm text-gray-600 mb-4 ${josefinRegular.className}`}>
          Used to prefill sourcing requests. You can still enter a different address on each request.
        </p>
        <div className='space-y-3'>
          <div>
            <label className={`block text-sm text-gray-700 mb-1 ${josefinSemiBold.className}`}>Company (optional)</label>
            <input
              value={delivery.company}
              onChange={(e) => setDelivery((p) => ({ ...p, company: e.target.value }))}
              className={`w-full border border-gray-200 rounded px-3 py-2 ${josefinRegular.className}`}
            />
          </div>
          <div>
            <label className={`block text-sm text-gray-700 mb-1 ${josefinSemiBold.className}`}>Address line 1</label>
            <input
              value={delivery.line1}
              onChange={(e) => setDelivery((p) => ({ ...p, line1: e.target.value }))}
              className={`w-full border border-gray-200 rounded px-3 py-2 ${josefinRegular.className}`}
            />
          </div>
          <div>
            <label className={`block text-sm text-gray-700 mb-1 ${josefinSemiBold.className}`}>Address line 2 (optional)</label>
            <input
              value={delivery.line2}
              onChange={(e) => setDelivery((p) => ({ ...p, line2: e.target.value }))}
              className={`w-full border border-gray-200 rounded px-3 py-2 ${josefinRegular.className}`}
            />
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div>
              <label className={`block text-sm text-gray-700 mb-1 ${josefinSemiBold.className}`}>City</label>
              <input
                value={delivery.city}
                onChange={(e) => setDelivery((p) => ({ ...p, city: e.target.value }))}
                className={`w-full border border-gray-200 rounded px-3 py-2 ${josefinRegular.className}`}
              />
            </div>
            <div>
              <label className={`block text-sm text-gray-700 mb-1 ${josefinSemiBold.className}`}>Postal code</label>
              <input
                value={delivery.postalCode}
                onChange={(e) => setDelivery((p) => ({ ...p, postalCode: e.target.value }))}
                className={`w-full border border-gray-200 rounded px-3 py-2 ${josefinRegular.className}`}
              />
            </div>
          </div>
          <div>
            <label className={`block text-sm text-gray-700 mb-1 ${josefinSemiBold.className}`}>Country</label>
            <input
              value={delivery.country}
              onChange={(e) => setDelivery((p) => ({ ...p, country: e.target.value }))}
              className={`w-full border border-gray-200 rounded px-3 py-2 ${josefinRegular.className}`}
              placeholder='e.g. Ireland'
            />
          </div>
          <div>
            <label className={`block text-sm text-gray-700 mb-1 ${josefinSemiBold.className}`}>Phone (optional)</label>
            <input
              value={delivery.phone}
              onChange={(e) => setDelivery((p) => ({ ...p, phone: e.target.value }))}
              className={`w-full border border-gray-200 rounded px-3 py-2 ${josefinRegular.className}`}
            />
          </div>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className={`bg-brand-green text-white rounded px-4 py-2 ${josefinSemiBold.className}`}>
        {saving ? 'Saving...' : 'Save changes'}
      </button>
    </div>
  );
}
