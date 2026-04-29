import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import CrmContact from "../models/crmContact.model.js";
import CrmInteraction from "../models/crmInteraction.model.js";
import {
  syncOrderContactToCrmSafely,
  syncUserIdentityToCrmSafely,
} from "../services/crm/crmAutoSync.service.js";

let mongoServer;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    dbName: "bogecom-crm-auto-sync-tests",
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

test("syncUserIdentityToCrmSafely creates one CRM contact and dedupes repeat syncs", async () => {
  const userId = new mongoose.Types.ObjectId();
  const createdAt = new Date("2026-04-28T08:00:00.000Z");

  await syncUserIdentityToCrmSafely({
    user: {
      _id: userId,
      name: "Lead User",
      email: "lead.user@example.com",
      provider: "local",
      role: "User",
      verifyEmail: false,
      email_opt_out: false,
      notificationSettings: {
        pushNotifications: true,
      },
      createdAt,
    },
    source: "email_signup",
    pageUrl: "/register",
  });

  await syncUserIdentityToCrmSafely({
    user: {
      _id: userId,
      name: "Lead User",
      email: "lead.user@example.com",
      provider: "local",
      role: "User",
      verifyEmail: true,
      email_opt_out: false,
      notificationSettings: {
        pushNotifications: true,
      },
      createdAt,
    },
    source: "email_login",
    pageUrl: "/login",
  });

  const [contacts, interactions] = await Promise.all([
    CrmContact.find({}).lean(),
    CrmInteraction.find({}).lean(),
  ]);

  assert.equal(contacts.length, 1);
  assert.equal(interactions.length, 1);
  assert.equal(String(contacts[0].user), String(userId));
  assert.equal(contacts[0].email, "lead.user@example.com");
  assert.equal(contacts[0].lifecycleStage, "lead");
  assert.equal(contacts[0].status, "open");
  assert.equal(contacts[0].consent.email, true);
  assert.equal(contacts[0].consent.push, true);
});

test("syncOrderContactToCrmSafely creates CRM contact for phone-only guest orders", async () => {
  const orderId = new mongoose.Types.ObjectId().toString();

  await syncOrderContactToCrmSafely({
    name: "Guest Buyer",
    phone: "919876543210",
    orderId,
    orderAmount: 799,
    sessionId: "guest-order-session",
    isSavedOrder: false,
  });

  const [contact, interaction] = await Promise.all([
    CrmContact.findOne({}).lean(),
    CrmInteraction.findOne({ orderId }).lean(),
  ]);

  assert.ok(contact);
  assert.equal(contact.phone, "919876543210");
  assert.equal(contact.name, "Guest Buyer");
  assert.equal(contact.lifecycleStage, "customer");
  assert.equal(contact.status, "qualified");
  assert.ok(interaction);
  assert.equal(interaction.eventType, "order_created");
});

test("user identity sync merges into existing CRM contact created from order email", async () => {
  const orderId = new mongoose.Types.ObjectId().toString();
  const userId = new mongoose.Types.ObjectId();

  await syncOrderContactToCrmSafely({
    email: "repeat.buyer@example.com",
    name: "Repeat Buyer",
    phone: "919812345678",
    orderId,
    orderAmount: 1299,
    sessionId: "repeat-buyer-order",
  });

  await syncUserIdentityToCrmSafely({
    user: {
      _id: userId,
      name: "Repeat Buyer",
      email: "repeat.buyer@example.com",
      provider: "local",
      role: "User",
      verifyEmail: true,
      email_opt_out: false,
      createdAt: new Date("2026-04-28T08:15:00.000Z"),
    },
    source: "email_signup",
    pageUrl: "/register",
  });

  const [contacts, interactions] = await Promise.all([
    CrmContact.find({}).lean(),
    CrmInteraction.find({}).sort({ createdAt: 1 }).lean(),
  ]);

  assert.equal(contacts.length, 1);
  assert.equal(interactions.length, 2);
  assert.equal(String(contacts[0].user), String(userId));
  assert.equal(contacts[0].email, "repeat.buyer@example.com");
  assert.equal(contacts[0].lifecycleStage, "customer");
  assert.equal(contacts[0].status, "qualified");
});
