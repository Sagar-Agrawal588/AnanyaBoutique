import fs from "fs/promises";
import mongoose from "mongoose";
import path from "path";
import connectDb from "../config/connectDb.js";
import { ensureOrderInvoice } from "../controllers/order.controller.js";
import AddressModel from "../models/address.model.js";
import ComboModel from "../models/combo.model.js";
import "../models/influencer.model.js";
import OrderModel, { generateFinalOrderId } from "../models/order.model.js";
import UserModel from "../models/user.model.js";
import { autoCreateShipmentForPaidOrder } from "../services/automatedShipping.service.js";
import {
  buildComboOrderSnapshot,
  expandComboToOrderProducts,
  resolveEffectiveComboUnitPrice,
} from "../services/combos/combo.service.js";
import {
  calculateTax,
  splitGstInclusiveAmount,
} from "../services/tax.service.js";
import { getAbsolutePathFromStoredInvoicePath } from "../utils/generateInvoicePdf.js";

const round2 = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const DEFAULT_STATE = "Rajasthan";
const DEFAULT_CITY = "Jaipur";
const DEFAULT_PINCODE = "302022";

const resolveAddressSeed = async (userId) => {
  const address = await AddressModel.findOne({ userId })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  return {
    fullName:
      String(address?.full_name || address?.name || "Demo Customer").trim() ||
      "Demo Customer",
    mobile:
      String(address?.mobile || address?.phone || "9876543210").trim() ||
      "9876543210",
    line1:
      String(
        address?.address_line1 || address?.flat_house || "Demo Address",
      ).trim() || "Demo Address",
    line2: String(
      address?.address_line2 || address?.area_street_sector || "",
    ).trim(),
    landmark: String(address?.landmark || "").trim(),
    city: String(address?.city || DEFAULT_CITY).trim() || DEFAULT_CITY,
    state: String(address?.state || DEFAULT_STATE).trim() || DEFAULT_STATE,
    pincode:
      String(address?.pincode || DEFAULT_PINCODE).trim() || DEFAULT_PINCODE,
    country: String(address?.country || "India").trim() || "India",
  };
};

const run = async () => {
  await connectDb();

  const user = await UserModel.findOne({})
    .select("_id name email mobile")
    .lean();
  if (!user?._id) {
    throw new Error("No user found for demo combo order.");
  }

  const combo = await ComboModel.findOne({
    isActive: true,
    items: { $exists: true, $ne: [] },
  }).lean();

  if (!combo?._id) {
    throw new Error("No active combo with items found in database.");
  }

  const comboQuantity = 1;
  const expandedProducts = expandComboToOrderProducts(combo, comboQuantity);
  if (!Array.isArray(expandedProducts) || expandedProducts.length === 0) {
    throw new Error("Selected combo does not expand to order products.");
  }

  const comboSnapshot = buildComboOrderSnapshot(combo, comboQuantity);
  const originalInclusiveAmount = round2(
    expandedProducts.reduce(
      (sum, item) => sum + Number(item?.subTotal || 0),
      0,
    ),
  );

  let comboInclusiveAmount = round2(
    resolveEffectiveComboUnitPrice(combo) * comboQuantity,
  );

  if (comboInclusiveAmount <= 0) {
    comboInclusiveAmount = originalInclusiveAmount;
  }
  if (
    originalInclusiveAmount > 0 &&
    comboInclusiveAmount > originalInclusiveAmount
  ) {
    comboInclusiveAmount = originalInclusiveAmount;
  }

  const addressSeed = await resolveAddressSeed(user._id);
  const baseSplit = splitGstInclusiveAmount(
    comboInclusiveAmount,
    5,
    addressSeed.state,
  );
  const taxableAmount = round2(baseSplit.taxableAmount || 0);
  const taxData = calculateTax(taxableAmount, addressSeed.state);
  const gstAmount = round2(taxData.tax || 0);

  const paidAt = new Date();
  const finalId = await generateFinalOrderId(paidAt);

  const demoOrder = new OrderModel({
    user: user._id,
    products: expandedProducts,
    combos: comboSnapshot ? [comboSnapshot] : [],
    subtotal: taxableAmount,
    totalAmt: comboInclusiveAmount,
    tax: gstAmount,
    shipping: 0,
    finalAmount: comboInclusiveAmount,
    originalPrice: originalInclusiveAmount,
    comboDiscount: round2(
      Math.max(originalInclusiveAmount - comboInclusiveAmount, 0),
    ),
    discount: 0,
    discountAmount: 0,
    paymentMethod: "TEST",
    payment_status: "paid",
    order_status: "accepted",
    status: "confirmed",
    statusTimeline: [
      {
        status: "pending",
        source: "DEMO_COMBO_ORDER",
        timestamp: paidAt,
      },
      {
        status: "accepted",
        source: "DEMO_COMBO_PAYMENT",
        timestamp: paidAt,
      },
    ],
    paymentCompletedAt: paidAt,
    confirmed_at: paidAt,
    confirmedAt: paidAt,
    final_id: finalId,
    orderNumber: finalId,
    displayOrderId: finalId,
    gst: {
      rate: Number(taxData.rate || 5),
      state: taxData.state || addressSeed.state,
      taxableAmount,
      cgst: Number(taxData.cgst || 0),
      sgst: Number(taxData.sgst || 0),
      igst: Number(taxData.igst || 0),
    },
    billingDetails: {
      fullName: String(
        user.name || addressSeed.fullName || "Demo Customer",
      ).trim(),
      email: String(user.email || "")
        .trim()
        .toLowerCase(),
      phone: String(user.mobile || addressSeed.mobile || "").trim(),
      address: [addressSeed.line1, addressSeed.line2]
        .filter(Boolean)
        .join(", "),
      pincode: addressSeed.pincode,
      state: addressSeed.state,
      city: addressSeed.city,
      flat_house: addressSeed.line1,
      area_street_sector: addressSeed.line2,
      landmark: addressSeed.landmark,
      country: addressSeed.country,
    },
    deliveryAddressSnapshot: {
      order_name: String(
        user.name || addressSeed.fullName || "Demo Customer",
      ).trim(),
      order_mobile: String(user.mobile || addressSeed.mobile || "").trim(),
      order_flat_house: addressSeed.line1,
      order_area: addressSeed.line2,
      order_landmark: addressSeed.landmark,
      order_city: addressSeed.city,
      order_state: addressSeed.state,
      order_pincode: addressSeed.pincode,
      country: addressSeed.country,
      address_line1: addressSeed.line1,
      address_line2: addressSeed.line2,
      full_address: [
        addressSeed.line1,
        addressSeed.line2,
        addressSeed.city,
        addressSeed.state,
        addressSeed.pincode,
      ]
        .filter(Boolean)
        .join(", "),
      email: String(user.email || "")
        .trim()
        .toLowerCase(),
      source: "demo_combo_script",
      address_id: "",
    },
    guestDetails: {},
    isDemoOrder: true,
    isSavedOrder: true,
    notes: `Demo combo invoice generation for combo ${String(combo.name || combo._id)}`,
  });

  await demoOrder.save();

  const invoiceResult = await ensureOrderInvoice(demoOrder, {
    forceRegenerate: true,
  });
  if (!invoiceResult?.ok) {
    throw new Error(invoiceResult?.reason || "Failed to generate invoice");
  }

  const shipmentAttempt = await autoCreateShipmentForPaidOrder({
    orderId: demoOrder._id,
    source: "DEMO_COMBO_INVOICE_SCRIPT",
  });

  const refreshed = await OrderModel.findById(demoOrder._id).lean();
  const invoiceAbsolutePath = getAbsolutePathFromStoredInvoicePath(
    refreshed?.invoicePath || "",
  );

  const output = {
    order: {
      mongoId: String(refreshed?._id || demoOrder._id),
      tempId: refreshed?.temp_id || null,
      finalId: refreshed?.final_id || null,
      displayOrderId: refreshed?.displayOrderId || null,
      comboName: String(combo?.name || ""),
      comboId: String(combo?._id || ""),
      paymentStatus: refreshed?.payment_status || null,
      orderStatus: refreshed?.order_status || null,
      status: refreshed?.status || null,
      total: round2(Number(refreshed?.finalAmount || refreshed?.totalAmt || 0)),
    },
    invoice: {
      generated: Boolean(invoiceResult?.ok),
      invoiceNumber: refreshed?.invoiceNumber || null,
      invoicePath: refreshed?.invoicePath || null,
      invoiceAbsolutePath: invoiceAbsolutePath || null,
    },
    expressbees: {
      attemptedByScript: true,
      skipped: Boolean(shipmentAttempt?.skipped),
      reason: shipmentAttempt?.reason || null,
      awbNumber: refreshed?.awbNumber || refreshed?.awb_number || null,
      shipmentStatus:
        refreshed?.shipmentStatus || refreshed?.shipment_status || "pending",
    },
  };

  const snapshotDir = path.resolve("./invoices/local-test-invoices");
  await fs.mkdir(snapshotDir, { recursive: true });
  const snapshotPath = path.join(snapshotDir, `DEMO-COMBO-${Date.now()}.json`);
  await fs.writeFile(snapshotPath, JSON.stringify(output, null, 2), "utf8");

  console.log(JSON.stringify({ ...output, snapshotPath }, null, 2));
};

run()
  .catch((error) => {
    console.error(
      "Demo combo order/invoice generation failed:",
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
