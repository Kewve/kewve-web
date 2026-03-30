import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
const BuyerSchema = new Schema({
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
        select: false,
    },
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
    },
    role: {
        type: String,
        enum: ["buyer"],
        default: "buyer",
    },
    businessName: {
        type: String,
        trim: true,
    },
    country: {
        type: String,
        trim: true,
    },
    discountCodeUsed: {
        type: String,
        trim: true,
        uppercase: true,
    },
    emailVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationToken: {
        type: String,
        select: false,
    },
    emailVerificationTokenExpiry: {
        type: Date,
        select: false,
    },
    resetToken: {
        type: String,
        select: false,
    },
    resetTokenExpiry: {
        type: Date,
        select: false,
    },
}, {
    timestamps: true,
});
BuyerSchema.pre("save", async function (next) {
    if (!this.isModified("password"))
        return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});
BuyerSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};
export const Buyer = mongoose.model("Buyer", BuyerSchema);
