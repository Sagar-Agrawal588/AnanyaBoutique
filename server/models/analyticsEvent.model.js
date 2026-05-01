import mongoose from "mongoose";

const analyticsEventSchema = new mongoose.Schema(
  {
    event_type: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
    collection: "analytics_events",
  },
);

analyticsEventSchema.index({ product_id: 1, event_type: 1, created_at: -1 });
analyticsEventSchema.index({ user_id: 1, created_at: -1 });
analyticsEventSchema.index({ email: 1, created_at: -1 });

const AnalyticsEventModel = mongoose.model(
  "AnalyticsEvent",
  analyticsEventSchema,
);

export default AnalyticsEventModel;
