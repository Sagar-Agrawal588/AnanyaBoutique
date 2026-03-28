import crypto from "node:crypto";
import fs from "node:fs";
import mongoose from "mongoose";
import path from "node:path";
import PDFDocument from "pdfkit";
import Category from "../models/category.model.js";
import Combo from "../models/combo.model.js";
import Partner from "../models/partner.model.js";
import PartnerApiKey from "../models/partnerApiKey.model.js";
import PartnerApiRequestLog from "../models/partnerApiRequestLog.model.js";
import Product from "../models/product.model.js";
import { getPartnerLiveSnapshot } from "../middlewares/partnerApiActivity.js";
import { getRedisClient } from "../config/redisClient.js";
import {
  getPartnerDailyLimitSnapshot,
  getPartnerRateLimitSnapshot,
} from "../middlewares/partnerApiAuth.js";
import {
  applyPartnerDynamicAdminOverride,
  getPartnerDynamicLimitSnapshot,
  getPartnerDynamicScalingEvents,
} from "../services/partnerApiDynamicScaling.service.js";
import { splitGstInclusiveAmount } from "../services/tax.service.js";

const SITE_URL =
  String(process.env.NEXT_PUBLIC_SITE_URL || process.env.CLIENT_URL || "https://healthyonegram.com")
    .split(",")[0]
    .trim()
    .replace(/\/+$/, "") || "https://healthyonegram.com";

const SUPPORT_EMAIL = String(
  process.env.SUPPORT_EMAIL || process.env.CONTACT_EMAIL || "support@healthyonegram.com",
)
  .trim()
  .toLowerCase();

const SUPPORT_PHONE = String(
  process.env.SUPPORT_PHONE || process.env.CONTACT_PHONE || "+91-00000-00000",
).trim();

const resolvePartnerGuideLogoPath = () => {
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, "frontend", "admin", "public", "logo.png"),
    path.resolve(cwd, "frontend", "client", "public", "logo.png"),
    path.resolve(cwd, "..", "frontend", "admin", "public", "logo.png"),
    path.resolve(cwd, "..", "frontend", "client", "public", "logo.png"),
    path.resolve(cwd, "frontend", "admin", "public", "logo-og-v2.png"),
    path.resolve(cwd, "frontend", "client", "public", "logo-og-v2.png"),
    path.resolve(cwd, "..", "frontend", "admin", "public", "logo-og-v2.png"),
    path.resolve(cwd, "..", "frontend", "client", "public", "logo-og-v2.png"),
  ];

  return candidates.find((filePath) => fs.existsSync(filePath)) || null;
};

const hashApiKey = (value) =>
  crypto.createHash("sha256").update(String(value || "")).digest("hex");

const createApiKey = () => {
  const prefix = `hogp_${crypto.randomBytes(4).toString("hex")}`;
  const secret = crypto.randomBytes(24).toString("hex");
  const apiKey = `${prefix}.${secret}`;
  return {
    apiKey,
    keyPrefix: prefix,
    keyHash: hashApiKey(apiKey),
  };
};

const parseBoolean = (value, fallback = undefined) => {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const parseNumber = (value, fallback) => {
  const number = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(number) ? number : fallback;
};

const clampNumber = (value, min, max, fallback) =>
  Math.min(max, Math.max(min, parseNumber(value, fallback)));

const parseFloatInRange = (value, min, max, fallback) => {
  const parsed = Number.parseFloat(String(value ?? "").trim());
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const toSafeDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfUtcDay = (date = new Date()) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));

const resolveAnalyticsRange = ({ range, startDate, endDate }) => {
  const now = new Date();
  const selectedRange = String(range || "24h").trim().toLowerCase();

  if (selectedRange === "custom") {
    const customStart = toSafeDate(startDate);
    const customEnd = toSafeDate(endDate);
    if (!customStart || !customEnd || customStart >= customEnd) {
      const fallbackStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return {
        key: "24h",
        from: fallbackStart,
        to: now,
        granularity: "hour",
      };
    }

    const durationMs = customEnd.getTime() - customStart.getTime();
    return {
      key: "custom",
      from: customStart,
      to: customEnd,
      granularity: durationMs > 72 * 60 * 60 * 1000 ? "day" : "hour",
    };
  }

  if (selectedRange === "7d") {
    return {
      key: "7d",
      from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      to: now,
      granularity: "day",
    };
  }

  return {
    key: "24h",
    from: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    to: now,
    granularity: "hour",
  };
};

const getAnalyticsRedisKeys = (keyPrefix) => ({
  rpm: `partner:${keyPrefix}:rpm`,
  usageDaily: `partner:${keyPrefix}:usage:daily`,
});

const ANALYTICS_DEFAULT_ERROR_RATE_THRESHOLD = 5;
const ANALYTICS_DEFAULT_SPIKE_MULTIPLIER = 2.5;
const ANALYTICS_DEFAULT_SPIKE_MIN_REQUESTS = 50;

const toFloatInRange = (value, fallback, min, max) => {
  const parsed = Number.parseFloat(String(value ?? "").trim());
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const csvEscape = (value) => {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
};

const normalizeDynamicTier = (value, fallback = "custom") => {
  const tier = String(value || fallback).trim().toLowerCase();
  return ["free", "growth", "pro", "enterprise", "custom"].includes(tier)
    ? tier
    : fallback;
};

const toPartnerDynamicPatch = (input = {}, currentPartner = null) => {
  const patch = {};

  const baseRate = currentPartner?.rateLimitPlan?.baseRPM || currentPartner?.rateLimitPerMinute || 120;
  const currentDaily = currentPartner?.rateLimitPlan?.dailyLimit || currentPartner?.dailyRequestLimit || 20000;

  if (input?.tier !== undefined) {
    patch["rateLimitPlan.tier"] = normalizeDynamicTier(
      input.tier,
      currentPartner?.rateLimitPlan?.tier || "custom",
    );
  }
  if (input?.baseRPM !== undefined) {
    patch["rateLimitPlan.baseRPM"] = clampNumber(input.baseRPM, 10, 50000, baseRate);
  }
  if (input?.burstRPM !== undefined) {
    const floor = patch["rateLimitPlan.baseRPM"] || baseRate;
    patch["rateLimitPlan.burstRPM"] = clampNumber(input.burstRPM, floor, 50000, Math.round(floor * 1.8));
  }
  if (input?.dailyLimit !== undefined) {
    patch["rateLimitPlan.dailyLimit"] = clampNumber(input.dailyLimit, 100, 10000000, currentDaily);
  }
  if (input?.minDynamicRPM !== undefined) {
    patch["rateLimitPlan.minDynamicRPM"] = clampNumber(input.minDynamicRPM, 10, 50000, Math.floor(baseRate * 0.5));
  }
  if (input?.maxDynamicRPM !== undefined) {
    patch["rateLimitPlan.maxDynamicRPM"] = clampNumber(input.maxDynamicRPM, 10, 50000, Math.max(baseRate, 4000));
  }
  if (input?.scalingEnabled !== undefined) {
    patch["rateLimitPlan.scalingEnabled"] = Boolean(parseBoolean(input.scalingEnabled, true));
  }

  if (input?.lockScaling !== undefined) {
    patch["dynamicControls.lockScaling"] = Boolean(parseBoolean(input.lockScaling, false));
  }
  if (input?.manualOverrideRPM !== undefined) {
    const override = parseNumber(input.manualOverrideRPM, 0);
    patch["dynamicControls.manualOverrideRPM"] = override > 0
      ? clampNumber(override, 10, 50000, baseRate)
      : null;
  }
  if (input?.manualOverrideDailyLimit !== undefined) {
    const overrideDaily = parseNumber(input.manualOverrideDailyLimit, 0);
    patch["dynamicControls.manualOverrideDailyLimit"] = overrideDaily > 0
      ? clampNumber(overrideDaily, 100, 10000000, currentDaily)
      : null;
  }
  if (input?.qualityScore !== undefined) {
    patch["dynamicControls.qualityScore"] = parseFloatInRange(
      input.qualityScore,
      0.5,
      1.5,
      currentPartner?.dynamicControls?.qualityScore || 1,
    );
  }
  if (input?.safeModeForced !== undefined) {
    patch["dynamicControls.safeModeForced"] = Boolean(parseBoolean(input.safeModeForced, false));
  }

  return patch;
};

const ALLOWED_VISIBLE_PRODUCT_FIELDS = Object.freeze([
  "description",
  "shortDescription",
  "images",
  "category",
  "tags",
  "discount",
  "stock",
  "shipping",
  "hsnCode",
  "gstBreakup",
]);

const DEFAULT_VISIBLE_PRODUCT_FIELDS = Object.freeze([
  "description",
  "shortDescription",
  "images",
  "category",
  "tags",
  "discount",
  "stock",
  "shipping",
  "hsnCode",
  "gstBreakup",
]);

const ALLOWED_SCOPES = Object.freeze([
  "catalog.read",
  "inventory.read",
  "pricing.read",
  "gst.read",
  "combos.read",
]);

const SCOPE_ALIASES = Object.freeze({
  "price.read": "pricing.read",
});

const normalizeScopes = (rawScopes) => {
  const source = Array.isArray(rawScopes) ? rawScopes : [];
  const normalized = source
    .map((scope) => String(scope || "").trim().toLowerCase())
    .map((scope) => SCOPE_ALIASES[scope] || scope)
    .filter((scope) => ALLOWED_SCOPES.includes(scope));

  if (normalized.length > 0) {
    return Array.from(new Set(normalized));
  }

  return ["catalog.read", "inventory.read", "pricing.read", "gst.read"];
};

const normalizeVisibleProductFields = (rawFields) => {
  const incoming = Array.isArray(rawFields) ? rawFields : DEFAULT_VISIBLE_PRODUCT_FIELDS;
  const normalized = incoming
    .map((field) => String(field || "").trim())
    .filter((field) => ALLOWED_VISIBLE_PRODUCT_FIELDS.includes(field));

  return normalized.length > 0
    ? Array.from(new Set(normalized))
    : [...DEFAULT_VISIBLE_PRODUCT_FIELDS];
};

const hasVisibleField = (visibleFields, fieldName) =>
  normalizeVisibleProductFields(visibleFields).includes(fieldName);

const normalizeTaxState = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const buildPriceTaxBreakup = (inclusiveAmount, stateForTax) => {
  const summary = splitGstInclusiveAmount(inclusiveAmount, 5, stateForTax || "");
  const normalizedState = normalizeTaxState(stateForTax);
  const isRajasthan = normalizedState === "rajasthan";

  const taxPaise = Math.round(Number(summary.tax || 0) * 100);
  if (isRajasthan) {
    const half = Math.floor(taxPaise / 2);
    const remaining = taxPaise - half;
    return {
      ...summary,
      mode: "CGST_SGST",
      cgst: half / 100,
      sgst: remaining / 100,
      igst: 0,
    };
  }

  return {
    ...summary,
    mode: "IGST",
    cgst: 0,
    sgst: 0,
    igst: taxPaise / 100,
  };
};

const escapeRegex = (value = "") =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getAvailableStock = (product) => {
  const directStock = Number(product?.stock_quantity ?? product?.stock ?? 0);
  const directReserved = Number(product?.reserved_quantity ?? 0);
  const directAvailable = Math.max(directStock - directReserved, 0);

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const variantAvailable = variants.reduce((sum, variant) => {
    const stock = Number(variant?.stock_quantity ?? variant?.stock ?? 0);
    const reserved = Number(variant?.reserved_quantity ?? 0);
    return sum + Math.max(stock - reserved, 0);
  }, 0);

  if (variantAvailable > 0) return variantAvailable;
  return Math.max(directAvailable, 0);
};

const mapPartnerProduct = (product, options = {}) => {
  const visibleFields = normalizeVisibleProductFields(options.visibleFields);
  const stateForTax = String(options.stateForTax || "").trim();
  const availableQuantity = getAvailableStock(product);
  const discountedAmount = Number(product?.price || 0);
  const originalAmount = Number(product?.originalPrice || discountedAmount || 0);
  const discountValue = Number(product?.discount || 0);

  const discountedTax = buildPriceTaxBreakup(discountedAmount, stateForTax);
  const originalTax = buildPriceTaxBreakup(originalAmount, stateForTax);

  const payload = {
    id: String(product._id),
    sku: String(product.sku || "").trim() || null,
    name: product.name,
    productUrl: `${SITE_URL}/product/${String(product._id)}`,
    hsnCode: String(product?.hsnCode || "").trim() || null,
    price: {
      amount: discountedAmount,
      currency: "INR",
      originalAmount,
      taxableAmount: Number(discountedTax.taxableAmount || 0),
      gstAmount: Number(discountedTax.tax || 0),
      amountWithGst: Number(discountedTax.grossAmount || discountedAmount),
    },
    updatedAt: product.updatedAt,
  };

  if (hasVisibleField(visibleFields, "description")) {
    payload.description = product.description || "";
  }

  if (hasVisibleField(visibleFields, "shortDescription")) {
    payload.shortDescription = product.shortDescription || "";
  }

  if (hasVisibleField(visibleFields, "images")) {
    payload.images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  }

  if (hasVisibleField(visibleFields, "category")) {
    payload.category = product.category
      ? {
          id: String(product.category._id || ""),
          name: product.category.name || "",
          slug: product.category.slug || "",
        }
      : null;
  }

  if (hasVisibleField(visibleFields, "tags")) {
    payload.tags = Array.isArray(product.tags) ? product.tags : [];
  }

  if (hasVisibleField(visibleFields, "discount")) {
    payload.discount = {
      type: "percentage",
      value: discountValue,
    };
  }

  if (hasVisibleField(visibleFields, "stock")) {
    payload.stock = {
      status: availableQuantity > 0 ? "in_stock" : "out_of_stock",
      availableQuantity,
    };
  }

  if (hasVisibleField(visibleFields, "shipping")) {
    payload.shipping = {
      freeShipping: discountedAmount >= 499,
      estimatedDispatchDays: availableQuantity > 0 ? 1 : 3,
    };
  }

  if (hasVisibleField(visibleFields, "gstBreakup")) {
    payload.price.gstBreakup = {
      state: stateForTax || "",
      mode: discountedTax.mode,
      rate: Number(discountedTax.rate || 5),
      cgst: Number(discountedTax.cgst || 0),
      sgst: Number(discountedTax.sgst || 0),
      igst: Number(discountedTax.igst || 0),
    };
    payload.price.originalGstBreakup = {
      state: stateForTax || "",
      mode: originalTax.mode,
      rate: Number(originalTax.rate || 5),
      cgst: Number(originalTax.cgst || 0),
      sgst: Number(originalTax.sgst || 0),
      igst: Number(originalTax.igst || 0),
      taxableAmount: Number(originalTax.taxableAmount || 0),
      gstAmount: Number(originalTax.tax || 0),
      amountWithGst: Number(originalTax.grossAmount || originalAmount),
    };
  }

  if (!hasVisibleField(visibleFields, "hsnCode")) {
    delete payload.hsnCode;
  }

  return payload;
};

const withMeta = (req, payload) => ({
  ...payload,
  meta: {
    requestId: req.requestId || crypto.randomBytes(6).toString("hex"),
    version: "v1",
    partnerId: req.partner ? String(req.partner._id) : undefined,
  },
});

const buildDeterministicEtagPayload = (bodyObject) => {
  if (!bodyObject || typeof bodyObject !== "object") return bodyObject;

  const cloned = {
    ...bodyObject,
    meta: bodyObject.meta
      ? {
          ...bodyObject.meta,
          requestId: undefined,
        }
      : undefined,
  };

  return cloned;
};

const setEtagAndHandle304 = (req, res, bodyObject) => {
  const etagBasis = buildDeterministicEtagPayload(bodyObject);
  const etag = `W/\"${hashApiKey(JSON.stringify(etagBasis)).slice(0, 16)}\"`;
  res.setHeader("ETag", etag);
  if (req.headers["if-none-match"] === etag) {
    res.status(304).end();
    return true;
  }
  return false;
};

const getPartnerGuideDetails = (req) => {
  const baseUrl = `${req.protocol}://${req.get("host")}/api/v1/partner`;
  const authModes = [
    {
      type: "header",
      header: "x-api-key",
      valueExample: "hogp_xxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
    },
    {
      type: "bearer",
      header: "Authorization",
      valueExample: "Bearer hogp_xxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
    },
  ];

  const endpoints = [
    {
      method: "GET",
      path: "/health",
      fullUrl: `${baseUrl}/health`,
      scope: "none",
      description: "API/key health check",
    },
    {
      method: "GET",
      path: "/products",
      fullUrl: `${baseUrl}/products?limit=20&page=1&deliveryState=Rajasthan`,
      scope: "catalog.read",
      description: "List products (includes GST breakup by deliveryState)",
    },
    {
      method: "GET",
      path: "/products/:productId",
      fullUrl: `${baseUrl}/products/PRODUCT_ID_OR_SLUG?deliveryState=Rajasthan`,
      scope: "catalog.read",
      description: "Get one product (includes GST breakup by deliveryState)",
    },
    {
      method: "GET",
      path: "/inventory",
      fullUrl: `${baseUrl}/inventory?inStock=true`,
      scope: "inventory.read",
      description: "Inventory snapshot",
    },
    {
      method: "GET",
      path: "/pricing",
      fullUrl: `${baseUrl}/pricing?deliveryState=Rajasthan`,
      scope: "pricing.read",
      description: "Current prices with GST/taxable breakup by deliveryState",
    },
    {
      method: "GET",
      path: "/gst",
      fullUrl: `${baseUrl}/gst?amount=599&deliveryState=Rajasthan`,
      scope: "gst.read",
      description: "GST-only breakdown helper",
    },
    {
      method: "GET",
      path: "/combos",
      fullUrl: `${baseUrl}/combos?limit=20&page=1`,
      scope: "combos.read",
      description: "Partner-visible combo offers",
    },
    {
      method: "GET",
      path: "/categories",
      fullUrl: `${baseUrl}/categories`,
      scope: "catalog.read",
      description: "Category list",
    },
    {
      method: "GET",
      path: "/tags",
      fullUrl: `${baseUrl}/tags`,
      scope: "catalog.read",
      description: "Tag list",
    },
  ];

  const sampleCurl = `curl -X GET \"${baseUrl}/products?limit=20\" -H \"x-api-key: YOUR_PARTNER_API_KEY\"`;

  return {
    baseUrl,
    authModes,
    endpoints,
    sampleCurl,
  };
};

const buildPartnerGuidePdfBuffer = ({ baseUrl, endpoints, sampleCurl }) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 42 });
    const chunks = [];
    const logoPath = resolvePartnerGuideLogoPath();

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.rect(42, 42, pageWidth, 64).fill("#0f172a");

    if (logoPath) {
      try {
        doc.image(logoPath, 52, 52, {
          fit: [34, 34],
          align: "left",
        });
      } catch {
      }
    }

    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text("HealthyOneGram Partner API", logoPath ? 94 : 56, 58);
    doc
      .font("Helvetica")
      .fontSize(10)
      .text("Share this PDF with partners for direct API integration", logoPath ? 94 : 56, 82);

    doc.moveDown(4.8);
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(12).text("Base URL");
    doc
      .moveDown(0.3)
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#334155")
      .text(baseUrl, {
        width: pageWidth,
      });

    doc.moveDown(0.8);
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(12).text("Authentication");
    doc
      .moveDown(0.3)
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#334155")
      .text("1) x-api-key: YOUR_PARTNER_API_KEY")
      .text("2) Authorization: Bearer YOUR_PARTNER_API_KEY");

    doc.moveDown(0.8);
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(12).text("Endpoints");

    const startX = doc.page.margins.left;
    const tableWidth = pageWidth;
    const rowHeight = 20;
    const colWidths = [60, 180, 110, tableWidth - 60 - 180 - 110];

    let y = doc.y + 8;
    doc.rect(startX, y, tableWidth, rowHeight).fill("#e2e8f0");
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(9);
    doc.text("Method", startX + 6, y + 6, { width: colWidths[0] - 8 });
    doc.text("Path", startX + colWidths[0] + 6, y + 6, { width: colWidths[1] - 8 });
    doc.text("Scope", startX + colWidths[0] + colWidths[1] + 6, y + 6, { width: colWidths[2] - 8 });
    doc.text("Description", startX + colWidths[0] + colWidths[1] + colWidths[2] + 6, y + 6, { width: colWidths[3] - 8 });

    y += rowHeight;
    doc.font("Helvetica").fontSize(8.8);

    endpoints.forEach((item, index) => {
      if (y > doc.page.height - 90) {
        doc.addPage();
        y = doc.page.margins.top;
      }

      doc.rect(startX, y, tableWidth, rowHeight).fill(index % 2 === 0 ? "#ffffff" : "#f8fafc");
      doc.fillColor("#0f172a");
      doc.text(item.method, startX + 6, y + 6, { width: colWidths[0] - 8 });
      doc.text(item.path, startX + colWidths[0] + 6, y + 6, { width: colWidths[1] - 8 });
      doc.text(item.scope, startX + colWidths[0] + colWidths[1] + 6, y + 6, { width: colWidths[2] - 8 });
      doc.text(item.description, startX + colWidths[0] + colWidths[1] + colWidths[2] + 6, y + 6, { width: colWidths[3] - 8 });
      y += rowHeight;
    });

    doc.y = y + 12;
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(12).text("Sample cURL");
    doc.moveDown(0.25);
    doc.rect(startX, doc.y, tableWidth, 46).fill("#0f172a");
    doc.fillColor("#e2e8f0").font("Helvetica").fontSize(9);
    doc.text(sampleCurl, startX + 8, doc.y + 14, { width: tableWidth - 16 });

    doc.moveDown(3.2);
    doc.fillColor("#64748b").font("Helvetica").fontSize(8.5).text(
      `Generated on ${new Date().toLocaleString("en-IN")} • Guide URL: ${baseUrl}/guide • Support: ${SUPPORT_EMAIL} • ${SUPPORT_PHONE}`,
      startX,
      doc.y,
      { width: tableWidth },
    );

    doc.end();
  });

const buildPartnerCredentialPdfBuffer = ({
  baseUrl,
  guideUrl,
  guidePdfUrl,
  partnerName,
  contactEmail,
  apiKey,
  sampleCurl,
}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 42 });
    const chunks = [];
    const logoPath = resolvePartnerGuideLogoPath();

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.rect(42, 42, pageWidth, 68).fill("#0f172a");
    if (logoPath) {
      try {
        doc.image(logoPath, 52, 54, { fit: [34, 34], align: "left" });
      } catch {
      }
    }

    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text("HealthyOneGram Partner Credentials", logoPath ? 94 : 56, 58);
    doc
      .font("Helvetica")
      .fontSize(10)
      .text("Share this only with the intended receiver over a secure channel", logoPath ? 94 : 56, 82);

    doc.moveDown(4.4);
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(12).text("Partner");
    doc
      .moveDown(0.3)
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#334155")
      .text(`Name: ${String(partnerName || "").trim() || "-"}`)
      .text(`Email: ${String(contactEmail || "").trim() || "-"}`)
      .text(`Generated: ${new Date().toLocaleString("en-IN")}`);

    doc.moveDown(0.8);
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(12).text("API Base");
    doc
      .moveDown(0.25)
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#334155")
      .text(baseUrl, { width: pageWidth });

    doc.moveDown(0.8);
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(12).text("API Key");
    doc.moveDown(0.2);
    doc.rect(doc.page.margins.left, doc.y, pageWidth, 44).fill("#f8fafc");
    doc
      .fillColor("#0f172a")
      .font("Helvetica")
      .fontSize(10)
      .text(String(apiKey || "").trim() || "-", doc.page.margins.left + 8, doc.y + 13, {
        width: pageWidth - 16,
      });

    doc.moveDown(2.9);
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(12).text("How receiver uses this");
    doc
      .moveDown(0.3)
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#334155")
      .text("1) Save API key securely (password manager or backend secret store).")
      .text("2) Use header: x-api-key: YOUR_PARTNER_API_KEY")
      .text("3) Test: GET /health")
      .text("4) Start with GET /products?limit=20");

    doc.moveDown(0.8);
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(12).text("Links");
    doc
      .moveDown(0.3)
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#334155")
      .text(`Guide: ${guideUrl}`)
      .text(`Guide PDF: ${guidePdfUrl}`);

    doc.moveDown(0.8);
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(12).text("Sample cURL");
    doc.moveDown(0.2);
    doc.rect(doc.page.margins.left, doc.y, pageWidth, 52).fill("#0f172a");
    doc
      .fillColor("#e2e8f0")
      .font("Helvetica")
      .fontSize(9)
      .text(sampleCurl, doc.page.margins.left + 8, doc.y + 16, {
        width: pageWidth - 16,
      });

    doc.moveDown(3.2);
    doc
      .fillColor("#64748b")
      .font("Helvetica")
      .fontSize(8.5)
      .text(
        `Security: API key is shown once. Rotate key immediately if leaked. Support: ${SUPPORT_EMAIL} • ${SUPPORT_PHONE}`,
        doc.page.margins.left,
        doc.y,
        { width: pageWidth },
      );

    doc.end();
  });

export const partnerHealth = async (req, res) => {
  return res.status(200).json(
    withMeta(req, {
      success: true,
      data: {
        status: "ok",
        service: "partner-api",
      },
    }),
  );
};

export const getPartnerApiGuide = async (req, res) => {
  const { baseUrl, authModes, endpoints, sampleCurl } = getPartnerGuideDetails(req);

  const payload = {
    success: true,
    data: {
      title: "HealthyOneGram Partner API Guide",
      version: "v1",
      baseUrl,
      authentication: authModes,
      endpoints,
      sampleCurl,
      notes: [
        "All responses are JSON and include success/data or success/error envelopes.",
        "Use If-None-Match with returned ETag for cache-friendly polling on product endpoints.",
      ],
    },
  };

  const format = String(req.query?.format || "").trim().toLowerCase();
  if (format === "json") {
    return res.status(200).json(payload);
  }
  if (format === "pdf") {
    try {
      const pdfBuffer = await buildPartnerGuidePdfBuffer({ baseUrl, endpoints, sampleCurl });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'inline; filename="healthyonegram-partner-api-guide.pdf"');
      return res.status(200).send(pdfBuffer);
    } catch (error) {
      console.error("Partner API guide PDF generation error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to generate partner API PDF guide",
      });
    }
  }

  const endpointRows = endpoints
    .map(
      (item) => `
        <tr>
          <td style=\"padding:10px;border:1px solid #e5e7eb;white-space:nowrap;font-weight:600;\">${item.method}</td>
          <td style=\"padding:10px;border:1px solid #e5e7eb;\">${item.path}</td>
          <td style=\"padding:10px;border:1px solid #e5e7eb;\">${item.scope}</td>
          <td style=\"padding:10px;border:1px solid #e5e7eb;\">${item.description}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>HealthyOneGram Partner API Guide</title>
  </head>
  <body style=\"margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;\">
    <div style=\"max-width:980px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:22px;\">
      <h1 style=\"margin:0 0 8px;font-size:26px;\">HealthyOneGram Partner API Guide</h1>
      <p style=\"margin:0 0 16px;color:#475569;\">Version v1 • Share this link with partners.</p>

      <div style=\"padding:12px;background:#f1f5f9;border-radius:10px;margin-bottom:16px;\">
        <div style=\"font-size:12px;color:#64748b;margin-bottom:6px;\">Base URL</div>
        <div style=\"font-family:Consolas,monospace;font-size:13px;word-break:break-all;\">${baseUrl}</div>
      </div>

      <h2 style=\"margin:16px 0 8px;font-size:18px;\">Authentication</h2>
      <ul style=\"margin:0 0 12px 18px;padding:0;color:#334155;\">
        <li>Header: <code>x-api-key: YOUR_PARTNER_API_KEY</code></li>
        <li>Or Bearer: <code>Authorization: Bearer YOUR_PARTNER_API_KEY</code></li>
      </ul>

      <h2 style=\"margin:16px 0 8px;font-size:18px;\">Endpoints</h2>
      <table style=\"width:100%;border-collapse:collapse;font-size:14px;\">
        <thead>
          <tr style=\"background:#f8fafc;\">
            <th style=\"text-align:left;padding:10px;border:1px solid #e5e7eb;\">Method</th>
            <th style=\"text-align:left;padding:10px;border:1px solid #e5e7eb;\">Path</th>
            <th style=\"text-align:left;padding:10px;border:1px solid #e5e7eb;\">Scope</th>
            <th style=\"text-align:left;padding:10px;border:1px solid #e5e7eb;\">Description</th>
          </tr>
        </thead>
        <tbody>${endpointRows}</tbody>
      </table>

      <h2 style=\"margin:16px 0 8px;font-size:18px;\">Sample cURL</h2>
      <pre style=\"background:#0f172a;color:#e2e8f0;padding:12px;border-radius:10px;overflow:auto;\">${sampleCurl}</pre>

      <p style=\"margin-top:14px;font-size:12px;color:#64748b;\">JSON format of this guide: <a href=\"${baseUrl}/guide?format=json\">${baseUrl}/guide?format=json</a></p>
        <p style="margin-top:6px;font-size:12px;color:#64748b;">PDF format: <a href="${baseUrl}/guide.pdf">${baseUrl}/guide.pdf</a></p>
        <p style="margin-top:6px;font-size:12px;color:#64748b;">Support: ${SUPPORT_EMAIL} • ${SUPPORT_PHONE}</p>
    </div>
  </body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(html);
};

export const getPartnerApiGuidePdf = async (req, res) => {
  try {
    const { baseUrl, endpoints, sampleCurl } = getPartnerGuideDetails(req);
    const pdfBuffer = await buildPartnerGuidePdfBuffer({ baseUrl, endpoints, sampleCurl });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="healthyonegram-partner-api-guide.pdf"');
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("getPartnerApiGuidePdf error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate partner API PDF guide",
    });
  }
};

export const getPartnerProducts = async (req, res) => {
  try {
    const deliveryState = String(req.query.deliveryState || req.query.state || "").trim();
    const visibleFields = normalizeVisibleProductFields(req.partner?.visibleProductFields);
    const page = Math.max(parseNumber(req.query.page, 1), 1);
    const limit = Math.min(Math.max(parseNumber(req.query.limit, 20), 1), 100);
    const skip = (page - 1) * limit;

    const query = { isActive: true };

    const q = String(req.query.q || "").trim();
    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
      query.$or = [{ name: regex }, { description: regex }, { shortDescription: regex }];
    }

    const tag = String(req.query.tag || "").trim();
    if (tag) {
      query.tags = { $in: [tag] };
    }

    const category = String(req.query.category || "").trim();
    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        query.category = category;
      } else {
        const matchedCategory = await Category.findOne({ slug: category, isActive: true })
          .select("_id")
          .lean();
        if (matchedCategory?._id) {
          query.category = matchedCategory._id;
        }
      }
    }

    const inStock = parseBoolean(req.query.inStock);
    if (inStock === true) {
      query.$or = [...(query.$or || []), { stock_quantity: { $gt: 0 } }, { stock: { $gt: 0 } }];
    }

    const updatedSince = String(req.query.updatedSince || "").trim();
    if (updatedSince) {
      const date = new Date(updatedSince);
      if (!Number.isNaN(date.getTime())) {
        query.updatedAt = { $gte: date };
      }
    }

    const sortMap = {
      updatedAt_desc: { updatedAt: -1 },
      updatedAt_asc: { updatedAt: 1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      name_asc: { name: 1 },
    };
    const sort = sortMap[String(req.query.sort || "").trim()] || { updatedAt: -1 };

    const [items, total] = await Promise.all([
      Product.find(query)
        .populate("category", "name slug")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    const data = items.map((item) =>
      mapPartnerProduct(item, {
        stateForTax: deliveryState,
        visibleFields,
      }),
    );
    const body = withMeta(req, {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });

    if (setEtagAndHandle304(req, res, body)) return;

    return res.status(200).json(body);
  } catch (error) {
    console.error("getPartnerProducts error:", error);
    return res.status(500).json(
      withMeta(req, {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch products",
          details: null,
        },
      }),
    );
  }
};

export const getPartnerProductById = async (req, res) => {
  try {
    const deliveryState = String(req.query.deliveryState || req.query.state || "").trim();
    const visibleFields = normalizeVisibleProductFields(req.partner?.visibleProductFields);
    const id = String(req.params.productId || "").trim();
    const query = { isActive: true };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query._id = id;
    } else {
      query.slug = id;
    }

    const product = await Product.findOne(query)
      .populate("category", "name slug")
      .lean();

    if (!product) {
      return res.status(404).json(
        withMeta(req, {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Product not found",
            details: null,
          },
        }),
      );
    }

    const body = withMeta(req, {
      success: true,
      data: mapPartnerProduct(product, {
        stateForTax: deliveryState,
        visibleFields,
      }),
    });

    if (setEtagAndHandle304(req, res, body)) return;

    return res.status(200).json(body);
  } catch (error) {
    console.error("getPartnerProductById error:", error);
    return res.status(500).json(
      withMeta(req, {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch product",
          details: null,
        },
      }),
    );
  }
};

export const getPartnerInventory = async (req, res) => {
  try {
    const page = Math.max(parseNumber(req.query.page, 1), 1);
    const limit = Math.min(Math.max(parseNumber(req.query.limit, 20), 1), 100);
    const skip = (page - 1) * limit;

    const query = { isActive: true };

    const productId = String(req.query.productId || "").trim();
    if (productId) {
      if (mongoose.Types.ObjectId.isValid(productId)) {
        query._id = productId;
      } else {
        query.slug = productId;
      }
    }

    const sku = String(req.query.sku || "").trim();
    if (sku) {
      query.sku = sku.toUpperCase();
    }

    const inStock = parseBoolean(req.query.inStock);
    if (inStock === true) {
      query.$or = [{ stock_quantity: { $gt: 0 } }, { stock: { $gt: 0 } }];
    }

    const [items, total] = await Promise.all([
      Product.find(query)
        .select("_id sku stock stock_quantity reserved_quantity updatedAt")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    const data = items.map((item) => {
      const availableQuantity = getAvailableStock(item);
      return {
        productId: String(item._id),
        sku: String(item.sku || "").trim() || null,
        stock: {
          status: availableQuantity > 0 ? "in_stock" : "out_of_stock",
          availableQuantity,
        },
        updatedAt: item.updatedAt,
      };
    });

    return res.status(200).json(
      withMeta(req, {
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      }),
    );
  } catch (error) {
    console.error("getPartnerInventory error:", error);
    return res.status(500).json(
      withMeta(req, {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch inventory",
          details: null,
        },
      }),
    );
  }
};

export const getPartnerPricing = async (req, res) => {
  try {
    const deliveryState = String(req.query.deliveryState || req.query.state || "").trim();
    const visibleFields = normalizeVisibleProductFields(req.partner?.visibleProductFields);
    const query = { isActive: true };

    const productId = String(req.query.productId || "").trim();
    if (productId) {
      if (mongoose.Types.ObjectId.isValid(productId)) {
        query._id = productId;
      } else {
        query.slug = productId;
      }
    }

    const sku = String(req.query.sku || "").trim();
    if (sku) {
      query.sku = sku.toUpperCase();
    }

    const items = await Product.find(query)
      .select("_id sku price originalPrice discount updatedAt")
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();

    const data = items.map((item) => {
      const amountWithGst = Number(item.price || 0);
      const originalAmountWithGst = Number(item.originalPrice || item.price || 0);
      const discountedTax = buildPriceTaxBreakup(amountWithGst, deliveryState);
      const originalTax = buildPriceTaxBreakup(originalAmountWithGst, deliveryState);
      const price = {
        amount: amountWithGst,
        currency: "INR",
        originalAmount: originalAmountWithGst,
        taxableAmount: Number(discountedTax.taxableAmount || 0),
        gstAmount: Number(discountedTax.tax || 0),
        amountWithGst: Number(discountedTax.grossAmount || amountWithGst),
      };

      if (hasVisibleField(visibleFields, "gstBreakup")) {
        price.gstBreakup = {
          state: deliveryState || "",
          mode: discountedTax.mode,
          rate: Number(discountedTax.rate || 5),
          cgst: Number(discountedTax.cgst || 0),
          sgst: Number(discountedTax.sgst || 0),
          igst: Number(discountedTax.igst || 0),
        };
        price.originalGstBreakup = {
          state: deliveryState || "",
          mode: originalTax.mode,
          rate: Number(originalTax.rate || 5),
          cgst: Number(originalTax.cgst || 0),
          sgst: Number(originalTax.sgst || 0),
          igst: Number(originalTax.igst || 0),
          taxableAmount: Number(originalTax.taxableAmount || 0),
          gstAmount: Number(originalTax.tax || 0),
          amountWithGst: Number(originalTax.grossAmount || originalAmountWithGst),
        };
      }

      const record = {
        productId: String(item._id),
        sku: String(item.sku || "").trim() || null,
        price,
        updatedAt: item.updatedAt,
      };

      if (hasVisibleField(visibleFields, "discount")) {
        record.discount = {
          type: "percentage",
          value: Number(item.discount || 0),
        };
      }

      return record;
    });

    return res.status(200).json(withMeta(req, { success: true, data }));
  } catch (error) {
    console.error("getPartnerPricing error:", error);
    return res.status(500).json(
      withMeta(req, {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch pricing",
          details: null,
        },
      }),
    );
  }
};

export const getPartnerGst = async (req, res) => {
  try {
    const deliveryState = String(req.query.deliveryState || req.query.state || "").trim();
    const amount = Number(req.query.amount || 0);
    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json(
        withMeta(req, {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "amount must be a valid non-negative number",
            details: null,
          },
        }),
      );
    }

    const gst = buildPriceTaxBreakup(amount, deliveryState);
    return res.status(200).json(
      withMeta(req, {
        success: true,
        data: {
          amount,
          currency: "INR",
          state: deliveryState || "",
          mode: gst.mode,
          rate: Number(gst.rate || 5),
          taxableAmount: Number(gst.taxableAmount || 0),
          gstAmount: Number(gst.tax || 0),
          amountWithGst: Number(gst.grossAmount || amount),
          cgst: Number(gst.cgst || 0),
          sgst: Number(gst.sgst || 0),
          igst: Number(gst.igst || 0),
        },
      }),
    );
  } catch (error) {
    console.error("getPartnerGst error:", error);
    return res.status(500).json(
      withMeta(req, {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch GST details",
          details: null,
        },
      }),
    );
  }
};

export const getPartnerCombos = async (req, res) => {
  try {
    const page = Math.max(parseNumber(req.query.page, 1), 1);
    const limit = Math.min(Math.max(parseNumber(req.query.limit, 20), 1), 100);
    const skip = (page - 1) * limit;

    const query = {
      isActive: true,
      isVisible: true,
    };

    const [combos, total] = await Promise.all([
      Combo.find(query)
        .select("_id slug name shortDescription image comboPrice originalPrice discountPercentage updatedAt")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Combo.countDocuments(query),
    ]);

    return res.status(200).json(
      withMeta(req, {
        success: true,
        data: combos.map((combo) => ({
          id: String(combo._id),
          slug: String(combo.slug || "").trim() || null,
          name: combo.name,
          shortDescription: combo.shortDescription || "",
          image: combo.image || "",
          price: {
            amount: Number(combo.comboPrice || combo.originalPrice || 0),
            currency: "INR",
            originalAmount: Number(combo.originalPrice || combo.comboPrice || 0),
            discountPercent: Number(combo.discountPercentage || 0),
          },
          updatedAt: combo.updatedAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      }),
    );
  } catch (error) {
    console.error("getPartnerCombos error:", error);
    return res.status(500).json(
      withMeta(req, {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch combos",
          details: null,
        },
      }),
    );
  }
};

export const getPartnerCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select("_id name slug parentCategory")
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    const data = categories.map((item) => ({
      id: String(item._id),
      name: item.name,
      slug: item.slug,
      parentCategoryId: item.parentCategory ? String(item.parentCategory) : null,
    }));

    return res.status(200).json(withMeta(req, { success: true, data }));
  } catch (error) {
    console.error("getPartnerCategories error:", error);
    return res.status(500).json(
      withMeta(req, {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch categories",
          details: null,
        },
      }),
    );
  }
};

export const getPartnerTags = async (req, res) => {
  try {
    const tags = await Product.distinct("tags", { isActive: true });
    const cleanTags = tags
      .map((tag) => String(tag || "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    return res.status(200).json(withMeta(req, { success: true, data: cleanTags }));
  } catch (error) {
    console.error("getPartnerTags error:", error);
    return res.status(500).json(
      withMeta(req, {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch tags",
          details: null,
        },
      }),
    );
  }
};

export const adminCreatePartner = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const companyName = String(req.body?.companyName || "").trim();
    const contactEmail = String(req.body?.contactEmail || "").trim().toLowerCase();
    const rateLimitPerMinute = parseNumber(req.body?.rateLimitPerMinute, 120);
    const dailyRequestLimit = parseNumber(req.body?.dailyRequestLimit, 20000);
    const dailyTokenLimit = parseNumber(req.body?.dailyTokenLimit, 0);

    if (!name || !contactEmail) {
      return res.status(400).json({
        success: false,
        message: "name and contactEmail are required",
      });
    }

    if (rateLimitPerMinute < 10 || rateLimitPerMinute > 5000) {
      return res.status(400).json({
        success: false,
        message: "rateLimitPerMinute must be between 10 and 5000",
      });
    }

    if (dailyRequestLimit < 100 || dailyRequestLimit > 5000000) {
      return res.status(400).json({
        success: false,
        message: "dailyRequestLimit must be between 100 and 5000000",
      });
    }

    if (dailyTokenLimit < 0 || dailyTokenLimit > 50000000) {
      return res.status(400).json({
        success: false,
        message: "dailyTokenLimit must be between 0 and 50000000",
      });
    }

    const dynamicPatch = toPartnerDynamicPatch({
      tier: req.body?.tier,
      baseRPM: req.body?.baseRPM ?? rateLimitPerMinute,
      burstRPM: req.body?.burstRPM,
      dailyLimit: req.body?.dailyLimit ?? dailyRequestLimit,
      minDynamicRPM: req.body?.minDynamicRPM,
      maxDynamicRPM: req.body?.maxDynamicRPM,
      scalingEnabled: req.body?.scalingEnabled,
      lockScaling: req.body?.lockScaling,
      manualOverrideRPM: req.body?.manualOverrideRPM,
      manualOverrideDailyLimit: req.body?.manualOverrideDailyLimit,
      qualityScore: req.body?.qualityScore,
      safeModeForced: req.body?.safeModeForced,
    });

    const rateLimitPlan = {
      tier: dynamicPatch["rateLimitPlan.tier"] || "custom",
      baseRPM: dynamicPatch["rateLimitPlan.baseRPM"] || rateLimitPerMinute,
      burstRPM: dynamicPatch["rateLimitPlan.burstRPM"] || Math.round(rateLimitPerMinute * 1.8),
      dailyLimit: dynamicPatch["rateLimitPlan.dailyLimit"] || dailyRequestLimit,
      minDynamicRPM: dynamicPatch["rateLimitPlan.minDynamicRPM"] || Math.max(10, Math.floor(rateLimitPerMinute * 0.5)),
      maxDynamicRPM: dynamicPatch["rateLimitPlan.maxDynamicRPM"] || Math.max(rateLimitPerMinute, 4000),
      scalingEnabled: dynamicPatch["rateLimitPlan.scalingEnabled"] !== undefined
        ? Boolean(dynamicPatch["rateLimitPlan.scalingEnabled"])
        : true,
    };

    const dynamicControls = {
      lockScaling: Boolean(dynamicPatch["dynamicControls.lockScaling"]),
      manualOverrideRPM: dynamicPatch["dynamicControls.manualOverrideRPM"] ?? null,
      manualOverrideDailyLimit: dynamicPatch["dynamicControls.manualOverrideDailyLimit"] ?? null,
      qualityScore: dynamicPatch["dynamicControls.qualityScore"] || 1,
      safeModeForced: Boolean(dynamicPatch["dynamicControls.safeModeForced"]),
    };

    const partner = await Partner.create({
      name,
      companyName,
      contactEmail,
      status: "active",
      scopes: normalizeScopes(req.body?.scopes),
      visibleProductFields: normalizeVisibleProductFields(req.body?.visibleProductFields),
      rateLimitPerMinute,
      dailyRequestLimit,
      dailyTokenLimit,
      rateLimitPlan,
      dynamicControls,
      allowedOrigins: Array.isArray(req.body?.allowedOrigins) ? req.body.allowedOrigins : [],
      notes: String(req.body?.notes || "").trim(),
    });

    const generated = createApiKey();
    await PartnerApiKey.create({
      partnerId: partner._id,
      keyPrefix: generated.keyPrefix,
      keyHash: generated.keyHash,
      status: "active",
      expiresAt: null,
    });

    const dynamic = await getPartnerDynamicLimitSnapshot({
      partner,
      keyPrefix: generated.keyPrefix,
    });

    await applyPartnerDynamicAdminOverride({
      partner,
      keyPrefix: generated.keyPrefix,
      reason: "partner_created",
    });

    return res.status(201).json({
      success: true,
      message: "Partner created",
      data: {
        partner: {
          id: String(partner._id),
          name: partner.name,
          companyName: partner.companyName || "",
          contactEmail: partner.contactEmail,
          status: partner.status,
          scopes: partner.scopes,
          visibleProductFields: normalizeVisibleProductFields(partner.visibleProductFields),
          rateLimitPerMinute: partner.rateLimitPerMinute,
          dailyRequestLimit: partner.dailyRequestLimit,
          dailyTokenLimit: partner.dailyTokenLimit,
          dynamic,
        },
        apiKey: generated.apiKey,
      },
    });
  } catch (error) {
    console.error("adminCreatePartner error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create partner",
    });
  }
};

export const adminListPartners = async (_req, res) => {
  try {
    const partners = await Partner.find({}).sort({ createdAt: -1 }).lean();

    const ids = partners.map((p) => p._id);
    const keys = await PartnerApiKey.find({
      partnerId: { $in: ids },
      status: "active",
    })
      .select("partnerId keyPrefix lastUsedAt createdAt")
      .lean();

    const keyByPartner = new Map(keys.map((item) => [String(item.partnerId), item]));

    const data = await Promise.all(
      partners.map(async (partner) => {
        const key = keyByPartner.get(String(partner._id));
        const [dynamic, rateLimit, dailyUsage] = await Promise.all([
          getPartnerDynamicLimitSnapshot({
            partner,
            keyPrefix: key?.keyPrefix || "",
          }),
          getPartnerRateLimitSnapshot({
            partnerId: String(partner._id),
            keyPrefix: key?.keyPrefix || "",
            configuredRateLimitPerMinute: partner.rateLimitPerMinute,
            partner,
          }),
          getPartnerDailyLimitSnapshot({
            partnerId: String(partner._id),
            keyPrefix: key?.keyPrefix || "",
            configuredDailyRequestLimit: partner.dailyRequestLimit,
            partner,
          }),
        ]);

        return {
          id: String(partner._id),
          name: partner.name,
          companyName: partner.companyName || "",
          contactEmail: partner.contactEmail,
          status: partner.status,
          scopes: normalizeScopes(partner.scopes),
          visibleProductFields: normalizeVisibleProductFields(partner.visibleProductFields),
          rateLimitPerMinute: partner.rateLimitPerMinute,
          dailyRequestLimit: partner.dailyRequestLimit,
          dailyTokenLimit: partner.dailyTokenLimit,
          dynamic,
          rateLimit,
          dailyUsage,
          keyPrefix: key?.keyPrefix || null,
          keyCreatedAt: key?.createdAt || null,
          keyLastUsedAt: key?.lastUsedAt || null,
          lastUsedAt: partner.lastUsedAt || key?.lastUsedAt || null,
          notes: partner.notes || "",
          createdAt: partner.createdAt,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("adminListPartners error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list partners",
    });
  }
};

export const adminExportPartnersCsv = async (_req, res) => {
  try {
    const partners = await Partner.find({}).sort({ createdAt: -1 }).lean();

    const ids = partners.map((p) => p._id);
    const keys = await PartnerApiKey.find({
      partnerId: { $in: ids },
      status: "active",
    })
      .select("partnerId keyPrefix lastUsedAt createdAt")
      .lean();

    const keyByPartner = new Map(keys.map((item) => [String(item.partnerId), item]));

    const csvEscape = (value) => {
      const text = String(value ?? "");
      if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const headers = [
      "partnerId",
      "name",
      "companyName",
      "contactEmail",
      "status",
      "scopes",
      "visibleProductFields",
      "rateLimitPerMinute",
      "dailyRequestLimit",
      "dailyTokenLimit",
      "planTier",
      "baseRPM",
      "burstRPM",
      "planDailyLimit",
      "scalingEnabled",
      "lockScaling",
      "manualOverrideRPM",
      "manualOverrideDailyLimit",
      "qualityScore",
      "safeModeForced",
      "keyPrefix",
      "keyCreatedAt",
      "keyLastUsedAt",
      "createdAt",
    ];

    const rows = partners.map((partner) => {
      const key = keyByPartner.get(String(partner._id));
      return [
        String(partner._id),
        partner.name || "",
        partner.companyName || "",
        partner.contactEmail || "",
        partner.status || "",
        Array.isArray(partner.scopes) ? partner.scopes.join("|") : "",
        Array.isArray(partner.visibleProductFields)
          ? normalizeVisibleProductFields(partner.visibleProductFields).join("|")
          : "",
        String(partner.rateLimitPerMinute ?? ""),
        String(partner.dailyRequestLimit ?? ""),
        String(partner.dailyTokenLimit ?? ""),
        String(partner.rateLimitPlan?.tier || "custom"),
        String(partner.rateLimitPlan?.baseRPM ?? partner.rateLimitPerMinute ?? ""),
        String(partner.rateLimitPlan?.burstRPM ?? ""),
        String(partner.rateLimitPlan?.dailyLimit ?? partner.dailyRequestLimit ?? ""),
        String(partner.rateLimitPlan?.scalingEnabled !== false),
        String(Boolean(partner.dynamicControls?.lockScaling)),
        String(partner.dynamicControls?.manualOverrideRPM ?? ""),
        String(partner.dynamicControls?.manualOverrideDailyLimit ?? ""),
        String(partner.dynamicControls?.qualityScore ?? ""),
        String(Boolean(partner.dynamicControls?.safeModeForced)),
        key?.keyPrefix || "",
        key?.createdAt ? new Date(key.createdAt).toISOString() : "",
        key?.lastUsedAt ? new Date(key.lastUsedAt).toISOString() : "",
        partner.createdAt ? new Date(partner.createdAt).toISOString() : "",
      ].map(csvEscape).join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const fileName = `partner-api-partners-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error("adminExportPartnersCsv error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to export partners CSV",
    });
  }
};

export const adminRotatePartnerKey = async (req, res) => {
  try {
    const partnerId = String(req.params?.partnerId || "").trim();
    const partner = await Partner.findById(partnerId);

    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    await PartnerApiKey.updateMany(
      { partnerId: partner._id, status: "active" },
      { $set: { status: "revoked", revokedAt: new Date() } },
    );

    const generated = createApiKey();
    await PartnerApiKey.create({
      partnerId: partner._id,
      keyPrefix: generated.keyPrefix,
      keyHash: generated.keyHash,
      status: "active",
      expiresAt: null,
    });

    return res.status(200).json({
      success: true,
      message: "Partner API key rotated",
      data: {
        partnerId: String(partner._id),
        apiKey: generated.apiKey,
      },
    });
  } catch (error) {
    console.error("adminRotatePartnerKey error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to rotate partner key",
    });
  }
};

export const adminUpdatePartner = async (req, res) => {
  try {
    const partnerId = String(req.params?.partnerId || "").trim();

    const existingPartner = await Partner.findById(partnerId).lean();
    if (!existingPartner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    const update = {};
    if (req.body?.name !== undefined) update.name = String(req.body.name || "").trim();
    if (req.body?.companyName !== undefined) {
      update.companyName = String(req.body.companyName || "").trim();
    }
    if (req.body?.contactEmail !== undefined) {
      update.contactEmail = String(req.body.contactEmail || "").trim().toLowerCase();
    }
    if (req.body?.status !== undefined) {
      const status = String(req.body.status || "").trim().toLowerCase();
      if (["active", "paused", "revoked"].includes(status)) update.status = status;
    }
    if (req.body?.scopes !== undefined && Array.isArray(req.body.scopes)) {
      update.scopes = normalizeScopes(req.body.scopes);
    }
    if (
      req.body?.visibleProductFields !== undefined &&
      Array.isArray(req.body.visibleProductFields)
    ) {
      update.visibleProductFields = normalizeVisibleProductFields(
        req.body.visibleProductFields,
      );
    }
    if (req.body?.rateLimitPerMinute !== undefined) {
      update.rateLimitPerMinute = Math.min(Math.max(parseNumber(req.body.rateLimitPerMinute, 120), 10), 5000);
    }
    if (req.body?.dailyRequestLimit !== undefined) {
      update.dailyRequestLimit = Math.min(
        Math.max(parseNumber(req.body.dailyRequestLimit, 20000), 100),
        5000000,
      );
    }
    if (req.body?.dailyTokenLimit !== undefined) {
      update.dailyTokenLimit = Math.min(
        Math.max(parseNumber(req.body.dailyTokenLimit, 0), 0),
        50000000,
      );
    }
    if (req.body?.allowedOrigins !== undefined && Array.isArray(req.body.allowedOrigins)) {
      update.allowedOrigins = req.body.allowedOrigins;
    }

    const dynamicPatch = toPartnerDynamicPatch(
      {
        tier: req.body?.tier,
        baseRPM: req.body?.baseRPM,
        burstRPM: req.body?.burstRPM,
        dailyLimit: req.body?.dailyLimit,
        minDynamicRPM: req.body?.minDynamicRPM,
        maxDynamicRPM: req.body?.maxDynamicRPM,
        scalingEnabled: req.body?.scalingEnabled,
        lockScaling: req.body?.lockScaling,
        manualOverrideRPM: req.body?.manualOverrideRPM,
        manualOverrideDailyLimit: req.body?.manualOverrideDailyLimit,
        qualityScore: req.body?.qualityScore,
        safeModeForced: req.body?.safeModeForced,
      },
      existingPartner,
    );

    Object.assign(update, dynamicPatch);

    if (update["rateLimitPlan.baseRPM"] !== undefined) {
      update.rateLimitPerMinute = update["rateLimitPlan.baseRPM"];
    }
    if (update["rateLimitPlan.dailyLimit"] !== undefined) {
      update.dailyRequestLimit = update["rateLimitPlan.dailyLimit"];
    }

    const partner = await Partner.findByIdAndUpdate(
      partnerId,
      { $set: update },
      { new: true },
    ).lean();

    if (update.status === "paused") {
      await PartnerApiKey.updateMany(
        { partnerId, status: "active" },
        { $set: { status: "paused" } },
      );
    }

    if (update.status === "active") {
      await PartnerApiKey.updateMany(
        { partnerId, status: "paused" },
        { $set: { status: "active" } },
      );
    }

    if (update.status === "revoked") {
      await PartnerApiKey.updateMany(
        { partnerId, status: { $in: ["active", "paused"] } },
        { $set: { status: "revoked", revokedAt: new Date(), expiresAt: new Date() } },
      );
    }

    const activeKey = await PartnerApiKey.findOne({
      partnerId,
      status: "active",
    })
      .select("keyPrefix")
      .sort({ createdAt: -1 })
      .lean();

    const dynamic = await getPartnerDynamicLimitSnapshot({
      partner,
      keyPrefix: activeKey?.keyPrefix || "",
    });

    if (Object.keys(dynamicPatch).length > 0) {
      await applyPartnerDynamicAdminOverride({
        partner,
        keyPrefix: activeKey?.keyPrefix || "",
        reason: "partner_updated",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Partner updated",
      data: {
        id: String(partner._id),
        name: partner.name,
        companyName: partner.companyName || "",
        contactEmail: partner.contactEmail,
        status: partner.status,
        scopes: normalizeScopes(partner.scopes),
        visibleProductFields: normalizeVisibleProductFields(partner.visibleProductFields),
        rateLimitPerMinute: partner.rateLimitPerMinute,
        dailyRequestLimit: partner.dailyRequestLimit,
        dailyTokenLimit: partner.dailyTokenLimit,
        dynamic,
      },
    });
  } catch (error) {
    console.error("adminUpdatePartner error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update partner",
    });
  }
};

export const adminDeletePartner = async (req, res) => {
  try {
    const partnerId = String(req.params?.partnerId || "").trim();

    const partner = await Partner.findById(partnerId).lean();
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    await Promise.all([
      Partner.deleteOne({ _id: partnerId }),
      PartnerApiKey.deleteMany({ partnerId }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Partner deleted",
      data: {
        id: partnerId,
        name: partner.name,
      },
    });
  } catch (error) {
    console.error("adminDeletePartner error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete partner",
    });
  }
};

export const adminRevokePartnerKey = async (req, res) => {
  try {
    const partnerId = String(req.params?.partnerId || "").trim();
    const partner = await Partner.findById(partnerId).lean();
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    const result = await PartnerApiKey.updateMany(
      { partnerId, status: { $in: ["active", "paused"] } },
      {
        $set: {
          status: "revoked",
          revokedAt: new Date(),
          expiresAt: new Date(),
        },
      },
    );

    await Partner.updateOne(
      { _id: partnerId },
      { $set: { status: "revoked" } },
    );

    return res.status(200).json({
      success: true,
      message: "Partner key revoked",
      data: {
        partnerId,
        revokedKeys: Number(result.modifiedCount || 0),
      },
    });
  } catch (error) {
    console.error("adminRevokePartnerKey error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to revoke partner key",
    });
  }
};

export const adminGetPartnerOverview = async (_req, res) => {
  try {
    const [
      partners,
      activeKeys,
      totalLogsLast24h,
      errorLogsLast24h,
      lockedScalingPartners,
      manualOverridePartners,
      safeModeForcedPartners,
    ] = await Promise.all([
      Partner.countDocuments({}),
      PartnerApiKey.countDocuments({ status: "active" }),
      PartnerApiRequestLog.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
      PartnerApiRequestLog.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        statusCode: { $gte: 400 },
      }),
      Partner.countDocuments({ "dynamicControls.lockScaling": true }),
      Partner.countDocuments({ "dynamicControls.manualOverrideRPM": { $ne: null } }),
      Partner.countDocuments({ "dynamicControls.safeModeForced": true }),
    ]);

    const live = getPartnerLiveSnapshot({ limit: 20 });
    return res.status(200).json({
      success: true,
      data: {
        totals: {
          partners,
          activeKeys,
          requestsLast24h: totalLogsLast24h,
          errorRateLast24h: totalLogsLast24h > 0
            ? Number(((errorLogsLast24h / totalLogsLast24h) * 100).toFixed(2))
            : 0,
          lockedScalingPartners,
          manualOverridePartners,
          safeModeForcedPartners,
        },
        live,
      },
    });
  } catch (error) {
    console.error("adminGetPartnerOverview error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load partner overview",
    });
  }
};

export const adminGetPartnerAnalytics = async (req, res) => {
  try {
    const format = String(req.query?.format || "json").trim().toLowerCase();
    const errorRateThreshold = toFloatInRange(
      req.query?.errorRateThreshold,
      ANALYTICS_DEFAULT_ERROR_RATE_THRESHOLD,
      0.1,
      100,
    );
    const trafficSpikeMultiplier = toFloatInRange(
      req.query?.trafficSpikeMultiplier,
      ANALYTICS_DEFAULT_SPIKE_MULTIPLIER,
      1.1,
      20,
    );
    const trafficSpikeMinRequests = Math.max(
      1,
      parseNumber(req.query?.trafficSpikeMinRequests, ANALYTICS_DEFAULT_SPIKE_MIN_REQUESTS),
    );

    const partnerIdRaw = String(req.query?.partnerId || "").trim();
    const hasPartnerFilter = partnerIdRaw && mongoose.Types.ObjectId.isValid(partnerIdRaw);
    const selectedPartnerId = hasPartnerFilter ? partnerIdRaw : "";
    const range = resolveAnalyticsRange({
      range: req.query?.range,
      startDate: req.query?.startDate,
      endDate: req.query?.endDate,
    });

    const partnerQuery = selectedPartnerId ? { _id: selectedPartnerId } : {};
    const partners = await Partner.find(partnerQuery)
      .select("name status lastUsedAt rateLimitPerMinute dailyRequestLimit rateLimitPlan dynamicControls")
      .sort({ name: 1 })
      .lean();

    const partnerIds = partners.map((partner) => String(partner._id));
    if (!partnerIds.length) {
      return res.status(200).json({
        success: true,
        data: {
          summary: {
            totalRequestsToday: 0,
            totalErrorsToday: 0,
            averageErrorRate: 0,
            liveRequestsPerMinute: 0,
            activePartners: 0,
            lastActivityAt: null,
          },
          partnerStats: [],
          charts: {
            requestsOverTime: [],
            topEndpoints: [],
          },
          alerts: [],
          filters: {
            applied: {
              partnerId: selectedPartnerId || "",
              range: range.key,
              startDate: range.from.toISOString(),
              endDate: range.to.toISOString(),
            },
            partners: [],
            ranges: ["24h", "7d", "custom"],
            thresholds: {
              errorRateThreshold,
              trafficSpikeMultiplier,
              trafficSpikeMinRequests,
            },
          },
        },
      });
    }

    const partnerIdSet = new Set(partnerIds);
    const keys = await PartnerApiKey.find({ partnerId: { $in: partnerIds } })
      .select("partnerId keyPrefix lastUsedAt")
      .lean();

    const keysByPartner = new Map();
    for (const keyRow of keys) {
      const id = String(keyRow.partnerId || "");
      if (!id) continue;
      const list = keysByPartner.get(id) || [];
      list.push(keyRow);
      keysByPartner.set(id, list);
    }

    const partnerStatsMap = new Map(
      partners.map((partner) => [
        String(partner._id),
        {
          partnerId: String(partner._id),
          partnerName: partner.name,
          status: partner.status,
          totalRequestsToday: 0,
          requestsPerMinuteLive: 0,
          errorsToday: 0,
          errorRate: 0,
          lastActiveAt: partner.lastUsedAt || null,
          isRedisBacked: false,
          dynamicCurrentRPM: 0,
          dynamicPolicy: "unknown",
          dynamicLockScaling: Boolean(partner?.dynamicControls?.lockScaling),
          dynamicOverrideRPM: Number(partner?.dynamicControls?.manualOverrideRPM || 0),
          alerts: {
            highErrorRate: false,
            trafficSpike: false,
          },
        },
      ]),
    );

    await Promise.all(
      partners.map(async (partner) => {
        const partnerId = String(partner._id || "");
        const stat = partnerStatsMap.get(partnerId);
        if (!stat) return;

        const activeKeysForPartner = keysByPartner.get(partnerId) || [];
        const keyPrefix = String(activeKeysForPartner?.[0]?.keyPrefix || "");
        const dynamic = await getPartnerDynamicLimitSnapshot({ partner, keyPrefix });

        stat.dynamicCurrentRPM = Number(dynamic?.effectiveRPM || 0);
        stat.dynamicPolicy = String(dynamic?.state?.policy || "unknown");
      }),
    );

    const redis = getRedisClient();
    if (redis && keys.length) {
      try {
        const pipeline = redis.multi();
        for (const keyRow of keys) {
          const keyPrefix = String(keyRow.keyPrefix || "").trim();
          if (!keyPrefix) continue;
          const redisKeys = getAnalyticsRedisKeys(keyPrefix);
          pipeline.get(redisKeys.rpm);
          pipeline.hget(redisKeys.usageDaily, "total");
          pipeline.hget(redisKeys.usageDaily, "errors");
        }

        const redisRows = await pipeline.exec();
        let idx = 0;
        for (const keyRow of keys) {
          const keyPrefix = String(keyRow.keyPrefix || "").trim();
          if (!keyPrefix) continue;
          const partnerId = String(keyRow.partnerId || "");
          const stat = partnerStatsMap.get(partnerId);
          if (!stat) {
            idx += 3;
            continue;
          }

          const rpmRaw = redisRows[idx++]?.[1];
          const totalRaw = redisRows[idx++]?.[1];
          const errorsRaw = redisRows[idx++]?.[1];

          stat.requestsPerMinuteLive += Math.max(Number(rpmRaw || 0), 0);
          stat.totalRequestsToday += Math.max(Number(totalRaw || 0), 0);
          stat.errorsToday += Math.max(Number(errorsRaw || 0), 0);
          stat.isRedisBacked = true;

          const keyLastUsed = toSafeDate(keyRow.lastUsedAt);
          const currentLast = toSafeDate(stat.lastActiveAt);
          if (keyLastUsed && (!currentLast || keyLastUsed > currentLast)) {
            stat.lastActiveAt = keyLastUsed.toISOString();
          }
        }
      } catch (error) {
        console.warn("adminGetPartnerAnalytics redis aggregation fallback:", error?.message || error);
      }
    }

    const todayStart = startOfUtcDay(new Date());

    const [todayByPartner, rangeSeries, topEndpoints, rangeCountsByPartner] = await Promise.all([
      PartnerApiRequestLog.aggregate([
        {
          $match: {
            createdAt: { $gte: todayStart },
            ...(selectedPartnerId
              ? { partnerId: new mongoose.Types.ObjectId(selectedPartnerId) }
              : { partnerId: { $in: partnerIds.map((id) => new mongoose.Types.ObjectId(id)) } }),
          },
        },
        {
          $group: {
            _id: "$partnerId",
            requests: { $sum: 1 },
            errors: {
              $sum: {
                $cond: [{ $gte: ["$statusCode", 400] }, 1, 0],
              },
            },
            lastActiveAt: { $max: "$createdAt" },
          },
        },
      ]),
      PartnerApiRequestLog.aggregate([
        {
          $match: {
            createdAt: { $gte: range.from, $lte: range.to },
            ...(selectedPartnerId
              ? { partnerId: new mongoose.Types.ObjectId(selectedPartnerId) }
              : { partnerId: { $in: partnerIds.map((id) => new mongoose.Types.ObjectId(id)) } }),
          },
        },
        {
          $group: {
            _id: {
              bucket: {
                $dateToString: {
                  format: range.granularity === "day" ? "%Y-%m-%d" : "%m-%d %H:00",
                  date: "$createdAt",
                },
              },
            },
            requests: { $sum: 1 },
            errors: {
              $sum: {
                $cond: [{ $gte: ["$statusCode", 400] }, 1, 0],
              },
            },
          },
        },
        { $sort: { "_id.bucket": 1 } },
      ]),
      PartnerApiRequestLog.aggregate([
        {
          $match: {
            createdAt: { $gte: range.from, $lte: range.to },
            ...(selectedPartnerId
              ? { partnerId: new mongoose.Types.ObjectId(selectedPartnerId) }
              : { partnerId: { $in: partnerIds.map((id) => new mongoose.Types.ObjectId(id)) } }),
          },
        },
        {
          $group: {
            _id: "$endpoint",
            requests: { $sum: 1 },
            errors: {
              $sum: {
                $cond: [{ $gte: ["$statusCode", 400] }, 1, 0],
              },
            },
          },
        },
        { $sort: { requests: -1 } },
        { $limit: 8 },
      ]),
      PartnerApiRequestLog.aggregate([
        {
          $match: {
            createdAt: { $gte: range.from, $lte: range.to },
            ...(selectedPartnerId
              ? { partnerId: new mongoose.Types.ObjectId(selectedPartnerId) }
              : { partnerId: { $in: partnerIds.map((id) => new mongoose.Types.ObjectId(id)) } }),
          },
        },
        {
          $group: {
            _id: "$partnerId",
            requests: { $sum: 1 },
            errors: {
              $sum: {
                $cond: [{ $gte: ["$statusCode", 400] }, 1, 0],
              },
            },
            lastActiveAt: { $max: "$createdAt" },
          },
        },
      ]),
    ]);

    for (const row of todayByPartner) {
      const partnerId = String(row?._id || "");
      const stat = partnerStatsMap.get(partnerId);
      if (!stat) continue;

      if (!stat.isRedisBacked) {
        stat.totalRequestsToday = Math.max(Number(row.requests || 0), 0);
        stat.errorsToday = Math.max(Number(row.errors || 0), 0);
      }

      const lastActiveAt = toSafeDate(row.lastActiveAt);
      const currentLast = toSafeDate(stat.lastActiveAt);
      if (lastActiveAt && (!currentLast || lastActiveAt > currentLast)) {
        stat.lastActiveAt = lastActiveAt.toISOString();
      }
    }

    const rangeCountMap = new Map(
      rangeCountsByPartner.map((row) => [String(row?._id || ""), row]),
    );

    const partnerStats = Array.from(partnerStatsMap.values())
      .map((stat) => {
        const rangeCounts = rangeCountMap.get(stat.partnerId);
        const rangeRequests = Math.max(Number(rangeCounts?.requests || 0), 0);
        const rangeErrors = Math.max(Number(rangeCounts?.errors || 0), 0);
        const effectiveRequests = stat.totalRequestsToday > 0 ? stat.totalRequestsToday : rangeRequests;
        const effectiveErrors = stat.errorsToday > 0 ? stat.errorsToday : rangeErrors;
        const errorRate = effectiveRequests > 0
          ? Number(((effectiveErrors / effectiveRequests) * 100).toFixed(2))
          : 0;

        const currentLast = toSafeDate(stat.lastActiveAt);
        const rangeLast = toSafeDate(rangeCounts?.lastActiveAt);
        if (rangeLast && (!currentLast || rangeLast > currentLast)) {
          stat.lastActiveAt = rangeLast.toISOString();
        }

        const highErrorRate = errorRate >= errorRateThreshold;

        return {
          ...stat,
          totalRequestsToday: effectiveRequests,
          errorsToday: effectiveErrors,
          errorRate,
          alerts: {
            highErrorRate,
            trafficSpike: false,
          },
        };
      })
      .sort((a, b) => b.totalRequestsToday - a.totalRequestsToday);

    const requestsOverTime = rangeSeries.map((row) => {
      const requests = Math.max(Number(row.requests || 0), 0);
      const errors = Math.max(Number(row.errors || 0), 0);
      return {
        label: row._id.bucket,
        requests,
        errors,
      };
    });

    const topEndpointRows = topEndpoints.map((row) => {
      const requests = Math.max(Number(row.requests || 0), 0);
      const errors = Math.max(Number(row.errors || 0), 0);
      return {
        endpoint: String(row._id || "/"),
        requests,
        errors,
        errorRate: requests > 0 ? Number(((errors / requests) * 100).toFixed(2)) : 0,
      };
    });

    const globalAlerts = [];
    const latestBucket = requestsOverTime[requestsOverTime.length - 1];
    const previousBuckets = requestsOverTime.slice(0, -1);
    const previousAverage = previousBuckets.length
      ? previousBuckets.reduce((sum, row) => sum + row.requests, 0) / previousBuckets.length
      : 0;
    const hasTrafficSpike = Boolean(
      latestBucket
      && previousAverage > 0
      && latestBucket.requests >= Math.max(
        trafficSpikeMinRequests,
        Math.ceil(previousAverage * trafficSpikeMultiplier),
      ),
    );

    if (hasTrafficSpike) {
      globalAlerts.push({
        type: "traffic_spike",
        severity: "warning",
        message: `Traffic spike detected: ${latestBucket.requests} requests in latest bucket vs avg ${Math.round(previousAverage)}.`,
      });
    }

    const highErrorPartners = partnerStats.filter((item) => item.alerts.highErrorRate);
    if (highErrorPartners.length) {
      globalAlerts.push({
        type: "high_error_rate",
        severity: "critical",
        message: `${highErrorPartners.length} partner(s) above error-rate threshold (>=${errorRateThreshold}%).`,
      });
    }

    const partnerStatsWithSpike = partnerStats.map((stat) => ({
      ...stat,
      alerts: {
        ...stat.alerts,
        trafficSpike: hasTrafficSpike && stat.requestsPerMinuteLive > 0,
      },
    }));

    const totalRequestsToday = partnerStatsWithSpike.reduce(
      (sum, stat) => sum + Number(stat.totalRequestsToday || 0),
      0,
    );
    const totalErrorsToday = partnerStatsWithSpike.reduce(
      (sum, stat) => sum + Number(stat.errorsToday || 0),
      0,
    );
    const liveRequestsPerMinute = partnerStatsWithSpike.reduce(
      (sum, stat) => sum + Number(stat.requestsPerMinuteLive || 0),
      0,
    );
    const averageErrorRate = totalRequestsToday > 0
      ? Number(((totalErrorsToday / totalRequestsToday) * 100).toFixed(2))
      : 0;

    const responsePayload = {
      summary: {
        totalRequestsToday,
        totalErrorsToday,
        averageErrorRate,
        liveRequestsPerMinute,
        activePartners: partnerStatsWithSpike.filter((item) => item.status === "active").length,
        lastActivityAt: partnerStatsWithSpike
          .map((item) => toSafeDate(item.lastActiveAt))
          .filter(Boolean)
          .sort((a, b) => b.getTime() - a.getTime())?.[0]?.toISOString() || null,
      },
      partnerStats: partnerStatsWithSpike,
      charts: {
        requestsOverTime,
        topEndpoints: topEndpointRows,
      },
      alerts: globalAlerts,
      filters: {
        applied: {
          partnerId: selectedPartnerId || "",
          range: range.key,
          startDate: range.from.toISOString(),
          endDate: range.to.toISOString(),
        },
        partners: partners.map((partner) => ({
          id: String(partner._id),
          name: partner.name,
          status: partner.status,
        })),
        ranges: ["24h", "7d", "custom"],
        thresholds: {
          errorRateThreshold,
          trafficSpikeMultiplier,
          trafficSpikeMinRequests,
        },
      },
    };

    if (format === "csv") {
      const headers = [
        "partnerId",
        "partnerName",
        "status",
        "totalRequestsToday",
        "requestsPerMinuteLive",
        "errorsToday",
        "errorRate",
        "lastActiveAt",
        "highErrorRate",
        "trafficSpike",
      ];

      const rows = partnerStatsWithSpike.map((item) => [
        item.partnerId,
        item.partnerName,
        item.status,
        item.totalRequestsToday,
        item.requestsPerMinuteLive,
        item.errorsToday,
        item.errorRate,
        item.lastActiveAt || "",
        item.alerts?.highErrorRate ? "yes" : "no",
        item.alerts?.trafficSpike ? "yes" : "no",
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => csvEscape(cell)).join(","))
        .join("\n");

      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=partner-analytics-${stamp}.csv`);
      return res.status(200).send(csv);
    }

    return res.status(200).json({
      success: true,
      data: responsePayload,
    });
  } catch (error) {
    console.error("adminGetPartnerAnalytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load partner analytics",
    });
  }
};

export const adminGetPartnerDetail = async (req, res) => {
  try {
    const partnerId = String(req.params?.partnerId || "").trim();
    const partner = await Partner.findById(partnerId).lean();
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    const activeKey = await PartnerApiKey.findOne({
      partnerId,
      status: "active",
    })
      .select("keyPrefix createdAt lastUsedAt lastUsedIp")
      .sort({ createdAt: -1 })
      .lean();

    const [usage24h, usage7d, latestLogs] = await Promise.all([
      PartnerApiRequestLog.aggregate([
        {
          $match: {
            partnerId: new mongoose.Types.ObjectId(partnerId),
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              hour: { $dateToString: { format: "%Y-%m-%d %H:00", date: "$createdAt" } },
            },
            count: { $sum: 1 },
            errors: {
              $sum: {
                $cond: [{ $gte: ["$statusCode", 400] }, 1, 0],
              },
            },
          },
        },
        { $sort: { "_id.hour": 1 } },
      ]),
      PartnerApiRequestLog.aggregate([
        {
          $match: {
            partnerId: new mongoose.Types.ObjectId(partnerId),
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            },
            count: { $sum: 1 },
            errors: {
              $sum: {
                $cond: [{ $gte: ["$statusCode", 400] }, 1, 0],
              },
            },
          },
        },
        { $sort: { "_id.day": 1 } },
      ]),
      PartnerApiRequestLog.find({ partnerId })
        .select("method endpoint statusCode ipAddress location responseTimeMs createdAt errorCode")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    const [dynamic, rateLimit, dailyUsage, dynamicEvents] = await Promise.all([
      getPartnerDynamicLimitSnapshot({
        partner,
        keyPrefix: activeKey?.keyPrefix || "",
      }),
      getPartnerRateLimitSnapshot({
        partnerId,
        keyPrefix: activeKey?.keyPrefix || "",
        configuredRateLimitPerMinute: partner.rateLimitPerMinute,
        partner,
      }),
      getPartnerDailyLimitSnapshot({
        partnerId,
        keyPrefix: activeKey?.keyPrefix || "",
        configuredDailyRequestLimit: partner.dailyRequestLimit,
        partner,
      }),
      getPartnerDynamicScalingEvents({
        partnerId,
        keyPrefix: activeKey?.keyPrefix || "",
        limit: 20,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        partner: {
          id: String(partner._id),
          name: partner.name,
          companyName: partner.companyName || "",
          contactEmail: partner.contactEmail,
          status: partner.status,
          scopes: normalizeScopes(partner.scopes),
          rateLimitPerMinute: partner.rateLimitPerMinute,
          dailyRequestLimit: partner.dailyRequestLimit,
          dailyTokenLimit: partner.dailyTokenLimit,
          dynamic,
          visibleProductFields: normalizeVisibleProductFields(partner.visibleProductFields),
          notes: partner.notes || "",
          createdAt: partner.createdAt,
          lastUsedAt: partner.lastUsedAt || activeKey?.lastUsedAt || null,
        },
        activeKey: activeKey || null,
        usage: {
          rateLimit,
          dailyUsage,
          series24h: usage24h.map((item) => ({
            label: item._id.hour,
            requests: item.count,
            errors: item.errors,
          })),
          series7d: usage7d.map((item) => ({
            label: item._id.day,
            requests: item.count,
            errors: item.errors,
          })),
        },
        logs: latestLogs,
        dynamicEvents,
      },
    });
  } catch (error) {
    console.error("adminGetPartnerDetail error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load partner details",
    });
  }
};

export const adminGetPartnerDynamicState = async (req, res) => {
  try {
    const partnerId = String(req.params?.partnerId || "").trim();
    const partner = await Partner.findById(partnerId).lean();
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    const activeKey = await PartnerApiKey.findOne({ partnerId, status: "active" })
      .select("keyPrefix")
      .sort({ createdAt: -1 })
      .lean();

    const keyPrefix = String(activeKey?.keyPrefix || "");
    const [dynamic, events] = await Promise.all([
      getPartnerDynamicLimitSnapshot({ partner, keyPrefix }),
      getPartnerDynamicScalingEvents({ partnerId, keyPrefix, limit: 40 }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        partnerId,
        keyPrefix,
        dynamic,
        events,
      },
    });
  } catch (error) {
    console.error("adminGetPartnerDynamicState error:", error);
    return res.status(500).json({ success: false, message: "Failed to load dynamic limiter state" });
  }
};

export const adminUpdatePartnerDynamicState = async (req, res) => {
  try {
    const partnerId = String(req.params?.partnerId || "").trim();
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    const dynamicPatch = toPartnerDynamicPatch(req.body || {}, partner);
    if (!Object.keys(dynamicPatch).length) {
      return res.status(400).json({
        success: false,
        message: "No dynamic limiter fields were provided",
      });
    }

    await Partner.updateOne({ _id: partner._id }, { $set: dynamicPatch });
    const updatedPartner = await Partner.findById(partnerId).lean();

    const activeKey = await PartnerApiKey.findOne({ partnerId, status: "active" })
      .select("keyPrefix")
      .sort({ createdAt: -1 })
      .lean();

    const keyPrefix = String(activeKey?.keyPrefix || "");
    await applyPartnerDynamicAdminOverride({
      partner: updatedPartner,
      keyPrefix,
      reason: "dynamic_state_updated",
    });

    const [dynamic, events] = await Promise.all([
      getPartnerDynamicLimitSnapshot({ partner: updatedPartner, keyPrefix }),
      getPartnerDynamicScalingEvents({ partnerId, keyPrefix, limit: 20 }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Dynamic limiter settings updated",
      data: {
        partnerId,
        keyPrefix,
        dynamic,
        events,
      },
    });
  } catch (error) {
    console.error("adminUpdatePartnerDynamicState error:", error);
    return res.status(500).json({ success: false, message: "Failed to update dynamic limiter state" });
  }
};

export const adminGetPartnerLogs = async (req, res) => {
  try {
    const partnerId = String(req.query?.partnerId || "").trim();
    const statusCode = parseNumber(req.query?.statusCode, null);
    const endpoint = String(req.query?.endpoint || "").trim();
    const page = Math.max(parseNumber(req.query?.page, 1), 1);
    const limit = Math.min(Math.max(parseNumber(req.query?.limit, 50), 1), 200);
    const skip = (page - 1) * limit;

    const query = {};
    if (partnerId && mongoose.Types.ObjectId.isValid(partnerId)) {
      query.partnerId = partnerId;
    }
    if (Number.isFinite(statusCode)) {
      query.statusCode = statusCode;
    }
    if (endpoint) {
      query.endpoint = new RegExp(escapeRegex(endpoint), "i");
    }

    const [rows, total] = await Promise.all([
      PartnerApiRequestLog.find(query)
        .select("partnerId keyPrefix method endpoint statusCode ipAddress location responseTimeMs createdAt errorCode")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PartnerApiRequestLog.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    console.error("adminGetPartnerLogs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load partner logs",
    });
  }
};

export const adminGetPartnerLiveMonitoring = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseNumber(req.query?.limit, 30), 1), 100);
    const partnerId = String(req.query?.partnerId || "").trim();
    const live = getPartnerLiveSnapshot({ limit });

    const recentErrors = await PartnerApiRequestLog.find({
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
      statusCode: { $gte: 400 },
    })
      .select("partnerId keyPrefix method endpoint statusCode createdAt errorCode")
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    let dynamic = null;
    let dynamicEvents = [];
    if (partnerId && mongoose.Types.ObjectId.isValid(partnerId)) {
      const partner = await Partner.findById(partnerId).lean();
      if (partner) {
        const activeKey = await PartnerApiKey.findOne({ partnerId, status: "active" })
          .select("keyPrefix")
          .sort({ createdAt: -1 })
          .lean();

        const keyPrefix = String(activeKey?.keyPrefix || "");
        [dynamic, dynamicEvents] = await Promise.all([
          getPartnerDynamicLimitSnapshot({ partner, keyPrefix }),
          getPartnerDynamicScalingEvents({ partnerId, keyPrefix, limit: 20 }),
        ]);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        ...live,
        recentErrors,
        dynamic,
        dynamicEvents,
      },
    });
  } catch (error) {
    console.error("adminGetPartnerLiveMonitoring error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load live monitoring",
    });
  }
};

export const adminGeneratePartnerCredentialPdf = async (req, res) => {
  try {
    const partnerId = String(req.params?.partnerId || "").trim();
    const partner = await Partner.findById(partnerId).lean();
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    const apiKey = String(req.body?.apiKey || "").trim();
    if (!apiKey || !apiKey.startsWith("hogp_")) {
      return res.status(400).json({
        success: false,
        message: "Valid API key is required to generate credential PDF",
      });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}/api/v1/partner`;
    const guideUrl = `${baseUrl}/guide`;
    const guidePdfUrl = `${baseUrl}/guide.pdf`;
    const sampleCurl = `curl -X GET "${baseUrl}/products?limit=20" -H "x-api-key: ${apiKey}"`;

    const pdfBuffer = await buildPartnerCredentialPdfBuffer({
      baseUrl,
      guideUrl,
      guidePdfUrl,
      partnerName: partner.name,
      contactEmail: partner.contactEmail,
      apiKey,
      sampleCurl,
    });

    const safeName = String(partner.name || "partner")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "partner";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="healthyonegram-partner-credentials-${safeName}.pdf"`,
    );
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("adminGeneratePartnerCredentialPdf error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate partner credential PDF",
    });
  }
};
