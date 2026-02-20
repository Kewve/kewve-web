'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { josefinSemiBold, josefinRegular } from '@/utils';
import { assessmentAPI, tradeProfileAPI, productAPI } from '@/lib/api';
import {
  ArrowRight,
  Globe,
  Layers,
  ArrowLeftRight,
  FileText,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

const VERIFICATION_CATEGORIES = [
  'biz-reg', 'tax-id', 'bank-stmt',
  'food-safety', 'export-license', 'phyto-cert',
  'prod-capacity', 'packaging', 'quality-ctrl',
];

function computeReadinessScore(data: any) {
  if (!data) return { score: 0, max: 100 };
  const yes = (f: string) => data[f] === 'yes';

  // Core Eligibility & Fundamentals (30)
  let core = 0;
  if (data.country) core += 3;
  if (data.exportDestination) core += 3;
  if (yes('plantBasedConfirmation')) core += 4;
  if (yes('businessRegistered')) core += 3;
  if (yes('businessDocuments')) core += 2;
  if (yes('taxId')) core += 2;
  if (yes('fixedLocation')) core += 3;
  if (yes('definedProducts')) core += 2;
  if (yes('consistentIngredients')) core += 1;
  if (yes('documentedIngredientList')) core += 1;
  if (yes('ingredientOriginKnown')) core += 1;
  if (yes('haccpProcess')) core += 3;
  if (yes('documentedProcedures')) core += 2;

  // Food Safety & Quality (25)
  let foodSafety = 0;
  const certs: string[] = data.certifications || [];
  if (certs.includes('HACCP')) foodSafety += 4;
  if (certs.includes('GMP')) foodSafety += 2;
  if (certs.includes('ISO 22000') || certs.includes('FSSC 22000')) foodSafety += 2;
  if (certs.includes('Organic')) foodSafety += 2;
  if (yes('hygieneRecords')) foodSafety += 3;
  if (yes('certificateOfAnalysis')) foodSafety += 3;
  if (yes('accreditedLabTesting')) foodSafety += 3;
  if (yes('localFoodAgencyRegistration')) foodSafety += 2;
  // Product Traceability
  if (yes('traceRawToFinished')) foodSafety += 1;
  if (yes('identifySuppliers')) foodSafety += 1;
  if (yes('batchLotNumbers')) foodSafety += 1;
  if (yes('traceOneStepBackForward')) foodSafety += 1;

  // Packaging, Labelling & Shelf Life (20)
  let packLabel = 0;
  if (yes('exportPackaging')) packLabel += 2;
  if (yes('internationalShipping')) packLabel += 2;
  if (yes('multipleFormats')) packLabel += 1;
  const labelFields = ['labelProductName','labelIngredients','labelAllergens','labelNetWeight','labelOrigin','labelStorage','labelBusinessDetails'];
  packLabel += Math.min(Math.round((labelFields.filter((f) => yes(f)).length / 7) * 5), 5);
  if (yes('labelsInEnglish')) packLabel += 2;
  if (yes('allergenDeclarations')) packLabel += 1;
  if (yes('barcodes')) packLabel += 1;
  if (yes('shelfLifeInfo')) packLabel += 1;
  if (yes('knownShelfLife')) packLabel += 2;
  if (yes('shelfLifeTested')) packLabel += 2;
  if (yes('storageConditionsDefined')) packLabel += 1;

  // Capacity, Logistics & Trade (15)
  let capLog = 0;
  if (data.monthlyProductionCapacity === '5000-plus') capLog += 3;
  else if (data.monthlyProductionCapacity === '1000-5000') capLog += 2;
  else if (data.monthlyProductionCapacity === '500-1000') capLog += 1;
  if (yes('consistentSupply')) capLog += 2;
  if (yes('scalableProduction')) capLog += 1;
  if (yes('qualityControlProcesses')) capLog += 1;
  if (yes('exportedBefore')) capLog += 3;
  if (yes('exportGradeCartons')) capLog += 3;
  if (yes('understandLogistics')) capLog += 2;

  // Financial & Documentation (10)
  let financial = 0;
  if (yes('businessBankAccount')) financial += 2;
  if (yes('internationalPayments')) financial += 2;
  if (yes('exportPricing')) financial += 2;
  if (yes('paymentTerms')) financial += 2;
  if (yes('samplePolicy')) financial += 1;
  if (yes('canUploadCOA')) financial += 1;

  const score = core + foodSafety + packLabel + capLog + financial;
  return { score, max: 100 };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'there';

  const [loading, setLoading] = useState(true);
  const [readiness, setReadiness] = useState<{ score: number; max: number; hasAssessment: boolean }>({
    score: 0,
    max: 100,
    hasAssessment: false,
  });
  const [verification, setVerification] = useState<{ uploaded: number; total: number; rejected: number }>({
    uploaded: 0,
    total: VERIFICATION_CATEGORIES.length,
    rejected: 0,
  });
  const [tradeProfile, setTradeProfile] = useState<{ completedSections: number; totalSections: number }>({
    completedSections: 0,
    totalSections: 5,
  });
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [assessmentRes, tradeRes, productsRes] = await Promise.allSettled([
          assessmentAPI.getAssessment(),
          tradeProfileAPI.getProfile(),
          productAPI.getProducts(),
        ]);

        // Assessment / Export Readiness
        if (assessmentRes.status === 'fulfilled' && assessmentRes.value.success) {
          const data = assessmentRes.value.data;
          const { score, max } = computeReadinessScore(data);
          setReadiness({ score, max, hasAssessment: true });

          // Verification — count approved and rejected documents with matching categories
          if (data.documents && Array.isArray(data.documents)) {
            const approvedCategories = new Set(
              data.documents
                .filter((d: any) => d.category && VERIFICATION_CATEGORIES.includes(d.category) && d.status === 'approved')
                .map((d: any) => d.category)
            );
            const rejectedCategories = new Set(
              data.documents
                .filter((d: any) => d.category && VERIFICATION_CATEGORIES.includes(d.category) && d.status === 'rejected')
                .map((d: any) => d.category)
            );
            setVerification({
              uploaded: approvedCategories.size,
              total: VERIFICATION_CATEGORIES.length,
              rejected: rejectedCategories.size,
            });
          }
        }

        // Trade Profile
        if (tradeRes.status === 'fulfilled' && tradeRes.value.success && tradeRes.value.data) {
          const completed = tradeRes.value.data.completedSections || [];
          setTradeProfile({ completedSections: completed.length, totalSections: 5 });
        }

        // Products
        if (productsRes.status === 'fulfilled' && productsRes.value.success) {
          setProductCount(productsRes.value.data?.length || 0);
        }
      } catch {
        // Silently fail — cards will show defaults
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Readiness badge
  const getReadinessBadge = () => {
    if (!readiness.hasAssessment) {
      return { label: 'Not Started', bg: 'bg-red-100 text-red-700' };
    }
    const pct = Math.round((readiness.score / readiness.max) * 100);
    if (pct >= 70) return { label: 'Export Ready', bg: 'bg-green-100 text-green-700' };
    if (pct >= 40) return { label: 'Nearly Ready', bg: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Not Ready', bg: 'bg-red-100 text-red-700' };
  };

  // Verification badge
  const getVerificationBadge = () => {
    if (verification.uploaded === 0) return { label: 'Pending', bg: 'border border-gray-300 text-gray-600' };
    if (verification.uploaded === verification.total) return { label: 'Verified', bg: 'bg-green-100 text-green-700' };
    return { label: 'In Progress', bg: 'bg-yellow-100 text-yellow-700' };
  };

  // Trade Profile badge
  const getTradeProfileBadge = () => {
    if (tradeProfile.completedSections === 0) return { label: 'Incomplete', bg: 'text-gray-500' };
    if (tradeProfile.completedSections >= tradeProfile.totalSections) return { label: 'Complete', bg: 'bg-green-100 text-green-700' };
    return { label: 'In Progress', bg: 'bg-yellow-100 text-yellow-700' };
  };

  const readinessBadge = getReadinessBadge();
  const verificationBadge = getVerificationBadge();
  const tradeProfileBadge = getTradeProfileBadge();

  return (
    <div className='max-w-5xl mx-auto space-y-6'>
      {/* Welcome */}
      <h1 className={`text-2xl lg:text-3xl text-gray-900 ${josefinSemiBold.className}`}>
        Welcome back, {firstName}
      </h1>

      {/* Status Cards */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        {/* Export Readiness */}
        <Link href='/dashboard/export-readiness' className='bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 transition-colors'>
          <p className={`text-sm text-gray-500 mb-1 ${josefinRegular.className}`}>Export Readiness</p>
          <div className='flex items-center justify-between'>
            {loading ? (
              <Loader2 className='w-5 h-5 text-gray-300 animate-spin' />
            ) : (
              <span className={`text-2xl text-gray-900 ${josefinSemiBold.className}`}>
                {readiness.score}/{readiness.max}
              </span>
            )}
            <span className={`text-xs px-2.5 py-1 rounded-full ${readinessBadge.bg} ${josefinSemiBold.className}`}>
              {loading ? '...' : readinessBadge.label}
            </span>
          </div>
        </Link>

        {/* Verification */}
        <Link href='/dashboard/verification' className='bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 transition-colors'>
          <p className={`text-sm text-gray-500 mb-1 ${josefinRegular.className}`}>Verification</p>
          <div className='flex items-center justify-between'>
            {loading ? (
              <Loader2 className='w-5 h-5 text-gray-300 animate-spin' />
            ) : (
              <span className={`text-2xl text-gray-900 ${josefinSemiBold.className}`}>
                {verification.uploaded}/{verification.total}
              </span>
            )}
            <span className={`text-xs px-2.5 py-1 rounded-full ${verificationBadge.bg} ${josefinSemiBold.className}`}>
              {loading ? '...' : verificationBadge.label}
            </span>
          </div>
        </Link>

        {/* Trade Profile */}
        <Link href='/dashboard/trade-profile' className='bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 transition-colors'>
          <p className={`text-sm text-gray-500 mb-1 ${josefinRegular.className}`}>Trade Profile</p>
          <div className='flex items-center justify-between'>
            {loading ? (
              <Loader2 className='w-5 h-5 text-gray-300 animate-spin' />
            ) : (
              <span className={`text-2xl text-gray-900 ${josefinSemiBold.className}`}>
                {tradeProfile.completedSections}/{tradeProfile.totalSections}
              </span>
            )}
            <span className={`text-xs px-2.5 py-1 rounded-full ${tradeProfileBadge.bg} ${josefinSemiBold.className}`}>
              {loading ? '...' : tradeProfileBadge.label}
            </span>
          </div>
        </Link>
      </div>

      {/* CTA - Complete Export Readiness */}
      <div className='bg-white rounded-xl p-6 border border-gray-200'>
        <h2 className={`text-lg text-gray-900 mb-1 ${josefinSemiBold.className}`}>
          Complete Export Readiness
        </h2>
        <p className={`text-sm text-gray-500 mb-4 ${josefinRegular.className}`}>
          Assess your readiness to export to UK/EU markets.
        </p>
        <Link
          href='/export-readiness/assessment'
          className={`inline-flex items-center gap-2 bg-[#1a2e23] text-white rounded-lg py-2.5 px-5 text-sm transition-all hover:bg-[#243d2f] ${josefinSemiBold.className}`}>
          Start Assessment
          <ArrowRight className='w-4 h-4' />
        </Link>
      </div>

      {/* Quick Stats */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <div className='bg-white rounded-xl p-5 border border-gray-200 flex items-center gap-3'>
          <Globe className='w-5 h-5 text-gray-400 shrink-0' />
          <div>
            <p className={`text-xl text-gray-900 ${josefinSemiBold.className}`}>
              {loading ? '—' : productCount}
            </p>
            <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Products Listed</p>
          </div>
        </div>

        <div className='bg-white rounded-xl p-5 border border-gray-200 flex items-center gap-3'>
          <Layers className='w-5 h-5 text-gray-400 shrink-0' />
          <div>
            <p className={`text-xl text-gray-900 ${josefinSemiBold.className}`}>0</p>
            <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Aggregation Eligible</p>
          </div>
        </div>

        <div className='bg-white rounded-xl p-5 border border-gray-200 flex items-center gap-3'>
          <ArrowLeftRight className='w-5 h-5 text-gray-400 shrink-0' />
          <div>
            <p className={`text-xl text-gray-900 ${josefinSemiBold.className}`}>0</p>
            <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Active Trade Requests</p>
          </div>
        </div>

        <div className='bg-white rounded-xl p-5 border border-gray-200 flex items-center gap-3'>
          <FileText className='w-5 h-5 text-gray-400 shrink-0' />
          <div>
            <p className={`text-xl text-gray-900 ${josefinSemiBold.className}`}>
              {loading ? '—' : (VERIFICATION_CATEGORIES.length - verification.uploaded)}
            </p>
            <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Documents Pending</p>
          </div>
        </div>
      </div>

      {/* Rejected documents alert */}
      {!loading && verification.rejected > 0 && (
        <Link href='/dashboard/verification' className='block bg-red-50 rounded-xl p-5 border border-red-200 hover:border-red-300 transition-colors'>
          <div className='flex items-start gap-3'>
            <AlertTriangle className='w-5 h-5 text-red-500 mt-0.5 shrink-0' />
            <div>
              <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>
                {verification.rejected} document{verification.rejected > 1 ? 's' : ''} rejected
              </p>
              <p className={`text-sm text-gray-600 mt-0.5 ${josefinRegular.className}`}>
                Some of your verification documents have been rejected. Please review the reasons and re-upload the corrected documents.
              </p>
              <span className={`inline-flex items-center gap-1.5 text-xs text-red-700 mt-2 ${josefinSemiBold.className}`}>
                Go to Verification <ArrowRight className='w-3.5 h-3.5' />
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Alerts */}
      <div className='bg-white rounded-xl p-6 border border-gray-200'>
        <div className='flex items-center gap-2 mb-3'>
          <AlertTriangle className='w-5 h-5 text-orange' />
          <h2 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>Alerts</h2>
        </div>
        <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>
          {!readiness.hasAssessment
            ? 'Complete your export readiness assessment to get started.'
            : verification.uploaded < verification.total
              ? `You have ${VERIFICATION_CATEGORIES.length - verification.uploaded} verification document(s) still pending.`
              : 'No alerts at this time. You\'re on track!'}
        </p>
      </div>
    </div>
  );
}
