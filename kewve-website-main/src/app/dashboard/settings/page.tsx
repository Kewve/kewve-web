'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { josefinSemiBold, josefinRegular } from '@/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { authAPI } from '@/lib/api';
import { requestPasswordReset } from '@/actions/resetPassword';
import { Loader2 } from 'lucide-react';

function DashboardSettingsContent() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [profileCountry, setProfileCountry] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectStatus, setConnectStatus] = useState<{
    hasAccount?: boolean;
    detailsSubmitted?: boolean;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    stripeModeMismatch?: boolean;
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const isProducer =
    !!user?.roles?.some((r) => String(r).toLowerCase() === 'producer') ||
    String(user?.role || '').toLowerCase() === 'producer';

  useEffect(() => {
    if (user) {
      const parts = (user.name || '').split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      setEmail(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    if (!isProducer) return;
    let cancelled = false;
    setStatusLoading(true);
    (async () => {
      try {
        const res = await authAPI.stripeConnectStatus();
        if (!cancelled && res.success && res.data) {
          setConnectStatus({
            hasAccount: res.data.hasAccount,
            detailsSubmitted: res.data.detailsSubmitted,
            chargesEnabled: res.data.chargesEnabled,
            payoutsEnabled: res.data.payoutsEnabled,
            stripeModeMismatch: res.data.stripeModeMismatch,
          });
        }
      } catch {
        if (!cancelled) setConnectStatus(null);
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isProducer, user?.stripeConnectAccountId]);

  useEffect(() => {
    const s = searchParams.get('stripe_connect');
    if (!s || !isProducer) return;

    (async () => {
      if (s === 'return') {
        try {
          const res = await authAPI.stripeConnectStatus();
          if (res.success && res.data) {
            setConnectStatus({
              hasAccount: res.data.hasAccount,
              detailsSubmitted: res.data.detailsSubmitted,
              chargesEnabled: res.data.chargesEnabled,
              payoutsEnabled: res.data.payoutsEnabled,
              stripeModeMismatch: res.data.stripeModeMismatch,
            });
          }
          if (refreshUser) await refreshUser();
          const d = res.success ? res.data : undefined;
          if (d?.payoutsEnabled && d?.detailsSubmitted) {
            toast({
              title: 'Payouts connected',
              description: 'Your Stripe Connect account is ready to receive transfers.',
            });
          } else if (d?.detailsSubmitted) {
            toast({
              title: 'Details submitted',
              description: 'Stripe may still be verifying your account. Check back shortly.',
            });
          } else {
            toast({
              title: 'Continue in Stripe',
              description: 'Finish any remaining steps if Stripe prompts you.',
            });
          }
        } catch (e: any) {
          toast({
            title: 'Could not verify status',
            description: e?.message || 'Try again or contact support.',
            variant: 'destructive',
          });
        }
        router.replace('/dashboard/settings');
      } else if (s === 'refresh') {
        toast({
          title: 'Session expired or incomplete',
          description: 'Click Connect payouts again to continue Stripe onboarding.',
        });
        router.replace('/dashboard/settings');
      }
    })();
  }, [searchParams, isProducer, refreshUser, router, toast]);

  const handleSaveChanges = async () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!fullName) {
      toast({ title: 'Error', description: 'Name cannot be empty.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await authAPI.updateProfile({ name: fullName, country: profileCountry.trim() });
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

  const connectComingSoonToast = (description: string) => {
    toast({
      title: 'Coming soon',
      description,
    });
  };

  const handleConnectPayouts = async () => {
    setConnecting(true);
    try {
      const res = await authAPI.stripeConnectStart();
      if (!res.success || !res.url) {
        const msg = res.message || 'Check that Stripe is configured and you are logged in as a producer.';
        if (/coming soon/i.test(msg)) {
          connectComingSoonToast(msg);
        } else {
          toast({
            title: 'Could not start Connect',
            description: msg,
            variant: 'destructive',
          });
        }
        return;
      }
      window.location.href = res.url;
    } catch (error: any) {
      const msg = error?.message || 'Failed to open Stripe onboarding.';
      if (/coming soon/i.test(msg)) {
        connectComingSoonToast(msg);
      } else {
        toast({
          title: 'Error',
          description: msg,
          variant: 'destructive',
        });
      }
    } finally {
      setConnecting(false);
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
          <div>
            <label className={labelClassName}>
              Country{isProducer ? '' : ' (optional)'}
            </label>
            <input
              type='text'
              className={inputClassName}
              value={profileCountry}
              onChange={(e) => setProfileCountry(e.target.value)}
              placeholder='e.g. Ireland'
            />
            <p className={`text-xs text-gray-500 mt-1.5 ${josefinRegular.className}`}>
              {isProducer
                ? 'Required to join aggregation clusters (must match cluster supply regions where set). Also used for compliance.'
                : 'Your country or region on file (e.g. for matching and compliance).'}
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveChanges}
          disabled={saving}
          className={`mt-5 bg-[#ed722d] text-white rounded-lg py-2.5 px-5 text-sm transition-colors hover:opacity-90 disabled:opacity-60 ${josefinSemiBold.className}`}>
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

      {isProducer ? (
        <div className='bg-white rounded-xl border border-gray-200 p-6'>
          <h2 className={`text-base text-gray-900 mb-2 ${josefinSemiBold.className}`}>Payouts (Stripe Connect)</h2>
          <p className={`text-sm text-gray-600 mb-4 ${josefinRegular.className}`}>
            Complete Stripe&apos;s hosted onboarding so Kewve can send your share after completed orders. You won&apos;t
            enter bank details in Kewve—Stripe collects that securely.
          </p>

          {connectStatus?.stripeModeMismatch ? (
            <div
              className={`mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${josefinRegular.className}`}>
              The Connect account saved on your profile was created in a different Stripe mode than this server (test vs
              live). Click <strong className={josefinSemiBold.className}>Connect payouts</strong> to replace it with an
              account that matches your current <code className='text-xs'>STRIPE_SECRET_KEY</code>.
            </div>
          ) : null}

          {statusLoading ? (
            <p className={`text-sm text-gray-500 mb-4 flex items-center gap-2 ${josefinRegular.className}`}>
              <Loader2 className='w-4 h-4 animate-spin' />
              Checking Connect status…
            </p>
          ) : connectStatus?.stripeModeMismatch ? null : connectStatus?.payoutsEnabled && connectStatus?.detailsSubmitted ? (
            <p className={`text-sm text-emerald-700 mb-4 ${josefinRegular.className}`}>Payout account connected.</p>
          ) : (
            <p className={`text-sm text-gray-600 mb-4 ${josefinRegular.className}`}>No Connect account linked yet.</p>
          )}

          <button
            type='button'
            onClick={handleConnectPayouts}
            disabled={connecting}
            className={`rounded-lg py-2.5 px-5 text-sm transition-colors disabled:opacity-60 ${josefinSemiBold.className} ${
              connectStatus?.payoutsEnabled && connectStatus?.detailsSubmitted
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-[#635bff] text-white hover:opacity-90'
            }`}>
            {connecting ? (
              <span className='flex items-center gap-2'>
                <Loader2 className='w-4 h-4 animate-spin' />
                Opening Stripe…
              </span>
            ) : connectStatus?.payoutsEnabled && connectStatus?.detailsSubmitted ? (
              'Connected'
            ) : (
              'Connect payouts'
            )}
          </button>
        </div>
      ) : null}

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

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className='max-w-2xl mx-auto py-12 flex justify-center'>
          <Loader2 className='w-8 h-8 animate-spin text-gray-400' />
        </div>
      }>
      <DashboardSettingsContent />
    </Suspense>
  );
}
