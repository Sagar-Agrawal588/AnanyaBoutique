import mongoose from "mongoose";

const stockReservationSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    sessionId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
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
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "EXPIRED", "COMPLETED"],
      default: "ACTIVE",
      index: true,
    },
    source: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

stockReservationSchema.index(
  { orderId: 1, productId: 1, variantId: 1 },
  { unique: true },
);

const StockReservationModel =
  mongoose.models.StockReservation ||
  mongoose.model("StockReservation", stockReservationSchema);

export default StockReservationModel;
