import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import CartModel from "../models/cart.model.js";
import ProductModel from "../models/product.model.js";
import { addToCart } from "../controllers/cart.controller.js";

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
    dbName: "AnanyaBoutique-test",
  });

  const app = express();
  app.use(express.json());
  app.post("/cart/add", addToCart);

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
  await CartModel.deleteMany({});
  await ProductModel.deleteMany({});
});

test("guest add-to-cart succeeds for a selected product variant", async () => {
  const variantId = new mongoose.Types.ObjectId();
  const product = await ProductModel.create({
    name: "Cart Variant Product",
    slug: `cart-variant-product-${Date.now()}`,
    category: new mongoose.Types.ObjectId(),
    price: 449,
    originalPrice: 549,
    hasVariants: true,
    variants: [
      {
        _id: variantId,
        name: "1 kg",
        sku: "CVP-1KG",
        price: 799,
        originalPrice: 899,
        stock_quantity: 12,
        reserved_quantity: 0,
        isDefault: true,
      },
    ],
    stock_quantity: 12,
    stock: 12,
    reserved_quantity: 0,
  });

  const { response, payload } = await requestJson("/cart/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-Id": "guest_test_cart_add_variant",
    },
    body: JSON.stringify({
      productId: product._id.toString(),
      variantId: variantId.toString(),
      variantName: "1 kg",
      quantity: 1,
    }),
  });

  assert.equal(response.status, 200);
  assert.equal(payload?.success, true);
  assert.equal(payload?.data?.itemCount, 1);
  assert.equal(payload?.data?.items?.[0]?.price, 799);
  assert.equal(payload?.data?.items?.[0]?.variantName, "1 kg");
});

test("variant products without a selected variant return a validation error instead of crashing", async () => {
  const product = await ProductModel.create({
    name: "Cart Variant Required Product",
    slug: `cart-variant-required-${Date.now()}`,
    category: new mongoose.Types.ObjectId(),
    price: 449,
    originalPrice: 549,
    hasVariants: true,
    variants: [
      {
        _id: new mongoose.Types.ObjectId(),
        name: "500g",
        sku: "CVR-500G",
        price: 449,
        originalPrice: 549,
        stock_quantity: 12,
        reserved_quantity: 0,
        isDefault: true,
      },
    ],
    stock_quantity: 12,
    stock: 12,
    reserved_quantity: 0,
  });

  const { response, payload } = await requestJson("/cart/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-Id": "guest_test_cart_missing_variant",
    },
    body: JSON.stringify({
      productId: product._id.toString(),
      quantity: 1,
    }),
  });

  assert.equal(response.status, 400);
  assert.equal(payload?.success, false);
  assert.match(
    String(payload?.message || ""),
    /select a pack size/i,
  );
});
