import mongoose, { Schema } from "mongoose";
export const PRODUCT_CATEGORIES = [
    "Grains & Cereals",
    "Spices & Herbs",
    "Seeds & Nuts",
    "Oils & Fats",
    "Beverages",
    "Fresh Produce",
    "Processed Food",
    "Others",
];
const ProductComplianceDocSchema = new Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    data: { type: Schema.Types.Buffer, required: true },
    size: { type: Number, required: true },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    rejectionReason: { type: String },
    reviewedAt: { type: Date },
    uploadedAt: { type: Date, default: Date.now },
}, { _id: true });
const ProductSchema = new Schema({
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
    complianceDocuments: {
        type: [ProductComplianceDocSchema],
        default: [],
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
    rejectionReason: {
        type: String,
        default: "",
    },
    aggregation: {
        type: String,
        enum: ["not_eligible", "eligible"],
        default: "not_eligible",
    },
}, {
    timestamps: true,
});
ProductSchema.index({ userId: 1 });
export const Product = mongoose.model("Product", ProductSchema);
