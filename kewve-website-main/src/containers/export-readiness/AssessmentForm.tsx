'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { titleFont, josefinRegular, josefinSemiBold } from '@/utils';
import { Label } from '@/components/ui/label';
import { YesNoButton } from '@/components/ui/yes-no-button';
import { useAuth } from '@/contexts/AuthContext';
import { assessmentAPI } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

const TOTAL_STEPS = 12;
const STEPS = [
  { id: 'export-context', label: 'Export Context' },
  { id: 'business-legal', label: 'Business & Legal' },
  { id: 'product-definition', label: 'Product Definition' },
  { id: 'food-safety', label: 'Food Safety' },
  { id: 'production', label: 'Production & Capacity' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'labelling', label: 'Labelling' },
  { id: 'shelf-life', label: 'Shelf Life' },
  { id: 'documentation', label: 'Documentation' },
  { id: 'logistics', label: 'Logistics' },
  { id: 'financial', label: 'Financial & Trade' },
  { id: 'compliance', label: 'Compliance' },
];

const COUNTRIES = [
  'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Ethiopia', 'Other',
];

const selectClass = 'flex h-10 w-full rounded-md border border-black bg-white px-3 py-2 text-black text-sm ring-offset-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2';

const CERTIFICATIONS = ['HACCP', 'GMP', 'ISO 22000', 'FSSC 22000', 'Organic', 'None', 'Other'];

export default function AssessmentForm() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [scrollPosition, setScrollPosition] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/export-readiness/assessment');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAssessment();
    }
  }, [isAuthenticated]);

  const loadAssessment = async () => {
    try {
      const response = await assessmentAPI.getAssessment();
      if (response.success && response.data) {
        const { userId, documents, checklistState, createdAt, updatedAt, _id, __v, ...data } = response.data;
        setFormData(data);
      }
    } catch {
      // No existing assessment
    }
  };

  useEffect(() => {
    if (isAuthenticated && Object.keys(formData).length > 0) {
      const timeoutId = setTimeout(() => { saveAssessment(); }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [formData, isAuthenticated]);

  const isStepCompleted = (step: number, d: Record<string, any>): boolean => {
    switch (step) {
      case 1: return !!d.country && !!d.exportDestination && d.plantBasedConfirmation !== undefined;
      case 2: return d.businessRegistered !== undefined && d.businessDocuments !== undefined && d.taxId !== undefined && d.fixedLocation !== undefined;
      case 3: return d.definedProducts !== undefined && d.consistentIngredients !== undefined && d.documentedIngredientList !== undefined && d.ingredientOriginKnown !== undefined;
      case 4: return d.haccpProcess !== undefined && d.documentedProcedures !== undefined && d.hygieneRecords !== undefined && d.certificateOfAnalysis !== undefined && d.accreditedLabTesting !== undefined && d.localFoodAgencyRegistration !== undefined;
      case 5: return !!d.monthlyProductionCapacity && d.consistentSupply !== undefined && d.scalableProduction !== undefined && d.trackProductionVolumes !== undefined && d.qualityControlProcesses !== undefined;
      case 6: return d.exportPackaging !== undefined && d.knowPackagingMaterials !== undefined && d.internationalShipping !== undefined && d.multipleFormats !== undefined;
      case 7: return d.labelProductName !== undefined && d.labelIngredients !== undefined && d.labelAllergens !== undefined && d.labelNetWeight !== undefined && d.labelOrigin !== undefined && d.labelStorage !== undefined && d.labelBusinessDetails !== undefined && d.labelsInEnglish !== undefined && d.allergenDeclarations !== undefined && d.shelfLifeInfo !== undefined && d.barcodes !== undefined;
      case 8: return d.knownShelfLife !== undefined && d.shelfLifeTested !== undefined && d.storageConditionsDefined !== undefined;
      case 9: return d.canUploadCOA !== undefined;
      case 10: return d.exportedBefore !== undefined && d.exportGradeCartons !== undefined && d.understandLogistics !== undefined;
      case 11: return d.businessBankAccount !== undefined && d.internationalPayments !== undefined && d.exportPricing !== undefined && d.paymentTerms !== undefined && d.samplePolicy !== undefined;
      case 12: return d.confirmAccuracy === 'yes' && d.agreeCompliance === 'yes';
      default: return false;
    }
  };

  useEffect(() => {
    const s = new Set<number>();
    for (let i = 1; i <= TOTAL_STEPS; i++) { if (isStepCompleted(i, formData)) s.add(i); }
    setCompletedSteps(s);
  }, [formData]);

  const progress = (completedSteps.size / TOTAL_STEPS) * 100;

  const saveAssessment = async () => {
    if (!isAuthenticated) return;
    try { await assessmentAPI.saveAssessment(formData); } catch { /* silent */ }
  };

  const handleNext = async () => {
    if (currentStep < TOTAL_STEPS) {
      const next = currentStep + 1;
      setCurrentStep(next);
      setTimeout(() => scrollToActiveTab(next), 100);
    } else {
      setSaving(true);
      try {
        await assessmentAPI.saveAssessment(formData);
        toast({ title: 'Success!', description: 'Your assessment has been saved.' });
        router.push('/dashboard/export-readiness');
      } catch (error: any) {
        toast({ title: 'Error', description: error.message || 'Failed to save assessment.', variant: 'destructive' });
      } finally { setSaving(false); }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      setTimeout(() => scrollToActiveTab(prev), 100);
    }
  };

  const scrollToActiveTab = (stepNumber: number) => {
    const container = document.getElementById('tabs-container');
    const tab = document.getElementById(`tab-${stepNumber}`);
    if (container && tab) {
      const cRect = container.getBoundingClientRect();
      const tRect = tab.getBoundingClientRect();
      const scrollLeft = container.scrollLeft;
      const tabLeft = tRect.left - cRect.left + scrollLeft;
      const tabRight = tabLeft + tRect.width;
      if (tabLeft < scrollLeft) container.scrollTo({ left: tabLeft - 20, behavior: 'smooth' });
      else if (tabRight > scrollLeft + container.clientWidth) container.scrollTo({ left: tabRight - container.clientWidth + 20, behavior: 'smooth' });
    }
  };

  const set = (field: string, value: any) => setFormData((p) => ({ ...p, [field]: value }));

  const handleTabClick = (idx: number) => {
    const s = idx + 1;
    setCurrentStep(s);
    setTimeout(() => scrollToActiveTab(s), 100);
  };

  useEffect(() => { scrollToActiveTab(currentStep); }, [currentStep]);

  const handleScroll = (dir: 'left' | 'right') => {
    const c = document.getElementById('tabs-container');
    if (c) {
      const amount = 200;
      const pos = dir === 'left' ? scrollPosition - amount : scrollPosition + amount;
      setScrollPosition(Math.max(0, Math.min(pos, c.scrollWidth - c.clientWidth)));
      c.scrollTo({ left: pos, behavior: 'smooth' });
    }
  };

  const toggleCert = (cert: string) => {
    const current: string[] = formData.certifications || [];
    if (cert === 'None') {
      set('certifications', current.includes('None') ? [] : ['None']);
    } else {
      const without = current.filter((c: string) => c !== 'None');
      set('certifications', without.includes(cert) ? without.filter((c: string) => c !== cert) : [...without, cert]);
    }
  };

  const note = (text: string) => (
    <div className='bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-4'>
      <p className={`text-xs text-amber-800 ${josefinRegular.className}`}>{text}</p>
    </div>
  );

  const sectionHeader = (title: string, desc: string) => (
    <div>
      <h2 className={`text-3xl md:text-4xl font-bold text-black mb-2 ${titleFont.className}`}>{title}</h2>
      <p className={`text-base text-black-muted mb-6 ${josefinRegular.className}`}>{desc}</p>
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className='space-y-6'>
            {sectionHeader('Export Context', 'Confirm basic eligibility and your target export market.')}
            <div>
              <Label className='text-black mb-2 block'>Country of operation</Label>
              <select value={formData.country || ''} onChange={(e) => set('country', e.target.value)} className={selectClass}>
                <option value=''>Select a country</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label className='text-black mb-2 block'>Export destination</Label>
              <select value={formData.exportDestination || ''} onChange={(e) => set('exportDestination', e.target.value)} className={selectClass}>
                <option value=''>Select destination</option>
                <option value='uk'>UK</option>
                <option value='eu'>EU</option>
                <option value='both'>Both</option>
              </select>
            </div>
            <div>
              <Label className='text-black mb-3 block'>I confirm all products are plant-based and contain no meat, seafood, or animal by-products</Label>
              <YesNoButton value={(formData.plantBasedConfirmation as 'yes' | 'no') || ''} onValueChange={(v) => set('plantBasedConfirmation', v)} />
            </div>
            {note('If products contain animal or seafood ingredients, they are not eligible for Kewve.')}
          </div>
        );

      case 2:
        return (
          <div className='space-y-6'>
            {sectionHeader('Business & Legal Readiness', 'UK and EU buyers expect exporters to be legally registered and traceable.')}
            <div>
              <Label className='text-black mb-3 block'>Is your business legally registered in your country?</Label>
              <YesNoButton value={(formData.businessRegistered as 'yes' | 'no') || ''} onValueChange={(v) => set('businessRegistered', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Do you have official business registration documents?</Label>
              <YesNoButton value={(formData.businessDocuments as 'yes' | 'no') || ''} onValueChange={(v) => set('businessDocuments', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Do you have a valid tax identification number?</Label>
              <YesNoButton value={(formData.taxId as 'yes' | 'no') || ''} onValueChange={(v) => set('taxId', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Do you operate from a fixed production or processing location?</Label>
              <YesNoButton value={(formData.fixedLocation as 'yes' | 'no') || ''} onValueChange={(v) => set('fixedLocation', v)} />
            </div>
            {note('Legal registration and a fixed location are minimum expectations for export trade.')}
          </div>
        );

      case 3:
        return (
          <div className='space-y-6'>
            {sectionHeader('Product Definition & Consistency', 'Buyers and regulators require clear and consistent product information.')}
            <div>
              <Label className='text-black mb-3 block'>Do you have clearly defined products intended for export?</Label>
              <YesNoButton value={(formData.definedProducts as 'yes' | 'no') || ''} onValueChange={(v) => set('definedProducts', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Are product ingredients consistent from batch to batch?</Label>
              <YesNoButton value={(formData.consistentIngredients as 'yes' | 'no') || ''} onValueChange={(v) => set('consistentIngredients', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Do you have a documented ingredient list for each product?</Label>
              <YesNoButton value={(formData.documentedIngredientList as 'yes' | 'no') || ''} onValueChange={(v) => set('documentedIngredientList', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Do you know the country of origin of all raw ingredients?</Label>
              <YesNoButton value={(formData.ingredientOriginKnown as 'yes' | 'no') || ''} onValueChange={(v) => set('ingredientOriginKnown', v)} />
            </div>
            {note('Inconsistent ingredients or unclear origins are common reasons for buyer rejection.')}
          </div>
        );

      case 4:
        return (
          <div className='space-y-6'>
            {sectionHeader('Food Safety & Quality Management', 'Food safety is a core requirement for UK and EU markets.')}
            <div>
              <Label className='text-black mb-3 block'>Do you follow a documented food safety process (HACCP-based)?</Label>
              <YesNoButton value={(formData.haccpProcess as 'yes' | 'no') || ''} onValueChange={(v) => set('haccpProcess', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Which certifications do you hold?</Label>
              <div className='flex flex-wrap gap-2'>
                {CERTIFICATIONS.map((cert) => {
                  const selected = (formData.certifications || []).includes(cert);
                  return (
                    <button key={cert} type='button' onClick={() => toggleCert(cert)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${selected ? 'bg-[#153b2e] text-white' : 'bg-gray-100 text-black-muted hover:bg-gray-200'}`}>
                      {cert}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className='text-black mb-3 block'>Are food safety procedures documented and followed by staff?</Label>
              <YesNoButton value={(formData.documentedProcedures as 'yes' | 'no') || ''} onValueChange={(v) => set('documentedProcedures', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Do you maintain hygiene and sanitation records?</Label>
              <YesNoButton value={(formData.hygieneRecords as 'yes' | 'no') || ''} onValueChange={(v) => set('hygieneRecords', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Do you have a valid Certificate of Analysis (COA)?</Label>
              <YesNoButton value={(formData.certificateOfAnalysis as 'yes' | 'no') || ''} onValueChange={(v) => set('certificateOfAnalysis', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Have you completed accredited laboratory/premises testing?</Label>
              <YesNoButton value={(formData.accreditedLabTesting as 'yes' | 'no') || ''} onValueChange={(v) => set('accreditedLabTesting', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Are you registered with a local food safety or regulatory authority?</Label>
              <YesNoButton value={(formData.localFoodAgencyRegistration as 'yes' | 'no') || ''} onValueChange={(v) => set('localFoodAgencyRegistration', v)} />
            </div>
            {note('HACCP-based food safety systems are mandatory for UK and EU. ISO 22000 and FSSC 22000 are not legally required but improve buyer confidence. COAs are critical for buyer trust, aggregation, and repeat trade.')}
          </div>
        );

      case 5:
        return (
          <div className='space-y-6'>
            {sectionHeader('Production Capacity & Scalability', 'Buyers need confidence that supply can be delivered consistently.')}
            <div>
              <Label className='text-black mb-2 block'>Current monthly production capacity</Label>
              <select value={formData.monthlyProductionCapacity || ''} onChange={(e) => set('monthlyProductionCapacity', e.target.value)} className={selectClass}>
                <option value=''>Select capacity</option>
                <option value='less-than-500'>Less than 500 kg</option>
                <option value='500-1000'>500 – 1,000 kg</option>
                <option value='1000-5000'>1 – 5 tonnes</option>
                <option value='5000-plus'>5+ tonnes</option>
              </select>
            </div>
            <div>
              <Label className='text-black mb-3 block'>Can you consistently supply the same product specification over time?</Label>
              <YesNoButton value={(formData.consistentSupply as 'yes' | 'no') || ''} onValueChange={(v) => set('consistentSupply', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Can production be scaled if demand increases?</Label>
              <YesNoButton value={(formData.scalableProduction as 'yes' | 'no') || ''} onValueChange={(v) => set('scalableProduction', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Do you track production volumes and output?</Label>
              <YesNoButton value={(formData.trackProductionVolumes as 'yes' | 'no') || ''} onValueChange={(v) => set('trackProductionVolumes', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Do you have quality control processes in place?</Label>
              <YesNoButton value={(formData.qualityControlProcesses as 'yes' | 'no') || ''} onValueChange={(v) => set('qualityControlProcesses', v)} />
            </div>
            {note('Clear capacity data is essential for aggregation and buyer planning.')}
          </div>
        );

      case 6:
        return (
          <div className='space-y-6'>
            {sectionHeader('Packaging Readiness', 'Packaging must protect products during international transport.')}
            <div>
              <Label className='text-black mb-3 block'>Are products packaged for export rather than local retail only?</Label>
              <YesNoButton value={(formData.exportPackaging as 'yes' | 'no') || ''} onValueChange={(v) => set('exportPackaging', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Do you know your packaging materials?</Label>
              <YesNoButton value={(formData.knowPackagingMaterials as 'yes' | 'no') || ''} onValueChange={(v) => set('knowPackagingMaterials', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Is packaging suitable for international shipping?</Label>
              <YesNoButton value={(formData.internationalShipping as 'yes' | 'no') || ''} onValueChange={(v) => set('internationalShipping', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Do you offer multiple formats (bulk and/or retail-ready)?</Label>
              <YesNoButton value={(formData.multipleFormats as 'yes' | 'no') || ''} onValueChange={(v) => set('multipleFormats', v)} />
            </div>
          </div>
        );

      case 7:
        return (
          <div className='space-y-6'>
            {sectionHeader('Labelling Compliance', 'Incorrect labelling is a common cause of shipment delays or rejection.')}
            <p className={`text-sm text-black-muted -mt-4 mb-2 ${josefinRegular.className}`}>Do your product labels include:</p>
            <div>
              <Label className='text-black mb-3 block'>Product name</Label>
              <YesNoButton value={(formData.labelProductName as 'yes' | 'no') || ''} onValueChange={(v) => set('labelProductName', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Ingredients</Label>
              <YesNoButton value={(formData.labelIngredients as 'yes' | 'no') || ''} onValueChange={(v) => set('labelIngredients', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Allergens</Label>
              <YesNoButton value={(formData.labelAllergens as 'yes' | 'no') || ''} onValueChange={(v) => set('labelAllergens', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Net weight</Label>
              <YesNoButton value={(formData.labelNetWeight as 'yes' | 'no') || ''} onValueChange={(v) => set('labelNetWeight', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Origin</Label>
              <YesNoButton value={(formData.labelOrigin as 'yes' | 'no') || ''} onValueChange={(v) => set('labelOrigin', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Storage instructions</Label>
              <YesNoButton value={(formData.labelStorage as 'yes' | 'no') || ''} onValueChange={(v) => set('labelStorage', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Business details</Label>
              <YesNoButton value={(formData.labelBusinessDetails as 'yes' | 'no') || ''} onValueChange={(v) => set('labelBusinessDetails', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Are labels in English?</Label>
              <YesNoButton value={(formData.labelsInEnglish as 'yes' | 'no') || ''} onValueChange={(v) => set('labelsInEnglish', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Do labels include allergen declarations?</Label>
              <YesNoButton value={(formData.allergenDeclarations as 'yes' | 'no') || ''} onValueChange={(v) => set('allergenDeclarations', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Do labels include shelf life and storage information?</Label>
              <YesNoButton value={(formData.shelfLifeInfo as 'yes' | 'no') || ''} onValueChange={(v) => set('shelfLifeInfo', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Do products have barcodes (EAN/UPC)?</Label>
              <YesNoButton value={(formData.barcodes as 'yes' | 'no') || ''} onValueChange={(v) => set('barcodes', v)} />
            </div>
            {note('UK and EU food labels must be accurate, legible, and in English.')}
          </div>
        );

      case 8:
        return (
          <div className='space-y-6'>
            {sectionHeader('Shelf Life & Stability', 'Shelf life data is essential for international trade.')}
            <div>
              <Label className='text-black mb-3 block'>Do you know the shelf life of your products?</Label>
              <YesNoButton value={(formData.knownShelfLife as 'yes' | 'no') || ''} onValueChange={(v) => set('knownShelfLife', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Has shelf life been tested or validated?</Label>
              <YesNoButton value={(formData.shelfLifeTested as 'yes' | 'no') || ''} onValueChange={(v) => set('shelfLifeTested', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Are storage conditions clearly defined?</Label>
              <YesNoButton value={(formData.storageConditionsDefined as 'yes' | 'no') || ''} onValueChange={(v) => set('storageConditionsDefined', v)} />
            </div>
          </div>
        );

      case 9:
        return (
          <div className='space-y-6'>
            {sectionHeader('Documentation Readiness', 'Documents support customs clearance and buyer confidence.')}
            <p className={`text-sm text-black-muted -mt-4 mb-2 ${josefinRegular.className}`}>
              Can you upload the following documents where available?
            </p>
            <div>
              <Label className='text-black mb-3 block'>Certificate of Analysis (COA)</Label>
              <YesNoButton value={(formData.canUploadCOA as 'yes' | 'no') || ''} onValueChange={(v) => set('canUploadCOA', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Product specification sheet</Label>
              <YesNoButton value={(formData.canUploadSpecSheet as 'yes' | 'no') || ''} onValueChange={(v) => set('canUploadSpecSheet', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Packing list</Label>
              <YesNoButton value={(formData.canUploadPackingList as 'yes' | 'no') || ''} onValueChange={(v) => set('canUploadPackingList', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Export license (if required)</Label>
              <YesNoButton value={(formData.canUploadExportLicense as 'yes' | 'no') || ''} onValueChange={(v) => set('canUploadExportLicense', v)} />
            </div>
          </div>
        );

      case 10:
        return (
          <div className='space-y-6'>
            {sectionHeader('Logistics & Export Readiness', 'Basic export logistics readiness.')}
            <div>
              <Label className='text-black mb-3 block'>Have you exported internationally before?</Label>
              <YesNoButton value={(formData.exportedBefore as 'yes' | 'no') || ''} onValueChange={(v) => set('exportedBefore', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Do you have export-grade cartons and palletisation capability?</Label>
              <YesNoButton value={(formData.exportGradeCartons as 'yes' | 'no') || ''} onValueChange={(v) => set('exportGradeCartons', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Do you understand basic export logistics (FOB, CIF, lead times)?</Label>
              <YesNoButton value={(formData.understandLogistics as 'yes' | 'no') || ''} onValueChange={(v) => set('understandLogistics', v)} />
            </div>
            {note('FOB (Free On Board) — producer responsible until goods loaded onto ship. CIF (Cost, Insurance and Freight) — producer arranges shipping and insurance to destination. Lead time — time from order confirmation to product shipped; buyers expect realistic timelines.')}
          </div>
        );

      case 11:
        return (
          <div className='space-y-6'>
            {sectionHeader('Financial & Trade Readiness', 'Financial infrastructure for international trade.')}
            <div>
              <Label className='text-black mb-3 block'>Do you have a business bank account?</Label>
              <YesNoButton value={(formData.businessBankAccount as 'yes' | 'no') || ''} onValueChange={(v) => set('businessBankAccount', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Can you receive international payments?</Label>
              <YesNoButton value={(formData.internationalPayments as 'yes' | 'no') || ''} onValueChange={(v) => set('internationalPayments', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Do you have export pricing established (EXW, FOB, CIF)?</Label>
              <YesNoButton value={(formData.exportPricing as 'yes' | 'no') || ''} onValueChange={(v) => set('exportPricing', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Have you established payment terms for export orders?</Label>
              <YesNoButton value={(formData.paymentTerms as 'yes' | 'no') || ''} onValueChange={(v) => set('paymentTerms', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Do you have a sample policy for buyers?</Label>
              <YesNoButton value={(formData.samplePolicy as 'yes' | 'no') || ''} onValueChange={(v) => set('samplePolicy', v)} />
            </div>
            {note('Export pricing clarifies which costs you cover versus the buyer. EXW: price from your facility. FOB: price up to loading onto ship. CIF: price including shipping and insurance to destination.')}
          </div>
        );

      case 12:
        return (
          <div className='space-y-6'>
            {sectionHeader('Compliance Confirmation', 'Final confirmation before submitting your assessment.')}
            <div>
              <Label className='text-black mb-3 block'>I confirm the information provided is accurate.</Label>
              <YesNoButton value={(formData.confirmAccuracy as 'yes' | 'no') || ''} onValueChange={(v) => set('confirmAccuracy', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>I agree to meet UK/EU compliance requirements before trade.</Label>
              <YesNoButton value={(formData.agreeCompliance as 'yes' | 'no') || ''} onValueChange={(v) => set('agreeCompliance', v)} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section className='bg-cream pt-16 lg:pt-28 pb-16 lg:pb-24 min-h-screen'>
      <div className='spacing container mx-auto max-w-4xl'>
        <div className='mb-8'>
          <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-3 ${titleFont.className}`}>
            Export Readiness Assessment
          </h1>
          <p className={`text-base md:text-lg text-black-muted ${josefinRegular.className}`}>
            UK &amp; EU – Plant-Based Food &amp; Beverage Products. Complete this assessment to receive your export readiness score.
          </p>
        </div>

        <div className='mb-8'>
          <div className='flex justify-between items-center mb-2'>
            <span className={`text-sm text-black-muted ${josefinRegular.className}`}>Step {currentStep} of {TOTAL_STEPS}</span>
            <span className={`text-sm text-black-muted ${josefinRegular.className}`}>{Math.round(progress)}% complete</span>
          </div>
          <div className='w-full h-2 bg-gray-200 rounded-full overflow-hidden'>
            <div className='h-full bg-orange transition-all duration-300 ease-out' style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className='mb-8 relative'>
          <div className='flex items-center gap-2'>
            <button onClick={() => handleScroll('left')} className='p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0'>
              <ChevronLeft className='w-5 h-5 text-black' />
            </button>
            <div id='tabs-container' className='flex-1 overflow-x-auto scrollbar-hide flex gap-2 pb-2' style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {STEPS.map((step, index) => {
                const stepNum = index + 1;
                const isActive = currentStep === stepNum;
                const isCompleted = completedSteps.has(stepNum);
                return (
                  <button key={step.id} id={`tab-${stepNum}`} onClick={() => handleTabClick(index)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-2 ${
                      isActive ? 'bg-black text-white' : isCompleted ? 'bg-orange/20 text-black border border-orange' : 'bg-gray-100 text-black-muted hover:bg-gray-200'
                    } ${josefinSemiBold.className}`}>
                    {isCompleted && !isActive && <Check className='w-4 h-4 text-orange' />}
                    {step.label}
                  </button>
                );
              })}
            </div>
            <button onClick={() => handleScroll('right')} className='p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0'>
              <ChevronRight className='w-5 h-5 text-black' />
            </button>
          </div>
          <div className='mt-2 h-1 bg-gray-200 rounded-full overflow-hidden'>
            <div className='h-full bg-black-muted transition-all duration-300' style={{ width: `${(currentStep / STEPS.length) * 100}%` }}></div>
          </div>
        </div>

        <div className='bg-white rounded-lg p-6 lg:p-8 shadow-sm border border-gray-100 mb-8'>
          {renderStep()}
        </div>

        <div className='flex justify-between items-center'>
          <button onClick={handleBack} disabled={currentStep === 1}
            className={`px-6 py-3 rounded-lg border-2 border-gray-300 bg-white text-black-muted font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center gap-2 ${josefinSemiBold.className}`}>
            <ChevronLeft className='w-4 h-4' /> Back
          </button>
          <button onClick={handleNext} disabled={saving}
            className={`px-6 py-3 rounded-lg bg-black text-white font-semibold transition-all hover:bg-orange flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${josefinSemiBold.className}`}>
            {saving ? 'Saving...' : currentStep === TOTAL_STEPS ? 'Complete Assessment' : 'Next'}
            {currentStep !== TOTAL_STEPS && !saving && <ChevronRight className='w-4 h-4' />}
          </button>
        </div>
      </div>
    </section>
  );
}
