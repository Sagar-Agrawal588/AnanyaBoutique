import mongoose from "mongoose";

const stockNotificationSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    variant_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
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
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    notification_status: {
      type: String,
      enum: ["pending", "queued", "sent", "failed"],
      default: "pending",
      index: true,
    },
    queued_at: {
      type: Date,
      default: null,
    },
    last_attempt_at: {
      type: Date,
      default: null,
    },
    last_failure_at: {
      type: Date,
      default: null,
    },
    last_error: {
      type: String,
      default: "",
      trim: true,
    },
    email_log_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailLog",
      default: null,
      index: true,
    },
    restock_batch_key: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    restocked_at: {
      type: Date,
      default: null,
    },
    notified: {
      type: Boolean,
      default: false,
      index: true,
    },
    notified_at: {
      type: Date,
      default: null,
    },
    converted_at: {
      type: Date,
      default: null,
    },
    converted_order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "order",
      default: null,
      index: true,
    },
    conversion_source: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    versionKey: false,
    collection: "stock_notifications",
  },
);

stockNotificationSchema.index(
  { product_id: 1, variant_id: 1, user_id: 1, notified: 1 },
  {
    unique: true,
    partialFilterExpression: {
      user_id: { $type: "objectId" },
      notified: false,
    },
  },
);

stockNotificationSchema.index(
  { product_id: 1, variant_id: 1, email: 1, notified: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $gt: "" },
      notified: false,
    },
  },
);

stockNotificationSchema.index({
  product_id: 1,
  variant_id: 1,
  notification_status: 1,
  notified: 1,
  created_at: -1,
});

stockNotificationSchema.index({
  product_id: 1,
  user_id: 1,
  email: 1,
  created_at: -1,
});

const StockNotificationModel = mongoose.model(
  "StockNotification",
  stockNotificationSchema,
);

export default StockNotificationModel;
