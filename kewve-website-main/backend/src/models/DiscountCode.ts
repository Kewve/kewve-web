import mongoose, { Schema, Document } from "mongoose";

export interface DiscountCodeDocument extends Document {
  code: string;
  discountPercent: number;
  discountAmountEuros?: number;
  isActive: boolean;
  createdBy?: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DiscountCodeSchema = new Schema<DiscountCodeDocument>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    discountPercent: {
      type: Number,
      default: 10,
      min: 1,
      max: 100,
    },
    // Legacy support for old fixed-amount discount codes.
    discountAmountEuros: {
      type: Number,
      min: 1,
      max: 1000,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
      trim: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const DiscountCode = mongoose.model<DiscountCodeDocument>("DiscountCode", DiscountCodeSchema);

