'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check, Info, Lightbulb, BookOpen } from 'lucide-react';
import { titleFont, josefinRegular, josefinSemiBold } from '@/utils';
import { Label } from '@/components/ui/label';
import { YesNoButton } from '@/components/ui/yes-no-button';
import { useAuth } from '@/contexts/AuthContext';
import { assessmentAPI } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

const TOTAL_STEPS = 13;
const STEPS = [
  { id: 'export-context', label: 'Export Context' },
  { id: 'business-legal', label: 'Business & Legal' },
  { id: 'product-definition', label: 'Product Definition' },
  { id: 'product-traceability', label: 'Product Traceability' },
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

type ExplanationItem = {
  term: string;
  detail: string;
};

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
        const certifications: string[] = data.certifications || [];
        const normalizedData = {
          ...data,
          haccpCertification:
            data.haccpCertification !== undefined
              ? data.haccpCertification
              : certifications.includes('HACCP')
                ? 'yes'
                : 'no',
          isoCertification:
            data.isoCertification !== undefined
              ? data.isoCertification
              : certifications.includes('ISO 22000') || certifications.includes('FSSC 22000')
                ? 'yes'
                : 'no',
        };
        setFormData(normalizedData);
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
      case 4: return d.traceRawToFinished !== undefined && d.identifySuppliers !== undefined && d.batchLotNumbers !== undefined && d.traceOneStepBackForward !== undefined;
      case 5: return d.haccpProcess !== undefined && d.haccpCertification !== undefined && d.isoCertification !== undefined && d.documentedProcedures !== undefined && d.hygieneRecords !== undefined && d.certificateOfAnalysis !== undefined && d.accreditedLabTesting !== undefined && d.localFoodAgencyRegistration !== undefined;
      case 6: return !!d.monthlyProductionCapacity && d.consistentSupply !== undefined && d.scalableProduction !== undefined && d.trackProductionVolumes !== undefined && d.qualityControlProcesses !== undefined;
      case 7: return d.exportPackaging !== undefined && d.knowPackagingMaterials !== undefined && d.internationalShipping !== undefined && d.multipleFormats !== undefined;
      case 8: return d.labelProductName !== undefined && d.labelIngredients !== undefined && d.labelAllergens !== undefined && d.labelNetWeight !== undefined && d.labelOrigin !== undefined && d.labelStorage !== undefined && d.labelBusinessDetails !== undefined && d.labelsInEnglish !== undefined && d.allergenDeclarations !== undefined && d.shelfLifeInfo !== undefined && d.barcodes !== undefined;
      case 9: return d.knownShelfLife !== undefined && d.shelfLifeTested !== undefined && d.storageConditionsDefined !== undefined;
      case 10: return d.canUploadCOA !== undefined;
      case 11: return d.exportedBefore !== undefined && d.exportGradeCartons !== undefined && d.understandLogistics !== undefined;
      case 12: return d.businessBankAccount !== undefined && d.internationalPayments !== undefined && d.exportPricing !== undefined && d.paymentTerms !== undefined && d.samplePolicy !== undefined;
      case 13: return d.confirmAccuracy === 'yes' && d.agreeCompliance === 'yes';
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

  const note = (text: string) => (
    <div className='bg-amber-50 border-l-4 border-amber-500 border border-amber-200 rounded-lg px-4 py-3 mt-4 shadow-sm'>
      <div className='flex items-center gap-1.5 mb-1'>
        <Lightbulb className='w-3.5 h-3.5 text-amber-700' />
        <p className={`text-[11px] uppercase tracking-wide text-amber-700 ${josefinSemiBold.className}`}>Tip</p>
      </div>
      <p className={`text-xs text-amber-900 ${josefinRegular.className}`}>{text}</p>
    </div>
  );

  const topExplanation = (text: string) => (
    <div className='bg-blue-50 border-l-4 border-blue-500 border border-blue-200 rounded-lg px-4 py-3 -mt-2 shadow-sm'>
      <div className='flex items-center gap-1.5 mb-1'>
        <Info className='w-3.5 h-3.5 text-blue-700' />
        <p className={`text-[11px] uppercase tracking-wide text-blue-700 ${josefinSemiBold.className}`}>Quick context</p>
      </div>
      <p className={`text-sm text-black ${josefinRegular.className}`}>{text}</p>
    </div>
  );

  const explanationList = (items: ExplanationItem[]) => (
    <div className='bg-green-50 border-l-4 border-green-600 border border-green-200 rounded-lg px-4 py-3 space-y-2 shadow-sm'>
      <div className='flex items-center gap-1.5 mb-1'>
        <BookOpen className='w-3.5 h-3.5 text-green-700' />
        <p className={`text-[11px] uppercase tracking-wide text-green-700 ${josefinSemiBold.className}`}>Term guide</p>
      </div>
      {items.map((item) => (
        <p key={item.term} className={`text-sm text-black ${josefinRegular.className}`}>
          <span className='font-semibold'>{item.term}:</span> {item.detail}
        </p>
      ))}
    </div>
  );

  const sectionHeader = (title: string, desc: string) => (
    <div>
      <h2 className={`text-3xl md:text-4xl font-bold text-black mb-2 ${titleFont.className}`}>{title}</h2>
      {desc ? <p className={`text-base text-black-muted mb-6 ${josefinRegular.className}`}>{desc}</p> : null}
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className='space-y-6'>
            {sectionHeader('Export Context', '')}
            {topExplanation('Confirm basic eligibility and your target export market. This section helps us understand where you operate and where you want to export.')}
            {explanationList([
              { term: 'Country of operation', detail: 'The country where your business produces or processes the product. Example: Nigeria.' },
              { term: 'Export destination', detail: 'Where you want to sell your product. Example: United Kingdom (UK) or European Union (EU).' },
            ])}
            <div>
              <Label className='text-black mb-2 block'>Country of operation (where production or processing happens)</Label>
              <select value={formData.country || ''} onChange={(e) => set('country', e.target.value)} className={selectClass}>
                <option value=''>Select a country</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label className='text-black mb-2 block'>Export destination (UK, EU, or both)</Label>
              <select value={formData.exportDestination || ''} onChange={(e) => set('exportDestination', e.target.value)} className={selectClass}>
                <option value=''>Select destination</option>
                <option value='uk'>UK</option>
                <option value='eu'>EU</option>
                <option value='both'>Both</option>
              </select>
            </div>
            <div>
              <Label className='text-black mb-3 block'>I confirm all products are plant-based and contain no meat, seafood, or animal by-products.</Label>
              <YesNoButton value={(formData.plantBasedConfirmation as 'yes' | 'no') || ''} onValueChange={(v) => set('plantBasedConfirmation', v)} />
            </div>
            {note('Kewve supports only plant-based products (such as grains, spices, flours, nuts, seeds, and dried fruits). Products containing animal or seafood ingredients are not eligible.')}
          </div>
        );

      case 2:
        return (
          <div className='space-y-6'>
            {sectionHeader('Business & Legal Readiness', '')}
            {topExplanation('Legal registration and traceability are minimum expectations for export trade. This section checks if your business legally exists and can be traced.')}
            {explanationList([
              { term: 'Business registered', detail: 'Your business is officially registered with your government (for example, CAC registration in Nigeria).' },
              { term: 'Registration documents', detail: 'Official papers that prove your business is registered, such as a Certificate of Incorporation.' },
              { term: 'Tax identification number', detail: 'A number issued by tax authorities to identify your business.' },
              { term: 'Fixed production location', detail: 'A permanent place where production happens, such as a factory, warehouse, or processing centre.' },
            ])}
            <div>
              <Label className='text-black mb-3 block'>Is your business legally registered in your country of operation?</Label>
              <YesNoButton value={(formData.businessRegistered as 'yes' | 'no') || ''} onValueChange={(v) => set('businessRegistered', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Do you have official business registration documents (for example, Certificate of Incorporation)?</Label>
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
            {sectionHeader('Product Definition & Consistency', '')}
            {topExplanation('Buyers and regulators require clear and consistent product information. This section checks whether your product is clearly defined and consistent.')}
            {explanationList([
              { term: 'Clearly defined product', detail: "You can clearly describe what you sell (for example, 'Dried ginger powder, 25kg bags')." },
              { term: 'Ingredient consistency', detail: 'Ingredients do not change from one batch to another.' },
              { term: 'Documented ingredient list', detail: 'A written list of all ingredients used.' },
              { term: 'Ingredient origin', detail: 'You know where raw materials come from (for example, ginger sourced from Kaduna State).' },
            ])}
            <div>
              <Label className='text-black mb-3 block'>Do you have clearly defined products intended for export (product type, form, and pack size)?</Label>
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
              <Label className='text-black mb-3 block'>Do you know the origin of all raw ingredients (farm, region, or country)?</Label>
              <YesNoButton value={(formData.ingredientOriginKnown as 'yes' | 'no') || ''} onValueChange={(v) => set('ingredientOriginKnown', v)} />
            </div>
            {note('Inconsistent ingredients or unclear origins are common reasons for buyer rejection.')}
          </div>
        );

      case 4:
        return (
          <div className='space-y-6'>
            {sectionHeader('Product Traceability', '')}
            {topExplanation('This section checks if your product can be traced through the supply chain. Traceability is required under UK/EU food law. Simple records are acceptable.')}
            {explanationList([
              { term: 'Trace raw materials', detail: 'Ability to identify where raw materials came from.' },
              { term: 'Batch or lot numbers', detail: 'Codes used to identify specific production batches.' },
              { term: 'One step back, one step forward', detail: 'You know who supplied you and who you sold to.' },
            ])}
            <div>
              <Label className='text-black mb-3 block'>Do you trace products from raw materials to finished goods?</Label>
              <YesNoButton value={(formData.traceRawToFinished as 'yes' | 'no') || ''} onValueChange={(v) => set('traceRawToFinished', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Can you identify raw material suppliers?</Label>
              <YesNoButton value={(formData.identifySuppliers as 'yes' | 'no') || ''} onValueChange={(v) => set('identifySuppliers', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Do you use batch or lot numbers?</Label>
              <YesNoButton value={(formData.batchLotNumbers as 'yes' | 'no') || ''} onValueChange={(v) => set('batchLotNumbers', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Can you trace one step back and one step forward?</Label>
              <YesNoButton value={(formData.traceOneStepBackForward as 'yes' | 'no') || ''} onValueChange={(v) => set('traceOneStepBackForward', v)} />
            </div>
            {note('Traceability is required under UK/EU food law. Simple records are acceptable.')}
          </div>
        );

      case 5:
        return (
          <div className='space-y-6'>
            {sectionHeader('Food Safety & Quality Management', '')}
            {topExplanation('Food safety is a core requirement for UK and EU markets.')}
            {explanationList([
              { term: 'HACCP', detail: 'A food safety system that identifies risks during production and sets controls to prevent unsafe food.' },
              { term: 'GMP', detail: 'Basic rules that ensure food is produced in a clean, controlled, and consistent environment.' },
              { term: 'ISO 22000', detail: 'An international standard for managing food safety across production.' },
              { term: 'FSSC 22000', detail: 'A globally recognised food safety certification, often required by large buyers and retailers.' },
              { term: 'Organic', detail: 'A certification showing production without synthetic chemicals or GMOs under approved standards.' },
            ])}
            <div>
              <Label className='text-black mb-3 block'>Do you follow a documented HACCP-based food safety process?</Label>
              <YesNoButton value={(formData.haccpProcess as 'yes' | 'no') || ''} onValueChange={(v) => set('haccpProcess', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Have you submitted HACCP certification separately?</Label>
              <YesNoButton value={(formData.haccpCertification as 'yes' | 'no') || ''} onValueChange={(v) => set('haccpCertification', v)} />
            </div>
            <div>
              <Label className='text-black mb-3 block'>Have you submitted ISO 22000/FSSC 22000 certification separately?</Label>
              <YesNoButton value={(formData.isoCertification as 'yes' | 'no') || ''} onValueChange={(v) => set('isoCertification', v)} />
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

      case 6:
        return (
          <div className='space-y-6'>
            {sectionHeader('Production Capacity & Scalability', '')}
            {topExplanation('Buyers need confidence that supply can be delivered reliably. This section checks your ability to supply consistent volumes.')}
            {explanationList([
              { term: 'Monthly production capacity', detail: 'How much you can produce in one month. Example: 2 tonnes per month.' },
              { term: 'Consistent specifications', detail: 'Product quality remains the same each time.' },
              { term: 'Ability to scale', detail: 'You can increase production if demand grows.' },
              { term: 'Output tracking', detail: 'Keeping records of production quantities.' },
            ])}
            <div>
              <Label className='text-black mb-2 block'>Current monthly production capacity (how much you produce each month)</Label>
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

      case 7:
        return (
          <div className='space-y-6'>
            {sectionHeader('Packaging Readiness', '')}
            {topExplanation('Packaging must protect products during international transport. This section checks whether packaging protects products during export transit and handling.')}
            {explanationList([
              { term: 'Export packaging', detail: 'Packaging that is strong enough for long-distance shipping.' },
              { term: 'Packaging materials', detail: 'Knowing the materials used in your packaging.' },
              { term: 'Bulk or retail formats', detail: 'Large bags for wholesale buyers or smaller packs for retail buyers.' },
            ])}
            <div>
              <Label className='text-black mb-3 block'>Are products packaged for export (not local retail only)?</Label>
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

      case 8:
        return (
          <div className='space-y-6'>
            {sectionHeader('Labelling Compliance', '')}
            {topExplanation('Incorrect labelling is a common cause of shipment delays or rejection. This section checks whether labels meet legal requirements for UK/EU markets.')}
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

      case 9:
        return (
          <div className='space-y-6'>
            {sectionHeader('Shelf Life & Stability', '')}
            {topExplanation('Shelf life data is essential for international trade. This section checks shelf life knowledge and validation for your products.')}
            {explanationList([
              { term: 'Shelf life', detail: 'How long the product remains safe and usable.' },
              { term: 'Shelf life testing', detail: 'Tests used to prove your shelf life claim.' },
              { term: 'Storage conditions', detail: "Instructions such as 'store in a cool, dry place'." },
            ])}
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

      case 10:
        return (
          <div className='space-y-6'>
            {sectionHeader('Documentation Readiness', '')}
            {topExplanation('Documents support customs clearance and buyer confidence. This section checks availability of key export documents.')}
            {explanationList([
              { term: 'Certificate of Analysis (COA)', detail: 'Lab report confirming safety/quality parameters.' },
              { term: 'Product specification sheet', detail: 'Document describing product details and limits.' },
              { term: 'Packing list', detail: 'Document listing the contents of the shipment.' },
              { term: 'Export licence', detail: 'Government permission required for some products/markets.' },
            ])}
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

      case 11:
        return (
          <div className='space-y-6'>
            {sectionHeader('Logistics & Export Understanding', '')}
            {topExplanation('This section checks understanding of shipping terms and basic export logistics readiness.')}
            {explanationList([
              { term: 'FOB', detail: 'Seller responsibility ends at the export port after goods are loaded.' },
              { term: 'CIF', detail: 'Seller covers shipping and insurance to destination.' },
              { term: 'Lead time', detail: 'Time from order confirmation to shipment.' },
            ])}
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

      case 12:
        return (
          <div className='space-y-6'>
            {sectionHeader('Financial & Trade Readiness', '')}
            {topExplanation('This section checks your ability to transact internationally.')}
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

      case 13:
        return (
          <div className='space-y-6'>
            {sectionHeader('Compliance Confirmation', '')}
            {topExplanation('This section confirms accuracy and commitment to UK/EU export rules.')}
            <label className='flex items-start gap-3 cursor-pointer'>
              <input
                type='checkbox'
                checked={formData.confirmAccuracy === 'yes'}
                onChange={(e) => set('confirmAccuracy', e.target.checked ? 'yes' : 'no')}
                className='mt-1 h-5 w-5 rounded border-gray-300 text-orange focus:ring-orange accent-orange cursor-pointer'
              />
              <span className={`text-sm text-black ${josefinRegular.className}`}>
                I confirm the information provided is accurate.
              </span>
            </label>
            <label className='flex items-start gap-3 cursor-pointer'>
              <input
                type='checkbox'
                checked={formData.agreeCompliance === 'yes'}
                onChange={(e) => set('agreeCompliance', e.target.checked ? 'yes' : 'no')}
                className='mt-1 h-5 w-5 rounded border-gray-300 text-orange focus:ring-orange accent-orange cursor-pointer'
              />
              <span className={`text-sm text-black ${josefinRegular.className}`}>
                I agree to meet UK/EU compliance requirements before trade.
              </span>
            </label>
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
          <button onClick={handleNext}
            disabled={saving || (currentStep === TOTAL_STEPS && (formData.confirmAccuracy !== 'yes' || formData.agreeCompliance !== 'yes'))}
            className={`px-6 py-3 rounded-lg bg-black text-white font-semibold transition-all hover:bg-orange flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${josefinSemiBold.className}`}>
            {saving ? 'Saving...' : currentStep === TOTAL_STEPS ? 'Complete Assessment' : 'Next'}
            {currentStep !== TOTAL_STEPS && !saving && <ChevronRight className='w-4 h-4' />}
          </button>
        </div>
      </div>
    </section>
  );
}
