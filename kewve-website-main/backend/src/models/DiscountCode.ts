import mongoose, { Schema, Document } from "mongoose";

export interface DiscountCodeDocument extends Document {
  code: string;
  discountPercent: number;
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
      default: 15,
      min: 1,
      max: 100,
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

