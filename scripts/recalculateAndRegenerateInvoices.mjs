import dotenv from "dotenv";
import mongoose from "../server/node_modules/mongoose/index.js";
import connectDb from "../server/config/connectDb.js";
import InvoiceModel from "../server/models/invoice.model.js";
import OrderModel from "../server/models/order.model.js";
import ProductModel from "../server/models/product.model.js";
import "../server/models/user.model.js";
import {
  calculateInclusiveOrderPricing,
} from "../server/utils/pricingEngine.js";
import {
  generateInvoicePdf,
  getAbsolutePathFromStoredInvoicePath,
} from "../server/utils/generateInvoicePdf.js";

dotenv.config({ path: new URL("../server/.env", import.meta.url) });
dotenv.config();

const FIXED_SELLER_DETAILS = Object.freeze({
  name: "Ananya Boutique",
  gstin: "08AAJCB3889Q1ZO",
  address: "G-225, RIICO INDUSTRIAL AREA SITAPURA, TONK ROAD, JAIPUR-302022",
  state: "Rajasthan",
  placeOfSupplyStateCode: "08",
  cin: "U51909RJ2020PTC071817",
  msme: "UDYAM-RJ-17-0154669",
  fssai: "12224027000921",
  currencySymbol: "Rs. ",
  jurisdictionLine: "SUBJECT TO JAIPUR JURISDICTION",
  bankName: "ICICI BANK LIMITED",
  bankAccount: "731405000083",
  bankBranch: "SITAPURA",
  bankIfsc: "ICIC0006748",
});

const round2 = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const getIstDayBounds = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value || "1970";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";
  const start = new Date(`${year}-${month}-${day}T00:00:00+05:30`);
  const end = new Date(`${year}-${month}-${day}T23:59:59.999+05:30`);
  return { start, end };
};

const buildProductMetaById = async (order) => {
  const productIds = Array.from(
    new Set(
      (Array.isArray(order?.products) ? order.products : [])
        .map((item) => String(item?.productId || ""))
        .filter(Boolean),
    ),
  );
  if (productIds.length === 0) return {};

  const products = await ProductModel.find({ _id: { $in: productIds } })
    .select("_id hsnCode specifications unit weight")
    .lean();

  const map = {};
  for (const product of products) {
    map[String(product._id)] = {
      hsn: String(product?.hsnCode || "").trim() || "2106",
      unit: product?.unit || "Nos",
      weight: Number(product?.weight || 0),
      taxRate: Number(order?.gst?.rate || 5),
    };
  }
  return map;
};

const hasTargetDiscount = (order) =>
  Number(order?.discount || 0) > 0 ||
  Number(order?.discountAmount || 0) > 0 ||
  Number(order?.comboDiscount || 0) > 0 ||
  Number(order?.membershipDiscount || 0) > 0 ||
  Number(order?.influencerDiscount || 0) > 0 ||
  Boolean(String(order?.couponCode || "").trim()) ||
  Boolean(String(order?.influencerCode || "").trim());

const run = async () => {
  await connectDb();
  const { start, end } = getIstDayBounds(new Date());

  const orders = await OrderModel.find({
    createdAt: { $gte: start, $lte: end },
    $or: [
      { discount: { $gt: 0 } },
      { discountAmount: { $gt: 0 } },
      { comboDiscount: { $gt: 0 } },
      { membershipDiscount: { $gt: 0 } },
      { influencerDiscount: { $gt: 0 } },
      { couponCode: { $exists: true, $ne: "" } },
      { influencerCode: { $exists: true, $ne: "" } },
    ],
  })
    .populate("user", "name email")
    .populate("delivery_address")
    .sort({ createdAt: 1 })
    .exec();

  console.log(`Recalculating ${orders.length} orders from ${start.toISOString()} to ${end.toISOString()}`);

  let updated = 0;
  let failed = 0;

  for (const order of orders) {
    try {
      const originalPrice = round2(
        Number(
          order?.originalPrice ??
            (Number(order?.subtotal || 0) + Number(order?.discount || 0)),
        ),
      );
      const totalDiscount = round2(
        Number(
          order?.discount ??
            (Number(order?.discountAmount || 0) +
              Number(order?.comboDiscount || 0) +
              Number(order?.membershipDiscount || 0) +
              Number(order?.influencerDiscount || 0)),
        ),
      );
      if (!hasTargetDiscount(order)) {
        continue;
      }

      const pricing = calculateInclusiveOrderPricing({
        originalPrice,
        discount: totalDiscount,
        gstRate: Number(order?.gst?.rate || 5),
        shipping: Number(order?.shipping || 0),
        coinRedemption: Number(order?.coinRedemption?.amount || 0),
        state:
          order?.billingDetails?.state ||
          order?.guestDetails?.state ||
          order?.delivery_address?.state ||
          "",
      });
      const invoiceMeta = await buildProductMetaById(order);
      const invoice = await generateInvoicePdf({
        order: {
          ...order.toObject(),
          basePrice: pricing.basePrice,
          discountedPrice: pricing.discountedPrice,
          total: pricing.total,
          totalAmt: pricing.total,
          finalAmount: pricing.total,
          roundedAmount: pricing.roundedTotal,
          roundedTotal: pricing.roundedTotal,
          roundOff: pricing.roundOff,
          pricing,
          tax: pricing.gst,
          subtotal: pricing.discountedPrice,
          gst: {
            ...(order?.gst || {}),
            rate: pricing.gstRate,
            taxableAmount: pricing.discountedPrice,
            totalTax: pricing.gst,
            cgst: 0,
            sgst: 0,
            igst: pricing.gst,
          },
        },
        sellerDetails: FIXED_SELLER_DETAILS,
        productMetaById: invoiceMeta,
        forceRegenerate: true,
      });

      await OrderModel.updateOne(
        { _id: order._id },
        {
          $set: {
            basePrice: pricing.basePrice,
            discountedPrice: pricing.discountedPrice,
            subtotal: pricing.discountedPrice,
            tax: pricing.gst,
            total: pricing.total,
            totalAmt: pricing.total,
            finalAmount: pricing.total,
            roundedAmount: pricing.roundedTotal,
            roundedTotal: pricing.roundedTotal,
            roundOff: pricing.roundOff,
            pricing,
            gst: {
              ...(order?.gst || {}),
              rate: pricing.gstRate,
              taxableAmount: pricing.discountedPrice,
              totalTax: pricing.gst,
              cgst: 0,
              sgst: 0,
              igst: pricing.gst,
            },
            invoiceNumber: invoice.invoiceNumber,
            invoicePath: invoice.invoicePath,
            invoiceGeneratedAt: invoice.invoiceGeneratedAt,
            invoiceUrl: invoice.invoicePath,
            isInvoiceGenerated: true,
          },
        },
      );

      await InvoiceModel.findOneAndUpdate(
        { orderId: order._id },
        {
          orderId: order._id,
          invoiceNumber: invoice.invoiceNumber,
          subtotal: pricing.discountedPrice,
          taxBreakdown: {
            rate: pricing.gstRate,
            state:
              order?.billingDetails?.state ||
              order?.guestDetails?.state ||
              order?.delivery_address?.state ||
              "",
            taxableAmount: pricing.discountedPrice,
            cgst: 0,
            sgst: 0,
            igst: pricing.gst,
            totalTax: pricing.gst,
          },
          shipping: 0,
          total: pricing.total,
          invoicePath: invoice.invoicePath,
        },
        { upsert: true, new: true, runValidators: true },
      );

      updated += 1;
    } catch (error) {
      failed += 1;
      console.error(`FAILED ${order?._id}: ${error?.message || error}`);
    }
  }

  console.log(JSON.stringify({ scanned: orders.length, updated, failed }, null, 2));
  await mongoose.connection.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
