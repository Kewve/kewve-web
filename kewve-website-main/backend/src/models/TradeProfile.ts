import mongoose, { Schema, Document } from "mongoose";

export interface TradeProfileDocument extends Document {
  userId: mongoose.Types.ObjectId;
  companyName: string;
  country: string;
  description: string;
  yearsOfExperience: number;
  marketsPreviouslyExportedTo: string;
  monthlyProductionCapacity: number;
  processingMethods: string;
  packagingFormats: string;
  storageFacilities: string;
  sustainabilityPractices: string;
  traceabilitySystems: string;
  completedSections: number[];
  createdAt: Date;
  updatedAt: Date;
}

const TradeProfileSchema = new Schema<TradeProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    companyName: { type: String, default: "" },
    country: { type: String, default: "" },
    description: { type: String, default: "" },
    yearsOfExperience: { type: Number, default: 0 },
    marketsPreviouslyExportedTo: { type: String, default: "" },
    monthlyProductionCapacity: { type: Number, default: 0 },
    processingMethods: { type: String, default: "" },
    packagingFormats: { type: String, default: "" },
    storageFacilities: { type: String, default: "" },
    sustainabilityPractices: { type: String, default: "" },
    traceabilitySystems: { type: String, default: "" },
    completedSections: { type: [Number], default: [] },
  },
  {
    timestamps: true,
  }
);

export const TradeProfile = mongoose.model<TradeProfileDocument>(
  "TradeProfile",
  TradeProfileSchema
);
