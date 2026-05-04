import assert from "node:assert/strict";
import test from "node:test";
import { buildOrderExportRow } from "../controllers/reportController.js";

test("buildOrderExportRow exports exact utrNumber and paymentAppTxnId fields", () => {
  const row = buildOrderExportRow({
    order_status: "accepted",
    utrNumber: "",
    paymentAppTxnId: "",
    upiRefId: "123456789012",
    upiRef: "upi-ref-fallback",
    utr: "utr-fallback",
    paymentId: "payment-id-fallback",
  });

  assert.equal(row.utrNumber, "");
  assert.equal(row.paymentId, "");
});

