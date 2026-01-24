import mongoose, { Schema, Document } from "mongoose";
import * as bcrypt from "bcryptjs";

export interface UserDocument extends Document {
  email: string;
  password: string;
  name: string;
  businessName?: string;
  country?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't return password by default
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    businessName: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.default.hash(this.password, 12);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.default.compare(candidatePassword, this.password);
};

// Note: email index is automatically created by unique: true in the schema

export const User = mongoose.model<UserDocument>("User", UserSchema);
