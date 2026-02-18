'use client';

import {
  Check,
  Shield,
  BarChart3,
  ClipboardCheck,
  ArrowRight,
  Users,
  Globe,
  PackageCheck,
  Sparkles,
} from 'lucide-react';
import { titleFont, josefinRegular, josefinSemiBold } from '@/utils';
import Link from 'next/link';

const steps = [
  {
    number: '01',
    title: 'Complete the Assessment',
    description:
      'Answer guided questions about your business, products, certifications, and export capabilities. It takes about 15–20 minutes.',
  },
  {
    number: '02',
    title: 'Receive Your Score & Action Plan',
    description:
      'Get a detailed readiness score across 6 categories with a personalised action plan showing exactly what you need to do.',
  },
  {
    number: '03',
    title: 'Get Market-Ready with Kewve',
    description:
      'Our team walks you through every step — from compliance and packaging to labelling and logistics — until you are export-ready.',
  },
  {
    number: '04',
    title: 'Connect with Buyers',
    description:
      'Once you meet export standards, we introduce you to verified UK & EU buyers actively sourcing African food & beverage products.',
  },
];

const benefits = [
  {
    icon: ClipboardCheck,
    title: 'Comprehensive Readiness Evaluation',
    description: 'Assessment across compliance, packaging, pricing, logistics, and production capacity.',
  },
  {
    icon: BarChart3,
    title: 'Personalised Readiness Score',
    description: 'A score from 0–100 with detailed breakdown across 6 key export dimensions.',
  },
  {
    icon: Shield,
    title: 'Compliance & Certification Guidance',
    description: 'Understand exactly which food safety and regulatory standards you need to meet.',
  },
  {
    icon: PackageCheck,
    title: 'Packaging & Labelling Review',
    description: 'Ensure your products meet UK & EU packaging, labelling, and presentation standards.',
  },
  {
    icon: Globe,
    title: 'Logistics & Shipping Assessment',
    description: 'Evaluate your shipping readiness, cold chain capabilities, and distribution strategy.',
  },
  {
    icon: Users,
    title: 'Priority Buyer Matching',
    description: 'Export-ready producers get priority introductions to verified international buyers.',
  },
];

export default function AssessmentLanding() {
  return (
    <>
      {/* Hero Section */}
      <section className='bg-cream pt-24 lg:pt-32 pb-16 lg:pb-20'>
        <div className='max-w-4xl mx-auto px-5 lg:px-6 text-center'>
          <div className='inline-flex items-center gap-2 bg-orange/10 text-orange px-4 py-2 rounded-full mb-6'>
            <Sparkles className='w-4 h-4' />
            <span className={`text-sm ${josefinSemiBold.className}`}>Export Readiness Assessment</span>
          </div>

          <h1 className={`text-4xl md:text-5xl lg:text-6xl text-black leading-tight mb-6 ${titleFont.className}`}>
            Your Path to Export Success Starts Here
          </h1>

          <p className={`text-lg md:text-xl text-black-muted leading-relaxed max-w-2xl mx-auto mb-8 ${josefinRegular.className}`}>
            Kewve&apos;s Export Readiness Assessment evaluates your business across every dimension that matters — compliance,
            packaging, logistics, pricing — and delivers a personalised action plan to get your products into UK &amp; EU markets.
          </p>

          <p className={`text-base text-black-muted/70 max-w-xl mx-auto mb-10 ${josefinRegular.className}`}>
            We don&apos;t just assess — we hold your hand through every step until you&apos;re export-ready, then connect you
            with real buyers.
          </p>

          <Link
            href='/register'
            className={`group inline-flex items-center gap-2 bg-[#153b2e] text-white rounded-md py-4 px-10 text-lg font-semibold transition-all hover:bg-[#1a4a3a] cursor-pointer ${josefinSemiBold.className}`}>
            Get Started — €99
            <ArrowRight className='w-5 h-5 group-hover:translate-x-1 transition-transform' />
          </Link>

          <p className={`text-sm text-black-muted/50 mt-4 ${josefinRegular.className}`}>
            One-time payment &middot; No recurring charges &middot; Secure payment via Stripe
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className='py-16 lg:py-24 bg-[#faf8f5]'>
        <div className='max-w-5xl mx-auto px-5 lg:px-6'>
          <h2 className={`text-3xl md:text-4xl text-center text-black mb-4 ${titleFont.className}`}>
            How It Works
          </h2>
          <p className={`text-center text-black-muted/70 max-w-2xl mx-auto mb-14 ${josefinRegular.className}`}>
            From assessment to buyer introductions — here&apos;s your journey to the UK &amp; EU market.
          </p>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8'>
            {steps.map((step) => (
              <div key={step.number} className='bg-white rounded-2xl p-7 md:p-8 border border-gray-100 shadow-sm'>
                <span className={`text-3xl font-bold text-orange/30 ${josefinSemiBold.className}`}>
                  {step.number}
                </span>
                <h3 className={`text-xl text-black mt-2 mb-3 ${josefinSemiBold.className}`}>{step.title}</h3>
                <p className={`text-sm text-black-muted/70 leading-relaxed ${josefinRegular.className}`}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className='py-16 lg:py-24 bg-cream'>
        <div className='max-w-5xl mx-auto px-5 lg:px-6'>
          <h2 className={`text-3xl md:text-4xl text-center text-black mb-4 ${titleFont.className}`}>
            What You Get
          </h2>
          <p className={`text-center text-black-muted/70 max-w-2xl mx-auto mb-14 ${josefinRegular.className}`}>
            Everything you need to go from producer to international exporter.
          </p>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
            {benefits.map((benefit, i) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={i}
                  className='bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow'>
                  <div className='w-12 h-12 rounded-xl bg-orange/10 flex items-center justify-center mb-4'>
                    <Icon className='w-6 h-6 text-orange' />
                  </div>
                  <h3 className={`text-base text-black mb-2 ${josefinSemiBold.className}`}>{benefit.title}</h3>
                  <p className={`text-sm text-black-muted/70 leading-relaxed ${josefinRegular.className}`}>
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Kewve Promise */}
      <section className='py-16 lg:py-20 bg-[#153b2e]'>
        <div className='max-w-3xl mx-auto px-5 lg:px-6 text-center'>
          <h2 className={`text-3xl md:text-4xl text-white mb-6 ${titleFont.className}`}>
            We Don&apos;t Just Assess — We Walk With You
          </h2>
          <p className={`text-lg text-white/80 leading-relaxed mb-4 ${josefinRegular.className}`}>
            Most readiness tools give you a score and leave you on your own. Kewve is different. Our team works directly
            with you to close every gap, meet every standard, and prepare your products for international shelves.
          </p>
          <p className={`text-base text-white/60 mb-10 ${josefinRegular.className}`}>
            When you&apos;re ready, we connect you with verified buyers in the UK and EU who are actively sourcing African
            food &amp; beverage products.
          </p>

          <div className='flex flex-wrap justify-center gap-6 mb-10'>
            <div className='flex items-center gap-2 text-white/90'>
              <Check className='w-5 h-5 text-orange' />
              <span className={`text-sm ${josefinSemiBold.className}`}>Hands-on guidance</span>
            </div>
            <div className='flex items-center gap-2 text-white/90'>
              <Check className='w-5 h-5 text-orange' />
              <span className={`text-sm ${josefinSemiBold.className}`}>Compliance support</span>
            </div>
            <div className='flex items-center gap-2 text-white/90'>
              <Check className='w-5 h-5 text-orange' />
              <span className={`text-sm ${josefinSemiBold.className}`}>Buyer introductions</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className='py-16 lg:py-24 bg-cream'>
        <div className='max-w-3xl mx-auto px-5 lg:px-6 text-center'>
          <h2 className={`text-3xl md:text-4xl lg:text-5xl text-black leading-tight mb-6 ${titleFont.className}`}>
            Ready to Start Exporting?
          </h2>
          <p className={`text-lg text-black-muted leading-relaxed max-w-xl mx-auto mb-10 ${josefinRegular.className}`}>
            Take the Export Readiness Assessment today and get a clear roadmap to international markets.
          </p>

          <Link
            href='/register'
            className={`group inline-flex items-center gap-2 bg-orange text-white rounded-md py-4 px-10 text-lg font-semibold transition-all hover:bg-orange/90 cursor-pointer ${josefinSemiBold.className}`}>
            Get Started — €99
            <ArrowRight className='w-5 h-5 group-hover:translate-x-1 transition-transform' />
          </Link>

          <p className={`text-sm text-black-muted/50 mt-4 ${josefinRegular.className}`}>
            Secure payment via Stripe &middot; One-time fee &middot; No hidden charges
          </p>
        </div>
      </section>
    </>
  );
}
