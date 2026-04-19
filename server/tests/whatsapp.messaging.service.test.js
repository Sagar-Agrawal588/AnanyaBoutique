import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import CrmContact from "../models/crmContact.model.js";
import CrmInteraction from "../models/crmInteraction.model.js";
import { recordCrmTouchpoint } from "../services/crm/crmTracking.service.js";
import { getWhatsappAudiencePreview } from "../services/whatsapp/whatsappAdmin.service.js";
import { sendWhatsappMessage } from "../services/whatsapp/whatsappMessaging.service.js";

let mongoServer;

const ORIGINAL_ENV = {
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  WHATSAPP_GRAPH_API_VERSION: process.env.WHATSAPP_GRAPH_API_VERSION,
};

const restoreWhatsappEnv = () => {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }
};

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    dbName: "bogecom-whatsapp-tests",
  });
});

test.after(async () => {
  restoreWhatsappEnv();
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

test.afterEach(async () => {
  restoreWhatsappEnv();
  await Promise.all([CrmContact.deleteMany({}), CrmInteraction.deleteMany({})]);
});

test("getWhatsappAudiencePreview only returns consented contacts with phone", async () => {
  const lead = await recordCrmTouchpoint({
    channel: "whatsapp",
    eventType: "chat_message",
    direction: "inbound",
    phone: "919876540001",
    name: "Lead Contact",
    idempotencyKey: "wa-audience-lead",
  });

  const customer = await recordCrmTouchpoint({
    channel: "whatsapp",
    eventType: "chat_message",
    direction: "inbound",
    phone: "919876540002",
    name: "Customer Contact",
    idempotencyKey: "wa-audience-customer",
  });

  await CrmContact.updateOne(
    { _id: lead.contact._id },
    { $set: { lifecycleStage: "lead", status: "open" } },
  );
  await CrmContact.updateOne(
    { _id: customer.contact._id },
    { $set: { lifecycleStage: "customer", status: "converted" } },
  );

  await CrmContact.create({
    name: "No Consent",
    phone: "919876540003",
    lifecycleStage: "customer",
    status: "open",
    consent: {
      whatsapp: false,
    },
  });

  const preview = await getWhatsappAudiencePreview({
    segment: "customers",
    inactiveDays: 45,
  });

  assert.equal(preview.segment, "customers");
  assert.equal(preview.count, 1);
  assert.equal(preview.sample.length, 1);
  assert.equal(preview.sample[0].name, "Customer Contact");
  assert.equal(preview.sample[0].consent.whatsapp, true);
});

test("sendWhatsappMessage sends text message for active conversation and stores outbound CRM event", async () => {
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "123456789";
  process.env.WHATSAPP_GRAPH_API_VERSION = "v22.0";

  const inbound = await recordCrmTouchpoint({
    channel: "whatsapp",
    eventType: "chat_message",
    direction: "inbound",
    phone: "919876540010",
    name: "Reply User",
    idempotencyKey: "wa-send-text-inbound",
  });

  let requestPayload = null;
  const mockFetch = async (url, options = {}) => {
    requestPayload = {
      url,
      method: options.method,
      body: JSON.parse(String(options.body || "{}")),
    };

    return {
      ok: true,
      async json() {
        return {
          messaging_product: "whatsapp",
          contacts: [
            {
              input: "919876540010",
              wa_id: "919876540010",
            },
          ],
          messages: [
            {
              id: "wamid.text.123",
            },
          ],
        };
      },
    };
  };

  const result = await sendWhatsappMessage({
    contactId: String(inbound.contact._id),
    body: "Thanks for reaching out. We are on it.",
    adminUserId: "admin-1",
    fetchImpl: mockFetch,
  });

  assert.equal(result.accepted, true);
  assert.equal(result.mode, "text");
  assert.equal(result.messageId, "wamid.text.123");
  assert.equal(
    requestPayload.url,
    "https://graph.facebook.com/v22.0/123456789/messages",
  );
  assert.equal(requestPayload.method, "POST");
  assert.equal(requestPayload.body.type, "text");
  assert.equal(requestPayload.body.to, "919876540010");
  assert.equal(
    requestPayload.body.text.body,
    "Thanks for reaching out. We are on it.",
  );

  const outbound = await CrmInteraction.findOne({
    contact: inbound.contact._id,
    direction: "outbound",
    eventName: "whatsapp_text",
  }).lean();

  assert.ok(outbound);
  assert.equal(outbound.eventType, "chat_message");
  assert.equal(outbound.metadata?.messageId, "wamid.text.123");
});

test("sendWhatsappMessage builds template payload with variables for promotional sends", async () => {
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "123456789";
  process.env.WHATSAPP_GRAPH_API_VERSION = "v22.0";

  const contact = await recordCrmTouchpoint({
    channel: "whatsapp",
    eventType: "chat_message",
    direction: "inbound",
    phone: "919876540020",
    name: "Promo User",
    idempotencyKey: "wa-send-template-inbound",
  });

  let requestPayload = null;
  const mockFetch = async (_url, options = {}) => {
    requestPayload = JSON.parse(String(options.body || "{}"));
    return {
      ok: true,
      async json() {
        return {
          contacts: [{ input: "919876540020", wa_id: "919876540020" }],
          messages: [{ id: "wamid.template.123" }],
        };
      },
    };
  };

  const result = await sendWhatsappMessage({
    contactId: String(contact.contact._id),
    templateName: "spring_offer_template",
    languageCode: "en",
    bodyVariables: ["Utkarsh", "15% OFF"],
    headerVariables: ["HealthyOneGram"],
    campaignName: "Spring Offer",
    segment: "customers",
    adminUserId: "admin-2",
    fetchImpl: mockFetch,
  });

  assert.equal(result.mode, "template");
  assert.equal(result.templateName, "spring_offer_template");
  assert.equal(requestPayload.type, "template");
  assert.equal(requestPayload.template.name, "spring_offer_template");
  assert.equal(requestPayload.template.language.code, "en");
  assert.equal(requestPayload.template.components.length, 2);
  assert.equal(requestPayload.template.components[0].type, "header");
  assert.equal(requestPayload.template.components[1].type, "body");

  const outbound = await CrmInteraction.findOne({
    contact: contact.contact._id,
    direction: "outbound",
    eventName: "whatsapp_template",
  }).lean();

  assert.ok(outbound);
  assert.equal(outbound.metadata?.templateName, "spring_offer_template");
  assert.equal(outbound.metadata?.messageId, "wamid.template.123");
  assert.equal(outbound.campaign?.campaign, "Spring Offer");
});
