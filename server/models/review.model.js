import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    comboId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Combo",
      default: null,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "order",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
      maxLength: 120,
    },
    userEmail: {
      type: String,
      default: "",
      trim: true,
      maxLength: 160,
    },
    city: {
      type: String,
      default: "",
      trim: true,
      maxLength: 120,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxLength: 2000,
    },
    source: {
      type: String,
      enum: ["order", "public", "admin"],
      default: "order",
      index: true,
    },
    visibility: {
      type: String,
      enum: ["visible", "hidden", "pending"],
      default: "visible",
      index: true,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
      index: true,
    },
    moderatedAt: {
      type: Date,
      default: null,
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

reviewSchema.index(
  { orderId: 1, productId: 1, variantId: 1, userId: 1 },
  { unique: true },
);
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ productId: 1, createdAt: -1 });
reviewSchema.index({ productId: 1, variantId: 1, visibility: 1, createdAt: -1 });
reviewSchema.index({ comboId: 1, createdAt: -1 });
reviewSchema.index({ orderId: 1, createdAt: -1 });
reviewSchema.index({ productId: 1, visibility: 1, createdAt: -1 });
reviewSchema.index({ comboId: 1, visibility: 1, createdAt: -1 });
reviewSchema.index({ source: 1, visibility: 1, createdAt: -1 });

const ReviewModel = mongoose.model("Review", reviewSchema);

export default ReviewModel;
