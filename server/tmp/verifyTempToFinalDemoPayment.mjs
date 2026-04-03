import mongoose from "mongoose";
import connectDb from "../config/connectDb.js";
import "../models/address.model.js";
import "../models/influencer.model.js";
import OrderModel, { generateFinalOrderId } from "../models/order.model.js";
import ProductModel from "../models/product.model.js";
import UserModel from "../models/user.model.js";
import { autoCreateShipmentForPaidOrder } from "../services/automatedShipping.service.js";

const round2 = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const run = async () => {
  await connectDb();

  const user = await UserModel.findOne({})
    .select("_id name email mobile")
    .lean();
  if (!user?._id) {
    throw new Error("No user found to run demo validation.");
  }

  const product = await ProductModel.findOne({})
    .select("_id name price images thumbnail sku hsnCode")
    .lean();
  if (!product?._id) {
    throw new Error("No product found to run demo validation.");
  }

  const quantity = 1;
  const unitPrice = Math.max(round2(Number(product.price || 199)), 1);
  const lineTotal = round2(unitPrice * quantity);

  const order = new OrderModel({
    user: user._id,
    products: [
      {
        productId: String(product._id),
        productTitle:
          String(product.name || "Demo Product").trim() || "Demo Product",
        variantId: null,
        variantName: "",
        sku: String(product.sku || "DEMO-SKU")
          .trim()
          .toUpperCase(),
        hsnCode: String(product.hsnCode || "").trim(),
        quantity,
        price: unitPrice,
        image: product.images?.[0] || product.thumbnail || "",
        subTotal: lineTotal,
      },
    ],
    subtotal: lineTotal,
    totalAmt: lineTotal,
    tax: 0,
    shipping: 0,
    finalAmount: lineTotal,
    paymentMethod: "PENDING",
    payment_status: "pending",
    order_status: "pending",
    status: "pending",
    isDemoOrder: true,
    notes: "TMP->FINAL demo payment validation (shipping disabled)",
  });

  await order.save();

  const beforePayment = {
    mongoId: String(order._id),
    tempId: order.temp_id || null,
    finalId: order.final_id || null,
    displayOrderId: order.displayOrderId || null,
    paymentStatus: order.payment_status,
    orderStatus: order.order_status,
    status: order.status,
  };

  const paidAt = new Date();
  const generatedFinalId = await generateFinalOrderId(
    order.createdAt || paidAt,
  );

  order.payment_status = "paid";
  order.paymentCompletedAt = paidAt;
  order.paymentMethod = "TEST";
  order.order_status = "accepted";
  order.status = "confirmed";
  order.final_id = generatedFinalId;
  order.orderNumber = generatedFinalId;
  order.displayOrderId = generatedFinalId;
  order.confirmed_at = paidAt;
  order.confirmedAt = paidAt;
  await order.save();

  const shipmentAttempt = await autoCreateShipmentForPaidOrder({
    orderId: order._id,
    source: "DEMO_PAYMENT_VALIDATION",
  });

  const refreshed = await OrderModel.findById(order._id).lean();

  const afterPayment = {
    mongoId: String(refreshed?._id || order._id),
    tempId: refreshed?.temp_id || null,
    finalId: refreshed?.final_id || null,
    displayOrderId: refreshed?.displayOrderId || null,
    paymentStatus: refreshed?.payment_status || null,
    orderStatus: refreshed?.order_status || null,
    status: refreshed?.status || null,
    awbNumber: refreshed?.awbNumber || refreshed?.awb_number || null,
    shipmentStatus:
      refreshed?.shipmentStatus || refreshed?.shipment_status || null,
  };

  const checks = {
    tempIdAssigned: /^TMP-[A-Z0-9]{6}$/.test(
      String(beforePayment.tempId || ""),
    ),
    finalIdAssigned: /^[A-Z0-9]+-\d{4}\/\d{4}$/.test(
      String(afterPayment.finalId || ""),
    ),
    tempToFinalTransition:
      Boolean(beforePayment.tempId) &&
      Boolean(afterPayment.finalId) &&
      String(beforePayment.tempId) !== String(afterPayment.finalId),
    paymentMarkedPaid: String(afterPayment.paymentStatus || "") === "paid",
    shipmentSkippedForDemo:
      Boolean(shipmentAttempt?.skipped) &&
      String(shipmentAttempt?.reason || "") === "DEMO_ORDER_SHIPPING_DISABLED",
    expressbeesNotTriggered:
      !String(afterPayment.awbNumber || "").trim() &&
      String(afterPayment.shipmentStatus || "pending") === "pending",
  };

  console.log(
    JSON.stringify(
      {
        beforePayment,
        afterPayment,
        shipmentAttempt: {
          ok: Boolean(shipmentAttempt?.ok),
          skipped: Boolean(shipmentAttempt?.skipped),
          reason: shipmentAttempt?.reason || null,
        },
        checks,
      },
      null,
      2,
    ),
  );
};

run()
  .catch((error) => {
    console.error(
      "Demo TMP->FINAL validation failed:",
      error?.message || error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect errors
    }
  });
