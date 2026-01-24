'use client';

import Link from 'next/link';
import { Check, Shield, BarChart3, ClipboardCheck, ArrowRight } from 'lucide-react';
import { titleFont, josefinRegular, josefinSemiBold } from '@/utils';
import { useAuth } from '@/contexts/AuthContext';

export default function AssessmentLanding() {
  const { isAuthenticated, loading } = useAuth();
  const features = [
    {
      icon: Shield,
      title: 'Compliance Check',
      description: 'Evaluate your food safety certifications, packaging standards, and regulatory compliance.',
    },
    {
      icon: BarChart3,
      title: 'Readiness Score',
      description: 'Receive a score from 0-100 across 6 categories with detailed breakdown and tier classification.',
    },
    {
      icon: ClipboardCheck,
      title: 'Action Checklist',
      description: 'Get a personalized checklist of improvements needed to become export-ready.',
    },
  ];

  // Show sign-in view if not authenticated
  if (!loading && !isAuthenticated) {
    return (
      <section className='bg-cream pt-16 lg:pt-28 pb-16 lg:pb-24 min-h-screen flex items-center justify-center'>
        <div className='spacing container mx-auto max-w-2xl text-center'>
          {/* Icon and Title Section */}
          <div className='flex flex-col items-center mb-12'>
            <div className='w-16 h-16 rounded-full border-2 border-[#153b2e] flex items-center justify-center mb-6'>
              <Check className='w-8 h-8 text-[#153b2e]' />
            </div>
            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-4 ${titleFont.className}`}>
              Export Readiness Assessment
            </h1>
            <p className={`text-lg md:text-xl text-black-muted max-w-2xl mx-auto ${josefinRegular.className}`}>
              Evaluate your export readiness for UK and EU markets. Get a personalized score, action checklist, and trade
              showcase eligibility status.
            </p>
          </div>

          {/* Sign In CTA Button */}
          <div className='flex justify-center'>
            <Link
              href='/login'
              className={`group bg-[#153b2e] text-white rounded-full py-4 px-8 lg:py-5 lg:px-10 text-lg lg:text-xl font-semibold transition-all hover:bg-[#1a4a3a] flex items-center gap-2 ${josefinSemiBold.className}`}>
              Sign In to Start
              <ArrowRight className='w-5 h-5 group-hover:translate-x-1 transition-transform' />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Show full landing page if authenticated
  return (
    <section className='bg-cream pt-16 lg:pt-28 pb-16 lg:pb-24'>
      <div className='spacing container mx-auto max-w-4xl'>
        {/* Icon and Title Section */}
        <div className='flex flex-col items-center text-center mb-12'>
          <div className='w-16 h-16 rounded-full bg-orange/10 flex items-center justify-center mb-6'>
            <div className='w-12 h-12 rounded-lg bg-orange flex items-center justify-center'>
              <Check className='w-6 h-6 text-white' />
            </div>
          </div>
          <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-4 ${titleFont.className}`}>
            Export Readiness Assessment
          </h1>
          <p className={`text-lg md:text-xl text-black-muted max-w-2xl mx-auto ${josefinRegular.className}`}>
            Evaluate your export readiness for UK and EU markets. Get a personalized score, action checklist, and trade
            showcase eligibility status.
          </p>
        </div>

        {/* CTA Button */}
        <div className='flex justify-center mb-16'>
          <Link
            href='/export-readiness/assessment'
            className={`group bg-black text-white rounded-full py-4 px-8 lg:py-5 lg:px-10 text-lg lg:text-xl font-semibold transition-all hover:bg-orange flex items-center gap-2 ${josefinSemiBold.className}`}>
            Start Assessment
            <ArrowRight className='w-5 h-5 group-hover:translate-x-1 transition-transform' />
          </Link>
        </div>

        {/* Feature Cards */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-12'>
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className='bg-white rounded-lg p-6 lg:p-8 shadow-sm border border-gray-100'>
                <div className='w-14 h-14 rounded-full bg-orange/10 flex items-center justify-center mb-4'>
                  <Icon className='w-7 h-7 text-orange' />
                </div>
                <h3 className={`text-xl font-bold text-black mb-3 ${josefinSemiBold.className}`}>{feature.title}</h3>
                <p className={`text-base text-black-muted leading-relaxed ${josefinRegular.className}`}>
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Dashboard Link */}
        <div className='text-center'>
          <Link
            href='/export-readiness/dashboard'
            className={`text-base text-black-muted hover:text-orange underline transition-colors ${josefinRegular.className}`}>
            Already completed your assessment? View your dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}

