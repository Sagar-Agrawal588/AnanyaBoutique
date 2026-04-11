import mongoose from "mongoose";
import {
  CRM_CHANNELS,
  CRM_CONTACT_LIFECYCLE_STAGES,
  CRM_CONTACT_STATUSES,
} from "../services/crm/channelResolver.service.js";

const attributionSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: CRM_CHANNELS,
      default: null,
    },
    source: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },
    campaign: {
      type: String,
      default: "",
      trim: true,
      maxlength: 160,
    },
    referrer: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    pageUrl: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    sessionId: {
      type: String,
      default: "",
      trim: true,
      maxlength: 128,
    },
    happenedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const crmContactSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    sessionId: {
      type: String,
      default: null,
      trim: true,
      maxlength: 128,
      index: true,
    },
    name: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      maxlength: 160,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
      maxlength: 32,
    },
    sourceChannel: {
      type: String,
      enum: CRM_CHANNELS,
      default: "website",
      index: true,
    },
    lifecycleStage: {
      type: String,
      enum: CRM_CONTACT_LIFECYCLE_STAGES,
      default: "lead",
      index: true,
    },
    status: {
      type: String,
      enum: CRM_CONTACT_STATUSES,
      default: "open",
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    consent: {
      email: { type: Boolean, default: null },
      whatsapp: { type: Boolean, default: null },
      sms: { type: Boolean, default: null },
      push: { type: Boolean, default: null },
    },
    firstSeenAt: {
      type: Date,
      default: null,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
    firstAttribution: {
      type: attributionSchema,
      default: () => ({}),
    },
    lastAttribution: {
      type: attributionSchema,
      default: () => ({}),
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    interactionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastOrderAt: {
      type: Date,
      default: null,
    },
    lastInteractionAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

crmContactSchema.index(
  { user: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { user: { $type: "objectId" } },
  },
);
crmContactSchema.index(
  { email: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { email: { $type: "string" } },
  },
);
crmContactSchema.index(
  { phone: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { phone: { $type: "string" } },
  },
);
crmContactSchema.index({ sourceChannel: 1, lifecycleStage: 1, status: 1 });
crmContactSchema.index({ tags: 1 });
crmContactSchema.index({ lastInteractionAt: -1, updatedAt: -1 });

const CrmContact =
  mongoose.models.CrmContact || mongoose.model("CrmContact", crmContactSchema);

export default CrmContact;
