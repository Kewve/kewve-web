'use client';

import { useState, useEffect } from 'react';
import { josefinSemiBold, josefinRegular } from '@/utils';
import { useToast } from '@/components/ui/use-toast';
import { tradeProfileAPI } from '@/lib/api';
import { useDashboardProgress } from '@/contexts/DashboardProgressContext';
import { Check, Loader2 } from 'lucide-react';

const tabs = [
  'Company Overview',
  'Export Experience',
  'Production & Processing',
  'Packaging & Storage',
  'Sustainability & Traceability',
];

interface TradeProfileData {
  companyName: string;
  country: string;
  description: string;
  yearsOfExperience: string;
  marketsPreviouslyExportedTo: string;
  monthlyProductionCapacity: string;
  processingMethods: string;
  packagingFormats: string;
  storageFacilities: string;
  sustainabilityPractices: string;
  traceabilitySystems: string;
}

const initialData: TradeProfileData = {
  companyName: '',
  country: '',
  description: '',
  yearsOfExperience: '0',
  marketsPreviouslyExportedTo: '',
  monthlyProductionCapacity: '0',
  processingMethods: '',
  packagingFormats: '',
  storageFacilities: '',
  sustainabilityPractices: '',
  traceabilitySystems: '',
};

export default function TradeProfilePage() {
  const [activeTab, setActiveTab] = useState(0);
  const [completedTabs, setCompletedTabs] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<TradeProfileData>(initialData);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { refresh: refreshProgress } = useDashboardProgress();

  // Load existing profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await tradeProfileAPI.getProfile();
        if (response.success && response.data) {
          const d = response.data;
          setFormData({
            companyName: d.companyName || '',
            country: d.country || '',
            description: d.description || '',
            yearsOfExperience: String(d.yearsOfExperience ?? '0'),
            marketsPreviouslyExportedTo: d.marketsPreviouslyExportedTo || '',
            monthlyProductionCapacity: String(d.monthlyProductionCapacity ?? '0'),
            processingMethods: d.processingMethods || '',
            packagingFormats: d.packagingFormats || '',
            storageFacilities: d.storageFacilities || '',
            sustainabilityPractices: d.sustainabilityPractices || '',
            traceabilitySystems: d.traceabilitySystems || '',
          });
          if (d.completedSections && d.completedSections.length > 0) {
            setCompletedTabs(new Set(d.completedSections));
          }
        }
      } catch {
        // No profile yet, that's fine — use defaults
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const updateField = (field: keyof TradeProfileData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = async () => {
    const newCompleted = new Set(Array.from(completedTabs));
    newCompleted.add(activeTab);
    setCompletedTabs(newCompleted);

    // Auto-save on each step
    try {
      await tradeProfileAPI.saveProfile({
        ...formData,
        completedSections: Array.from(newCompleted),
      });
    } catch {
      // Silent save — don't block navigation
    }

    if (activeTab < tabs.length - 1) {
      setActiveTab(activeTab + 1);
    }
  };

  const handlePrevious = () => {
    if (activeTab > 0) {
      setActiveTab(activeTab - 1);
    }
  };

  const handleSaveProfile = async () => {
    const newCompleted = new Set(Array.from(completedTabs));
    newCompleted.add(activeTab);
    setCompletedTabs(newCompleted);
    setSaving(true);
    try {
      await tradeProfileAPI.saveProfile({
        ...formData,
        completedSections: Array.from(newCompleted),
      });
      toast({
        title: 'Profile Saved',
        description: 'Your trade profile has been saved successfully.',
      });
      await refreshProgress();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTabClick = (index: number) => {
    if (index <= activeTab || completedTabs.has(index) || completedTabs.has(index - 1) || index === 0) {
      setActiveTab(index);
    }
  };

  const allCompleted = completedTabs.size === tabs.length;
  const isLastTab = activeTab === tabs.length - 1;

  const inputClassName = `w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a2e23]/20 focus:border-[#1a2e23] transition-colors ${josefinRegular.className}`;
  const textareaClassName = `${inputClassName} resize-y min-h-[120px]`;
  const labelClassName = `block text-sm text-gray-900 mb-2 ${josefinSemiBold.className}`;

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <div className='flex flex-col items-center gap-3'>
          <Loader2 className='w-6 h-6 text-gray-400 animate-spin' />
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-3xl mx-auto space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h1 className={`text-2xl lg:text-3xl text-gray-900 ${josefinSemiBold.className}`}>
          Trade Profile
        </h1>
        <span className={`text-sm text-gray-500 ${josefinRegular.className}`}>
          {allCompleted ? 'Complete' : 'Incomplete'}
        </span>
      </div>

      {/* Tabs */}
      <div className='flex flex-wrap gap-2'>
        {tabs.map((tab, index) => {
          const isActive = index === activeTab;
          const isCompleted = completedTabs.has(index);

          return (
            <button
              key={tab}
              onClick={() => handleTabClick(index)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm border transition-colors ${josefinRegular.className} ${
                isActive
                  ? 'bg-[#1a2e23] text-white border-[#1a2e23]'
                  : isCompleted
                    ? 'bg-white text-gray-700 border-gray-300'
                    : 'bg-white text-gray-500 border-gray-200'
              }`}>
              {isCompleted && !isActive && <Check className='w-4 h-4' />}
              {tab}
            </button>
          );
        })}
      </div>

      {/* Form Card */}
      <div className='bg-white rounded-xl border border-gray-200 p-6 lg:p-8'>
        <h2 className={`text-lg text-gray-900 mb-6 ${josefinSemiBold.className}`}>
          {tabs[activeTab]}
        </h2>

        <div className='space-y-5'>
          {/* Tab 0: Company Overview */}
          {activeTab === 0 && (
            <>
              <div>
                <label className={labelClassName}>Company Name</label>
                <input
                  type='text'
                  className={inputClassName}
                  placeholder='Enter company name'
                  value={formData.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClassName}>Country</label>
                <input
                  type='text'
                  className={inputClassName}
                  placeholder='e.g. Nigeria'
                  value={formData.country}
                  onChange={(e) => updateField('country', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClassName}>Description</label>
                <textarea
                  className={textareaClassName}
                  placeholder='Brief company description'
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                />
              </div>
            </>
          )}

          {/* Tab 1: Export Experience */}
          {activeTab === 1 && (
            <>
              <div>
                <label className={labelClassName}>Years of Export Experience</label>
                <input
                  type='number'
                  className={inputClassName}
                  placeholder='0'
                  min='0'
                  value={formData.yearsOfExperience}
                  onChange={(e) => updateField('yearsOfExperience', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClassName}>Markets Previously Exported To</label>
                <input
                  type='text'
                  className={inputClassName}
                  placeholder='e.g. UK, Netherlands, Germany'
                  value={formData.marketsPreviouslyExportedTo}
                  onChange={(e) => updateField('marketsPreviouslyExportedTo', e.target.value)}
                />
              </div>
            </>
          )}

          {/* Tab 2: Production & Processing */}
          {activeTab === 2 && (
            <>
              <div>
                <label className={labelClassName}>Monthly Production Capacity (kg)</label>
                <input
                  type='number'
                  className={inputClassName}
                  placeholder='0'
                  min='0'
                  value={formData.monthlyProductionCapacity}
                  onChange={(e) => updateField('monthlyProductionCapacity', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClassName}>Processing Methods</label>
                <textarea
                  className={textareaClassName}
                  placeholder='Describe your processing methods'
                  value={formData.processingMethods}
                  onChange={(e) => updateField('processingMethods', e.target.value)}
                />
              </div>
            </>
          )}

          {/* Tab 3: Packaging & Storage */}
          {activeTab === 3 && (
            <>
              <div>
                <label className={labelClassName}>Packaging Formats Available</label>
                <input
                  type='text'
                  className={inputClassName}
                  placeholder='e.g. Retail packs, Bulk bags, Cartons'
                  value={formData.packagingFormats}
                  onChange={(e) => updateField('packagingFormats', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClassName}>Storage Facilities</label>
                <textarea
                  className={textareaClassName}
                  placeholder='Describe your storage capabilities'
                  value={formData.storageFacilities}
                  onChange={(e) => updateField('storageFacilities', e.target.value)}
                />
              </div>
            </>
          )}

          {/* Tab 4: Sustainability & Traceability */}
          {activeTab === 4 && (
            <>
              <div>
                <label className={labelClassName}>Sustainability Practices</label>
                <textarea
                  className={textareaClassName}
                  placeholder='Describe your sustainability practices'
                  value={formData.sustainabilityPractices}
                  onChange={(e) => updateField('sustainabilityPractices', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClassName}>Traceability Systems</label>
                <textarea
                  className={textareaClassName}
                  placeholder='Describe how you track products from source to export'
                  value={formData.traceabilitySystems}
                  onChange={(e) => updateField('traceabilitySystems', e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className='flex items-center justify-between'>
        <button
          onClick={handlePrevious}
          disabled={activeTab === 0}
          className={`px-5 py-2.5 rounded-lg text-sm border border-gray-300 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed ${josefinRegular.className}`}>
          Previous
        </button>

        {isLastTab ? (
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className={`px-5 py-2.5 rounded-lg text-sm bg-[#1a2e23] text-white transition-colors hover:bg-[#243d2f] disabled:opacity-60 disabled:cursor-not-allowed ${josefinSemiBold.className}`}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className={`px-5 py-2.5 rounded-lg text-sm bg-[#1a2e23] text-white transition-colors hover:bg-[#243d2f] ${josefinSemiBold.className}`}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
