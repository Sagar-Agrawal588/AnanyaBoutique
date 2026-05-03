import mongoose from "mongoose";
import connectDb from "../config/connectDb.js";
import CouponModel from "../models/coupon.model.js";
import InfluencerModel from "../models/influencer.model.js";
import ProductModel from "../models/product.model.js";
import UserModel from "../models/user.model.js";

const DEFAULT_BASE_URL = process.env.TEST_ORDER_BASE_URL || "http://127.0.0.1:8000";
const TARGET_EMAIL = String(
  process.env.TEST_ORDER_EMAIL || "piyushsongara69@gmail.com",
)
  .trim()
  .toLowerCase();
const PRODUCT_NAME = "Choco Millet Crisp Peanut Butter";
const WELCOME_COUPON_CODE = "WELCOME10";

const getArgValue = (prefix) =>
  process.argv.find((arg) => String(arg || "").startsWith(prefix))?.slice(prefix.length) || "";

const influencerCodeArg = String(getArgValue("--influencer=") || "")
  .trim()
  .toUpperCase();
const baseUrl = String(getArgValue("--base-url=") || DEFAULT_BASE_URL)
  .trim()
  .replace(/\/+$/, "");

const ensureWelcomeCoupon = async () => {
  const now = new Date();
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const coupon = await CouponModel.findOneAndUpdate(
    { code: WELCOME_COUPON_CODE },
    {
      $set: {
        description: "Automated test coupon",
        discountType: "percentage",
        discountValue: 10,
        minOrderAmount: 0,
        maxDiscountAmount: 500,
        perUserLimit: 50,
        usageLimit: null,
        isActive: true,
        startDate: now,
        endDate,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  );

  return coupon;
};

const ensureTestUser = async () => {
  const existing = await UserModel.findOne({ email: TARGET_EMAIL });
  if (existing) return existing;

  return UserModel.create({
    name: "Piyush Test Orders",
    email: TARGET_EMAIL,
    password: "TestOrders!234",
    status: "active",
    role: "User",
  });
};

const resolveProductPayload = async () => {
  const product = await ProductModel.findOne({
    name: { $regex: new RegExp(`^${PRODUCT_NAME}$`, "i") },
    isActive: { $ne: false },
  }).lean();

  if (!product?._id) {
    throw new Error(`Product not found: ${PRODUCT_NAME}`);
  }

  const defaultVariant =
    Array.isArray(product.variants) &&
    (product.variants.find((variant) => variant?.isDefault) ||
      product.variants[0] ||
      null);

  return {
    product,
    payload: [
      {
        productId: String(product._id),
        productTitle: String(product.name || "Product"),
        quantity: 1,
        price: Number(defaultVariant?.price ?? product.price ?? 0),
        subTotal: Number(defaultVariant?.price ?? product.price ?? 0),
        ...(defaultVariant?._id
          ? { variantId: String(defaultVariant._id) }
          : {}),
      },
    ],
  };
};

const resolveInfluencerCode = async () => {
  if (influencerCodeArg) {
    const influencer = await InfluencerModel.findOne({
      code: influencerCodeArg,
      isActive: true,
    })
      .select("code")
      .lean();
    if (!influencer?.code) {
      throw new Error(`Active influencer not found for code ${influencerCodeArg}`);
    }
    return influencer.code;
  }

  const influencer = await InfluencerModel.findOne({ isActive: true })
    .sort({ updatedAt: -1, createdAt: -1 })
    .select("code")
    .lean();

  if (!influencer?.code) {
    throw new Error(
      "No active influencer code found. Pass one with --influencer=CODE.",
    );
  }

  return influencer.code;
};

const createOrder = async (payload) => {
  const response = await fetch(`${baseUrl}/api/orders/test/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new Error(
      data?.message ||
        `Test order request failed with status ${response.status}`,
    );
  }

  return data?.data || {};
};

const run = async () => {
  await connectDb();

  const [coupon, user, productInfo, influencerCode] = await Promise.all([
    ensureWelcomeCoupon(),
    ensureTestUser(),
    resolveProductPayload(),
    resolveInfluencerCode(),
  ]);

  const commonPayload = {
    userId: String(user._id),
    products: productInfo.payload,
    recipientEmail: TARGET_EMAIL,
    sendConfirmationEmail: true,
  };

  const couponOrder = await createOrder({
    ...commonPayload,
    couponCode: coupon.code,
    notes: "Automated coupon test order with shippingStatus=manual",
  });

  const influencerOrder = await createOrder({
    ...commonPayload,
    influencerCode,
    notes: "Automated influencer test order with shippingStatus=manual",
  });

  console.log(
    JSON.stringify(
      {
        baseUrl,
        product: productInfo.product.name,
        recipientEmail: TARGET_EMAIL,
        couponCode: coupon.code,
        influencerCode,
        orders: [
          {
            type: "coupon",
            orderId: couponOrder?.order?._id || couponOrder?.orderId || null,
            displayOrderId:
              couponOrder?.order?.displayOrderId || couponOrder?.order?.orderNumber || null,
            invoiceNumber:
              couponOrder?.invoice?.invoiceNumber ||
              couponOrder?.order?.invoiceNumber ||
              null,
            emailSent: Boolean(couponOrder?.email?.sent),
          },
          {
            type: "influencer",
            orderId:
              influencerOrder?.order?._id || influencerOrder?.orderId || null,
            displayOrderId:
              influencerOrder?.order?.displayOrderId ||
              influencerOrder?.order?.orderNumber ||
              null,
            invoiceNumber:
              influencerOrder?.invoice?.invoiceNumber ||
              influencerOrder?.order?.invoiceNumber ||
              null,
            emailSent: Boolean(influencerOrder?.email?.sent),
          },
        ],
      },
      null,
      2,
    ),
  );
};

run()
  .catch((error) => {
    console.error("Automated test order flow failed:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect failures for script shutdown
    }
  });
