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
  Truck,
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
  country?: string;
  businessRegistered?: string;
  exportLicense?: string;
  yearsInBusiness?: string;
  haccpCertification?: string;
  accreditedLabTesting?: string;
  certificateOfAnalysis?: string;
  localFoodAgencyRegistration?: string;
  isoCertification?: string;
  allergenDeclarations?: string;
  nutritionPanel?: string;
  labelsInEnglish?: string;
  barcodes?: string;
  shelfLifeInfo?: string;
  monthlyProductionCapacity?: string;
  consistentSupply?: string;
  qualityControlProcesses?: string;
  exportPricing?: string;
  paymentTerms?: string;
  samplePolicy?: string;
  exportGradeCartons?: string;
  palletiseShipments?: string;
  deliverToUK?: string;
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
      router.push('/login?redirect=/export-readiness/dashboard');
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

  // Calculate scores based on answers
  const calculateScores = (data: AssessmentData): CategoryScore[] => {
    let businessLegitimacy = 0;
    let foodSafety = 0;
    let packaging = 0;
    let production = 0;
    let pricing = 0;
    let logistics = 0;

    // Business Legitimacy (max 15)
    if (data.businessRegistered === 'yes') businessLegitimacy += 5;
    if (data.exportLicense === 'yes') businessLegitimacy += 5;
    if (data.yearsInBusiness === '5-plus') businessLegitimacy += 5;
    else if (data.yearsInBusiness === '3-5') businessLegitimacy += 3;
    else if (data.yearsInBusiness === '1-2') businessLegitimacy += 1;

    // Food Safety & Compliance (max 25)
    if (data.haccpCertification === 'yes') foodSafety += 8;
    if (data.accreditedLabTesting === 'yes') foodSafety += 5;
    if (data.certificateOfAnalysis === 'yes') foodSafety += 5;
    if (data.localFoodAgencyRegistration === 'yes') foodSafety += 4;
    if (data.isoCertification === 'yes') foodSafety += 3;

    // Packaging & Labelling (max 20)
    if (data.allergenDeclarations === 'yes') packaging += 5;
    if (data.nutritionPanel === 'yes') packaging += 6;
    if (data.labelsInEnglish === 'yes') packaging += 4;
    if (data.barcodes === 'yes') packaging += 3;
    if (data.shelfLifeInfo === 'yes') packaging += 2;

    // Production & Capacity (max 15)
    if (data.monthlyProductionCapacity === '50000-plus') production += 6;
    else if (data.monthlyProductionCapacity === '10000-50000') production += 5;
    else if (data.monthlyProductionCapacity === '5000-10000') production += 4;
    else if (data.monthlyProductionCapacity === '1000-5000') production += 3;
    else if (data.monthlyProductionCapacity === 'less-than-1000') production += 1;
    if (data.consistentSupply === 'yes') production += 5;
    if (data.qualityControlProcesses === 'yes') production += 4;

    // Pricing & Commercial (max 15)
    if (data.exportPricing === 'yes') pricing += 6;
    if (data.paymentTerms === 'yes') pricing += 5;
    if (data.samplePolicy === 'yes') pricing += 4;

    // Logistics Readiness (max 10)
    if (data.exportGradeCartons === 'yes') logistics += 3;
    if (data.palletiseShipments === 'yes') logistics += 4;
    if (data.deliverToUK === 'yes') logistics += 3;

    return [
      {
        name: 'Business Legitimacy',
        score: businessLegitimacy,
        maxScore: 15,
        icon: <Briefcase className='w-5 h-5' />,
      },
      {
        name: 'Food Safety & Compliance',
        score: foodSafety,
        maxScore: 25,
        icon: <ChefHat className='w-5 h-5' />,
      },
      {
        name: 'Packaging & Labelling',
        score: packaging,
        maxScore: 20,
        icon: <Package className='w-5 h-5' />,
      },
      {
        name: 'Production & Capacity',
        score: production,
        maxScore: 15,
        icon: <Factory className='w-5 h-5' />,
      },
      {
        name: 'Pricing & Commercial',
        score: pricing,
        maxScore: 15,
        icon: <DollarSign className='w-5 h-5' />,
      },
      {
        name: 'Logistics Readiness',
        score: logistics,
        maxScore: 10,
        icon: <Truck className='w-5 h-5' />,
      },
    ];
  };

  const categoryScores = calculateScores(assessmentData);
  const totalScore = categoryScores.reduce((sum, cat) => sum + cat.score, 0);
  const maxTotalScore = categoryScores.reduce((sum, cat) => sum + cat.maxScore, 0);
  const percentageScore = Math.round((totalScore / maxTotalScore) * 100);

  // Determine status
  const getStatus = () => {
    if (percentageScore >= 70) {
      return { 
        label: 'Ready', 
        color: 'bg-green-600', 
        textColor: 'text-green-700', 
        bgColor: 'bg-green-100', 
        borderColor: 'border-green-300', 
        text: 'Ready for international trade' 
      };
    }
    if (percentageScore >= 40) {
      return { 
        label: 'Developing', 
        color: 'bg-amber-500', 
        textColor: 'text-amber-700', 
        bgColor: 'bg-amber-100', 
        borderColor: 'border-amber-300', 
        text: 'Significant work required' 
      };
    }
    return { 
      label: 'Not Ready', 
      color: 'bg-red-600', 
      textColor: 'text-red-700', 
      bgColor: 'bg-red-100', 
      borderColor: 'border-red-300', 
      text: 'Major gaps to address' 
    };
  };

  const status = getStatus();
  const isEligible = percentageScore >= 70 && assessmentData.haccpCertification === 'yes' && assessmentData.nutritionPanel === 'yes' && assessmentData.deliverToUK === 'yes';

  // Generate action items based on gaps
  const getActionItems = (): ActionItem[] => {
    if (!assessmentData) return [];
    const items: ActionItem[] = [];

    if (assessmentData.haccpCertification !== 'yes') {
      items.push({
        title: 'Begin HACCP certification pathway',
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
        title: 'Complete accredited lab testing and upload Certificate of Analysis (COA)',
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

    if (assessmentData.localFoodAgencyRegistration !== 'yes') {
      items.push({
        title: 'Obtain local food registration for export products',
        category: 'Food Safety',
        priority: 'Medium',
        steps: [
          'Contact local food regulatory authority',
          'Complete registration application',
          'Submit required documentation',
          'Upload registration certificate',
        ],
      });
    }

    if (assessmentData.nutritionPanel !== 'yes') {
      items.push({
        title: 'Add UK/EU-compliant nutrition panel to packaging',
        category: 'Packaging & Labelling',
        priority: 'High',
        steps: [
          'Review UK/EU nutrition labelling requirements',
          'Design compliant nutrition panel',
          'Update packaging artwork',
          'Upload updated packaging sample',
        ],
      });
    }

    if (assessmentData.exportLicense !== 'yes') {
      items.push({
        title: 'Obtain export license from relevant authority',
        category: 'Business Legitimacy',
        priority: 'High',
        steps: [
          'Identify relevant export licensing authority',
          'Complete export license application',
          'Submit required business documentation',
          'Upload export license certificate',
        ],
      });
    }

    if (assessmentData.exportGradeCartons !== 'yes' || assessmentData.palletiseShipments !== 'yes') {
      items.push({
        title: 'Source export cartons and develop palletization plan',
        category: 'Logistics',
        priority: 'Medium',
        steps: [
          'Identify export-grade packaging suppliers',
          'Design palletization layout',
          'Test pallet stability',
          'Document palletization procedures',
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

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8'>
          {/* Left Column - Score and Checklist */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Your Score Section */}
            <div className='bg-white rounded-lg p-6 lg:p-8 shadow-sm border border-gray-100'>
              <div className='flex items-start justify-between mb-6'>
                <div className='flex-1'>
                  <h2 className={`text-2xl font-bold text-black mb-2 ${josefinSemiBold.className}`}>Your Score</h2>
                  <p className={`text-sm text-black-muted mb-4 ${josefinRegular.className}`}>Overall export readiness rating</p>
                  <div className='flex items-center gap-3 flex-wrap'>
                    <div className={`inline-block ${status.color} text-white px-4 py-2 rounded-lg ${josefinSemiBold.className}`}>
                      {status.label}
                    </div>
                    <span className={`text-sm ${status.textColor} ${josefinRegular.className}`}>{status.text}</span>
                  </div>
                </div>
                <div className='text-right'>
                  <span className={`text-6xl font-bold ${status.textColor} ${titleFont.className}`}>{totalScore}</span>
                  <p className={`text-sm text-black-muted mt-1 ${josefinRegular.className}`}>out of {maxTotalScore}</p>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className='mt-8'>
                <h3 className={`text-lg font-bold text-black mb-4 ${josefinSemiBold.className}`}>SCORE BREAKDOWN</h3>
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
            </div>

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

          {/* Right Column - Eligibility, Documents, Next Steps */}
          <div className='space-y-6'>
            {/* Trade Showcase Eligibility */}
            <div className='bg-white rounded-lg p-6 lg:p-8 shadow-sm border border-gray-100'>
              <h2 className={`text-xl font-bold text-black mb-4 ${josefinSemiBold.className}`}>Trade Showcase Eligibility</h2>
              {isEligible ? (
                <div className='bg-green-100 border border-green-300 rounded-lg p-4 mb-4'>
                  <div className='flex items-center gap-2 mb-2'>
                    <Check className='w-5 h-5 text-green-700' />
                    <span className={`font-semibold text-green-700 ${josefinSemiBold.className}`}>Eligible</span>
                  </div>
                  <p className={`text-sm text-green-700 ${josefinRegular.className}`}>All showcase eligibility criteria met.</p>
                </div>
              ) : (
                <div className='bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-4'>
                  <div className='flex items-center gap-2 mb-2'>
                    <AlertTriangle className='w-5 h-5 text-yellow-700' />
                    <span className={`font-semibold text-yellow-700 ${josefinSemiBold.className}`}>Not Eligible</span>
                  </div>
                  <p className={`text-sm text-yellow-700 ${josefinRegular.className}`}>
                    {percentageScore < 70
                      ? 'Score below 70. Minimum score of 70 required for showcase eligibility.'
                      : 'Missing critical requirements for showcase eligibility.'}
                  </p>
                </div>
              )}
              <p className={`text-xs text-black-muted ${josefinRegular.className}`}>
                International Trade Showcase eligibility (trade fairs, buyer showcases, sourcing events) requires a score of 70+, no critical gaps in food safety or labelling, and delivery capability to UK hub.
              </p>
            </div>

            {/* Documents */}
            <div className='bg-white rounded-lg p-6 lg:p-8 shadow-sm border border-gray-100'>
              <h2 className={`text-xl font-bold text-black mb-4 ${josefinSemiBold.className}`}>Documents</h2>
              <input
                type='file'
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept='.pdf,.doc,.docx,.jpg,.jpeg,.png'
                className='hidden'
                id='document-upload'
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={`w-full bg-transparent border-2 border-black text-black rounded-lg py-3 px-4 font-semibold transition-all hover:bg-orange hover:border-orange hover:text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${josefinSemiBold.className}`}>
                {uploading ? (
                  <>
                    <div className='w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin'></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className='w-4 h-4' />
                    Upload Document
                  </>
                )}
              </button>
              
              {documents && documents.length > 0 ? (
                <div className='mt-4 space-y-2'>
                  {documents.map((doc: any, index: number) => {
                    const docId = doc._id?.toString() || doc._id || doc.id || `doc-${index}`;
                    return (
                      <div
                        key={docId}
                        className='flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200'>
                        <div className='flex items-center gap-2 flex-1 min-w-0'>
                          <File className='w-4 h-4 text-gray-600 flex-shrink-0' />
                        <a
                          href={doc.url 
                            ? `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${doc.url}`
                            : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/assessment/documents/${doc._id?.toString() || doc._id || doc.id || `doc-${index}`}`
                          }
                          target='_blank'
                          rel='noopener noreferrer'
                          className={`text-sm text-black truncate hover:text-orange transition-colors ${josefinRegular.className}`}>
                          {doc.name || `Document ${index + 1}`}
                        </a>
                        </div>
                        <button
                          onClick={() => handleDeleteDocument(docId)}
                          className='ml-2 p-1 hover:bg-red-100 rounded transition-colors flex-shrink-0'
                          aria-label='Delete document'>
                          <X className='w-4 h-4 text-red-600' />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={`text-xs text-black-muted mt-3 ${josefinRegular.className}`}>No documents uploaded yet.</p>
              )}
            </div>

            {/* Next Steps */}
            <div className='bg-white rounded-lg p-6 lg:p-8 shadow-sm border border-gray-100'>
              <h2 className={`text-xl font-bold text-black mb-4 ${josefinSemiBold.className}`}>Next Steps</h2>
              <button
                onClick={() => router.push('/export-readiness/assessment')}
                className={`w-full bg-transparent border-2 border-black text-black rounded-lg py-3 px-4 font-semibold transition-all hover:bg-orange hover:border-orange hover:text-white flex items-center justify-center gap-2 mb-3 ${josefinSemiBold.className}`}>
                Update Assessment
                <ArrowRight className='w-4 h-4' />
              </button>
              <p className={`text-xs text-black-muted ${josefinRegular.className}`}>
                {actionItems.length > 0
                  ? 'Complete the action items above to improve your score and unlock trade showcase eligibility.'
                  : 'View your current assessment status to improve your score and unlock trade showcase eligibility.'}
              </p>
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
