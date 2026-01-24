'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { titleFont, josefinRegular, josefinSemiBold } from '@/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { YesNoButton } from '@/components/ui/yes-no-button';
import { useAuth } from '@/contexts/AuthContext';
import { assessmentAPI } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

const TOTAL_STEPS = 7;
const STEPS = [
  { id: 'country', label: 'Country' },
  { id: 'business', label: 'Business Legitimacy' },
  { id: 'food-safety', label: 'Food Safety & Compliance' },
  { id: 'packaging', label: 'Packaging & Labelling' },
  { id: 'production', label: 'Production & Capacity' },
  { id: 'commercial', label: 'Pricing & Commercial' },
  { id: 'logistics', label: 'Logistics Readiness' },
];

const COUNTRIES = [
  'Ghana',
  'Nigeria',
  'Kenya',
  'South Africa',
  'Ethiopia',
  'Tanzania',
  'Uganda',
  'Senegal',
  'Ivory Coast',
  'Cameroon',
  'Other',
];

export default function AssessmentForm() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [scrollPosition, setScrollPosition] = useState(0);
  const [saving, setSaving] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/export-readiness/assessment');
    }
  }, [isAuthenticated, authLoading, router]);

  // Load existing assessment data
  useEffect(() => {
    if (isAuthenticated) {
      loadAssessment();
    }
  }, [isAuthenticated]);

  const loadAssessment = async () => {
    try {
      const response = await assessmentAPI.getAssessment();
      if (response.success && response.data) {
        // Remove userId and other non-form fields
        const { userId, documents, checklistState, createdAt, updatedAt, _id, __v, ...data } = response.data;
        setFormData(data);
      }
    } catch (error) {
      // Assessment doesn't exist yet, that's fine
      console.log('No existing assessment found');
    }
  };

  // Auto-save as user fills form
  useEffect(() => {
    if (isAuthenticated && Object.keys(formData).length > 0) {
      const timeoutId = setTimeout(() => {
        saveAssessment();
      }, 1000); // Debounce: save 1 second after last change

      return () => clearTimeout(timeoutId);
    }
  }, [formData, isAuthenticated]);

  // Check if a step is completed based on form data
  const isStepCompleted = (stepNumber: number, data: Record<string, any>): boolean => {
    switch (stepNumber) {
      case 1:
        return !!data.country;
      case 2:
        return (
          data.businessRegistered !== undefined &&
          data.exportLicense !== undefined &&
          data.yearsInBusiness !== undefined
        );
      case 3:
        return (
          data.haccpCertification !== undefined &&
          data.accreditedLabTesting !== undefined &&
          data.certificateOfAnalysis !== undefined &&
          data.localFoodAgencyRegistration !== undefined &&
          data.isoCertification !== undefined
        );
      case 4:
        return (
          data.allergenDeclarations !== undefined &&
          data.nutritionPanel !== undefined &&
          data.labelsInEnglish !== undefined &&
          data.barcodes !== undefined &&
          data.shelfLifeInfo !== undefined
        );
      case 5:
        return (
          data.monthlyProductionCapacity !== undefined &&
          data.consistentSupply !== undefined &&
          data.qualityControlProcesses !== undefined
        );
      case 6:
        return (
          data.exportPricing !== undefined &&
          data.paymentTerms !== undefined &&
          data.samplePolicy !== undefined
        );
      case 7:
        return (
          data.exportGradeCartons !== undefined &&
          data.palletiseShipments !== undefined &&
          data.deliverToUK !== undefined
        );
      default:
        // For other steps, mark as completed if they have any data
        const stepKey = STEPS[stepNumber - 1]?.id;
        return stepKey ? !!data[stepKey] : false;
    }
  };

  // Update completed steps when form data changes
  useEffect(() => {
    const newCompletedSteps = new Set<number>();
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      if (isStepCompleted(i, formData)) {
        newCompletedSteps.add(i);
      }
    }
    setCompletedSteps(newCompletedSteps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  // Calculate progress based on completed steps
  const completedCount = completedSteps.size;
  const progress = (completedCount / TOTAL_STEPS) * 100;

  const saveAssessment = async () => {
    if (!isAuthenticated) return;
    
    try {
      await assessmentAPI.saveAssessment(formData);
    } catch (error: any) {
      console.error('Failed to save assessment:', error);
      // Don't show toast for auto-save errors to avoid spam
    }
  };

  const handleNext = async () => {
    if (currentStep < TOTAL_STEPS) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      // Scroll active tab into view
      setTimeout(() => scrollToActiveTab(nextStep), 100);
    } else if (currentStep === TOTAL_STEPS) {
      // Save assessment data to API
      setSaving(true);
      try {
        await assessmentAPI.saveAssessment(formData);
        toast({
          title: 'Success!',
          description: 'Your assessment has been saved.',
        });
        // Redirect to dashboard
        router.push('/export-readiness/dashboard');
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to save assessment. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      // Scroll active tab into view
      setTimeout(() => scrollToActiveTab(prevStep), 100);
    }
  };

  const scrollToActiveTab = (stepNumber: number) => {
    const tabsContainer = document.getElementById('tabs-container');
    const activeTab = document.getElementById(`tab-${stepNumber}`);
    if (tabsContainer && activeTab) {
      const containerRect = tabsContainer.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();
      const scrollLeft = tabsContainer.scrollLeft;
      const tabLeft = tabRect.left - containerRect.left + scrollLeft;
      const tabRight = tabLeft + tabRect.width;
      const containerWidth = tabsContainer.clientWidth;

      if (tabLeft < scrollLeft) {
        // Tab is to the left of visible area
        tabsContainer.scrollTo({ left: tabLeft - 20, behavior: 'smooth' });
      } else if (tabRight > scrollLeft + containerWidth) {
        // Tab is to the right of visible area
        tabsContainer.scrollTo({ left: tabRight - containerWidth + 20, behavior: 'smooth' });
      }
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTabClick = (stepIndex: number) => {
    const newStep = stepIndex + 1;
    setCurrentStep(newStep);
    setTimeout(() => scrollToActiveTab(newStep), 100);
  };

  // Scroll to active tab when step changes
  useEffect(() => {
    scrollToActiveTab(currentStep);
  }, [currentStep]);

  const handleScroll = (direction: 'left' | 'right') => {
    const scrollAmount = 200;
    const tabsContainer = document.getElementById('tabs-container');
    if (tabsContainer) {
      const newPosition = direction === 'left' ? scrollPosition - scrollAmount : scrollPosition + scrollAmount;
      setScrollPosition(Math.max(0, Math.min(newPosition, tabsContainer.scrollWidth - tabsContainer.clientWidth)));
      tabsContainer.scrollTo({ left: newPosition, behavior: 'smooth' });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className='space-y-6'>
            <div>
              <h2 className={`text-3xl md:text-4xl font-bold text-black mb-2 ${titleFont.className}`}>Country</h2>
              <p className={`text-base text-black-muted mb-6 ${josefinRegular.className}`}>
                Select your country of operation
              </p>
            </div>
            <div>
              <Label htmlFor='country' className='text-black mb-2 block'>
                Select your country
              </Label>
              <select
                id='country'
                name='country'
                value={formData.country || ''}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className='flex h-10 w-full rounded-md border border-black bg-white px-3 py-2 text-black text-sm ring-offset-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'>
                <option value=''>Select a country</option>
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              <p className={`text-sm text-black-muted mt-2 ${josefinRegular.className}`}>
                Country selection enables tailored recommendations for local regulatory authorities and export agencies.
              </p>
            </div>
          </div>
        );
      case 2:
        return (
          <div className='space-y-6'>
            <div>
              <h2 className={`text-3xl md:text-4xl font-bold text-black mb-2 ${titleFont.className}`}>
                Business Legitimacy
              </h2>
              <p className={`text-base text-black-muted mb-6 ${josefinRegular.className}`}>
                Company registration and export credentials.
              </p>
            </div>
            <div className='space-y-6'>
              <div>
                <Label className='text-black mb-3 block'>Is your business officially registered?</Label>
                <RadioGroup
                  value={formData.businessRegistered || ''}
                  onValueChange={(value) => handleInputChange('businessRegistered', value)}
                  className='flex gap-6'>
                  <div className='flex items-center space-x-2 cursor-pointer'>
                    <RadioGroupItem value='yes' id='registered-yes' />
                    <Label htmlFor='registered-yes' className='cursor-pointer'>
                      Yes
                    </Label>
                  </div>
                  <div className='flex items-center space-x-2 cursor-pointer'>
                    <RadioGroupItem value='no' id='registered-no' />
                    <Label htmlFor='registered-no' className='cursor-pointer'>
                      No
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label className='text-black mb-3 block'>Do you have an export license?</Label>
                <RadioGroup
                  value={formData.exportLicense || ''}
                  onValueChange={(value) => handleInputChange('exportLicense', value)}
                  className='flex gap-6'>
                  <div className='flex items-center space-x-2 cursor-pointer'>
                    <RadioGroupItem value='yes' id='license-yes' />
                    <Label htmlFor='license-yes' className='cursor-pointer'>
                      Yes
                    </Label>
                  </div>
                  <div className='flex items-center space-x-2 cursor-pointer'>
                    <RadioGroupItem value='no' id='license-no' />
                    <Label htmlFor='license-no' className='cursor-pointer'>
                      No
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label htmlFor='yearsInBusiness' className='text-black mb-2 block'>
                  Years in business
                </Label>
                <select
                  id='yearsInBusiness'
                  name='yearsInBusiness'
                  value={formData.yearsInBusiness || ''}
                  onChange={(e) => handleInputChange('yearsInBusiness', e.target.value)}
                  className='flex h-10 w-full rounded-md border border-black bg-white px-3 py-2 text-black text-sm ring-offset-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'>
                  <option value=''>Select years</option>
                  <option value='less-than-1'>Less than 1 year</option>
                  <option value='1-2'>1-2 years</option>
                  <option value='3-5'>3-5 years</option>
                  <option value='5-plus'>5+ years</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className='space-y-6'>
            <div>
              <h2 className={`text-3xl md:text-4xl font-bold text-black mb-2 ${titleFont.className}`}>
                Food Safety & Compliance
              </h2>
              <p className={`text-base text-black-muted mb-6 ${josefinRegular.className}`}>
                Certifications and quality standards.
              </p>
            </div>
            <div className='space-y-6'>
              <div>
                <Label className='text-black mb-3 block'>Do you have HACCP certification?</Label>
                <YesNoButton
                  value={(formData.haccpCertification as 'yes' | 'no') || ''}
                  onValueChange={(value) => handleInputChange('haccpCertification', value)}
                />
              </div>
              <div>
                <Label className='text-black mb-3 block'>Have you completed accredited lab testing?</Label>
                <YesNoButton
                  value={(formData.accreditedLabTesting as 'yes' | 'no') || ''}
                  onValueChange={(value) => handleInputChange('accreditedLabTesting', value)}
                />
              </div>
              <div>
                <Label className='text-black mb-3 block'>Do you have a Certificate of Analysis (COA)?</Label>
                <YesNoButton
                  value={(formData.certificateOfAnalysis as 'yes' | 'no') || ''}
                  onValueChange={(value) => handleInputChange('certificateOfAnalysis', value)}
                />
              </div>
              <div>
                <Label className='text-black mb-3 block'>Do you have local food agency registration?</Label>
                <YesNoButton
                  value={(formData.localFoodAgencyRegistration as 'yes' | 'no') || ''}
                  onValueChange={(value) => handleInputChange('localFoodAgencyRegistration', value)}
                />
              </div>
              <div>
                <Label className='text-black mb-3 block'>Do you have ISO certification?</Label>
                <YesNoButton
                  value={(formData.isoCertification as 'yes' | 'no') || ''}
                  onValueChange={(value) => handleInputChange('isoCertification', value)}
                />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className='space-y-6'>
            <div>
              <h2 className={`text-3xl md:text-4xl font-bold text-black mb-2 ${titleFont.className}`}>
                Packaging & Labelling
              </h2>
              <p className={`text-base text-black-muted mb-6 ${josefinRegular.className}`}>
                UK/EU compliant packaging requirements.
              </p>
            </div>
            <div className='space-y-6'>
              <div>
                <Label className='text-black mb-3 block'>Does your packaging include allergen declarations?</Label>
                <YesNoButton
                  value={(formData.allergenDeclarations as 'yes' | 'no') || ''}
                  onValueChange={(value) => handleInputChange('allergenDeclarations', value)}
                />
              </div>
              <div>
                <Label className='text-black mb-3 block'>
                  Does your packaging have a UK/EU-compliant nutrition panel?
                </Label>
                <YesNoButton
                  value={(formData.nutritionPanel as 'yes' | 'no') || ''}
                  onValueChange={(value) => handleInputChange('nutritionPanel', value)}
                />
              </div>
              <div>
                <Label className='text-black mb-3 block'>Are your labels in English?</Label>
                <YesNoButton
                  value={(formData.labelsInEnglish as 'yes' | 'no') || ''}
                  onValueChange={(value) => handleInputChange('labelsInEnglish', value)}
                />
              </div>
              <div>
                <Label className='text-black mb-3 block'>Do your products have barcodes (EAN/UPC)?</Label>
                <YesNoButton
                  value={(formData.barcodes as 'yes' | 'no') || ''}
                  onValueChange={(value) => handleInputChange('barcodes', value)}
                />
              </div>
              <div>
                <Label className='text-black mb-3 block'>
                  Does packaging include shelf life and storage information?
                </Label>
                <YesNoButton
                  value={(formData.shelfLifeInfo as 'yes' | 'no') || ''}
                  onValueChange={(value) => handleInputChange('shelfLifeInfo', value)}
                />
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className='space-y-6'>
            <div>
              <h2 className={`text-3xl md:text-4xl font-bold text-black mb-2 ${titleFont.className}`}>
                Production & Capacity
              </h2>
              <p className={`text-base text-black-muted mb-6 ${josefinRegular.className}`}>
                Manufacturing capabilities.
              </p>
            </div>
            <div className='space-y-6'>
              <div>
                <Label htmlFor='monthlyProductionCapacity' className='text-black mb-2 block'>
                  Monthly production capacity (kg)
                </Label>
                <select
                  id='monthlyProductionCapacity'
                  name='monthlyProductionCapacity'
                  value={formData.monthlyProductionCapacity || ''}
                  onChange={(e) => handleInputChange('monthlyProductionCapacity', e.target.value)}
                  className='flex h-10 w-full rounded-md border border-black bg-white px-3 py-2 text-black text-sm ring-offset-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'>
                  <option value=''>Select capacity</option>
                  <option value='less-than-1000'>Less than 1,000 kg</option>
                  <option value='1000-5000'>1,000 - 5,000 kg</option>
                  <option value='5000-10000'>5,000 - 10,000 kg</option>
                  <option value='10000-50000'>10,000 - 50,000 kg</option>
                  <option value='50000-plus'>50,000+ kg</option>
                </select>
              </div>
              <div>
                <Label className='text-black mb-3 block'>
                  Can you maintain consistent supply throughout the year?
                </Label>
                <YesNoButton
                  value={(formData.consistentSupply as 'yes' | 'no') || ''}
                  onValueChange={(value) => handleInputChange('consistentSupply', value)}
                />
              </div>
              <div>
                <Label className='text-black mb-3 block'>Do you have quality control processes in place?</Label>
                <YesNoButton
                  value={(formData.qualityControlProcesses as 'yes' | 'no') || ''}
                  onValueChange={(value) => handleInputChange('qualityControlProcesses', value)}
                />
              </div>
            </div>
          </div>
        );
      case 6:
        return (
          <div className='space-y-6'>
            <div>
              <h2 className={`text-3xl md:text-4xl font-bold text-black mb-2 ${titleFont.className}`}>
                Pricing & Commercial
              </h2>
              <p className={`text-base text-black-muted mb-6 ${josefinRegular.className}`}>
                Export pricing and terms.
              </p>
            </div>
            <div className='space-y-6'>
              <div>
                <Label className='text-black mb-3 block'>
                  Do you have export pricing established (FOB, CIF, etc.)?
                </Label>
                <YesNoButton
                  value={(formData.exportPricing as 'yes' | 'no') || ''}
                  onValueChange={(value) => handleInputChange('exportPricing', value)}
                />
              </div>
              <div>
                <Label className='text-black mb-3 block'>
                  Have you established payment terms for export orders?
                </Label>
                <YesNoButton
                  value={(formData.paymentTerms as 'yes' | 'no') || ''}
                  onValueChange={(value) => handleInputChange('paymentTerms', value)}
                />
              </div>
              <div>
                <Label className='text-black mb-3 block'>Do you have a sample policy for potential buyers?</Label>
                <YesNoButton
                  value={(formData.samplePolicy as 'yes' | 'no') || ''}
                  onValueChange={(value) => handleInputChange('samplePolicy', value)}
                />
              </div>
            </div>
          </div>
        );
      case 7:
        return (
          <div className='space-y-6'>
            <div>
              <h2 className={`text-3xl md:text-4xl font-bold text-black mb-2 ${titleFont.className}`}>
                Logistics Readiness
              </h2>
              <p className={`text-base text-black-muted mb-6 ${josefinRegular.className}`}>
                Shipping and delivery capabilities.
              </p>
            </div>
            <div className='space-y-6'>
              <div>
                <Label className='text-black mb-3 block'>Do you have export-grade cartons/packaging?</Label>
                <YesNoButton
                  value={(formData.exportGradeCartons as 'yes' | 'no') || ''}
                  onValueChange={(value) => handleInputChange('exportGradeCartons', value)}
                />
              </div>
              <div>
                <Label className='text-black mb-3 block'>Can you palletise shipments to EU/UK standards?</Label>
                <YesNoButton
                  value={(formData.palletiseShipments as 'yes' | 'no') || ''}
                  onValueChange={(value) => handleInputChange('palletiseShipments', value)}
                />
              </div>
              <div>
                <Label className='text-black mb-3 block'>Can you deliver products directly to UK?</Label>
                <YesNoButton
                  value={(formData.deliverToUK as 'yes' | 'no') || ''}
                  onValueChange={(value) => handleInputChange('deliverToUK', value)}
                />
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className='space-y-6'>
            <div>
              <h2 className={`text-3xl md:text-4xl font-bold text-black mb-2 ${titleFont.className}`}>
                {STEPS[currentStep - 1].label}
              </h2>
              <p className={`text-base text-black-muted mb-6 ${josefinRegular.className}`}>
                This section is coming soon. Please continue to the next step.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <section className='bg-cream pt-16 lg:pt-28 pb-16 lg:pb-24 min-h-screen'>
      <div className='spacing container mx-auto max-w-4xl'>
        {/* Title and Subtitle */}
        <div className='mb-8'>
          <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-3 ${titleFont.className}`}>
            Export Readiness Assessment
          </h1>
          <p className={`text-base md:text-lg text-black-muted ${josefinRegular.className}`}>
            Complete this assessment to receive your score and a country-tailored action plan.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className='mb-8'>
          <div className='flex justify-between items-center mb-2'>
            <span className={`text-sm text-black-muted ${josefinRegular.className}`}>
              Step {currentStep} of {TOTAL_STEPS}
            </span>
            <span className={`text-sm text-black-muted ${josefinRegular.className}`}>
              {Math.round(progress)}% complete
            </span>
          </div>
          <div className='w-full h-2 bg-gray-200 rounded-full overflow-hidden'>
            <div
              className='h-full bg-orange transition-all duration-300 ease-out'
              style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        {/* Assessment Section Navigation */}
        <div className='mb-8 relative'>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => handleScroll('left')}
              className='p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0'
              aria-label='Scroll left'>
              <ChevronLeft className='w-5 h-5 text-black' />
            </button>
            <div
              id='tabs-container'
              className='flex-1 overflow-x-auto scrollbar-hide flex gap-2 pb-2'
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {STEPS.map((step, index) => {
                const stepNumber = index + 1;
                const isActive = currentStep === stepNumber;
                const isCompleted = completedSteps.has(stepNumber);
                return (
                  <button
                    key={step.id}
                    id={`tab-${stepNumber}`}
                    onClick={() => handleTabClick(index)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-2 ${
                      isActive
                        ? 'bg-black text-white'
                        : isCompleted
                          ? 'bg-orange/20 text-black border border-orange'
                          : 'bg-gray-100 text-black-muted hover:bg-gray-200'
                    } ${josefinSemiBold.className}`}>
                    {isCompleted && !isActive && <Check className='w-4 h-4 text-orange' />}
                    {step.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => handleScroll('right')}
              className='p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0'
              aria-label='Scroll right'>
              <ChevronRight className='w-5 h-5 text-black' />
            </button>
          </div>
          {/* Scroll Indicator */}
          <div className='mt-2 h-1 bg-gray-200 rounded-full overflow-hidden'>
            <div
              className='h-full bg-black-muted transition-all duration-300'
              style={{
                width: `${(currentStep / STEPS.length) * 100}%`,
              }}></div>
          </div>
        </div>

        {/* Form Content */}
        <div className='bg-white rounded-lg p-6 lg:p-8 shadow-sm border border-gray-100 mb-8'>
          {renderStepContent()}
        </div>

        {/* Action Buttons */}
        <div className='flex justify-between items-center'>
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`px-6 py-3 rounded-lg border-2 border-gray-300 bg-white text-black-muted font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center gap-2 ${
              currentStep === 1 ? '' : ''
            } ${josefinSemiBold.className}`}>
            <ChevronLeft className='w-4 h-4' />
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={saving}
            className={`px-6 py-3 rounded-lg bg-black text-white font-semibold transition-all hover:bg-orange flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${josefinSemiBold.className}`}>
            {saving ? 'Saving...' : currentStep === TOTAL_STEPS ? 'Complete Assessment' : 'Next'}
            {currentStep !== TOTAL_STEPS && !saving && <ChevronRight className='w-4 h-4' />}
          </button>
        </div>
      </div>
    </section>
  );
}

