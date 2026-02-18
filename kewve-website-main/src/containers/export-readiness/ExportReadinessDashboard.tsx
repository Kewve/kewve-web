'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  AlertTriangle,
  Upload,
  Briefcase,
  ChefHat,
  Package,
  Factory,
  DollarSign,
  ArrowRight,
  X,
  File,
} from 'lucide-react';
import { titleFont, josefinRegular, josefinSemiBold } from '@/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { assessmentAPI } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

interface AssessmentData {
  [key: string]: any;
}

interface CategoryScore {
  name: string;
  score: number;
  maxScore: number;
  icon: React.ReactNode;
}

interface ActionItem {
  title: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  steps: string[];
}

interface ChecklistState {
  [itemId: string]: {
    completed: boolean;
    steps: { [stepIndex: number]: boolean };
  };
}

export default function ExportReadinessDashboard() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [checklistState, setChecklistState] = useState<ChecklistState>({});
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/dashboard/export-readiness');
    }
  }, [isAuthenticated, authLoading, router]);

  // Load assessment data from API
  useEffect(() => {
    if (isAuthenticated) {
      loadAssessment();
    }
  }, [isAuthenticated]);

  const loadAssessment = async () => {
    setLoading(true);
    try {
      const response = await assessmentAPI.getAssessment();
      if (response.success && response.data) {
        // Extract form data
        const { userId, documents: savedDocuments, checklistState: savedChecklist, createdAt, updatedAt, _id, __v, ...data } = response.data;
        setAssessmentData(data as AssessmentData);
        
        // Load documents
        if (savedDocuments && Array.isArray(savedDocuments) && savedDocuments.length > 0) {
          setDocuments(savedDocuments);
        } else {
          setDocuments([]);
        }
        
        // Load checklist state
        if (savedChecklist) {
          setChecklistState(savedChecklist);
        }
      } else {
        // No assessment found, redirect to assessment
        router.push('/export-readiness/assessment');
      }
    } catch (error: any) {
      if (error.message.includes('404') || error.message.includes('not found')) {
        // Assessment doesn't exist, redirect to assessment
        router.push('/export-readiness/assessment');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load assessment. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading || !assessmentData) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <p className={josefinRegular.className}>Loading dashboard...</p>
      </div>
    );
  }

  // Calculate scores based on new rubric (total 100)
  const calculateScores = (data: AssessmentData): CategoryScore[] => {
    const yes = (field: string) => data[field] === 'yes';

    // Core Eligibility & Fundamentals (30 pts)
    let core = 0;
    // Export Context (10)
    if (data.country) core += 3;
    if (data.exportDestination) core += 3;
    if (yes('plantBasedConfirmation')) core += 4;
    // Business & Legal (10)
    if (yes('businessRegistered')) core += 3;
    if (yes('businessDocuments')) core += 2;
    if (yes('taxId')) core += 2;
    if (yes('fixedLocation')) core += 3;
    // Product Definition (5)
    if (yes('definedProducts')) core += 2;
    if (yes('consistentIngredients')) core += 1;
    if (yes('documentedIngredientList')) core += 1;
    if (yes('ingredientOriginKnown')) core += 1;
    // Basic Food Safety Awareness (5)
    if (yes('haccpProcess')) core += 3;
    if (yes('documentedProcedures')) core += 2;

    // Food Safety & Quality (25 pts)
    let foodSafety = 0;
    const certs: string[] = data.certifications || [];
    if (certs.includes('HACCP')) foodSafety += 5;
    if (certs.includes('GMP')) foodSafety += 2;
    if (certs.includes('ISO 22000') || certs.includes('FSSC 22000')) foodSafety += 3;
    if (certs.includes('Organic')) foodSafety += 2;
    if (yes('hygieneRecords')) foodSafety += 3;
    if (yes('certificateOfAnalysis')) foodSafety += 4;
    if (yes('accreditedLabTesting')) foodSafety += 3;
    if (yes('localFoodAgencyRegistration')) foodSafety += 3;

    // Packaging, Labelling & Shelf Life (20 pts)
    let packLabel = 0;
    // Packaging (5)
    if (yes('exportPackaging')) packLabel += 2;
    if (yes('internationalShipping')) packLabel += 2;
    if (yes('multipleFormats')) packLabel += 1;
    // Labelling (10)
    const labelFields = ['labelProductName','labelIngredients','labelAllergens','labelNetWeight','labelOrigin','labelStorage','labelBusinessDetails'];
    const labelYes = labelFields.filter((f) => yes(f)).length;
    packLabel += Math.min(Math.round((labelYes / 7) * 5), 5);
    if (yes('labelsInEnglish')) packLabel += 2;
    if (yes('allergenDeclarations')) packLabel += 1;
    if (yes('barcodes')) packLabel += 1;
    if (yes('shelfLifeInfo')) packLabel += 1;
    // Shelf Life (5)
    if (yes('knownShelfLife')) packLabel += 2;
    if (yes('shelfLifeTested')) packLabel += 2;
    if (yes('storageConditionsDefined')) packLabel += 1;

    // Capacity, Logistics & Trade Readiness (15 pts)
    let capLog = 0;
    // Capacity (7)
    if (data.monthlyProductionCapacity === '5000-plus') capLog += 3;
    else if (data.monthlyProductionCapacity === '1000-5000') capLog += 2;
    else if (data.monthlyProductionCapacity === '500-1000') capLog += 1;
    if (yes('consistentSupply')) capLog += 2;
    if (yes('scalableProduction')) capLog += 1;
    if (yes('qualityControlProcesses')) capLog += 1;
    // Logistics (8)
    if (yes('exportedBefore')) capLog += 3;
    if (yes('exportGradeCartons')) capLog += 3;
    if (yes('understandLogistics')) capLog += 2;

    // Financial Readiness & Documentation (10 pts)
    let financial = 0;
    if (yes('businessBankAccount')) financial += 2;
    if (yes('internationalPayments')) financial += 2;
    if (yes('exportPricing')) financial += 2;
    if (yes('paymentTerms')) financial += 2;
    if (yes('samplePolicy')) financial += 1;
    if (yes('canUploadCOA')) financial += 1;

    return [
      { name: 'Core Eligibility & Fundamentals', score: core, maxScore: 30, icon: <Briefcase className='w-5 h-5' /> },
      { name: 'Food Safety & Quality', score: foodSafety, maxScore: 25, icon: <ChefHat className='w-5 h-5' /> },
      { name: 'Packaging, Labelling & Shelf Life', score: packLabel, maxScore: 20, icon: <Package className='w-5 h-5' /> },
      { name: 'Capacity, Logistics & Trade', score: capLog, maxScore: 15, icon: <Factory className='w-5 h-5' /> },
      { name: 'Financial & Documentation', score: financial, maxScore: 10, icon: <DollarSign className='w-5 h-5' /> },
    ];
  };

  const categoryScores = calculateScores(assessmentData);
  const totalScore = categoryScores.reduce((sum, cat) => sum + cat.score, 0);
  const maxTotalScore = categoryScores.reduce((sum, cat) => sum + cat.maxScore, 0);
  const percentageScore = Math.round((totalScore / maxTotalScore) * 100);

  // Determine status (new bands: 0-39 Not Ready, 40-69 Nearly Ready, 70-100 Export Ready)
  const getStatus = () => {
    if (totalScore >= 70) {
      return { 
        label: 'Export Ready', 
        color: 'bg-green-600', 
        textColor: 'text-green-700', 
        bgColor: 'bg-green-100', 
        borderColor: 'border-green-300', 
        text: 'Ready for international trade',
        headline: 'You are export-ready for UK and/or EU trade.',
        subtitle: 'Your assessment shows that your business, products, and documentation meet the key requirements for UK and/or EU export. You are ready to move into structured trade preparation.',
        bullets: [
          'Your products meet export readiness standards.',
          'You may be eligible for supply aggregation.',
          'Your products can be considered for buyer sourcing requests.',
        ],
        nextLabel: 'Next steps on Kewve:',
        nextSteps: [
          'Ensure all product information and documents are up to date.',
          'Prepare for aggregation opportunities.',
          'Respond to buyer interest when notified.',
        ],
      };
    }
    if (totalScore >= 40) {
      return { 
        label: 'Nearly Ready', 
        color: 'bg-amber-500', 
        textColor: 'text-amber-700', 
        bgColor: 'bg-amber-100', 
        borderColor: 'border-amber-300', 
        text: 'Some areas need attention',
        headline: "You're close to being export-ready.",
        subtitle: 'Your assessment shows that you meet many of the core requirements for UK or EU export, but a small number of important gaps still need to be addressed before trade can begin.',
        bullets: [
          'Your business and products show strong export potential.',
          'Some compliance, documentation, or readiness items are still outstanding.',
          'Once these gaps are resolved, you may qualify for aggregation and buyer interest.',
        ],
        nextLabel: 'What you can do now on Kewve:',
        nextSteps: [
          'Complete your trade profile.',
          'Build and organise your product catalog.',
          'Upload available certifications and documents.',
          'Review your market-specific checklist for the UK, EU, or both.',
          'Track outstanding readiness items directly in your dashboard.',
        ],
      };
    }
    return { 
      label: 'Not Ready', 
      color: 'bg-red-600', 
      textColor: 'text-red-700', 
      bgColor: 'bg-red-100', 
      borderColor: 'border-red-300', 
      text: 'Major gaps to address',
      headline: "You're at the foundation stage of export readiness.",
      subtitle: 'Your assessment shows that some essential foundations for UK or EU export are not yet in place. This is a common starting point for many producers and does not reflect the quality or potential of your products.',
      bullets: [
        'Your business or product setup needs further preparation before export can begin.',
        'You are not yet ready to trade with UK or EU buyers.',
        'Your focus should be on building the core foundations required for export.',
      ],
      nextLabel: 'Next steps on Kewve:',
      nextSteps: [
        'Review your readiness snapshot and key gaps.',
        'Work through the foundational checklist provided.',
        'Save your progress and return when improvements are complete.',
        'You can retake the assessment at any time.',
      ],
    };
  };

  const status = getStatus();
  const isEligible = totalScore >= 70 && assessmentData.haccpProcess === 'yes' && assessmentData.labelsInEnglish === 'yes';

  // Generate action items based on gaps
  const getActionItems = (): ActionItem[] => {
    if (!assessmentData) return [];
    const items: ActionItem[] = [];

    if (assessmentData.haccpProcess !== 'yes') {
      items.push({
        title: 'Implement HACCP-based food safety process',
        category: 'Food Safety',
        priority: 'High',
        steps: [
          'Identify accredited HACCP certification body',
          'Document all food safety procedures',
          'Complete internal HACCP audit',
          'Upload HACCP certification evidence',
        ],
      });
    }

    if (assessmentData.accreditedLabTesting !== 'yes' || assessmentData.certificateOfAnalysis !== 'yes') {
      items.push({
        title: 'Complete accredited lab testing and obtain COA',
        category: 'Food Safety',
        priority: 'High',
        steps: [
          'Identify accredited testing laboratory',
          'Collect product samples for testing',
          'Submit samples to laboratory',
          'Upload Certificate of Analysis (COA)',
        ],
      });
    }

    if (assessmentData.businessRegistered !== 'yes' || assessmentData.businessDocuments !== 'yes') {
      items.push({
        title: 'Complete business registration and documentation',
        category: 'Business & Legal',
        priority: 'High',
        steps: [
          'Register business with relevant authority',
          'Obtain official registration documents',
          'Obtain tax identification number',
        ],
      });
    }

    if (assessmentData.labelsInEnglish !== 'yes' || assessmentData.allergenDeclarations !== 'yes') {
      items.push({
        title: 'Update product labels to UK/EU compliance',
        category: 'Labelling',
        priority: 'High',
        steps: [
          'Ensure all labels are in English',
          'Add allergen declarations',
          'Include all required label elements',
          'Add barcodes (EAN/UPC)',
        ],
      });
    }

    if (assessmentData.exportPackaging !== 'yes') {
      items.push({
        title: 'Prepare export-grade packaging',
        category: 'Packaging',
        priority: 'Medium',
        steps: [
          'Source export-grade packaging materials',
          'Ensure packaging is suitable for international shipping',
          'Consider multiple format options (bulk/retail)',
        ],
      });
    }

    if (assessmentData.exportGradeCartons !== 'yes') {
      items.push({
        title: 'Source export cartons and develop logistics plan',
        category: 'Logistics',
        priority: 'Medium',
        steps: [
          'Identify export-grade carton suppliers',
          'Develop palletisation plan',
          'Understand FOB/CIF terms',
          'Establish realistic lead times',
        ],
      });
    }

    return items;
  };

  const actionItems = getActionItems();

  const toggleMainItem = (itemId: string, items: ActionItem[]) => {
    setChecklistState((prev) => {
      const newState = {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          completed: !prev[itemId]?.completed,
          steps: prev[itemId]?.steps || {},
        },
      };
      // If unchecking main item, uncheck all steps
      if (prev[itemId]?.completed) {
        newState[itemId].steps = {};
      } else {
        // If checking main item, check all steps
        const item = items.find((_, idx) => `item-${idx}` === itemId);
        if (item) {
          const allStepsChecked: { [key: number]: boolean } = {};
          item.steps.forEach((_, stepIdx) => {
            allStepsChecked[stepIdx] = true;
          });
          newState[itemId].steps = allStepsChecked;
        }
      }
      // Save to API
      assessmentAPI.updateChecklist(newState).catch((error) => {
        console.error('Failed to save checklist state:', error);
        toast({
          title: 'Error',
          description: 'Failed to save checklist progress.',
          variant: 'destructive',
        });
      });
      return newState;
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const response = await assessmentAPI.uploadDocument(file);
      if (response.success) {
        // Reload assessment to get updated documents
        await loadAssessment();
        toast({
          title: 'Success!',
          description: 'Document uploaded successfully.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await assessmentAPI.deleteDocument(documentId);
      if (response.success) {
        // Reload assessment to get updated documents
        await loadAssessment();
        toast({
          title: 'Success!',
          description: 'Document deleted successfully.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete document. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const toggleStep = (itemId: string, stepIndex: number, items: ActionItem[]) => {
    setChecklistState((prev) => {
      const newState = {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          completed: prev[itemId]?.completed || false,
          steps: {
            ...prev[itemId]?.steps,
            [stepIndex]: !prev[itemId]?.steps?.[stepIndex],
          },
        },
      };
      // Check if all steps are completed, then mark main item as complete
      const item = items.find((_, idx) => `item-${idx}` === itemId);
      if (item) {
        const allStepsCompleted = item.steps.every((_, idx) => newState[itemId].steps[idx] === true);
        newState[itemId].completed = allStepsCompleted;
      }
      // Save to API
      assessmentAPI.updateChecklist(newState).catch((error) => {
        console.error('Failed to save checklist state:', error);
        toast({
          title: 'Error',
          description: 'Failed to save checklist progress.',
          variant: 'destructive',
        });
      });
      return newState;
    });
  };

  return (
    <section className='bg-cream pt-16 lg:pt-28 pb-16 lg:pb-24 min-h-screen'>
      <div className='spacing container mx-auto max-w-7xl'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-3 ${titleFont.className}`}>
            Export Readiness Dashboard
          </h1>
          <p className={`text-base md:text-lg text-black-muted ${josefinRegular.className}`}>
            Track your progress and complete action items to improve your export readiness.
          </p>
        </div>

        {/* Result Screen */}
        <div className={`rounded-lg p-6 lg:p-8 shadow-sm border mb-8 ${status.bgColor} ${status.borderColor}`}>
          <div className='flex flex-col md:flex-row items-start justify-between gap-6'>
            <div className='flex-1'>
              <div className='flex items-center gap-3 mb-3'>
                <span className={`inline-block ${status.color} text-white px-4 py-2 rounded-lg text-sm ${josefinSemiBold.className}`}>{status.label}</span>
                <span className={`text-sm ${status.textColor} ${josefinRegular.className}`}>Score: {totalScore}/100</span>
              </div>
              <h2 className={`text-2xl md:text-3xl font-bold text-black mb-3 ${titleFont.className}`}>{status.headline}</h2>
              <p className={`text-sm text-black-muted mb-4 leading-relaxed ${josefinRegular.className}`}>{status.subtitle}</p>
              <ul className='space-y-2 mb-6'>
                {status.bullets.map((b, i) => (
                  <li key={i} className='flex items-start gap-2'>
                    <span className='mt-1.5 w-1.5 h-1.5 rounded-full bg-black-muted flex-shrink-0'></span>
                    <span className={`text-sm text-black-muted ${josefinRegular.className}`}>{b}</span>
                  </li>
                ))}
              </ul>
              <h3 className={`text-base font-bold text-black mb-2 ${josefinSemiBold.className}`}>{status.nextLabel}</h3>
              <ul className='space-y-2'>
                {status.nextSteps.map((s, i) => (
                  <li key={i} className='flex items-start gap-2'>
                    <span className='mt-1.5 w-1.5 h-1.5 rounded-full bg-orange flex-shrink-0'></span>
                    <span className={`text-sm text-black ${josefinRegular.className}`}>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className='text-center md:text-right flex-shrink-0'>
              <span className={`text-7xl font-bold ${status.textColor} ${titleFont.className}`}>{totalScore}</span>
              <p className={`text-sm text-black-muted mt-1 ${josefinRegular.className}`}>out of 100</p>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8'>
          {/* Left Column - Score Breakdown, Market Fit, and Checklist */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Score Breakdown */}
            <div className='bg-white rounded-lg p-6 lg:p-8 shadow-sm border border-gray-100'>
              <h2 className={`text-2xl font-bold text-black mb-6 ${josefinSemiBold.className}`}>Score Breakdown</h2>
              <div className='space-y-4'>
                {categoryScores.map((category) => {
                  const percentage = (category.score / category.maxScore) * 100;
                  return (
                    <div key={category.name} className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          {category.icon}
                          <span className={`text-sm text-black ${josefinRegular.className}`}>{category.name}</span>
                        </div>
                        <span className={`text-sm font-semibold text-black ${josefinSemiBold.className}`}>
                          {category.score}/{category.maxScore}
                        </span>
                      </div>
                      <div className='w-full h-2 bg-gray-200 rounded-full overflow-hidden'>
                        <div
                          className={`h-full ${percentage >= 70 ? 'bg-green-600' : percentage >= 40 ? 'bg-amber-500' : 'bg-red-600'} transition-all duration-300`}
                          style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Market Fit Indicator */}
            {assessmentData.exportDestination && (
              <div className='bg-white rounded-lg p-6 lg:p-8 shadow-sm border border-gray-100'>
                <h2 className={`text-2xl font-bold text-black mb-4 ${josefinSemiBold.className}`}>Market Fit Indicator</h2>
                <div className='space-y-3'>
                  {(assessmentData.exportDestination === 'uk' || assessmentData.exportDestination === 'both') && (
                    <div className='flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3'>
                      <Check className='w-5 h-5 text-green-600 mt-0.5 flex-shrink-0' />
                      <div>
                        <span className={`text-sm font-semibold text-green-800 ${josefinSemiBold.className}`}>UK</span>
                        <p className={`text-xs text-green-700 mt-0.5 ${josefinRegular.className}`}>Your products currently meet UK-specific requirements.</p>
                      </div>
                    </div>
                  )}
                  {(assessmentData.exportDestination === 'eu' || assessmentData.exportDestination === 'both') && (
                    <div className='flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3'>
                      <Check className='w-5 h-5 text-green-600 mt-0.5 flex-shrink-0' />
                      <div>
                        <span className={`text-sm font-semibold text-green-800 ${josefinSemiBold.className}`}>EU</span>
                        <p className={`text-xs text-green-700 mt-0.5 ${josefinRegular.className}`}>Your products currently meet EU-specific requirements.</p>
                      </div>
                    </div>
                  )}
                  {assessmentData.exportDestination === 'both' && (
                    <div className='flex items-start gap-3 bg-orange/5 border border-orange/20 rounded-lg px-4 py-3'>
                      <Check className='w-5 h-5 text-orange mt-0.5 flex-shrink-0' />
                      <div>
                        <span className={`text-sm font-semibold text-orange ${josefinSemiBold.className}`}>Both</span>
                        <p className={`text-xs text-black-muted mt-0.5 ${josefinRegular.className}`}>Your products meet requirements for both UK and EU markets.</p>
                      </div>
                    </div>
                  )}
                </div>
                <p className={`text-xs text-black-muted mt-4 ${josefinRegular.className}`}>
                  Market Fit reflects readiness based on labelling, documentation, and logistics information provided.
                </p>
              </div>
            )}

            {/* Action Checklist */}
            <div className='bg-white rounded-lg p-6 lg:p-8 shadow-sm border border-gray-100'>
              <div className='flex items-center justify-between mb-6'>
                <h2 className={`text-2xl font-bold text-black ${josefinSemiBold.className}`}>Action Checklist</h2>
                <span className={`text-sm text-black-muted ${josefinRegular.className}`}>
                  {actionItems.filter((item, idx) => checklistState[`item-${idx}`]?.completed).length} of {actionItems.length} items completed
                </span>
              </div>
              {actionItems.length === 0 ? (
                <div className='text-center py-12'>
                  <Check className='w-16 h-16 text-green-600 mx-auto mb-4' />
                  <p className={`text-lg text-black-muted ${josefinRegular.className}`}>No action items! Your export readiness is excellent.</p>
                </div>
              ) : (
                <div className='space-y-6'>
                  {actionItems.map((item, index) => {
                    const itemId = `item-${index}`;
                    const itemState = checklistState[itemId];
                    const isMainItemCompleted = itemState?.completed || false;
                    const completedStepsCount = item.steps.filter((_, stepIdx) => itemState?.steps?.[stepIdx]).length;

                    return (
                      <div key={index} className='border border-gray-200 rounded-lg p-4'>
                        <div className='flex items-start gap-3 mb-3'>
                          <button
                            onClick={() => toggleMainItem(itemId, actionItems)}
                            className='mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center transition-all hover:border-orange cursor-pointer'
                            aria-label={`Toggle ${item.title}`}>
                            {isMainItemCompleted && <Check className='w-4 h-4 text-green-600' />}
                          </button>
                          <div className='flex-1'>
                            <div className='flex items-start justify-between'>
                              <h3 className={`text-base font-semibold text-black ${josefinSemiBold.className}`}>{item.title}</h3>
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  item.priority === 'High' ? 'bg-red-100 text-red-700' : item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                                } ${josefinRegular.className}`}>
                                {item.priority}
                              </span>
                            </div>
                            <p className={`text-xs text-black-muted mt-1 ${josefinRegular.className}`}>
                              {item.category} • {item.priority} ({completedStepsCount}/{item.steps.length} steps)
                            </p>
                          </div>
                        </div>
                        <div className='mt-4 ml-9'>
                          <p className={`text-xs font-semibold text-black mb-2 ${josefinSemiBold.className}`}>HOW TO COMPLETE THIS</p>
                          <ul className='space-y-2'>
                            {item.steps.map((step, stepIndex) => {
                              const isStepCompleted = itemState?.steps?.[stepIndex] || false;
                              return (
                                <li key={stepIndex} className='flex items-start gap-2'>
                                  <button
                                    onClick={() => toggleStep(itemId, stepIndex, actionItems)}
                                    className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                                      isStepCompleted
                                        ? 'border-green-600 bg-green-50'
                                        : 'border-gray-300 hover:border-orange'
                                    }`}
                                    aria-label={`Toggle ${step}`}>
                                    {isStepCompleted && <Check className='w-3 h-3 text-green-600' />}
                                  </button>
                                  <span
                                    className={`text-xs ${isStepCompleted ? 'text-black line-through' : 'text-black-muted'} ${josefinRegular.className}`}>
                                    {step}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Eligibility, Quick Actions */}
          <div className='space-y-6'>
            {/* Aggregation Eligibility */}
            <div className='bg-white rounded-lg p-6 lg:p-8 shadow-sm border border-gray-100'>
              <h2 className={`text-xl font-bold text-black mb-4 ${josefinSemiBold.className}`}>Aggregation Eligibility</h2>
              {isEligible ? (
                <div className='bg-green-100 border border-green-300 rounded-lg p-4 mb-4'>
                  <div className='flex items-center gap-2 mb-2'>
                    <Check className='w-5 h-5 text-green-700' />
                    <span className={`font-semibold text-green-700 ${josefinSemiBold.className}`}>Eligible</span>
                  </div>
                  <p className={`text-sm text-green-700 ${josefinRegular.className}`}>
                    Your products can be considered for supply aggregation and buyer sourcing requests.
                  </p>
                </div>
              ) : (
                <div className='bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-4'>
                  <div className='flex items-center gap-2 mb-2'>
                    <AlertTriangle className='w-5 h-5 text-yellow-700' />
                    <span className={`font-semibold text-yellow-700 ${josefinSemiBold.className}`}>Not Yet Eligible</span>
                  </div>
                  <p className={`text-sm text-yellow-700 ${josefinRegular.className}`}>
                    {totalScore < 70
                      ? 'A minimum score of 70 is required for aggregation eligibility.'
                      : 'Critical compliance requirements are still outstanding.'}
                  </p>
                </div>
              )}
              <p className={`text-xs text-black-muted ${josefinRegular.className}`}>
                Aggregation eligibility requires a score of 70+, HACCP-based food safety, and compliant labelling.
              </p>
            </div>

            {/* Next Steps */}
            <div className='bg-white rounded-lg p-6 lg:p-8 shadow-sm border border-gray-100'>
              <h2 className={`text-xl font-bold text-black mb-4 ${josefinSemiBold.className}`}>Next Steps</h2>
              <button
                onClick={() => router.push('/dashboard/verification')}
                className={`w-full bg-transparent border-2 border-black text-black rounded-lg py-3 px-4 font-semibold transition-all hover:bg-orange hover:border-orange hover:text-white flex items-center justify-center gap-2 mb-3 ${josefinSemiBold.className}`}>
                Upload Document
                <ArrowRight className='w-4 h-4' />
              </button>
              <p className={`text-xs text-black-muted ${josefinRegular.className}`}>
                Upload your documents to complete verification and unlock trade readiness.
              </p>
            </div>

            {/* Retake Assessment */}
            <div className='bg-white rounded-lg p-6 lg:p-8 shadow-sm border border-gray-100'>
              <h2 className={`text-xl font-bold text-black mb-2 ${josefinSemiBold.className}`}>Retake Assessment</h2>
              <p className={`text-xs text-black-muted mb-4 ${josefinRegular.className}`}>
                Made improvements? Retake the assessment at any time to update your score and readiness status.
              </p>
              <button
                onClick={() => router.push('/export-readiness/assessment')}
                className={`w-full bg-black text-white rounded-lg py-3 px-4 font-semibold text-sm transition-all hover:bg-orange flex items-center justify-center gap-2 ${josefinSemiBold.className}`}>
                Retake Assessment
                <ArrowRight className='w-4 h-4' />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className='mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200'>
          <p className={`text-xs text-black-muted leading-relaxed ${josefinRegular.className}`}>
            <strong>Note:</strong> This guidance is for informational purposes only and does not constitute legal advice. Requirements may vary by country, product type, and market conditions. Always consult with qualified trade advisors and regulatory authorities for your specific situation.
          </p>
        </div>
      </div>
    </section>
  );
}
