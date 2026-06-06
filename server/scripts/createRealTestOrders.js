import mongoose from "mongoose";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import connectDb from "../config/connectDb.js";
import CouponModel from "../models/coupon.model.js";
import OrderModel from "../models/order.model.js";
import ProductModel from "../models/product.model.js";
import UserModel from "../models/user.model.js";

const TARGET_EMAIL = "piyushsongara69@gmail.com";
const TARGET_PRODUCT_NAME = "Choco Millet Crisp Boutique Style";
const TARGET_VARIANT_LABEL = "500g";
const API_BASE_URL = String(process.env.TEST_ORDER_BASE_URL || "http://127.0.0.1:8000")
  .trim()
  .replace(/\/+$/, "");

const COUPONS = [
  {
    code: "WELCOME10",
    description: "Automated real test order coupon",
    discountType: "percentage",
    discountValue: 10,
    maxDiscountAmount: 500,
  },
  {
    code: "INFLUENCER",
    description: "Automated influencer-style coupon",
    discountType: "percentage",
    discountValue: 12,
    maxDiscountAmount: 500,
  },
];

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;
const execFileAsync = promisify(execFile);

const ensureCoupons = async () => {
  const now = new Date();
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  for (const coupon of COUPONS) {
    await CouponModel.findOneAndUpdate(
      { code: coupon.code },
      {
        $set: {
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minOrderAmount: 0,
          maxDiscountAmount: coupon.maxDiscountAmount,
          perUserLimit: 100,
          usageLimit: null,
          isActive: true,
          startDate: now,
          endDate,
        },
      },
      {
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );
  }
};

const createFreshUser = async (label) => {
  const uniqueEmail = `realtest-${String(label || "order")
    .trim()
    .toLowerCase()}-${Date.now()}@example.com`;

  const created = await UserModel.create({
    name: `Piyush Real Test ${label}`,
    email: uniqueEmail,
    password: "RealTest!234",
    status: "active",
    role: "User",
  });
  return created.toObject ? created.toObject() : created;
};

const resolveProduct = async () => {
  const product = await ProductModel.findOne({
    name: { $regex: new RegExp(`^${TARGET_PRODUCT_NAME}$`, "i") },
    isActive: { $ne: false },
  }).lean();

  if (!product?._id) {
    throw new Error(`Product not found: ${TARGET_PRODUCT_NAME}`);
  }

  const variant =
    Array.isArray(product.variants) &&
    (product.variants.find((entry) =>
      String(entry?.name || entry?.label || "")
        .toLowerCase()
        .includes(TARGET_VARIANT_LABEL.toLowerCase()),
    ) ||
      product.variants.find((entry) => entry?.isDefault) ||
      product.variants[0] ||
      null);
  const unitPrice = round2(Number(variant?.price ?? product.price ?? 0));

  return {
    product,
    payload: {
      productId: String(product._id),
      productTitle: String(product.name || "Product"),
      quantity: 1,
      price: unitPrice,
      subTotal: unitPrice,
      ...(variant?._id ? { variantId: String(variant._id) } : {}),
    },
  };
};

const createOrder = async ({ userId, productPayload, couponCode }) => {
  const requestBody = JSON.stringify({
    userId,
    products: [productPayload],
    couponCode,
    recipientEmail: TARGET_EMAIL,
    sendConfirmationEmail: true,
    notes: `Real automated test order with ${couponCode} and shippingStatus=manual`,
    shippingStatus: "manual",
  });

  const { stdout } = await execFileAsync("curl.exe", [
    "-sS",
    "-X",
    "POST",
    `${API_BASE_URL}/api/orders/test/create`,
    "-H",
    "Content-Type: application/json",
    "-d",
    requestBody,
  ]);

  const payload = JSON.parse(String(stdout || "{}"));
  if (!payload?.success) {
    throw new Error(payload?.message || "Order creation failed");
  }

  return payload.data;
};

const verifyRecentOrders = async () => {
  const orders = await OrderModel.find({})
    .sort({ createdAt: -1 })
    .limit(5)
    .select(
      "_id displayOrderId orderNumber createdAt couponCode invoicePath invoiceUrl paymentAppTxnId utrNumber shippingStatus payment_status status order_status",
    )
    .lean();

  return orders.map((order) => ({
    orderId: String(order._id),
    displayOrderId: order.displayOrderId || order.orderNumber || null,
    createdAt: order.createdAt,
    couponCode: order.couponCode || null,
    invoicePath: order.invoicePath || order.invoiceUrl || null,
    paymentAppTxnId: order.paymentAppTxnId || null,
    utrNumber: order.utrNumber ?? null,
    shippingStatus: order.shippingStatus || null,
    paymentStatus: order.payment_status || null,
    status: order.status || null,
    orderStatus: order.order_status || null,
  }));
};

const run = async () => {
  await connectDb();

  const [productInfo] = await Promise.all([
    resolveProduct(),
    ensureCoupons(),
  ]);

  const createdOrders = [];
  for (const coupon of COUPONS) {
    const user = await createFreshUser(coupon.code);
    const created = await createOrder({
      userId: String(user._id),
      productPayload: productInfo.payload,
      couponCode: coupon.code,
    });
    createdOrders.push({
      couponCode: coupon.code,
      orderId: created?.order?._id || created?.orderId || null,
      displayOrderId:
        created?.order?.displayOrderId || created?.order?.orderNumber || null,
      finalAmount:
        created?.order?.finalAmount || created?.order?.totalAmt || null,
      roundedAmount: created?.order?.roundedAmount || null,
      roundOff: created?.order?.roundOff ?? null,
      invoiceNumber:
        created?.invoice?.invoiceNumber || created?.order?.invoiceNumber || null,
      invoicePath:
        created?.invoice?.invoicePath || created?.order?.invoicePath || null,
      emailSent: Boolean(created?.email?.sent),
      paymentAppTxnId: created?.order?.paymentAppTxnId || null,
      utrNumber:
        created?.order?.utrNumber === undefined ? null : created?.order?.utrNumber,
    });
  }

  const recentOrders = await verifyRecentOrders();

  console.log(
    JSON.stringify(
      {
        apiBaseUrl: API_BASE_URL,
        email: TARGET_EMAIL,
        product: productInfo.product.name,
        createdOrders,
        recentOrders,
      },
      null,
      2,
    ),
  );
};

run()
  .catch((error) => {
    console.error("createRealTestOrders failed:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect failures
    }
  });
