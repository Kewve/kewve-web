import mongoose, { Document, Schema, Types } from "mongoose";

export type ClusterStatus = "open" | "pending" | "ready" | "closed";
export type ContributionStatus = "pending" | "approved" | "rejected";
export type ClusterSupplyStatus = "pending" | "delivered" | "verified" | "accepted";
export type ClusterSettlementPayoutStatus = "none" | "pending" | "completed" | "failed";

export interface ClusterSettlementPayout {
  status: ClusterSettlementPayoutStatus;
  amountCents?: number;
  stripeTransferId?: string;
  initiatedAt?: Date;
  errorMessage?: string;
}

export interface ClusterSettlementEntry {
  _id?: Types.ObjectId;
  contributionId?: Types.ObjectId;
  producerId: Types.ObjectId;
  producerName: string;
  productId: Types.ObjectId;
  productName: string;
  allocatedKg: number;
  sharePercent: number;
  grossShareCents: number;
  additionalFeesShareCents?: number;
  adjustmentCents: number;
  netPayoutCents: number;
  supplyStatus: ClusterSupplyStatus;
  payout: ClusterSettlementPayout;
}

export interface ClusterSettlement {
  computedAt: Date;
  buyerVolumeKg: number;
  totalAllocatedKg: number;
  subtotalCents: number;
  additionalFeesCents?: number;
  platformFeePercent: number;
  platformFeeCents: number;
  totalPaidCents: number;
  currency: string;
  market: string;
  timeline: string;
  entries: ClusterSettlementEntry[];
}

export interface ClusterDeliveryDestination {
  /** Snapshot of where goods must be delivered (set by admin). */
  mode: "buyer_profile" | "custom";
  address: {
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    country: string;
    phone?: string;
    company?: string;
  };
  setAt?: Date;
}

export interface ClusterPurchase {
  buyerId: Types.ObjectId;
  buyerName?: string;
  buyerEmail?: string;
  paidAt?: Date;
  stripeCheckoutSessionId?: string;
  volumeKg: number;
  market: string;
  timeline: string;
  /** Where to ship — admin chooses buyer saved address or a custom address; producers see this. */
  deliveryDestination?: ClusterDeliveryDestination;
  invoice?: {
    currency: string;
    subtotalCents: number;
    additionalFeesCents?: number;
    platformFeePercent: number;
    platformFeeCents: number;
    totalCents: number;
    generatedAt: Date;
    sentAt: Date;
  };
  buyerReceipt?: "none" | "received_ok" | "received_issues";
  buyerReceiptAt?: Date;
  buyerReceiptNotes?: string;
  issuesNeedAdmin?: boolean;
  refund?: {
    status: "none" | "pending" | "completed" | "failed";
    amountCents?: number;
    stripeRefundId?: string;
    refundedAt?: Date;
    note?: string;
    errorMessage?: string;
  };
}

export interface ClusterContribution {
  _id?: Types.ObjectId;
  producerId: Types.ObjectId;
  producerName: string;
  productId: Types.ObjectId;
  productName: string;
  committedKg: number;
  availableCapacityKg: number;
  status: ContributionStatus;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AggregationClusterDocument extends Document {
  clusterId: string;
  productName: string;
  category: string;
  productForm?: string;
  targetMarket: "UK" | "EU" | "Both";
  /** When set, only producers in this country (profile) may join; empty = no country filter (legacy). */
  supplyCountry?: string;
  minimumExportVolumeKg: number;
  availabilityWindow?: string;
  specificationSummary?: string;
  status: ClusterStatus;
  totalApprovedVolumeKg: number;
  contributions: ClusterContribution[];
  /** Set when a buyer completes cluster checkout — cluster is then closed to new supply */
  purchase?: ClusterPurchase;
  settlement?: ClusterSettlement;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContributionSchema = new Schema<ClusterContribution>(
  {
    producerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    producerName: { type: String, required: true, trim: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true, trim: true },
    committedKg: { type: Number, required: true, min: 1 },
    availableCapacityKg: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

const ClusterSettlementPayoutSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["none", "pending", "completed", "failed"],
      default: "none",
    },
    amountCents: { type: Number },
    stripeTransferId: { type: String },
    initiatedAt: { type: Date },
    errorMessage: { type: String },
  },
  { _id: false }
);

const ClusterSettlementEntrySchema = new Schema(
  {
    contributionId: { type: Schema.Types.ObjectId },
    producerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    producerName: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    allocatedKg: { type: Number, required: true },
    sharePercent: { type: Number, default: 0 },
    grossShareCents: { type: Number, default: 0 },
    additionalFeesShareCents: { type: Number, default: 0 },
    adjustmentCents: { type: Number, default: 0 },
    netPayoutCents: { type: Number, default: 0 },
    supplyStatus: {
      type: String,
      enum: ["pending", "delivered", "verified", "accepted"],
      default: "pending",
    },
    payout: { type: ClusterSettlementPayoutSchema, default: () => ({ status: "none" }) },
  },
  { timestamps: false }
);

const ClusterSettlementSchema = new Schema(
  {
    computedAt: { type: Date, required: true },
    buyerVolumeKg: { type: Number, required: true },
    totalAllocatedKg: { type: Number, required: true },
    subtotalCents: { type: Number, required: true },
    additionalFeesCents: { type: Number, default: 0 },
    platformFeePercent: { type: Number, default: 10 },
    platformFeeCents: { type: Number, required: true },
    totalPaidCents: { type: Number, required: true },
    currency: { type: String, default: "eur" },
    market: { type: String, default: "" },
    timeline: { type: String, default: "" },
    entries: { type: [ClusterSettlementEntrySchema], default: [] },
  },
  { _id: false }
);

const ClusterPurchaseSchema = new Schema(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    buyerName: { type: String, default: "" },
    buyerEmail: { type: String, default: "" },
    paidAt: { type: Date },
    stripeCheckoutSessionId: { type: String },
    volumeKg: { type: Number, required: true },
    market: { type: String, default: "" },
    timeline: { type: String, default: "" },
    invoice: {
      currency: { type: String, default: "eur" },
      subtotalCents: { type: Number, default: 0 },
      additionalFeesCents: { type: Number, default: 0 },
      platformFeePercent: { type: Number, default: 10 },
      platformFeeCents: { type: Number, default: 0 },
      totalCents: { type: Number, default: 0 },
      generatedAt: { type: Date },
      sentAt: { type: Date },
    },
    buyerReceipt: { type: String, enum: ["none", "received_ok", "received_issues"], default: "none" },
    buyerReceiptAt: { type: Date },
    buyerReceiptNotes: { type: String, default: "" },
    issuesNeedAdmin: { type: Boolean, default: false },
    refund: {
      status: { type: String, enum: ["none", "pending", "completed", "failed"], default: "none" },
      amountCents: { type: Number },
      stripeRefundId: { type: String },
      refundedAt: { type: Date },
      note: { type: String, default: "" },
      errorMessage: { type: String },
    },
    deliveryDestination: {
      mode: { type: String, enum: ["buyer_profile", "custom"] },
      address: {
        line1: { type: String, trim: true, default: "" },
        line2: { type: String, trim: true, default: "" },
        city: { type: String, trim: true, default: "" },
        postalCode: { type: String, trim: true, default: "" },
        country: { type: String, trim: true, default: "" },
        phone: { type: String, trim: true, default: "" },
        company: { type: String, trim: true, default: "" },
      },
      setAt: { type: Date },
    },
  },
  { _id: false }
);

const AggregationClusterSchema = new Schema<AggregationClusterDocument>(
  {
    clusterId: { type: String, required: true, unique: true, trim: true, uppercase: true },
    productName: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    productForm: { type: String, trim: true, default: "" },
    targetMarket: { type: String, enum: ["UK", "EU", "Both"], default: "Both" },
    supplyCountry: { type: String, trim: true, default: "" },
    minimumExportVolumeKg: { type: Number, required: true, min: 1 },
    availabilityWindow: { type: String, trim: true, default: "" },
    specificationSummary: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["open", "pending", "ready", "closed"], default: "open" },
    totalApprovedVolumeKg: { type: Number, default: 0 },
    contributions: { type: [ContributionSchema], default: [] },
    purchase: { type: ClusterPurchaseSchema },
    settlement: { type: ClusterSettlementSchema },
    createdBy: { type: String, trim: true, default: "admin" },
  },
  { timestamps: true }
);

AggregationClusterSchema.index({ category: 1, status: 1 });

export const AggregationCluster = mongoose.model<AggregationClusterDocument>(
  "AggregationCluster",
  AggregationClusterSchema
);

