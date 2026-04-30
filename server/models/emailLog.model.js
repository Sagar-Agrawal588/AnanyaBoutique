import mongoose from "mongoose";

const emailLogSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "order",
      default: null,
      index: true,
    },
    to_email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    email_type: {
      type: String,
      enum: [
        "order_confirmation",
        "feedback_7d",
        "retention_30d",
        "promotion",
        "newsletter",
        "campaign",
        "stock_back_in_stock",
        "order_payment_reminder",
        "system",
      ],
      required: true,
      index: true,
    },
    template_type: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    subject: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["queued", "sent", "failed", "skipped"],
      default: "queued",
      index: true,
    },
    provider: {
      type: String,
      default: "smtp",
      trim: true,
    },
    provider_message_id: {
      type: String,
      default: "",
      trim: true,
    },
    error_message: {
      type: String,
      default: "",
      trim: true,
    },
    sent_at: {
      type: Date,
      default: null,
      index: true,
    },
    delivered_at: {
      type: Date,
      default: null,
    },
    opened_at: {
      type: Date,
      default: null,
    },
    clicked_at: {
      type: Date,
      default: null,
    },
    open_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    click_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    segment: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

emailLogSchema.index({ email_type: 1, status: 1, createdAt: -1 });
emailLogSchema.index({ to_email: 1, createdAt: -1 });
emailLogSchema.index({ user_id: 1, createdAt: -1 });
emailLogSchema.index({ order_id: 1, createdAt: -1 });

const EmailLogModel = mongoose.model("EmailLog", emailLogSchema);
export default EmailLogModel;
