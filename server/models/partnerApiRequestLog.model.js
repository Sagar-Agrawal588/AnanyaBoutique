import mongoose from "mongoose";

const partnerApiRequestLogSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      index: true,
      default: null,
    },
    keyPrefix: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    method: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    endpoint: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    statusCode: {
      type: Number,
      default: 0,
      index: true,
    },
    ipAddress: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    userAgent: {
      type: String,
      default: "",
      trim: true,
    },
    responseTimeMs: {
      type: Number,
      default: 0,
      min: 0,
    },
    scope: {
      type: String,
      default: "",
      trim: true,
    },
    errorCode: {
      type: String,
      default: "",
      trim: true,
    },
    tokensUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

partnerApiRequestLogSchema.index({ createdAt: -1 });
partnerApiRequestLogSchema.index({ partnerId: 1, createdAt: -1 });
partnerApiRequestLogSchema.index({ keyPrefix: 1, createdAt: -1 });

export default mongoose.model("PartnerApiRequestLog", partnerApiRequestLogSchema);
