import express from "express";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import Category from "../models/category.model.js";
import Partner from "../models/partner.model.js";
import PartnerApiKey from "../models/partnerApiKey.model.js";
import PartnerApiRequestLog from "../models/partnerApiRequestLog.model.js";
import Product from "../models/product.model.js";
import UserModel from "../models/user.model.js";
import partnerApiRouter from "../routes/partnerApi.route.js";

let mongoServer;
let httpServer;
let baseUrl = "";
let adminToken = "";

const hashApiKey = (value) =>
  crypto
    .createHash("sha256")
    .update(String(value || ""))
    .digest("hex");

const buildPartnerApiKey = () => {
  const keyPrefix = `hogp_test${Date.now().toString(36)}${Math.random().toString(16).slice(2, 8)}`;
  const apiKey = `${keyPrefix}.${crypto.randomBytes(24).toString("hex")}`;
  const keyHash = hashApiKey(apiKey);
  return { apiKey, keyPrefix, keyHash };
};

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload =
    response.status === 304 ? null : await response.json().catch(() => null);
  return { response, payload };
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const adminRequest = async (path, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${adminToken}`,
    ...(options.headers || {}),
  };

  return requestJson(path, {
    ...options,
    headers,
  });
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
    tags: ["dry-fruits", "protein"],
    isActive: true,
  });

  return { category, product };
};

const createPartnerViaAdmin = async ({
  name,
  scopes = ["catalog.read", "inventory.read", "pricing.read", "gst.read"],
  rpm = 120,
  daily = 20000,
  visibleProductFields,
} = {}) => {
  const payload = {
    name: String(name || `Partner-${Date.now()}`),
    companyName: "QA Labs",
    contactEmail: `qa-${Date.now()}@example.com`,
    scopes,
    rateLimitPerMinute: rpm,
    dailyRequestLimit: daily,
    visibleProductFields: Array.isArray(visibleProductFields)
      ? visibleProductFields
      : [
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
        ],
  };

  const { response, payload: body } = await adminRequest(
    "/api/v1/partner/admin/partners",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  assert.equal(response.status, 201);
  assert.equal(body?.success, true);

  return {
    partnerId: String(body.data.partner.id),
    apiKey: String(body.data.apiKey),
  };
};

test.before(async () => {
  process.env.ACCESS_TOKEN_SECRET =
    "partner-api-production-test-secret-0123456789";
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    dbName: "bogEcom-partner-prod-test",
  });

  const admin = await UserModel.create({
    name: "QA Admin",
    email: "qa-admin@example.com",
    password: "Password@123",
    role: "Admin",
    status: "active",
  });
  adminToken = jwt.sign(
    { id: String(admin._id) },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "1h",
    },
  );

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

  await seedCatalog();
});

test.afterEach(async () => {
  await Promise.all([
    PartnerApiRequestLog.deleteMany({}),
    PartnerApiKey.deleteMany({}),
    Partner.deleteMany({}),
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

  await Promise.all([
    Product.deleteMany({}),
    Category.deleteMany({}),
    UserModel.deleteMany({}),
  ]);
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

test("functional: valid API key can read products, inventory, pricing, gst", async () => {
  const { apiKey } = await createPartnerViaAdmin();

  const products = await requestJson("/api/v1/partner/products?limit=5", {
    headers: { "x-api-key": apiKey },
  });
  assert.equal(products.response.status, 200);
  assert.equal(products.payload?.success, true);

  const inventory = await requestJson("/api/v1/partner/inventory?limit=5", {
    headers: { "x-api-key": apiKey },
  });
  assert.equal(inventory.response.status, 200);

  const pricing = await requestJson("/api/v1/partner/pricing", {
    headers: { "x-api-key": apiKey },
  });
  assert.equal(pricing.response.status, 200);

  const gst = await requestJson(
    "/api/v1/partner/gst?amount=599&deliveryState=Rajasthan",
    {
      headers: { "x-api-key": apiKey },
    },
  );
  assert.equal(gst.response.status, 200);
  assert.equal(gst.payload?.data?.mode, "CGST_SGST");
});

test("admin settings: visibleProductFields controls what partners receive", async () => {
  const { apiKey } = await createPartnerViaAdmin({
    name: "Utkarsh Partner Demo",
    scopes: ["catalog.read"],
    visibleProductFields: ["stock", "gstBreakup"],
  });

  const products = await requestJson(
    "/api/v1/partner/products?limit=5&deliveryState=Rajasthan",
    {
      headers: { "x-api-key": apiKey },
    },
  );

  assert.equal(products.response.status, 200);
  assert.equal(products.payload?.success, true);

  const item = Array.isArray(products.payload?.data)
    ? products.payload.data[0]
    : null;
  assert.ok(item);

  assert.ok(item.stock);
  assert.ok(item.price?.gstBreakup);

  assert.equal(item.description, undefined);
  assert.equal(item.shortDescription, undefined);
  assert.equal(item.images, undefined);
  assert.equal(item.category, undefined);
  assert.equal(item.tags, undefined);
  assert.equal(item.discount, undefined);
  assert.equal(item.shipping, undefined);
  assert.equal(item.hsnCode, undefined);
});

test("docs: guide.pdf returns a PDF payload", async () => {
  const response = await fetch(`${baseUrl}/api/v1/partner/guide.pdf`);

  assert.equal(response.status, 200);
  assert.ok(
    String(response.headers.get("content-type") || "").includes(
      "application/pdf",
    ),
  );
  assert.ok(
    String(response.headers.get("content-disposition") || "")
      .toLowerCase()
      .includes("healthyonegram-partner-api-guide.pdf"),
  );

  const buffer = await response.arrayBuffer();
  assert.ok(buffer.byteLength > 100);
});

test("functional: invalid or tampered API key returns auth errors", async () => {
  const { apiKey } = await createPartnerViaAdmin();

  const invalid = await requestJson("/api/v1/partner/products");
  assert.equal(invalid.response.status, 401);
  assert.equal(invalid.payload?.error?.code, "UNAUTHORIZED");

  const tampered = await requestJson("/api/v1/partner/products", {
    headers: { "x-api-key": `${apiKey.slice(0, -1)}x` },
  });
  assert.equal(tampered.response.status, 401);
  assert.equal(tampered.payload?.error?.code, "UNAUTHORIZED");
});

test("functional: rotated key invalidates old key immediately", async () => {
  const { partnerId, apiKey } = await createPartnerViaAdmin();

  const rotate = await adminRequest(
    `/api/v1/partner/admin/partners/${partnerId}/rotate-key`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
  assert.equal(rotate.response.status, 200);
  const rotatedKey = String(rotate.payload?.data?.apiKey || "");
  assert.ok(rotatedKey.startsWith("hogp_"));

  const oldReq = await requestJson("/api/v1/partner/health", {
    headers: { "x-api-key": apiKey },
  });
  assert.equal(oldReq.response.status, 403);
  assert.equal(oldReq.payload?.error?.code, "KEY_REVOKED");

  const newReq = await requestJson("/api/v1/partner/health", {
    headers: { "x-api-key": rotatedKey },
  });
  assert.equal(newReq.response.status, 200);
});

test("functional: expired key is rejected", async () => {
  const partner = await Partner.create({
    name: `Expired-${Date.now()}`,
    contactEmail: `expired-${Date.now()}@example.com`,
    scopes: ["catalog.read", "inventory.read"],
    status: "active",
    rateLimitPerMinute: 120,
  });

  const key = buildPartnerApiKey();
  await PartnerApiKey.create({
    partnerId: partner._id,
    keyPrefix: key.keyPrefix,
    keyHash: key.keyHash,
    status: "active",
    expiresAt: new Date(Date.now() - 60 * 1000),
  });

  const result = await requestJson("/api/v1/partner/products", {
    headers: { "x-api-key": key.apiKey },
  });

  assert.equal(result.response.status, 401);
  assert.equal(result.payload?.error?.code, "KEY_EXPIRED");
});

test("functional: scope enforcement blocks unauthorized resources", async () => {
  const { apiKey } = await createPartnerViaAdmin({ scopes: ["catalog.read"] });

  const inventory = await requestJson("/api/v1/partner/inventory", {
    headers: { "x-api-key": apiKey },
  });
  assert.equal(inventory.response.status, 403);
  assert.equal(inventory.payload?.error?.code, "INSUFFICIENT_SCOPE");

  const gst = await requestJson("/api/v1/partner/gst?amount=100", {
    headers: { "x-api-key": apiKey },
  });
  assert.equal(gst.response.status, 403);
  assert.equal(gst.payload?.error?.code, "INSUFFICIENT_SCOPE");
});

test("security: injection and invalid parameter probes do not crash server", async () => {
  const { apiKey } = await createPartnerViaAdmin();

  const invalidAmount = await requestJson("/api/v1/partner/gst?amount=-200", {
    headers: { "x-api-key": apiKey },
  });
  assert.equal(invalidAmount.response.status, 400);
  assert.equal(invalidAmount.payload?.error?.code, "INVALID_INPUT");

  const nosqlStyle = await requestJson(
    "/api/v1/partner/products?q[$ne]=x&limit=<script>",
    {
      headers: { "x-api-key": apiKey },
    },
  );
  assert.equal(nosqlStyle.response.status, 200);
  assert.equal(nosqlStyle.payload?.success, true);

  const pathProbe = await requestJson(
    "/api/v1/partner/products/%7B%22$gt%22:%22%22%7D",
    {
      headers: { "x-api-key": apiKey },
    },
  );
  assert.ok([404, 200].includes(pathProbe.response.status));
});

test("rate limit: burst traffic triggers 429 and returns stable error payload", async () => {
  const { apiKey } = await createPartnerViaAdmin({ rpm: 20, daily: 1000 });

  const calls = await Promise.all(
    Array.from({ length: 120 }).map(() =>
      requestJson("/api/v1/partner/health", {
        headers: { "x-api-key": apiKey },
      }),
    ),
  );

  const statuses = calls.map((item) => item.response.status);
  const throttled = statuses.filter((status) => status === 429).length;
  const successful = statuses.filter((status) => status === 200).length;

  assert.ok(successful > 0);
  assert.ok(throttled > 0);

  const sample429 = calls.find((item) => item.response.status === 429);
  assert.equal(sample429?.payload?.error?.code, "RATE_LIMIT_EXCEEDED");

  const guide = await requestJson("/api/v1/partner/guide?format=json");
  assert.equal(guide.response.status, 200);
});

test("rate limit: daily limit triggers correctly", async () => {
  const { apiKey } = await createPartnerViaAdmin({ rpm: 1000, daily: 100 });

  for (let index = 0; index < 100; index += 1) {
    const ok = await requestJson("/api/v1/partner/health", {
      headers: { "x-api-key": apiKey },
    });
    assert.equal(ok.response.status, 200);
  }

  const blocked = await requestJson("/api/v1/partner/health", {
    headers: { "x-api-key": apiKey },
  });
  assert.equal(blocked.response.status, 429);
  assert.equal(blocked.payload?.error?.code, "DAILY_LIMIT_EXCEEDED");
});

test("logging and monitoring: requests are stored and surfaced in admin APIs", async () => {
  const { partnerId, apiKey } = await createPartnerViaAdmin({
    rpm: 500,
    daily: 2000,
  });

  const results = await Promise.all([
    requestJson("/api/v1/partner/products?limit=2", {
      headers: { "x-api-key": apiKey },
    }),
    requestJson("/api/v1/partner/inventory?limit=2", {
      headers: { "x-api-key": apiKey },
    }),
    requestJson("/api/v1/partner/pricing", {
      headers: { "x-api-key": apiKey },
    }),
  ]);

  results.forEach(({ response }) => {
    assert.equal(response.status, 200);
  });

  const maxWaitMs = process.env.CI ? 3000 : 1200;
  const start = Date.now();
  let dbLogs = [];

  while (Date.now() - start < maxWaitMs) {
    dbLogs = await PartnerApiRequestLog.find({ partnerId }).lean();
    if (dbLogs.length >= 3) break;
    await wait(150);
  }

  assert.ok(
    dbLogs.length >= 3,
    `expected >=3 partner logs, got ${dbLogs.length}`,
  );

  const overview = await adminRequest("/api/v1/partner/admin/overview");
  assert.equal(overview.response.status, 200);
  assert.equal(overview.payload?.success, true);
  assert.ok(
    typeof overview.payload?.data?.totals?.requestsLast24h === "number",
  );

  const live = await adminRequest(
    "/api/v1/partner/admin/monitoring/live?limit=10",
  );
  assert.equal(live.response.status, 200);
  assert.equal(live.payload?.success, true);
  assert.ok(Array.isArray(live.payload?.data?.lastHits));

  const logs = await adminRequest(
    `/api/v1/partner/admin/logs?partnerId=${partnerId}&limit=10&page=1`,
  );
  assert.equal(logs.response.status, 200);
  assert.equal(logs.payload?.success, true);
  assert.ok((logs.payload?.data || []).length >= 1);
});

test("admin auth hardening: admin endpoints reject missing auth", async () => {
  const result = await requestJson("/api/v1/partner/admin/overview");
  assert.equal(result.response.status, 401);
});

test("admin: credential PDF endpoint returns a valid PDF", async () => {
  const { partnerId, apiKey } = await createPartnerViaAdmin();

  const response = await fetch(
    `${baseUrl}/api/v1/partner/admin/partners/${partnerId}/credential-pdf`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ apiKey }),
    },
  );

  const contentType = String(response.headers.get("content-type") || "");
  const body = Buffer.from(await response.arrayBuffer());

  assert.equal(response.status, 200);
  assert.match(contentType, /application\/pdf/i);
  assert.ok(body.length > 200, "credential pdf should not be empty");
});

test(
  "load smoke: 100 concurrent and 1000 requests stay stable",
  { timeout: 40_000 },
  async () => {
    const { apiKey } = await createPartnerViaAdmin({
      rpm: 5000,
      daily: 100000,
    });

    const total = 1000;
    const concurrency = 100;
    let sent = 0;
    let failures = 0;
    const durations = [];

    const worker = async () => {
      while (true) {
        const current = sent;
        sent += 1;
        if (current >= total) return;

        const started = performance.now();
        const result = await requestJson("/api/v1/partner/products?limit=1", {
          headers: { "x-api-key": apiKey },
        });
        durations.push(performance.now() - started);
        if (result.response.status !== 200) failures += 1;
      }
    };

    await Promise.all(Array.from({ length: concurrency }).map(() => worker()));

    durations.sort((a, b) => a - b);
    const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
    const failureRate = failures / total;
    const configuredP95Limit = Number(process.env.PARTNER_LOAD_P95_MS || "");
    const maxP95Ms =
      Number.isFinite(configuredP95Limit) && configuredP95Limit > 0
        ? configuredP95Limit
        : process.env.CI
          ? 1500
          : 1200;

    assert.equal(total, durations.length);
    assert.ok(failureRate <= 0.05, `failure rate too high: ${failureRate}`);
    assert.ok(
      p95 <= maxP95Ms,
      `p95 latency too high: ${p95} (limit ${maxP95Ms})`,
    );
  },
);
