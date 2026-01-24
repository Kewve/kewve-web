import mongoose, { Schema, Document } from "mongoose";
import { WaitlistInput } from "../types/waitlist.js";

export interface WaitlistDocument extends WaitlistInput, Document {
  createdAt: Date;
  updatedAt: Date;
}

const WaitlistSchema = new Schema<WaitlistDocument>(
  {
    businessName: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
    },
    contactName: {
      type: String,
      required: [true, "Contact name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    productCategory: {
      type: String,
      required: [true, "Product category is required"],
      trim: true,
    },
    exportInterest: {
      type: String,
      required: [true, "Export interest is required"],
      enum: ["Yes", "Exploring", "No"],
    },
  },
  {
    timestamps: true,
  }
);

// Create index on email for faster lookups
WaitlistSchema.index({ email: 1 });

export const Waitlist = mongoose.model<WaitlistDocument>("Waitlist", WaitlistSchema);


