import crypto from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Category from "../../models/category.model.js";
import Product from "../../models/product.model.js";
import UserModel from "../../models/user.model.js";
import partnerApiRouter from "../../routes/partnerApi.route.js";

const durationArg = Number(process.argv.find((arg) => arg.startsWith("--duration="))?.split("=")[1] || 60);
const slowThresholdMs = Number(process.argv.find((arg) => arg.startsWith("--slowMs="))?.split("=")[1] || 700);

const PROFILES = [
  { id: "small", rps: 1 },
  { id: "medium", rps: 5 },
  { id: "large", rps: 20 },
];

const ENDPOINTS = [
  "/api/v1/partner/products?limit=1",
  "/api/v1/partner/inventory?limit=1",
  "/api/v1/partner/pricing",
  "/api/v1/partner/gst?amount=599&deliveryState=Rajasthan",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomPick = (items) => items[Math.floor(Math.random() * items.length)];

const bootstrapServer = async () => {
  process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "partner-api-sim-secret-012345";

  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: "AnanyaBoutique-partner-sim" });

  const category = await Category.create({
    name: "Simulation",
    slug: `simulation-${Date.now()}`,
    isActive: true,
  });

  await Product.create({
    name: "Simulation Product",
    slug: `simulation-product-${Date.now()}`,
    description: "Load test product",
    shortDescription: "Load",
    price: 399,
    originalPrice: 499,
    discount: 20,
    images: ["https://example.com/p.png"],
    category: category._id,
    sku: `SIM-${Date.now()}`,
    stock: 500,
    stock_quantity: 500,
    reserved_quantity: 0,
    tags: ["sim"],
    isActive: true,
  });

  const admin = await UserModel.create({
    name: "Sim Admin",
    email: `sim-admin-${Date.now()}@example.com`,
    password: "Password@123",
    role: "Admin",
    status: "active",
  });

  const token = jwt.sign({ id: String(admin._id) }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });

  const app = express();
  app.use(express.json());
  app.use("/api/v1/partner", partnerApiRouter);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const createPartner = async (name, rpm) => {
    const response = await fetch(`${baseUrl}/api/v1/partner/admin/partners`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        companyName: "Simulation Co",
        contactEmail: `${name}-${crypto.randomBytes(2).toString("hex")}@example.com`,
        scopes: ["catalog.read", "inventory.read", "pricing.read", "gst.read"],
        rateLimitPerMinute: rpm,
        dailyRequestLimit: 100000,
      }),
    });

    const body = await response.json();
    if (!response.ok || !body?.success) {
      throw new Error(`Unable to create partner ${name}`);
    }

    return {
      partnerId: String(body.data.partner.id),
      apiKey: String(body.data.apiKey),
    };
  };

  const partnerCreds = {};
  partnerCreds.small = await createPartner("Sim Small", 120);
  partnerCreds.medium = await createPartner("Sim Medium", 600);
  partnerCreds.large = await createPartner("Sim Large", 3000);

  return { mongo, server, baseUrl, partnerCreds };
};

const run = async () => {
  const { mongo, server, baseUrl, partnerCreds } = await bootstrapServer();
  const stats = {
    startedAt: new Date().toISOString(),
    durationSeconds: durationArg,
    slowThresholdMs,
    profiles: {
      small: { total: 0, success: 0, failures: 0, slow: 0, maxMs: 0 },
      medium: { total: 0, success: 0, failures: 0, slow: 0, maxMs: 0 },
      large: { total: 0, success: 0, failures: 0, slow: 0, maxMs: 0 },
    },
    samples: [],
  };

  let keepRunning = true;

  if (durationArg > 0) {
    setTimeout(() => {
      keepRunning = false;
    }, durationArg * 1000).unref?.();
  }

  const profileLoop = async (profile) => {
    const creds = partnerCreds[profile.id];
    while (keepRunning) {
      const cycleStart = Date.now();
      const batch = [];

      for (let i = 0; i < profile.rps; i += 1) {
        const endpoint = randomPick(ENDPOINTS);
        const started = performance.now();

        batch.push(
          fetch(`${baseUrl}${endpoint}`, {
            headers: {
              "x-api-key": creds.apiKey,
            },
          })
            .then(async (response) => ({
              status: response.status,
              endpoint,
              ms: performance.now() - started,
            }))
            .catch(() => ({
              status: 0,
              endpoint,
              ms: performance.now() - started,
            })),
        );
      }

      const results = await Promise.all(batch);
      for (const result of results) {
        const bucket = stats.profiles[profile.id];
        bucket.total += 1;
        if (result.status >= 200 && result.status < 400) {
          bucket.success += 1;
        } else {
          bucket.failures += 1;
        }

        if (result.ms > slowThresholdMs) {
          bucket.slow += 1;
        }
        bucket.maxMs = Math.max(bucket.maxMs, Math.round(result.ms));

        if (stats.samples.length < 20) {
          stats.samples.push({ profile: profile.id, ...result });
        }
      }

      const elapsed = Date.now() - cycleStart;
      const waitMs = Math.max(1000 - elapsed, 0);
      await sleep(waitMs);
    }
  };

  const reporter = setInterval(() => {
    const summary = Object.entries(stats.profiles)
      .map(([name, item]) => `${name}: ok=${item.success} fail=${item.failures} slow=${item.slow}`)
      .join(" | ");
    console.log(`[simulation] ${summary}`);
  }, 5000);

  process.on("SIGINT", () => {
    keepRunning = false;
  });

  await Promise.all(PROFILES.map((profile) => profileLoop(profile)));

  clearInterval(reporter);

  const finalReport = {
    ...stats,
    endedAt: new Date().toISOString(),
  };

  console.log("\n=== Real-World Simulation Report ===");
  console.log(JSON.stringify(finalReport, null, 2));

  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongo.stop();
};

run().catch((error) => {
  console.error("Simulation failed:", error);
  process.exitCode = 1;
});
