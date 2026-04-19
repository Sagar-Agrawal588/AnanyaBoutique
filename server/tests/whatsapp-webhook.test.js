import assert from "node:assert/strict";
import test from "node:test";
import {
  extractWhatsappWebhookTouchpoints,
  ingestWhatsappWebhookPayload,
  verifyWhatsappWebhookSubscription,
} from "../services/whatsapp/whatsappWebhook.service.js";
import {
  createWhatsappWebhookSignature,
  verifyWhatsappWebhookSignature,
} from "../utils/whatsappWebhookSignature.js";

test("WhatsApp webhook signature validates x-hub-signature-256", () => {
  const appSecret = "super-secret";
  const rawBody =
    '{"object":"whatsapp_business_account","entry":[{"id":"1","changes":[]}]}';
  const signature = createWhatsappWebhookSignature(rawBody, appSecret);

  const verification = verifyWhatsappWebhookSignature({
    headers: {
      "x-hub-signature-256": `sha256=${signature}`,
    },
    rawBody,
    appSecret,
  });

  assert.equal(verification.ok, true);
  assert.equal(verification.mode, "x_hub_signature_256");
});

test("WhatsApp webhook subscription requires matching verify token", () => {
  const success = verifyWhatsappWebhookSubscription({
    mode: "subscribe",
    verifyToken: "match-token",
    challenge: "12345",
    expectedVerifyToken: "match-token",
  });

  assert.equal(success.ok, true);
  assert.equal(success.challenge, "12345");

  const failure = verifyWhatsappWebhookSubscription({
    mode: "subscribe",
    verifyToken: "wrong-token",
    challenge: "12345",
    expectedVerifyToken: "match-token",
  });

  assert.equal(failure.ok, false);
  assert.equal(failure.statusCode, 403);
});

test("WhatsApp webhook payload extracts inbound messages and status updates", () => {
  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-1",
        changes: [
          {
            field: "messages",
            value: {
              metadata: {
                phone_number_id: "123456789",
                display_phone_number: "+91 98765 43210",
              },
              contacts: [
                {
                  wa_id: "919876543210",
                  profile: { name: "Aarav Sharma" },
                },
              ],
              messages: [
                {
                  from: "919876543210",
                  id: "wamid.HBg123",
                  timestamp: "1762511400",
                  type: "text",
                  text: { body: "Need help with my order" },
                },
              ],
              statuses: [
                {
                  id: "wamid.HBg456",
                  recipient_id: "919876543210",
                  status: "delivered",
                  timestamp: "1762511460",
                  conversation: {
                    id: "conversation-1",
                    origin: { type: "utility" },
                  },
                  pricing: {
                    billable: true,
                    category: "utility",
                    pricing_model: "CBP",
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const touchpoints = extractWhatsappWebhookTouchpoints(payload);

  assert.equal(touchpoints.length, 2);
  assert.equal(touchpoints[0].channel, "whatsapp");
  assert.equal(touchpoints[0].eventType, "chat_message");
  assert.equal(touchpoints[0].direction, "inbound");
  assert.equal(touchpoints[0].name, "Aarav Sharma");
  assert.equal(touchpoints[0].phone, "919876543210");
  assert.equal(touchpoints[0].message, "Need help with my order");

  assert.equal(touchpoints[1].eventType, "message_status");
  assert.equal(touchpoints[1].direction, "system");
  assert.equal(touchpoints[1].metadata.status, "delivered");
});

test("WhatsApp webhook ingestion forwards extracted touchpoints into CRM capture", async () => {
  const captured = [];
  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-1",
        changes: [
          {
            field: "messages",
            value: {
              metadata: {
                phone_number_id: "123456789",
                display_phone_number: "+91 98765 43210",
              },
              contacts: [
                {
                  wa_id: "919999999999",
                  profile: { name: "Naina" },
                },
              ],
              messages: [
                {
                  from: "919999999999",
                  id: "wamid.capture.1",
                  timestamp: "1762511400",
                  type: "button",
                  button: {
                    text: "Track order",
                    payload: "track-order",
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const result = await ingestWhatsappWebhookPayload(payload, {
    captureTouchpoint: async (touchpoint) => {
      captured.push(touchpoint);
      return { created: true };
    },
  });

  assert.equal(result.processedCount, 1);
  assert.equal(captured.length, 1);
  assert.equal(captured[0].channel, "whatsapp");
  assert.equal(captured[0].message, "Button reply: Track order");
});
