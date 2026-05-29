import mongoose from "mongoose";
import { INDIA_COUNTRY } from "../utils/addressUtils.js";
import OrderSequenceModel from "./orderSequence.model.js";
import SettingsModel from "./settings.model.js";

const LEGACY_GATEWAY_METHOD = String.fromCharCode(
  82,
  65,
  90,
  79,
  82,
  80,
  65,
  89,
);
const ORDER_PAYMENT_METHODS = [
  LEGACY_GATEWAY_METHOD,
  "PAYTM",
  "PHONEPE",
  "COD",
  "PENDING",
  "TEST",
];

const ORDER_STATUS_VALUES = [
  "pending",
  "pending_payment",
  "accepted",
  "in_warehouse",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "rto",
  "rto_completed",
  "confirmed",
  "completed",
];

const TEMP_ORDER_ID_PATTERN = /^TMP-[A-Z0-9]{6}$/;
const FINAL_ORDER_ID_PATTERN = /^[A-Z0-9]+-\d{4}\/\d{4}$/;
const TEMP_ORDER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TEMP_ORDER_SUFFIX_LENGTH = 6;

export const normalizeTempOrderId = (value) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  return TEMP_ORDER_ID_PATTERN.test(normalized) ? normalized : "";
};

const createTempOrderIdCandidate = () => {
  let suffix = "";
  for (let index = 0; index < TEMP_ORDER_SUFFIX_LENGTH; index += 1) {
    const randomIndex = Math.floor(Math.random() * TEMP_ORDER_ALPHABET.length);
    suffix += TEMP_ORDER_ALPHABET[randomIndex];
  }
  return `TMP-${suffix}`;
};

const generateUniqueTempOrderId = async (model) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = createTempOrderIdCandidate();
    // Unique index also enforces safety; this loop avoids avoidable collisions.
    const exists = await model.exists({ temp_id: candidate });
    if (!exists) return candidate;
  }

  throw new Error("Failed to generate unique temporary order ID");
};

const deriveDisplayOrderNumber = (orderId) => {
  const rawOrderId = String(orderId || "").trim();
  if (!rawOrderId) return "";
  return `BOG-${rawOrderId.slice(-8).toUpperCase()}`;
};

const resolveFiscalYearCode = (date = new Date()) => {
  const safeDate = date instanceof Date ? date : new Date(date);
  const year = safeDate.getFullYear();
  const month = safeDate.getMonth(); // 0-based
  // India FY: Apr (3) -> Mar (2)
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  const yy = (value) => String(value).slice(-2);
  return `${yy(startYear)}${yy(endYear)}`;
};

const DEFAULT_ORDER_NUMBER_PREFIX =
  String(process.env.ORDER_NUMBER_PREFIX || "H1G")
    .trim()
    .toUpperCase() || "H1G";

const normalizeSeriesPrefix = (value) => {
  const raw = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return raw || DEFAULT_ORDER_NUMBER_PREFIX;
};

const normalizeFiscalYearCodeOverride = (value) => {
  const raw = String(value || "").trim();
  return /^\d{4}$/.test(raw) ? raw : "";
};

const ORDER_NUMBER_SERIES_SETTING_KEY = "orderNumberSeries";
const SERIES_CACHE_TTL_MS = 5_000;
let cachedOrderNumberSeries = { loadedAt: 0, value: null };

const getOrderNumberSeriesOverride = async () => {
  const now = Date.now();
  if (now - cachedOrderNumberSeries.loadedAt < SERIES_CACHE_TTL_MS) {
    return cachedOrderNumberSeries.value;
  }

  try {
    const setting = await SettingsModel.findOne({
      key: ORDER_NUMBER_SERIES_SETTING_KEY,
      isActive: true,
    })
      .select("value -_id")
      .lean();

    const value =
      setting?.value && typeof setting.value === "object"
        ? setting.value
        : null;
    const enabled = value?.enabled === true;
    const override = enabled
      ? {
          prefix: normalizeSeriesPrefix(value?.prefix),
          fiscalYearCode: normalizeFiscalYearCodeOverride(
            value?.fiscalYearCode,
          ),
        }
      : null;

    cachedOrderNumberSeries = { loadedAt: now, value: override };
    return override;
  } catch {
    cachedOrderNumberSeries = { loadedAt: now, value: null };
    return null;
  }
};

const resolveOrderNumberSeries = async (date) => {
  const override = await getOrderNumberSeriesOverride();
  const prefix = normalizeSeriesPrefix(override?.prefix);
  const fiscalYearCode =
    override?.fiscalYearCode || resolveFiscalYearCode(date);
  return { prefix, fiscalYearCode };
};

export const formatFinalOrderId = ({ prefix, fiscalYearCode, seq }) => {
  const safeSeq = Math.max(Number(seq || 0), 0);
  const padded = String(safeSeq).padStart(4, "0");
  const safePrefix = normalizeSeriesPrefix(prefix);
  return `${safePrefix}-${String(fiscalYearCode || "").trim()}/${padded}`.toUpperCase();
};

const nextOrderSequence = async ({ prefix, fiscalYearCode }) => {
  const safePrefix = normalizeSeriesPrefix(prefix);
  const key =
    `${safePrefix}${String(fiscalYearCode || "").trim()}`.toUpperCase();
  const updated = await OrderSequenceModel.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  return Number(updated?.seq || 0) || 0;
};

export const generateFinalOrderId = async (referenceDate = new Date()) => {
  const { prefix, fiscalYearCode } =
    await resolveOrderNumberSeries(referenceDate);
  const seq = await nextOrderSequence({ prefix, fiscalYearCode });
  return formatFinalOrderId({ prefix, fiscalYearCode, seq });
};

/**
 * Order Schema
 * Stores all order information including payment details
 * Used for checkout flow and order tracking
 */
const orderSchema = new mongoose.Schema(
  {
    // User Reference
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      default: null, // Allow guest checkout
    },

    // Persisted user-facing order number (separate from Mongo _id)
    orderNumber: {
      type: String,
      default: null,
      trim: true,
    },

    // Backward-compatible alias used by some legacy consumers
    displayOrderId: {
      type: String,
      default: null,
      trim: true,
    },

    // Temporary identifier used before payment success.
    temp_id: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },

    // Final immutable identifier assigned only after successful payment.
    final_id: {
      type: String,
      default: undefined,
      trim: true,
      uppercase: true,
    },

    // Products in Order
    products: [
      {
        productId: {
          type: String,
          required: true,
        },
        comboId: {
          type: String,
          default: null,
        },
        comboName: {
          type: String,
          default: "",
        },
        comboSlug: {
          type: String,
          default: "",
        },
        comboType: {
          type: String,
          default: "",
        },
        productTitle: {
          type: String,
          required: true,
        },
        variantId: {
          type: String,
          default: null,
        },
        variantName: {
          type: String,
          default: "",
        },
        sku: {
          type: String,
          default: "",
        },
        hsnCode: {
          type: String,
          default: "",
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        originalPrice: {
          type: Number,
          default: 0,
          min: 0,
        },
        image: {
          type: String,
          default: "",
        },
        subTotal: {
          type: Number,
          required: true,
          min: 0,
        },
        originalSubTotal: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],

    // Combo/Bundles attached to order (snapshot)
    combos: [
      {
        comboId: { type: String, required: true },
        comboName: { type: String, required: true },
        comboSlug: { type: String, default: "" },
        comboSku: { type: String, default: "" },
        comboType: { type: String, default: "" },
        quantity: { type: Number, default: 1, min: 1 },
        comboPrice: { type: Number, default: 0, min: 0 },
        originalPrice: { type: Number, default: 0, min: 0 },
        savings: { type: Number, default: 0, min: 0 },
        variantIds: [{ type: String, default: "" }],
        items: [
          {
            productId: { type: String, required: true },
            productTitle: { type: String, required: true },
            variantId: { type: String, default: null },
            variantName: { type: String, default: "" },
            variantSku: { type: String, default: "" },
            quantity: { type: Number, default: 1, min: 1 },
            quantityRequired: { type: Number, default: 1, min: 1 },
            price: { type: Number, default: 0, min: 0 },
            originalPrice: { type: Number, default: 0, min: 0 },
            image: { type: String, default: "" },
          },
        ],
      },
    ],

    // Payment Information
    paymentId: {
      type: String,
      default: null, // Payment identifier from the active provider
      // Note: index is defined in compound indexes below
    },

    paymentAppTxnId: {
      type: String,
      default: "",
      index: true,
    },

    paymentProvider: {
      type: String,
      default: "",
      trim: true,
    },

    paymentCompletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    confirmed_at: {
      type: Date,
      default: null,
      index: true,
    },

    confirmedAt: {
      type: Date,
      default: null,
      index: true,
    },

    confirmationEmailSentAt: {
      type: Date,
      default: null,
      index: true,
    },

    // Legacy gateway references retained under provider-neutral keys.
    legacyGatewayOrderId: {
      type: String,
      default: null,
      index: true,
    },

    legacyGatewaySignature: {
      type: String,
      default: null,
    },

    // Paytm identifiers
    paytmOrderId: {
      type: String,
      default: null,
      index: true,
    },

    paytmTransactionId: {
      type: String,
      default: null,
      index: true,
    },

    // PhonePe identifiers
    phonepeMerchantOrderId: {
      type: String,
      default: null,
      index: true,
    },

    phonepeOrderId: {
      type: String,
      default: null,
      index: true,
    },

    phonepeTransactionId: {
      type: String,
      default: null,
      index: true,
    },

    // Canonical UPI bank reference (RRN/UTR) when available.
    upiRef: {
      type: String,
      default: null,
      index: true,
    },

    // Backward-compatible aliases used by legacy consumers.
    upiReferenceNumber: {
      type: String,
      default: null,
      index: true,
    },

    upiReferenceNo: {
      type: String,
      default: null,
    },

    rrn: {
      type: String,
      default: null,
    },

    utr: {
      type: String,
      default: null,
    },

    utrNumber: {
      type: String,
      default: null,
      index: true,
    },

    upiRefId: {
      type: String,
      default: null,
      index: true,
    },

    // Status Tracking
    payment_status: {
      type: String,
      enum: ["pending", "paid", "failed", "unavailable"],
      default: "pending",
      index: true,
    },

    paymentReminderEmailSentAt: {
      type: Date,
      default: null,
    },

    paymentReminderEmailFailureKind: {
      type: String,
      enum: ["", "failed", "cancelled", "expired"],
      default: "",
    },

    paymentReminderEmailProvider: {
      type: String,
      enum: ["", "PAYTM", "PHONEPE"],
      default: "",
    },

    order_status: {
      type: String,
      enum: ORDER_STATUS_VALUES,
      default: "pending",
      index: true,
    },

    status: {
      type: String,
      enum: ORDER_STATUS_VALUES,
      default: "pending",
      index: true,
    },

    inventoryStatus: {
      type: String,
      enum: ["none", "reserved", "deducted", "released", "restored"],
      default: "none",
      index: true,
    },
    inventoryUpdatedAt: {
      type: Date,
      default: null,
    },
    inventorySource: {
      type: String,
      default: "",
    },
    reservationExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    statusTimeline: [
      {
        status: { type: String, required: true },
        source: { type: String, default: "SYSTEM" },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // Delivery Information
    delivery_address: {
      type: mongoose.Schema.ObjectId,
      ref: "Address",
      default: null,
    },

    deliveryAddressSnapshot: {
      order_name: { type: String, default: "" },
      order_mobile: { type: String, default: "" },
      order_flat_house: { type: String, default: "" },
      order_area: { type: String, default: "" },
      order_landmark: { type: String, default: "" },
      order_city: { type: String, default: "" },
      order_state: { type: String, default: "" },
      order_pincode: { type: String, default: "" },
      order_district: { type: String, default: "" },
      country: { type: String, default: INDIA_COUNTRY },
      address_line1: { type: String, default: "" },
      address_line2: { type: String, default: "" },
      full_address: { type: String, default: "" },
      email: { type: String, default: "" },
      source: { type: String, default: "manual" },
      address_id: { type: String, default: "" },
    },

    // Location capture (90-day retention logs)
    locationLog: {
      type: mongoose.Schema.ObjectId,
      ref: "UserLocationLog",
      default: null,
      index: true,
    },

    // Financial Information
    totalAmt: {
      type: Number,
      required: true,
      min: 0,
    },

    total: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Optional Fields
    basePrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    discountedPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    tax: {
      type: Number,
      default: 0,
      min: 0,
    },

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    shipping: {
      type: Number,
      default: 0,
      min: 0,
    },

    gst: {
      rate: {
        type: Number,
        default: 5,
        min: 0,
      },
      state: {
        type: String,
        default: "",
      },
      taxableAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      cgst: {
        type: Number,
        default: 0,
        min: 0,
      },
      sgst: {
        type: Number,
        default: 0,
        min: 0,
      },
      igst: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    gstNumber: {
      type: String,
      default: "",
      trim: true,
    },

    billingDetails: {
      fullName: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      address: { type: String, default: "" },
      pincode: { type: String, default: "" },
      state: { type: String, default: "" },
      city: { type: String, default: "" },
      flat_house: { type: String, default: "" },
      area_street_sector: { type: String, default: "" },
      landmark: { type: String, default: "" },
      country: { type: String, default: INDIA_COUNTRY },
    },

    notes: {
      type: String,
      default: "",
    },

    // ==================== PAYMENT INTEGRATION FIELDS ====================

    // Payment method tracking.
    // Keep `LEGACY_GATEWAY_METHOD` temporarily to allow safe rollouts
    // before `migrate:payment-cleanup` is executed in production.
    paymentMethod: {
      type: String,
      enum: ORDER_PAYMENT_METHODS,
      default: "PENDING",
    },

    // Coupon/Discount tracking
    couponCode: {
      type: String,
      default: null,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    comboDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    membershipDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    membershipPlan: {
      type: mongoose.Schema.ObjectId,
      ref: "MembershipPlan",
      default: null,
    },

    coinRedemption: {
      coinsUsed: {
        type: Number,
        default: 0,
        min: 0,
      },
      amount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    coinsAwarded: {
      type: Number,
      default: 0,
      min: 0,
    },

    finalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    roundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    roundedTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    pricing: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    roundOff: {
      type: Number,
      default: 0,
    },

    // Affiliate/Referral tracking
    affiliateCode: {
      type: String,
      default: null,
    },

    affiliateSource: {
      type: String,
      enum: ["influencer", "campaign", "referral", "organic", null],
      default: null,
    },

    // ==================== INFLUENCER TRACKING ====================

    // Reference to influencer who referred this order
    influencerId: {
      type: mongoose.Schema.ObjectId,
      ref: "Influencer",
      default: null,
      index: true,
    },

    // Influencer code used (denormalized for historical tracking)
    influencerCode: {
      type: String,
      default: null,
    },

    // Discount applied from influencer referral
    influencerDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Commission owed to influencer for this order
    influencerCommission: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Internal guard to prevent duplicate influencer stats increments
    influencerStatsSynced: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Whether commission has been paid out
    commissionPaid: {
      type: Boolean,
      default: false,
    },

    // Linked purchase order (if order created from PO flow)
    purchaseOrder: {
      type: mongoose.Schema.ObjectId,
      ref: "PurchaseOrder",
      default: null,
    },

    // Original price before any discounts
    originalPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==================== END INFLUENCER TRACKING ====================

    // Saved order flag (for pending payment orders)
    isSavedOrder: {
      type: Boolean,
      default: false,
    },
    // Marks development/test orders that must never be shipped.
    isDemoOrder: {
      type: Boolean,
      default: false,
      index: true,
    },

    guestDetails: {
      fullName: { type: String, default: "" },
      phone: { type: String, default: "" },
      address: { type: String, default: "" },
      pincode: { type: String, default: "" },
      state: { type: String, default: "" },
      city: { type: String, default: "" },
      flat_house: { type: String, default: "" },
      area_street_sector: { type: String, default: "" },
      landmark: { type: String, default: "" },
      district: { type: String, default: "" },
      country: { type: String, default: INDIA_COUNTRY },
      email: { type: String, default: "" },
      gst: { type: String, default: "" },
    },

    trackingSessionId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },

    analyticsConsent: {
      type: String,
      enum: ["granted", "denied", "unknown"],
      default: "unknown",
      index: true,
    },

    // ==================== SHIPPING (XPRESSBEES) ====================

    shipping_provider: {
      type: String,
      enum: ["XPRESSBEES", null],
      default: null,
    },

    awb_number: {
      type: String,
      default: null,
    },

    shipping_label: {
      type: String,
      default: null, // PDF URL from courier
    },

    shipping_label_local_path: {
      type: String,
      default: null,
    },

    shippingStatus: {
      type: String,
      enum: ["auto", "manual"],
      default: "auto",
      index: true,
    },

    shipping_manifest: {
      type: String,
      default: null, // Manifest PDF URL
    },

    shipment_status: {
      type: String,
      enum: [
        "pending",
        "shipment_created",
        "booked",
        "pickup_scheduled",
        "in_transit",
        "out_for_delivery",
        "shipped",
        "delivered",
        "cancelled",
        "failed",
        "rto_initiated",
        "rto_in_transit",
        "rto_delivered",
      ],
      default: "pending",
    },

    awbNumber: {
      type: String,
      default: null,
    },

    courierName: {
      type: String,
      default: "",
      trim: true,
    },

    shipmentId: {
      type: String,
      default: null,
      index: true,
    },

    shipmentStatus: {
      type: String,
      enum: [
        "pending",
        "shipment_created",
        "pickup_scheduled",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "rto",
        "cancelled",
        "failed",
      ],
      default: "pending",
      index: true,
    },

    trackingUrl: {
      type: String,
      default: null,
    },

    manifestId: {
      type: String,
      default: null,
    },

    shipmentFailureCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    shipmentLastError: {
      type: String,
      default: "",
    },

    shipment_created_at: {
      type: Date,
      default: null,
    },

    // ==================== INVOICE ====================

    invoiceNumber: {
      type: String,
      default: null,
    },

    invoicePath: {
      type: String,
      default: null,
    },

    invoiceGeneratedAt: {
      type: Date,
      default: null,
    },

    isInvoiceGenerated: {
      type: Boolean,
      default: false,
      index: true,
    },

    invoiceUrl: {
      type: String,
      default: null,
    },

    deliveryDate: {
      type: Date,
      default: null,
      index: true,
    },

    delivery_date: {
      type: Date,
      default: null,
      index: true,
    },

    feedbackEmailSentAt: {
      type: Date,
      default: null,
      index: true,
    },
    feedbackEmailLastAttemptAt: {
      type: Date,
      default: null,
    },
    feedbackEmailFailureCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    retentionEmailSentAt: {
      type: Date,
      default: null,
      index: true,
    },
    retentionEmailLastAttemptAt: {
      type: Date,
      default: null,
    },
    retentionEmailFailureCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==================== END NEW FIELDS ====================

    // Metadata
    failureReason: {
      type: String,
      default: null, // Reason if payment failed
    },

    lastUpdatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      default: null, // Admin who last updated order
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  },
);

// Index for common queries
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ payment_status: 1, order_status: 1 });
orderSchema.index({
  inventoryStatus: 1,
  reservationExpiresAt: 1,
  payment_status: 1,
  order_status: 1,
});
orderSchema.index({ paymentId: 1 });
orderSchema.index({ orderNumber: 1 }, { sparse: true });
orderSchema.index({ displayOrderId: 1 }, { sparse: true });
orderSchema.index({ temp_id: 1 }, { unique: true, sparse: true });
orderSchema.index({ final_id: 1 }, { unique: true, sparse: true });
orderSchema.index({ status: 1, payment_status: 1 });
orderSchema.index({ invoiceNumber: 1 }, { sparse: true });
orderSchema.index({ "gst.state": 1, createdAt: -1 });
orderSchema.index({ purchaseOrder: 1 }, { sparse: true });
orderSchema.index({ awb_number: 1 }, { sparse: true });
orderSchema.index({ awbNumber: 1 }, { sparse: true });
orderSchema.index({ shipment_status: 1, order_status: 1 });
orderSchema.index({ shipmentStatus: 1, order_status: 1 });
orderSchema.index({ isInvoiceGenerated: 1, invoiceGeneratedAt: -1 });
orderSchema.index({ deliveryDate: -1 }, { sparse: true });
orderSchema.index({ trackingSessionId: 1, createdAt: -1 }, { sparse: true });

// Normalize legacy payment_status before validation
orderSchema.pre("validate", async function () {
  if (this.deliveryDate && !this.delivery_date) {
    this.delivery_date = this.deliveryDate;
  }
  if (this.delivery_date && !this.deliveryDate) {
    this.deliveryDate = this.delivery_date;
  }

  if (this.payment_status === "confirmed") {
    this.payment_status = "paid";
  }

  const normalizedPaymentStatus = String(this.payment_status || "")
    .trim()
    .toLowerCase();

  if (this.confirmedAt && !this.confirmed_at) {
    this.confirmed_at = this.confirmedAt;
  }
  if (this.confirmed_at && !this.confirmedAt) {
    this.confirmedAt = this.confirmed_at;
  }

  const normalizedOrderStatus = String(this.order_status || "")
    .trim()
    .toLowerCase();
  if (ORDER_STATUS_VALUES.includes(normalizedOrderStatus)) {
    this.order_status = normalizedOrderStatus;
  } else {
    this.order_status = "pending";
  }

  const normalizedStatus = String(this.status || "")
    .trim()
    .toLowerCase();
  this.status = ORDER_STATUS_VALUES.includes(normalizedStatus)
    ? normalizedStatus
    : this.order_status;

  const normalizedTempId = normalizeTempOrderId(this.temp_id);
  if (normalizedTempId) {
    this.temp_id = normalizedTempId;
  } else if (this.isNew) {
    this.temp_id = await generateUniqueTempOrderId(this.constructor);
  }

  let normalizedFinalId = String(this.final_id || "")
    .trim()
    .toUpperCase();
  const normalizedLegacyOrderNumber = String(this.orderNumber || "")
    .trim()
    .toUpperCase();
  const allowsFinalId =
    normalizedPaymentStatus === "paid" ||
    normalizedPaymentStatus === "confirmed";

  if (!allowsFinalId) {
    normalizedFinalId = "";
  } else if (
    !normalizedFinalId &&
    FINAL_ORDER_ID_PATTERN.test(normalizedLegacyOrderNumber)
  ) {
    normalizedFinalId = normalizedLegacyOrderNumber;
  }
  this.final_id = normalizedFinalId || undefined;

  if (normalizedPaymentStatus === "paid" && !this.confirmed_at) {
    const confirmedAt = this.paymentCompletedAt || new Date();
    this.confirmed_at = confirmedAt;
    this.confirmedAt = confirmedAt;
  }

  const normalizedOrderNumber = String(this.orderNumber || "")
    .trim()
    .toUpperCase();

  const resolvedDisplayIdentifier =
    this.final_id ||
    normalizeTempOrderId(this.temp_id) ||
    normalizedOrderNumber ||
    deriveDisplayOrderNumber(this._id);

  const normalizedDisplayOrderId = String(resolvedDisplayIdentifier || "")
    .trim()
    .toUpperCase();

  this.orderNumber = normalizedDisplayOrderId || null;
  this.displayOrderId = normalizedDisplayOrderId || null;
});

// Pre-save hook for validation
orderSchema.pre("save", async function () {
  // Ensure totalAmt is always a number
  if (typeof this.totalAmt !== "number" || this.totalAmt < 0) {
    throw new Error("Total amount must be a non-negative number");
  }

  // Ensure products array is not empty on save
  if (!this.products || this.products.length === 0) {
    throw new Error("Order must have at least one product");
  }
});

const OrderModel = mongoose.model("order", orderSchema);

export default OrderModel;
