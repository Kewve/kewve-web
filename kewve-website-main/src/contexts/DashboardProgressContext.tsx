'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { assessmentAPI, tradeProfileAPI } from '@/lib/api';

const VERIFICATION_CATEGORIES = [
  'biz-reg', 'tax-id', 'bank-stmt',
  'food-safety', 'export-license', 'phyto-cert',
  'prod-capacity', 'packaging', 'quality-ctrl',
];

interface ProgressState {
  assessmentComplete: boolean;
  allDocsUploaded: boolean;
  tradeProfileComplete: boolean;
  loading: boolean;
}

interface UnlockedTabs {
  home: boolean;
  exportReadiness: boolean;
  verification: boolean;
  documents: boolean;
  tradeProfile: boolean;
  products: boolean;
  settings: boolean;
}

interface DashboardProgressContextType {
  progress: ProgressState;
  unlocked: UnlockedTabs;
  refresh: () => Promise<void>;
}

const DashboardProgressContext = createContext<DashboardProgressContextType | undefined>(undefined);

export function DashboardProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ProgressState>({
    assessmentComplete: false,
    allDocsUploaded: false,
    tradeProfileComplete: false,
    loading: true,
  });

  const fetchProgress = useCallback(async () => {
    try {
      const [assessmentRes, tradeRes] = await Promise.allSettled([
        assessmentAPI.getAssessment(),
        tradeProfileAPI.getProfile(),
      ]);

      let assessmentComplete = false;
      let allDocsUploaded = false;
      let tradeProfileComplete = false;

      if (assessmentRes.status === 'fulfilled' && assessmentRes.value.success) {
        const data = assessmentRes.value.data;
        // Assessment is complete if the compliance confirmation step is done (last section)
        const hasConfirmed = data.confirmAccuracy === 'yes' && data.agreeCompliance === 'yes';
        // Fallback: also check for old-format assessments or any substantial data
        const hasAnswers = data.country && (data.businessRegistered || data.haccpProcess || data.plantBasedConfirmation);
        assessmentComplete = hasConfirmed || !!hasAnswers;

        // Check verification docs
        if (data.documents && Array.isArray(data.documents)) {
          const uploadedCategories = new Set(
            data.documents
              .filter((d: any) => d.category && VERIFICATION_CATEGORIES.includes(d.category))
              .map((d: any) => d.category)
          );
          allDocsUploaded = uploadedCategories.size >= VERIFICATION_CATEGORIES.length;
        }
      }

      if (tradeRes.status === 'fulfilled' && tradeRes.value.success && tradeRes.value.data) {
        const completed = tradeRes.value.data.completedSections || [];
        tradeProfileComplete = completed.length >= 5;
      }

      setProgress({
        assessmentComplete,
        allDocsUploaded,
        tradeProfileComplete,
        loading: false,
      });
    } catch {
      setProgress((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const unlocked: UnlockedTabs = {
    home: true,
    exportReadiness: progress.assessmentComplete,
    verification: progress.assessmentComplete,
    documents: progress.allDocsUploaded,
    tradeProfile: progress.allDocsUploaded,
    products: progress.tradeProfileComplete,
    settings: true,
  };

  return (
    <DashboardProgressContext.Provider value={{ progress, unlocked, refresh: fetchProgress }}>
      {children}
    </DashboardProgressContext.Provider>
  );
}

export function useDashboardProgress() {
  const context = useContext(DashboardProgressContext);
  if (!context) {
    throw new Error('useDashboardProgress must be used within DashboardProgressProvider');
  }
  return context;
}
