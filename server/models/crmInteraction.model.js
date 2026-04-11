import mongoose from "mongoose";
import {
  CRM_CHANNELS,
  CRM_DIRECTIONS,
  CRM_INTERACTION_EVENT_TYPES,
} from "../services/crm/channelResolver.service.js";

const crmInteractionSchema = new mongoose.Schema(
  {
    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CrmContact",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    channel: {
      type: String,
      enum: CRM_CHANNELS,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: CRM_INTERACTION_EVENT_TYPES,
      required: true,
      index: true,
    },
    eventName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 160,
    },
    direction: {
      type: String,
      enum: CRM_DIRECTIONS,
      default: "system",
    },
    message: {
      type: String,
      default: "",
      trim: true,
      maxlength: 4000,
    },
    pageUrl: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    referrer: {
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
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "order",
      default: null,
      index: true,
    },
    supportTicketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "supportTicket",
      default: null,
      index: true,
    },
    newsletterSource: {
      type: String,
      default: "",
      trim: true,
      maxlength: 80,
    },
    campaign: {
      source: { type: String, default: "", trim: true, maxlength: 120 },
      medium: { type: String, default: "", trim: true, maxlength: 120 },
      campaign: { type: String, default: "", trim: true, maxlength: 160 },
      term: { type: String, default: "", trim: true, maxlength: 160 },
      content: { type: String, default: "", trim: true, maxlength: 160 },
    },
    happenedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    idempotencyKey: {
      type: String,
      default: null,
      trim: true,
      maxlength: 200,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

crmInteractionSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  },
);
crmInteractionSchema.index({ contact: 1, happenedAt: -1, createdAt: -1 });
crmInteractionSchema.index({ user: 1, happenedAt: -1 });
crmInteractionSchema.index({ channel: 1, eventType: 1, happenedAt: -1 });

const CrmInteraction =
  mongoose.models.CrmInteraction ||
  mongoose.model("CrmInteraction", crmInteractionSchema);

export default CrmInteraction;
