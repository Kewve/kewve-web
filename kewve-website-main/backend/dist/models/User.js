import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
const SavedDeliveryAddressSchema = new Schema({
    line1: { type: String, trim: true, default: "" },
    line2: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    postalCode: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    company: { type: String, trim: true, default: "" },
}, { _id: false });
const UserSchema = new Schema({
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
        enum: ["producer", "buyer", "admin"],
        default: "producer",
    },
    roles: {
        type: [String],
        validate: {
            validator: (v) => Array.isArray(v) && v.length > 0 && v.every((r) => ["producer", "buyer", "admin"].includes(r)),
            message: "roles must be one or more of: producer, buyer, admin",
        },
        default: undefined,
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
        default: true,
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
    stripeConnectAccountId: {
        type: String,
        trim: true,
        default: "",
    },
    savedDeliveryAddress: { type: SavedDeliveryAddressSchema },
}, {
    timestamps: true,
});
UserSchema.pre("save", async function (next) {
    // Avoid TS2590 ("union type too complex") from `this` in Mongoose middleware typings.
    const doc = this;
    if (!doc.roles?.length) {
        doc.roles = [(doc.role || "producer")];
    }
    const r = doc.roles.map(String);
    if (r.includes("admin"))
        doc.role = "admin";
    else if (r.includes("producer"))
        doc.role = "producer";
    else if (r.includes("buyer"))
        doc.role = "buyer";
    else
        doc.role = "producer";
    if (!doc.isModified("password"))
        return next();
    doc.password = await bcrypt.hash(doc.password, 12);
    next();
});
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};
export const User = mongoose.model("User", UserSchema);
