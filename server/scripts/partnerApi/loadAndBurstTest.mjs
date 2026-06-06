import crypto from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Category from "../../models/category.model.js";
import Product from "../../models/product.model.js";
import UserModel from "../../models/user.model.js";
import partnerApiRouter from "../../routes/partnerApi.route.js";

const TOTAL_REQUESTS = Number(process.argv.find((arg) => arg.startsWith("--requests="))?.split("=")[1] || 1200);
const CONCURRENCY = Number(process.argv.find((arg) => arg.startsWith("--concurrency="))?.split("=")[1] || 100);
const BURST_COUNT = Number(process.argv.find((arg) => arg.startsWith("--burst="))?.split("=")[1] || 150);

const bootstrap = async () => {
  process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "partner-api-load-secret-012345";

  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: "AnanyaBoutique-partner-load" });

  const category = await Category.create({
    name: "Load",
    slug: `load-${Date.now()}`,
    isActive: true,
  });

  await Product.create({
    name: "Load Product",
    slug: `load-product-${Date.now()}`,
    description: "Load",
    shortDescription: "Load",
    price: 499,
    originalPrice: 599,
    discount: 10,
    images: ["https://example.com/load.png"],
    category: category._id,
    sku: `LOAD-${Date.now()}`,
    stock: 1000,
    stock_quantity: 1000,
    reserved_quantity: 10,
    tags: ["load"],
    isActive: true,
  });

  const admin = await UserModel.create({
    name: "Load Admin",
    email: `load-admin-${Date.now()}@example.com`,
    password: "Password@123",
    role: "Admin",
    status: "active",
  });

  const adminToken = jwt.sign({ id: String(admin._id) }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });

  const app = express();
  app.use(express.json());
  app.use("/api/v1/partner", partnerApiRouter);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const createPartner = async (name, rpm, daily) => {
    const response = await fetch(`${baseUrl}/api/v1/partner/admin/partners`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name,
        companyName: "Load Co",
        contactEmail: `${name}-${crypto.randomBytes(2).toString("hex")}@example.com`,
        scopes: ["catalog.read", "inventory.read", "pricing.read", "gst.read"],
        rateLimitPerMinute: rpm,
        dailyRequestLimit: daily,
      }),
    });

    const body = await response.json();
    if (!response.ok || !body?.success) {
      throw new Error(`Failed to create load partner: ${response.status} ${JSON.stringify(body)}`);
    }

    return {
      partnerId: String(body.data.partner.id),
      apiKey: String(body.data.apiKey),
    };
  };

  const highLimitPartners = [];
  for (let index = 0; index < 6; index += 1) {
    // Spread load across multiple keys to avoid triggering per-key runtime limits.
    // Max accepted RPM per partner in API is 5000.
    highLimitPartners.push(await createPartner(`Load High ${index + 1}`, 5000, 200000));
  }
  const burstPartner = await createPartner("Burst Limited", 20, 10000);

  return { mongo, server, baseUrl, highLimitPartners, burstPartner };
};

const percentile = (values, pct) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * pct));
  return sorted[index];
};

const run = async () => {
  const { mongo, server, baseUrl, highLimitPartners, burstPartner } = await bootstrap();

  const durations = [];
  let failures = 0;
  let completed = 0;

  const start = performance.now();
  const worker = async () => {
    while (true) {
      const current = completed;
      completed += 1;
      if (current >= TOTAL_REQUESTS) return;

      const started = performance.now();
      try {
        const partner = highLimitPartners[current % highLimitPartners.length];
        const response = await fetch(`${baseUrl}/api/v1/partner/products?limit=1`, {
          headers: { "x-api-key": partner.apiKey },
        });
        durations.push(performance.now() - started);
        if (response.status !== 200) failures += 1;
      } catch {
        failures += 1;
        durations.push(performance.now() - started);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }).map(() => worker()));
  const totalMs = performance.now() - start;

  const burstResults = await Promise.all(
    Array.from({ length: BURST_COUNT }).map(() =>
      fetch(`${baseUrl}/api/v1/partner/health`, {
        headers: { "x-api-key": burstPartner.apiKey },
      }).then((res) => res.status),
    ),
  );

  const burst429 = burstResults.filter((status) => status === 429).length;
  const burst200 = burstResults.filter((status) => status === 200).length;

  const healthAfterBurst = await fetch(`${baseUrl}/api/v1/partner/guide?format=json`);

  const report = {
    load: {
      totalRequests: TOTAL_REQUESTS,
      concurrency: CONCURRENCY,
      failures,
      failureRate: Number((failures / TOTAL_REQUESTS).toFixed(4)),
      durationMs: Math.round(totalMs),
      rpsApprox: Number(((TOTAL_REQUESTS / totalMs) * 1000).toFixed(2)),
      latencyMs: {
        avg: Number((durations.reduce((sum, value) => sum + value, 0) / Math.max(durations.length, 1)).toFixed(2)),
        p95: Number(percentile(durations, 0.95).toFixed(2)),
        p99: Number(percentile(durations, 0.99).toFixed(2)),
        max: Number(Math.max(...durations, 0).toFixed(2)),
      },
    },
    burst: {
      totalSent: BURST_COUNT,
      success200: burst200,
      throttled429: burst429,
      serverAliveAfterBurst: healthAfterBurst.status === 200,
    },
  };

  console.log("\n=== Load + Burst Report ===");
  console.log(JSON.stringify(report, null, 2));

  const loadFailed = report.load.failureRate > 0.05;
  const burstFailed = report.burst.throttled429 === 0 || !report.burst.serverAliveAfterBurst;

  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongo.stop();

  if (loadFailed || burstFailed) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error("Load/Burst test failed:", error);
  process.exitCode = 1;
});
