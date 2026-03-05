import mongoose, { Schema, Document } from "mongoose";

export const PRODUCT_CATEGORIES = [
  "Grains & Cereals",
  "Spices & Herbs",
  "Seeds & Nuts",
  "Oils & Fats",
  "Beverages",
  "Fresh Produce",
  "Processed Food",
  "Others",
] as const;

export interface ProductDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  category: string;
  description: string;
  hsCode: string;
  image?: {
    data: Buffer;
    contentType: string;
  };
  minimumOrderQuantity: number;
  unitPrice: number;
  leadTime: number;
  monthlyCapacity: number;
  readiness: "draft" | "pending" | "approved";
  verification: "pending" | "verified" | "rejected";
  aggregation: "not_eligible" | "eligible";
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<ProductDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, default: "" },
    category: { type: String, default: "" },
    description: { type: String, default: "" },
    hsCode: { type: String, default: "" },
    image: {
      data: { type: Schema.Types.Buffer },
      contentType: { type: String },
    },
    minimumOrderQuantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    leadTime: { type: Number, default: 0 },
    monthlyCapacity: { type: Number, default: 0 },
    readiness: {
      type: String,
      enum: ["draft", "pending", "approved"],
      default: "draft",
    },
    verification: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    aggregation: {
      type: String,
      enum: ["not_eligible", "eligible"],
      default: "not_eligible",
    },
  },
  {
    timestamps: true,
  }
);

ProductSchema.index({ userId: 1 });

export const Product = mongoose.model<ProductDocument>(
  "Product",
  ProductSchema
);
