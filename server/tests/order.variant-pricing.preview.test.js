import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import ProductModel from "../models/product.model.js";
import { previewOrderPricing } from "../controllers/order.controller.js";

let mongoServer;
let httpServer;
let baseUrl = "";

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload = await response.json().catch(() => null);
  return { response, payload };
};

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    dbName: "bogEcom-test",
  });

  const app = express();
  app.use(express.json());
  app.post("/preview", previewOrderPricing);

  await new Promise((resolve) => {
    httpServer = app.listen(0, "127.0.0.1", resolve);
  });
  const address = httpServer.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

test.afterEach(async () => {
  await ProductModel.deleteMany({});
});

test("preview pricing uses selected variant price (not client payload price)", async () => {
  const variantHalfKg = new mongoose.Types.ObjectId();
  const variantOneKg = new mongoose.Types.ObjectId();

  const product = await ProductModel.create({
    name: "Variant Test Product",
    slug: `variant-test-${Date.now()}`,
    price: 449,
    category: new mongoose.Types.ObjectId(),
    hasVariants: true,
    variants: [
      {
        _id: variantHalfKg,
        name: "0.5 kg",
        sku: "VT-05KG",
        price: 449,
        isDefault: true,
        stock_quantity: 10,
        reserved_quantity: 0,
      },
      {
        _id: variantOneKg,
        name: "1 kg",
        sku: "VT-1KG",
        price: 799,
        stock_quantity: 10,
        reserved_quantity: 0,
      },
    ],
    stock_quantity: 20,
    stock: 20,
  });

  const { response, payload } = await requestJson("/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      products: [
        {
          productId: product._id.toString(),
          productTitle: product.name,
          variantId: variantOneKg.toString(),
          variantName: "1 kg",
          quantity: 1,
          // Intentionally incorrect client price; server must ignore and use catalog variant price.
          price: 1,
        },
      ],
      combos: [],
      guestDetails: {},
      paymentType: "prepaid",
    }),
  });

  assert.equal(response.status, 200);
  assert.equal(payload?.success, true);
  assert.equal(payload?.data?.originalAmount, 799);
  assert.equal(payload?.data?.finalAmount, 799);
});

test("preview pricing rejects unknown variantId", async () => {
  const variantId = new mongoose.Types.ObjectId();
  const badVariantId = new mongoose.Types.ObjectId();

  const product = await ProductModel.create({
    name: "Variant Invalid Test",
    slug: `variant-invalid-${Date.now()}`,
    price: 449,
    category: new mongoose.Types.ObjectId(),
    hasVariants: true,
    variants: [
      {
        _id: variantId,
        name: "0.5 kg",
        sku: "VI-05KG",
        price: 449,
        isDefault: true,
        stock_quantity: 10,
        reserved_quantity: 0,
      },
    ],
    stock_quantity: 10,
    stock: 10,
  });

  const { response, payload } = await requestJson("/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      products: [
        {
          productId: product._id.toString(),
          productTitle: product.name,
          variantId: badVariantId.toString(),
          quantity: 1,
          price: 1,
        },
      ],
      combos: [],
      guestDetails: {},
      paymentType: "prepaid",
    }),
  });

  assert.equal(response.status, 400);
  assert.equal(payload?.success, false);
  assert.equal(String(payload?.code || ""), "INVALID_INPUT");
});

