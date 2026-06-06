import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import OrderModel from "../models/order.model.js";
import { saveDocumentWithTempIdRetry } from "../utils/orderPersistence.js";

let mongoServer;

const buildOrderPayload = (overrides = {}) => ({
  products: [
    {
      productId: "product-1",
      productTitle: "Test Product",
      quantity: 1,
      price: 199,
      subTotal: 199,
    },
  ],
  totalAmt: 199,
  subtotal: 199,
  finalAmount: 199,
  ...overrides,
});

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    dbName: "AnanyaBoutique-order-temp-id-test",
  });
  await OrderModel.syncIndexes();
});

test.after(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

test.afterEach(async () => {
  await OrderModel.deleteMany({});
});

test("saveDocumentWithTempIdRetry regenerates temp_id after a duplicate-key conflict", async () => {
  await OrderModel.create(
    buildOrderPayload({
      temp_id: "TMP-ABC123",
      final_id: "FINAL-ORDER-1",
    }),
  );

  const pendingOrder = new OrderModel(
    buildOrderPayload({
      temp_id: "TMP-ABC123",
      final_id: "FINAL-ORDER-2",
    }),
  );

  const retries = [];
  const savedOrder = await saveDocumentWithTempIdRetry(pendingOrder, {
    onDuplicateKey: ({ attempt, document }) => {
      retries.push({
        attempt,
        temp_id: document.temp_id,
      });
    },
  });

  assert.equal(retries.length, 1);
  assert.deepEqual(retries[0], {
    attempt: 1,
    temp_id: "TMP-ABC123",
  });
  assert.ok(savedOrder._id);
  assert.match(String(savedOrder.temp_id || ""), /^TMP-[A-Z0-9]{6}$/);
  assert.notEqual(savedOrder.temp_id, "TMP-ABC123");
  assert.equal(await OrderModel.countDocuments({}), 2);
});
