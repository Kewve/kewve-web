'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn, josefinRegular, josefinSemiBold, titleFont } from '@/utils';

type PricingPlan = {
  name: string;
  tagline: string;
  price: string;
  cadence?: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  popular?: boolean;
};

const plans: PricingPlan[] = [
  {
    name: 'Starter',
    tagline: 'For new exporters.',
    price: '€99',
    cadence: 'one-time',
    features: ['Export Readiness Assessment', 'Basic Documentation Guide', 'Community Access', 'Email Support'],
    ctaLabel: 'Get Started',
    ctaHref: '/waitlist',
  },
  {
    name: 'Trade',
    tagline: 'For growing businesses.',
    price: '€25',
    cadence: '/month',
    features: [
      'All Starter features',
      'Verified Buyer Access',
      'Standard Trade Support',
      'Payment Automation',
      'Monthly Logistics Updates',
    ],
    ctaLabel: 'Subscribe',
    ctaHref: '/waitlist',
    popular: true,
  },
  {
    name: 'Scale',
    tagline: 'For high-volume operations.',
    price: '€49',
    cadence: '/month',
    features: [
      'All Trade features',
      'Priority Logistics Handling',
      'Dedicated Account Manager',
      'Custom Customs Support',
      'Market Demand Analytics',
    ],
    ctaLabel: 'Contact Sales',
    ctaHref: 'mailto:hello@kewve.com',
  },
];

function PlanCard({ plan }: { plan: PricingPlan }) {
  const isPopular = Boolean(plan.popular);

  return (
    <div
      className={cn(
        'relative h-full rounded-sm border bg-white px-8 py-10 shadow-[0_1px_0_rgba(0,0,0,0.03)]',
        isPopular ? 'border-black shadow-[0_10px_30px_rgba(0,0,0,0.10)]' : 'border-gray-200'
      )}>
      {isPopular && (
        <div className='absolute right-0 top-0'>
          <div className='bg-black px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white'>
            Popular
          </div>
        </div>
      )}

      <h3 className={cn('text-2xl font-bold text-black', josefinSemiBold.className)}>{plan.name}</h3>
      <p className={cn('mt-2 text-sm text-black-muted', josefinRegular.className)}>{plan.tagline}</p>

      <div className='mt-6 flex items-end gap-2'>
        <span className={cn('text-4xl font-bold text-black', titleFont.className)}>{plan.price}</span>
        {plan.cadence && <span className={cn('pb-1 text-sm text-black-muted', josefinRegular.className)}>{plan.cadence}</span>}
      </div>

      <ul className={cn('mt-8 space-y-4 text-sm text-black-muted', josefinRegular.className)}>
        {plan.features.map((feature) => (
          <li key={feature} className='flex items-start gap-3'>
            <Check className='mt-0.5 h-5 w-5 flex-shrink-0 text-orange' />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className='mt-10'>
        <Link
          href={plan.ctaHref}
          className={cn(
            'block w-full rounded-sm border px-6 py-3 text-center text-sm font-semibold transition-colors',
            isPopular
              ? 'border-black bg-black text-white hover:bg-orange hover:border-orange'
              : 'border-gray-200 bg-white text-black hover:bg-gray-50',
            josefinSemiBold.className
          )}>
          {plan.ctaLabel}
        </Link>
      </div>
    </div>
  );
}

export default function PricingSection() {
  return (
    <section className='bg-cream py-14 lg:py-20'>
      <div className='spacing container mx-auto'>
        <div className='mx-auto max-w-4xl text-center'>
          <h1 className={cn('text-4xl md:text-5xl xl:text-6xl font-bold text-black', titleFont.className)}>
            Simple, transparent pricing.
          </h1>
          <p className={cn('mt-4 text-base md:text-lg text-black-muted', josefinRegular.className)}>
            Choose the plan that fits your export volume. No hidden marketplace fees.
          </p>
        </div>

        <div className='mt-12 grid grid-cols-1 gap-6 lg:mt-16 lg:grid-cols-3'>
          {plans.map((plan) => (
            <PlanCard key={plan.name} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}


