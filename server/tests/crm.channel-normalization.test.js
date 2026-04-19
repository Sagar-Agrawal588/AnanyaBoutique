import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeChannel,
  normalizeContactStatus,
  normalizeInteractionEventType,
  normalizeLifecycleStage,
  normalizePhone,
  normalizeTagList,
} from "../services/crm/channelResolver.service.js";

test("normalizeChannel resolves supported aliases", () => {
  assert.equal(normalizeChannel("site"), "website");
  assert.equal(normalizeChannel("whats app"), "whatsapp");
  assert.equal(normalizeChannel("fb"), "facebook");
  assert.equal(normalizeChannel("unknown-channel"), null);
});

test("normalize lifecycle and status stay strict", () => {
  assert.equal(normalizeLifecycleStage("interested"), "prospect");
  assert.equal(normalizeLifecycleStage("nonsense"), null);
  assert.equal(normalizeContactStatus("won"), "converted");
  assert.equal(normalizeContactStatus("broken"), null);
});

test("normalize interaction event aliases and helpers", () => {
  assert.equal(normalizeInteractionEventType("purchase"), "order_paid");
  assert.equal(
    normalizeInteractionEventType("ticket_created"),
    "support_ticket_created",
  );
  assert.equal(normalizePhone("+91 98765 43210"), "+919876543210");
  assert.deepEqual(normalizeTagList(["VIP", "vip", "Repeat Buyer"]), [
    "vip",
    "repeat buyer",
  ]);
});
