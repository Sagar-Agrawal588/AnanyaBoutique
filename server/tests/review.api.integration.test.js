import assert from "node:assert/strict";
import test from "node:test";
import cookieParser from "cookie-parser";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import ProductModel from "../models/product.model.js";
import ReviewModel from "../models/review.model.js";
import UserModel from "../models/user.model.js";
import adminReviewRouter from "../routes/adminReview.route.js";
import reviewRouter from "../routes/review.route.js";

const TEST_JWT_SECRET =
  "test_access_token_secret_for_review_api_12345678901234567890";

let mongoServer;
let httpServer;
let baseUrl = "";

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload = await response.json().catch(() => null);
  return { response, payload };
};

const issueAdminToken = async () => {
  const user = await UserModel.create({
    name: "Review Admin",
    email: `review-admin-${Date.now()}@example.com`,
    password: "secure-password",
    role: "Admin",
    status: "active",
  });

  return jwt.sign({ id: user._id.toString() }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });
};

test.before(async () => {
  process.env.ACCESS_TOKEN_SECRET =
    process.env.ACCESS_TOKEN_SECRET || TEST_JWT_SECRET;

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: "bogecom-review-test" });

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/reviews", reviewRouter);
  app.use("/api/admin/reviews", adminReviewRouter);
  app.use((err, _req, res, _next) => {
    res.status(err?.status || 500).json({
      error: true,
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
    ProductModel.deleteMany({}),
    ReviewModel.deleteMany({}),
    UserModel.deleteMany({}),
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

test("public reviews stay hidden until admin publishes them", async () => {
  const product = await ProductModel.create({
    name: "Reviewable Product",
    slug: `reviewable-product-${Date.now()}`,
    category: new mongoose.Types.ObjectId(),
    price: 399,
    originalPrice: 499,
    stock_quantity: 20,
    stock: 20,
    reserved_quantity: 0,
  });

  const createResponse = await requestJson("/api/reviews", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      productId: product._id.toString(),
      userName: "Guest Reviewer",
      city: "Jaipur",
      rating: 5,
      comment: "Public review should wait for approval.",
    }),
  });

  assert.equal(createResponse.response.status, 201);
  assert.equal(createResponse.payload?.success, true);
  assert.equal(createResponse.payload?.data?.source, "public");
  assert.equal(createResponse.payload?.data?.visibility, "pending");

  const hiddenListResponse = await requestJson(`/api/reviews/${product._id}`);
  assert.equal(hiddenListResponse.response.status, 200);
  assert.equal(hiddenListResponse.payload?.total, 0);

  const adminToken = await issueAdminToken();
  const publishResponse = await requestJson(
    `/api/admin/reviews/${createResponse.payload?.data?._id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        visibility: "visible",
      }),
    },
  );

  assert.equal(publishResponse.response.status, 200);
  assert.equal(publishResponse.payload?.success, true);
  assert.equal(publishResponse.payload?.data?.visibility, "visible");

  const publicListResponse = await requestJson(`/api/reviews/${product._id}`);
  assert.equal(publicListResponse.response.status, 200);
  assert.equal(publicListResponse.payload?.total, 1);
  assert.equal(publicListResponse.payload?.data?.[0]?.userName, "Guest Reviewer");
  assert.equal(publicListResponse.payload?.data?.[0]?.visibility, "visible");
});

test("admin review queue lists and deletes reviews", async () => {
  const product = await ProductModel.create({
    name: "Queue Review Product",
    slug: `queue-review-product-${Date.now()}`,
    category: new mongoose.Types.ObjectId(),
    price: 299,
    originalPrice: 349,
    stock_quantity: 30,
    stock: 30,
    reserved_quantity: 0,
  });

  const createResponse = await requestJson("/api/reviews", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      productId: product._id.toString(),
      userName: "Queue Reviewer",
      city: "Pune",
      rating: 4,
      comment: "Queue action flow should stay stable.",
    }),
  });

  assert.equal(createResponse.response.status, 201);
  assert.equal(createResponse.payload?.success, true);

  const adminToken = await issueAdminToken();
  const listResponse = await requestJson("/api/admin/reviews?page=1&limit=10", {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  assert.equal(listResponse.response.status, 200);
  assert.equal(listResponse.payload?.success, true);
  assert.equal(Array.isArray(listResponse.payload?.data), true);
  assert.equal(listResponse.payload?.data?.length, 1);
  assert.equal(listResponse.payload?.data?.[0]?.userName, "Queue Reviewer");

  const deleteResponse = await requestJson(
    `/api/admin/reviews/${createResponse.payload?.data?._id}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    },
  );

  assert.equal(deleteResponse.response.status, 200);
  assert.equal(deleteResponse.payload?.success, true);

  const finalListResponse = await requestJson(
    "/api/admin/reviews?page=1&limit=10",
    {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    },
  );

  assert.equal(finalListResponse.response.status, 200);
  assert.equal(finalListResponse.payload?.success, true);
  assert.equal(finalListResponse.payload?.data?.length, 0);
});
