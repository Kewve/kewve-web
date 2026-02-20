import mongoose, { Schema, Document } from "mongoose";
import { AssessmentInput } from "../types/assessment.js";

export interface AssessmentDocument extends AssessmentInput, Document {
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: false,
    },
    // Support both old (url) and new (data) document storage
    url: {
      type: String,
      required: false,
    },
    data: {
      type: Schema.Types.Buffer,
      required: function(this: any) {
        // Only require data if url is not present (new documents)
        return !this.url;
      },
    },
    size: {
      type: Number,
      required: function(this: any) {
        // Only require size if url is not present (new documents)
        return !this.url;
      },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
      required: false,
    },
    reviewedAt: {
      type: Date,
      required: false,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const ChecklistStateSchema = new Schema(
  {
    completed: {
      type: Boolean,
      default: false,
    },
    steps: {
      type: Map,
      of: Boolean,
      default: {},
    },
  },
  { _id: false }
);

const AssessmentSchema = new Schema<AssessmentDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    country: {
      type: String,
      trim: true,
    },
    businessRegistered: {
      type: String,
      enum: ["yes", "no"],
    },
    exportLicense: {
      type: String,
      enum: ["yes", "no"],
    },
    yearsInBusiness: {
      type: String,
      enum: ["less-than-1", "1-2", "3-5", "5-plus"],
    },
    haccpCertification: {
      type: String,
      enum: ["yes", "no"],
    },
    accreditedLabTesting: {
      type: String,
      enum: ["yes", "no"],
    },
    certificateOfAnalysis: {
      type: String,
      enum: ["yes", "no"],
    },
    localFoodAgencyRegistration: {
      type: String,
      enum: ["yes", "no"],
    },
    isoCertification: {
      type: String,
      enum: ["yes", "no"],
    },
    allergenDeclarations: {
      type: String,
      enum: ["yes", "no"],
    },
    nutritionPanel: {
      type: String,
      enum: ["yes", "no"],
    },
    labelsInEnglish: {
      type: String,
      enum: ["yes", "no"],
    },
    barcodes: {
      type: String,
      enum: ["yes", "no"],
    },
    shelfLifeInfo: {
      type: String,
      enum: ["yes", "no"],
    },
    monthlyProductionCapacity: {
      type: String,
      enum: ["less-than-500", "500-1000", "1000-5000", "5000-plus"],
    },
    consistentSupply: {
      type: String,
      enum: ["yes", "no"],
    },
    qualityControlProcesses: {
      type: String,
      enum: ["yes", "no"],
    },
    exportPricing: {
      type: String,
      enum: ["yes", "no"],
    },
    paymentTerms: {
      type: String,
      enum: ["yes", "no"],
    },
    samplePolicy: {
      type: String,
      enum: ["yes", "no"],
    },
    exportGradeCartons: {
      type: String,
      enum: ["yes", "no"],
    },
    palletiseShipments: {
      type: String,
      enum: ["yes", "no"],
    },
    deliverToUK: {
      type: String,
      enum: ["yes", "no"],
    },
    documents: {
      type: [DocumentSchema],
      default: [],
    },
    checklistState: {
      type: Map,
      of: ChecklistStateSchema,
      default: {},
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

// Create unique index on userId to ensure one assessment per user
AssessmentSchema.index({ userId: 1 }, { unique: true });

export const Assessment = mongoose.model<AssessmentDocument>("Assessment", AssessmentSchema);
