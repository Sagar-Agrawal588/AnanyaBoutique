import mongoose from "mongoose";

const DEFAULT_VISIBLE_PRODUCT_FIELDS = [
  "description",
  "shortDescription",
  "images",
  "category",
  "tags",
  "discount",
  "stock",
  "shipping",
  "hsnCode",
  "gstBreakup",
];

const partnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Partner name is required"],
      trim: true,
      maxlength: 160,
    },
    companyName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 160,
    },
    contactEmail: {
      type: String,
      required: [true, "Partner email is required"],
      trim: true,
      lowercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "paused", "revoked"],
      default: "active",
      index: true,
    },
    scopes: {
      type: [String],
      default: ["catalog.read", "inventory.read", "pricing.read", "gst.read"],
    },
    allowedOrigins: {
      type: [String],
      default: [],
    },
    rateLimitPerMinute: {
      type: Number,
      default: 120,
      min: 0,
    },
    dailyRequestLimit: {
      type: Number,
      default: 20000,
      min: 0,
    },
    dailyTokenLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    rateLimitPlan: {
      tier: {
        type: String,
        enum: ["free", "growth", "pro", "enterprise", "custom"],
        default: "custom",
      },
      baseRPM: {
        type: Number,
        default: 120,
        min: 0,
      },
      burstRPM: {
        type: Number,
        default: 220,
        min: 0,
      },
      dailyLimit: {
        type: Number,
        default: 20000,
        min: 0,
      },
      minDynamicRPM: {
        type: Number,
        default: 60,
        min: 0,
      },
      maxDynamicRPM: {
        type: Number,
        default: 4000,
        min: 0,
      },
      scalingEnabled: {
        type: Boolean,
        default: true,
      },
    },
    dynamicControls: {
      lockScaling: {
        type: Boolean,
        default: false,
      },
      manualOverrideRPM: {
        type: Number,
        default: null,
        min: 0,
      },
      manualOverrideDailyLimit: {
        type: Number,
        default: null,
        min: 0,
      },
      qualityScore: {
        type: Number,
        default: 1,
        min: 0.5,
        max: 1.5,
      },
      safeModeForced: {
        type: Boolean,
        default: false,
      },
    },
    lastUsedAt: {
      type: Date,
      default: null,
      index: true,
    },
    notes: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    visibleProductFields: {
      type: [String],
      default: DEFAULT_VISIBLE_PRODUCT_FIELDS,
    },
  },
  {
    timestamps: true,
  },
);

partnerSchema.index({ createdAt: -1 });

export default mongoose.model("Partner", partnerSchema);
