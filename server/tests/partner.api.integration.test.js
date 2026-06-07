import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Category from "../models/category.model.js";
import Partner from "../models/partner.model.js";
import PartnerApiKey from "../models/partnerApiKey.model.js";
import Product from "../models/product.model.js";
import partnerApiRouter from "../routes/partnerApi.route.js";

let mongoServer;
let httpServer;
let baseUrl = "";

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload =
    response.status === 304 ? null : await response.json();
  return { response, payload };
};

const buildPartnerApiKey = () => {
  const keyPrefix = `hogp_test${Date.now().toString(36)}${Math.random().toString(16).slice(2, 8)}`;
  const apiKey = `${keyPrefix}.${crypto.randomBytes(24).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
  return { apiKey, keyPrefix, keyHash };
};

const seedPartner = async ({
  scopes = ["catalog.read", "inventory.read", "price.read"],
  rateLimitPerMinute,
  visibleProductFields,
} = {}) => {
  const normalizedRateLimit = Number.isFinite(Number(rateLimitPerMinute))
    ? Math.max(10, Math.floor(Number(rateLimitPerMinute)))
    : undefined;

  const partner = await Partner.create({
    name: `Partner ${Date.now()}`,
    contactEmail: `partner-${Date.now()}@example.com`,
    status: "active",
    scopes,
    ...(Array.isArray(visibleProductFields)
      ? { visibleProductFields }
      : {}),
    ...(normalizedRateLimit !== undefined
      ? {
          rateLimitPerMinute: normalizedRateLimit,
          rateLimitPlan: {
            tier: "custom",
            baseRPM: normalizedRateLimit,
            burstRPM: normalizedRateLimit,
            dailyLimit: 20000,
            minDynamicRPM: normalizedRateLimit,
            maxDynamicRPM: normalizedRateLimit,
            scalingEnabled: false,
          },
          dynamicControls: {
            lockScaling: true,
            manualOverrideRPM: normalizedRateLimit,
          },
        }
      : {}),
  });

  const key = buildPartnerApiKey();
  await PartnerApiKey.create({
    partnerId: partner._id,
    keyPrefix: key.keyPrefix,
    keyHash: key.keyHash,
    status: "active",
  });

  return {
    partner,
    apiKey: key.apiKey,
  };
};

const seedCatalog = async () => {
  const category = await Category.create({
    name: "Nuts",
    slug: `nuts-${Date.now()}`,
    isActive: true,
  });

  const product = await Product.create({
    name: "Almond 500g",
    slug: `almond-500g-${Date.now()}`,
    description: "Premium almonds",
    shortDescription: "Crunchy almonds",
    price: 599,
    originalPrice: 699,
    discount: 14,
    images: ["https://example.com/almond.jpg"],
    category: category._id,
    sku: `ALM-${Date.now()}`,
    stock: 20,
    stock_quantity: 20,
    reserved_quantity: 2,
    tags: ["dry-fruits", "style"],
    isActive: true,
  });

  return { category, product };
};

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: "AnanyaBoutique-partner-test" });

  const app = express();
  app.use(express.json());
  app.use("/api/v1/partner", partnerApiRouter);
  app.use((err, _req, res, _next) => {
    res.status(err?.status || 500).json({
      success: false,
      message: err?.message || "Internal server error",
    });
  });

  httpServer = await new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });

  const { port } = httpServer.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.afterEach(async () => {
  await Promise.all([
    PartnerApiKey.deleteMany({}),
    Partner.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
  ]);
});

test.after(async () => {
  if (httpServer) {
    await new Promise((resolve, reject) => {
      httpServer.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

test("GET /api/v1/partner/guide?format=json returns shareable partner guide", async () => {
  const { response, payload } = await requestJson("/api/v1/partner/guide?format=json");

  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.data.version, "v1");
  assert.ok(Array.isArray(payload.data.endpoints));
  assert.ok(payload.data.endpoints.some((endpoint) => endpoint.path === "/products"));
});

test("GET /api/v1/partner/products rejects missing API key", async () => {
  const { response, payload } = await requestJson("/api/v1/partner/products");

  assert.equal(response.status, 401);
  assert.equal(payload.success, false);
  assert.equal(payload.error.code, "UNAUTHORIZED");
});

test("GET /api/v1/partner/inventory enforces scope checks", async () => {
  const { apiKey } = await seedPartner({ scopes: ["catalog.read"] });

  const { response, payload } = await requestJson("/api/v1/partner/inventory", {
    headers: {
      "x-api-key": apiKey,
    },
  });

  assert.equal(response.status, 403);
  assert.equal(payload.success, false);
  assert.equal(payload.error.code, "INSUFFICIENT_SCOPE");
});

test("GET /api/v1/partner/inventory returns variant-wise stock breakup", async () => {
  const { apiKey } = await seedPartner({ scopes: ["inventory.read"] });
  const category = await Category.create({
    name: "Boutique Style",
    slug: `boutique-style-${Date.now()}`,
    isActive: true,
  });

  const product = await Product.create({
    name: "Dark Chocolate Smooth Boutique Style",
    slug: `dark-choco-peanut-${Date.now()}`,
    price: 449,
    category: category._id,
    sku: `ANB-${Date.now()}`,
    isActive: true,
    hasVariants: true,
    stock: 37,
    stock_quantity: 37,
    reserved_quantity: 0,
    variants: [
      {
        name: "500g",
        sku: `ANB-500-${Date.now()}`,
        price: 449,
        stock: 16,
        stock_quantity: 16,
        reserved_quantity: 0,
      },
      {
        name: "1kg",
        sku: `ANB-1KG-${Date.now()}`,
        price: 799,
        stock: 21,
        stock_quantity: 21,
        reserved_quantity: 0,
      },
    ],
  });

  const { response, payload } = await requestJson(
    `/api/v1/partner/inventory?productId=${String(product._id)}`,
    {
      headers: {
        "x-api-key": apiKey,
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.ok(Array.isArray(payload.data));
  assert.equal(payload.data.length, 1);

  const [item] = payload.data;
  assert.equal(item.stock.availableQuantity, 37);
  assert.equal(item.stock.reservedQuantity, 0);
  assert.ok(Array.isArray(item.stock.variants));
  assert.equal(item.stock.variants.length, 2);

  const variant500g = item.stock.variants.find((variant) => variant.name === "500g");
  const variant1kg = item.stock.variants.find((variant) => variant.name === "1kg");

  assert.ok(variant500g);
  assert.equal(variant500g.availableQuantity, 16);
  assert.equal(variant500g.status, "in_stock");

  assert.ok(variant1kg);
  assert.equal(variant1kg.availableQuantity, 21);
  assert.equal(variant1kg.status, "in_stock");
});

test("GET /api/v1/partner/products returns variant-wise stock breakup", async () => {
  const { apiKey } = await seedPartner({ scopes: ["catalog.read"] });
  const category = await Category.create({
    name: "Boutique Style",
    slug: `boutique-style-products-${Date.now()}`,
    isActive: true,
  });

  await Product.create({
    name: "Choco Millet Crisp Boutique Style",
    slug: `choco-millet-${Date.now()}`,
    price: 399,
    category: category._id,
    sku: `ANB-PROD-${Date.now()}`,
    isActive: true,
    hasVariants: true,
    variants: [
      {
        name: "500g",
        sku: `ANB-PROD-500-${Date.now()}`,
        price: 399,
        stock: 50,
        stock_quantity: 50,
        reserved_quantity: 0,
      },
      {
        name: "1kg",
        sku: `ANB-PROD-1KG-${Date.now()}`,
        price: 699,
        stock: 50,
        stock_quantity: 50,
        reserved_quantity: 0,
      },
    ],
  });

  const { response, payload } = await requestJson("/api/v1/partner/products?limit=10&page=1", {
    headers: {
      "x-api-key": apiKey,
    },
  });

  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.ok(Array.isArray(payload.data));

  const item = payload.data.find((entry) => entry.name === "Choco Millet Crisp Boutique Style");
  assert.ok(item);
  assert.ok(item.stock);
  assert.equal(item.stock.availableQuantity, 100);
  assert.ok(Array.isArray(item.stock.variants));
  assert.equal(item.stock.variants.length, 2);

  const variant500g = item.stock.variants.find((variant) => variant.name === "500g");
  const variant1kg = item.stock.variants.find((variant) => variant.name === "1kg");

  assert.ok(variant500g);
  assert.equal(variant500g.availableQuantity, 50);

  assert.ok(variant1kg);
  assert.equal(variant1kg.availableQuantity, 50);
});

test("GET /api/v1/partner/products returns expected partner payload with ETag", async () => {
  const { partner, apiKey } = await seedPartner();
  const { product } = await seedCatalog();

  const first = await requestJson("/api/v1/partner/products?limit=10&page=1", {
    headers: {
      "x-api-key": apiKey,
    },
  });

  assert.equal(first.response.status, 200);
  assert.equal(first.payload.success, true);
  assert.equal(first.payload.meta.version, "v1");
  assert.equal(first.payload.meta.partnerId, String(partner._id));
  assert.ok(Array.isArray(first.payload.data));
  assert.ok(first.payload.data.length >= 1);

  const item = first.payload.data.find((entry) => entry.id === String(product._id));
  assert.ok(item);
  assert.equal(item.sku, product.sku);
  assert.equal(item.price.amount, 599);
  assert.equal(item.stock.status, "in_stock");
  assert.equal(item.stock.availableQuantity, 18);
  assert.equal(item.shipping.freeShipping, true);
  assert.match(item.productUrl, /\/product\//);

  const etag = first.response.headers.get("etag");
  assert.ok(etag);

  const second = await requestJson("/api/v1/partner/products?limit=10&page=1", {
    headers: {
      "x-api-key": apiKey,
      "if-none-match": etag,
    },
  });

  assert.equal(second.response.status, 304);
});

test("GET /api/v1/partner/products/:productId returns product details for valid id", async () => {
  const { apiKey } = await seedPartner({ scopes: ["catalog.read"] });
  const { product } = await seedCatalog();

  const { response, payload } = await requestJson(
    `/api/v1/partner/products/${String(product._id)}`,
    {
      headers: {
        "x-api-key": apiKey,
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.data.id, String(product._id));
  assert.equal(payload.data.name, "Almond 500g");
  assert.equal(payload.data.price.amount, 599);
  assert.equal(payload.data.stock.availableQuantity, 18);
});

test("GET /api/v1/partner/products/:productId returns 404 for unknown product", async () => {
  const { apiKey } = await seedPartner({ scopes: ["catalog.read"] });

  const { response, payload } = await requestJson(
    "/api/v1/partner/products/unknown-product-slug",
    {
      headers: {
        "x-api-key": apiKey,
      },
    },
  );

  assert.equal(response.status, 404);
  assert.equal(payload.success, false);
  assert.equal(payload.error.code, "NOT_FOUND");
});

test("GET /api/v1/partner/health enforces per-partner runtime rate limit", async () => {
  const { apiKey } = await seedPartner({ rateLimitPerMinute: 10 });

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const pass = await requestJson("/api/v1/partner/health", {
      headers: {
        "x-api-key": apiKey,
      },
    });
    assert.equal(pass.response.status, 200);
  }

  const blocked = await requestJson("/api/v1/partner/health", {
    headers: {
      "x-api-key": apiKey,
    },
  });

  assert.equal(blocked.response.status, 429);
  assert.equal(blocked.payload.success, false);
  assert.equal(blocked.payload.error.code, "RATE_LIMIT_EXCEEDED");
  assert.ok(blocked.response.headers.get("ratelimit-limit"));
  assert.ok(blocked.response.headers.get("ratelimit-remaining"));
  assert.ok(blocked.response.headers.get("retry-after"));
});

test("GET /api/v1/partner/pricing applies Rajasthan GST split and includes taxable + gross values", async () => {
  const { apiKey } = await seedPartner({ scopes: ["price.read"] });
  const { product } = await seedCatalog();

  const { response, payload } = await requestJson(
    `/api/v1/partner/pricing?productId=${String(product._id)}&deliveryState=Rajasthan`,
    {
      headers: {
        "x-api-key": apiKey,
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.data.length, 1);
  const item = payload.data[0];
  assert.equal(item.price.amountWithGst, 599);
  assert.ok(item.price.taxableAmount > 0);
  assert.ok(item.price.gstAmount > 0);
  assert.equal(item.price.gstBreakup.mode, "CGST_SGST");
  assert.ok(item.price.gstBreakup.cgst > 0);
  assert.ok(item.price.gstBreakup.sgst > 0);
  assert.equal(item.price.gstBreakup.igst, 0);
});

test("GET /api/v1/partner/products respects visibleProductFields configuration", async () => {
  const { apiKey } = await seedPartner({
    scopes: ["catalog.read"],
    visibleProductFields: ["stock", "gstBreakup"],
  });
  const { product } = await seedCatalog();

  const { response, payload } = await requestJson(
    `/api/v1/partner/products?deliveryState=Maharashtra&limit=10&page=1`,
    {
      headers: {
        "x-api-key": apiKey,
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  const item = payload.data.find((entry) => entry.id === String(product._id));
  assert.ok(item);
  assert.equal(item.stock.availableQuantity, 18);
  assert.equal(item.price.gstBreakup.mode, "IGST");
  assert.ok(item.price.gstBreakup.igst > 0);
  assert.equal(item.description, undefined);
  assert.equal(item.images, undefined);
  assert.equal(item.category, undefined);
  assert.equal(item.tags, undefined);
  assert.equal(item.discount, undefined);
  assert.equal(item.shipping, undefined);
  assert.equal(item.hsnCode, undefined);
});
