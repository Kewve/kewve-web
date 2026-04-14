'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import Script from 'next/script';
import { formSubmissionAction } from '@/actions';
import { cn, josefinSemiBold } from '@/utils';
import { GDPR } from '@/lib/gdprCopy';
import { Josefin_Sans } from 'next/font/google';

const josefin = Josefin_Sans({ weight: ['400', '600'], subsets: ['latin'] });

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type='submit'
      disabled={pending}
      className={`w-full sm:w-auto bg-orange text-white px-8 py-3 rounded-full text-base border-2 border-orange transition-opacity hover:opacity-90 disabled:opacity-60 ${josefinSemiBold.className}`}
    >
      {pending ? 'Sending…' : 'Send message'}
    </button>
  );
}

const FEEDBACK_MS = 4500;
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

declare global {
  interface Window {
    turnstile?: {
      render: (
        selector: string | HTMLElement,
        options: { sitekey: string; callback: (token: string) => void; 'expired-callback'?: () => void }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export default function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [state, action] = useFormState(formSubmissionAction, {
    message: '',
    error: false,
    submitted: false,
  });

  useEffect(() => {
    if (!state.submitted || !state.message) {
      setFeedbackVisible(false);
      return;
    }

    if (!state.error) {
      formRef.current?.reset();
      if (messageRef.current) {
        messageRef.current.value = '';
      }
    }
    setCaptchaToken('');
    if (turnstileWidgetIdRef.current && window.turnstile) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
    }

    setFeedbackVisible(true);
    const t = window.setTimeout(() => setFeedbackVisible(false), FEEDBACK_MS);
    return () => window.clearTimeout(t);
  }, [state]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    if (!turnstileReady) return;
    if (!window.turnstile || !turnstileContainerRef.current) return;
    if (turnstileWidgetIdRef.current) return;

    turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token: string) => setCaptchaToken(token),
      'expired-callback': () => setCaptchaToken(''),
    });
  }, [turnstileReady]);

  useEffect(() => {
    return () => {
      if (turnstileWidgetIdRef.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
      }
    };
  }, []);

  const labelClass = `text-[#1a1a1a] ${josefin.className}`;
  const fieldClass = 'bg-white text-[#1a1a1a] border border-black';

  return (
    <div className='w-full max-w-xl mx-auto'>
      {TURNSTILE_SITE_KEY ? (
        <Script
          src='https://challenges.cloudflare.com/turnstile/v0/api.js'
          async
          defer
          onLoad={() => setTurnstileReady(true)}
        />
      ) : null}
      <form ref={formRef} action={action} className='flex flex-col gap-4'>
        <input type='text' name='company_website' tabIndex={-1} autoComplete='off' className='hidden' />
        <input type='hidden' name='captchaToken' value={captchaToken} />
        <div className='flex flex-col gap-2'>
          <Label htmlFor='contact-account-type' className={labelClass}>
            I&apos;m interested as
          </Label>
          <select
            id='contact-account-type'
            name='account_type'
            required
            defaultValue=''
            className={cn(
              'flex h-10 w-full rounded-md border border-black bg-white px-3 py-2 text-sm text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2',
              josefin.className
            )}
          >
            <option value='' disabled>
              Select buyer or producer
            </option>
            <option value='buyer'>Buyer</option>
            <option value='producer'>Producer</option>
          </select>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='contact-firstName' className={labelClass}>
              First name
            </Label>
            <Input
              id='contact-firstName'
              type='text'
              name='firstName'
              placeholder='First name'
              required
              autoComplete='given-name'
              className={fieldClass}
            />
          </div>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='contact-lastName' className={labelClass}>
              Last name
            </Label>
            <Input
              id='contact-lastName'
              type='text'
              name='lastName'
              placeholder='Last name'
              autoComplete='family-name'
              className={fieldClass}
            />
          </div>
        </div>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='contact-email' className={labelClass}>
            Email
          </Label>
          <Input
            id='contact-email'
            type='email'
            name='email'
            placeholder='you@example.com'
            required
            autoComplete='email'
            className={fieldClass}
          />
        </div>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='contact-phone' className={labelClass}>
            Phone number
          </Label>
          <Input
            id='contact-phone'
            type='tel'
            name='phone'
            placeholder='+44 7700 900000'
            autoComplete='tel'
            className={fieldClass}
          />
        </div>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='contact-country' className={labelClass}>
            Country / region
          </Label>
          <Input
            id='contact-country'
            type='text'
            name='country'
            placeholder='e.g. Ireland'
            autoComplete='country-name'
            className={fieldClass}
          />
        </div>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='contact-message' className={labelClass}>
            Message
          </Label>
          <Textarea
            ref={messageRef}
            id='contact-message'
            name='message'
            placeholder='How can we help?'
            rows={4}
            required
            className={cn(fieldClass, 'resize-y min-h-[100px]')}
          />
        </div>
        <label className='flex items-start gap-3 cursor-pointer'>
          <input
            type='checkbox'
            name='gdpr_consent'
            required
            className='mt-1 h-4 w-4 rounded border-gray-400 text-orange focus:ring-orange accent-orange shrink-0'
          />
          <span className={`text-xs sm:text-sm text-[#5a5a5a] leading-snug ${josefin.className}`}>
            {(() => {
              const [before, after] = GDPR.contactForm.split('Privacy Policy');
              return (
                <>
                  {before}
                  <Link href='/privacy' className='text-orange underline hover:opacity-80'>
                    Privacy Policy
                  </Link>
                  {after}
                </>
              );
            })()}
          </span>
        </label>
        {TURNSTILE_SITE_KEY ? (
          <div className='pt-1'>
            <div ref={turnstileContainerRef} />
          </div>
        ) : null}
        <div className='flex justify-center sm:justify-start pt-1'>
          <SubmitButton />
        </div>
        {feedbackVisible && state.message ? (
          <p
            role='status'
            className={`text-sm text-center ${state.error ? 'text-red-600' : 'text-[#5a5a5a]'} ${josefin.className}`}
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
