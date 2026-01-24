import { Types } from "mongoose";

export interface AssessmentInput {
  userId: Types.ObjectId | string;
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
  documents?: {
    name: string;
    type: string;
    data?: Buffer;
    size: number;
    uploadedAt: Date;
  }[];
  checklistState?: {
    [itemId: string]: {
      completed: boolean;
      steps: { [stepIndex: number]: boolean };
    };
  };
}
