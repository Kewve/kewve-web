import mongoose, { Document, Schema, Types } from "mongoose";

export type BuyerRequestStatus = "pending" | "in_review" | "matched" | "closed";
export type BuyerRequestFulfillmentMode = "single" | "aggregation";

export type ProducerTradeDecision = "pending" | "accepted" | "declined";
export type TradeBuyerReceipt = "none" | "received_ok" | "received_issues";
export type TradeFulfillmentStatus =
  | "none"
  | "processing"
  | "dispatched"
  | "delivered"
  | "cancelled"
  | "completed";
export type TradePayoutStatus = "none" | "pending" | "completed" | "failed";
export type TradeRefundStatus = "none" | "pending" | "completed" | "failed";

export interface TradeIssueAdminNote {
  body: string;
  createdAt: Date;
  authorId?: Types.ObjectId;
  authorName?: string;
}

export interface BuyerRequestTradeInvoice {
  currency: string;
  platformFeePercent: number;
  /** Product line: unitPrice × volume (€, cents) */
  subtotalCents: number;
  /** Producer-added fees (e.g. delivery), not subject to platform % */
  additionalFeesCents?: number;
  /** Short label shown to buyer (e.g. "Delivery") */
  additionalFeesNote?: string;
  platformFeeCents: number;
  totalCents: number;
  generatedAt?: Date;
  sentAt?: Date;
  paidAt?: Date;
  stripeCheckoutSessionId?: string;
}

export interface BuyerRequestTradePayout {
  status: TradePayoutStatus;
  amountCents?: number;
  stripeTransferId?: string;
  initiatedAt?: Date;
  errorMessage?: string;
}

export interface BuyerRequestTradeRefund {
  status: TradeRefundStatus;
  amountCents?: number;
  stripeRefundId?: string;
  refundedAt?: Date;
  note?: string;
  errorMessage?: string;
}

export interface BuyerRequestTrade {
  producerDecision: ProducerTradeDecision;
  declinedReason?: string;
  declinedAt?: Date;
  invoice?: BuyerRequestTradeInvoice;
  fulfillmentStatus: TradeFulfillmentStatus;
  buyerReceipt: TradeBuyerReceipt;
  buyerReceiptNotes?: string;
  buyerReceiptAt?: Date;
  transactionClosed: boolean;
  transactionClosedAt?: Date;
  issuesNeedAdmin: boolean;
  /** Ops-only timeline (not shown to buyer/producer). */
  issueAdminNotes?: TradeIssueAdminNote[];
  /** Public message from ops when resolving a buyer-reported issue (buyer + producer + admin). */
  issueResolutionNote?: string;
  issuesResolvedAt?: Date;
  issuesResolvedBy?: Types.ObjectId;
  payout?: BuyerRequestTradePayout;
  refund?: BuyerRequestTradeRefund;
  /** Set when a producer cancels after the buyer has paid (requires reason; ops may reassign). */
  producerCancelledPaidOrderReason?: string;
  producerCancelledPaidOrderAt?: Date;
  awaitingProducerReassignment?: boolean;
  /** Set when admin confirms a paid cancellation as final cancellation. */
  adminCancelledPaidOrderReason?: string;
  adminCancelledPaidOrderAt?: Date;
  /** Buyer-visible note when admin reassigns/cancels a paid order. */
  adminBuyerNote?: string;
}

export type AllocationProducerResponse = "pending" | "accepted" | "declined";
export type AllocationFulfillmentStatus = "none" | "processing" | "dispatched" | "delivered" | "cancelled" | "completed";

export interface MatchedProducerAllocation {
  producerId: Types.ObjectId;
  producerName: string;
  productId: Types.ObjectId;
  productName: string;
  allocatedKg: number;
  availableCapacityKg: number;
  unitPrice?: number;
  producerResponse?: AllocationProducerResponse;
  fulfillmentStatus?: AllocationFulfillmentStatus;
  payout?: {
    status?: TradePayoutStatus;
    amountCents?: number;
    stripeTransferId?: string;
    initiatedAt?: Date;
    errorMessage?: string;
  };
  declinedReason?: string;
  declinedAt?: Date;
}

export interface BuyerRequestDeliveryAddress {
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
  company?: string;
}

export interface BuyerRequestDocument extends Document {
  buyerId: Types.ObjectId;
  buyerName: string;
  buyerEmail: string;
  producerId: Types.ObjectId;
  productId: Types.ObjectId;
  productName: string;
  category: string;
  volumeKg: number;
  market: string;
  timeline: string;
  packagingFormat?: string;
  otherInformation?: string;
  deliveryAddress?: BuyerRequestDeliveryAddress;
  status: BuyerRequestStatus;
  fulfillmentMode?: BuyerRequestFulfillmentMode;
  matchPlan?: {
    generatedAt: Date;
    requiredVolumeKg: number;
    totalAllocatedKg: number;
    remainingVolumeKg: number;
    matchedProducerCount: number;
    allocations: MatchedProducerAllocation[];
  };
  trade?: BuyerRequestTrade;
  createdAt: Date;
  updatedAt: Date;
}

const TradeInvoiceSchema = new Schema(
  {
    currency: { type: String, default: "eur" },
    platformFeePercent: { type: Number, default: 10 },
    subtotalCents: { type: Number },
    additionalFeesCents: { type: Number, default: 0 },
    additionalFeesNote: { type: String, trim: true, default: "" },
    platformFeeCents: { type: Number },
    totalCents: { type: Number },
    generatedAt: { type: Date },
    sentAt: { type: Date },
    paidAt: { type: Date },
    stripeCheckoutSessionId: { type: String, trim: true },
  },
  { _id: false }
);

const DeliveryAddressSchema = new Schema(
  {
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true, default: "" },
    city: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    company: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const TradePayoutSchema = new Schema(
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

const TradeRefundSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["none", "pending", "completed", "failed"],
      default: "none",
    },
    amountCents: { type: Number },
    stripeRefundId: { type: String },
    refundedAt: { type: Date },
    note: { type: String, default: "" },
    errorMessage: { type: String },
  },
  { _id: false }
);

const TradeIssueAdminNoteSchema = new Schema(
  {
    body: { type: String, required: true, maxlength: 4000 },
    createdAt: { type: Date, default: Date.now },
    authorId: { type: Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String, trim: true },
  },
  { _id: false }
);

const TradeSchema = new Schema(
  {
    producerDecision: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
    declinedReason: { type: String, default: "" },
    declinedAt: { type: Date },
    invoice: { type: TradeInvoiceSchema },
    fulfillmentStatus: {
      type: String,
      enum: ["none", "processing", "dispatched", "delivered", "cancelled", "completed"],
      default: "none",
    },
    buyerReceipt: {
      type: String,
      enum: ["none", "received_ok", "received_issues"],
      default: "none",
    },
    buyerReceiptNotes: { type: String, default: "" },
    buyerReceiptAt: { type: Date },
    transactionClosed: { type: Boolean, default: false },
    transactionClosedAt: { type: Date },
    issuesNeedAdmin: { type: Boolean, default: false },
    issueAdminNotes: { type: [TradeIssueAdminNoteSchema], default: undefined },
    issueResolutionNote: { type: String, default: "" },
    issuesResolvedAt: { type: Date },
    issuesResolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    payout: { type: TradePayoutSchema },
    refund: { type: TradeRefundSchema },
    producerCancelledPaidOrderReason: { type: String, default: "" },
    producerCancelledPaidOrderAt: { type: Date },
    awaitingProducerReassignment: { type: Boolean, default: false },
    adminCancelledPaidOrderReason: { type: String, default: "" },
    adminCancelledPaidOrderAt: { type: Date },
    adminBuyerNote: { type: String, default: "" },
  },
  { _id: false }
);

const BuyerRequestSchema = new Schema<BuyerRequestDocument>(
  {
    buyerId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    buyerName: { type: String, required: true, trim: true },
    buyerEmail: { type: String, required: true, trim: true, lowercase: true },
    producerId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    productId: { type: Schema.Types.ObjectId, required: true, ref: "Product" },
    productName: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    volumeKg: { type: Number, required: true, min: 1 },
    market: { type: String, required: true, trim: true },
    timeline: { type: String, required: true, trim: true },
    packagingFormat: { type: String, trim: true, default: "" },
    otherInformation: { type: String, trim: true, default: "", maxlength: 2000 },
    deliveryAddress: { type: DeliveryAddressSchema },
    status: {
      type: String,
      enum: ["pending", "in_review", "matched", "closed"],
      default: "pending",
    },
    fulfillmentMode: {
      type: String,
      enum: ["single", "aggregation"],
    },
    matchPlan: {
      generatedAt: { type: Date },
      requiredVolumeKg: { type: Number },
      totalAllocatedKg: { type: Number },
      remainingVolumeKg: { type: Number },
      matchedProducerCount: { type: Number },
      allocations: [
        {
          producerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
          producerName: { type: String, required: true },
          productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
          productName: { type: String, required: true },
          allocatedKg: { type: Number, required: true },
          availableCapacityKg: { type: Number, required: true },
          unitPrice: { type: Number },
          producerResponse: {
            type: String,
            enum: ["pending", "accepted", "declined"],
            default: "pending",
          },
          fulfillmentStatus: {
            type: String,
            enum: ["none", "processing", "dispatched", "delivered", "cancelled", "completed"],
            default: "none",
          },
          payout: { type: TradePayoutSchema },
          declinedReason: { type: String, default: "" },
          declinedAt: { type: Date },
        },
      ],
    },
    trade: { type: TradeSchema },
  },
  { timestamps: true }
);

export const BuyerRequest = mongoose.model<BuyerRequestDocument>("BuyerRequest", BuyerRequestSchema);

