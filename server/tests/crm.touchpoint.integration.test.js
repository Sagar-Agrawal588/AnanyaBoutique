import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import CrmContact from "../models/crmContact.model.js";
import CrmInteraction from "../models/crmInteraction.model.js";
import { recordCrmTouchpoint } from "../services/crm/crmTracking.service.js";

let mongoServer;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    dbName: "bogecom-crm-tests",
  });
});

test.after(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

test.afterEach(async () => {
  await Promise.all([CrmContact.deleteMany({}), CrmInteraction.deleteMany({})]);
});

test("recordCrmTouchpoint creates a contact and interaction", async () => {
  const result = await recordCrmTouchpoint({
    channel: "website",
    eventType: "newsletter_subscribed",
    email: "customer@example.com",
    source: "footer",
    sessionId: "sess-1",
    happenedAt: "2026-04-06T10:00:00.000Z",
    idempotencyKey: "crm-test-1",
  });

  assert.equal(result.created, true);
  assert.equal(result.contact.email, "customer@example.com");
  assert.equal(result.contact.lifecycleStage, "lead");
  assert.equal(result.contact.status, "open");
  assert.equal(result.contact.interactionCount, 1);
  assert.equal(result.contact.consent.email, true);
});

test("recordCrmTouchpoint dedupes by idempotency key", async () => {
  await recordCrmTouchpoint({
    channel: "website",
    eventType: "order_paid",
    email: "buyer@example.com",
    orderAmount: 499,
    orderId: new mongoose.Types.ObjectId().toString(),
    idempotencyKey: "crm-test-paid-1",
  });

  const duplicate = await recordCrmTouchpoint({
    channel: "website",
    eventType: "order_paid",
    email: "buyer@example.com",
    orderAmount: 499,
    orderId: new mongoose.Types.ObjectId().toString(),
    idempotencyKey: "crm-test-paid-1",
  });

  const [contactCount, interactionCount] = await Promise.all([
    CrmContact.countDocuments({}),
    CrmInteraction.countDocuments({}),
  ]);

  assert.equal(duplicate.deduped, true);
  assert.equal(contactCount, 1);
  assert.equal(interactionCount, 1);
});

test("recordCrmTouchpoint merges WhatsApp phone variants into the same contact", async () => {
  await recordCrmTouchpoint({
    channel: "website",
    eventType: "lead_capture",
    phone: "9876543210",
    name: "Existing Contact",
    idempotencyKey: "crm-phone-variant-base",
  });

  await recordCrmTouchpoint({
    channel: "whatsapp",
    eventType: "chat_message",
    phone: "919876543210",
    message: "Hi from WhatsApp",
    idempotencyKey: "crm-phone-variant-wa",
  });

  const contacts = await CrmContact.find({}).lean();
  const interactions = await CrmInteraction.find({}).lean();

  assert.equal(contacts.length, 1);
  assert.equal(interactions.length, 2);
  assert.equal(contacts[0].phone, "9876543210");
});

test("recordCrmTouchpoint auto-enables WhatsApp consent for inbound chat and customer orders", async () => {
  const inbound = await recordCrmTouchpoint({
    channel: "whatsapp",
    eventType: "chat_message",
    direction: "inbound",
    phone: "919111223344",
    message: "Hello from customer",
    idempotencyKey: "crm-whatsapp-inbound-consent",
  });

  const outbound = await recordCrmTouchpoint({
    channel: "whatsapp",
    eventType: "chat_message",
    direction: "outbound",
    phone: "919888776655",
    message: "Admin follow-up",
    idempotencyKey: "crm-whatsapp-outbound-consent",
  });

  const orderContact = await recordCrmTouchpoint({
    channel: "website",
    eventType: "order_created",
    phone: "919777665544",
    name: "Order Contact",
    orderId: new mongoose.Types.ObjectId().toString(),
    idempotencyKey: "crm-whatsapp-order-consent",
  });

  assert.equal(inbound.contact.consent.whatsapp, true);
  assert.equal(outbound.contact.consent.whatsapp, null);
  assert.equal(orderContact.contact.consent.whatsapp, true);
});
