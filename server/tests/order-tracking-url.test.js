import test from "node:test";
import assert from "node:assert/strict";

import {
  buildXpressbeesTrackingUrl,
  resolveOrderAwb,
  resolveOrderTrackingUrl,
} from "../utils/orderTracking.js";

test("resolveOrderAwb reads the first supported AWB field", () => {
  assert.equal(
    resolveOrderAwb({
      shipment: { awb: "  14344960888667  " },
    }),
    "14344960888667",
  );
});

test("buildXpressbeesTrackingUrl injects awbNo into the default template", () => {
  assert.equal(
    buildXpressbeesTrackingUrl("14344960888667"),
    "https://www.xpressbees.com/shipment/tracking?awbNo=14344960888667",
  );
});

test("resolveOrderTrackingUrl rewrites xpressbees URLs to use awbNo", () => {
  assert.equal(
    resolveOrderTrackingUrl({
      awb_number: "14344960888667",
      trackingUrl: "https://www.xpressbees.com/shipment/tracking?awb=old-value",
    }),
    "https://www.xpressbees.com/shipment/tracking?awbNo=14344960888667",
  );
});

test("resolveOrderTrackingUrl rewrites legacy xpressbees track paths", () => {
  assert.equal(
    resolveOrderTrackingUrl({
      awb_number: "14344960888667",
      trackingUrl: "https://www.xpressbees.com/track/14344960888667",
    }),
    "https://www.xpressbees.com/shipment/tracking?awbNo=14344960888667",
  );
});

test("resolveOrderTrackingUrl preserves non-xpressbees tracking links", () => {
  assert.equal(
    resolveOrderTrackingUrl({
      awb_number: "14344960888667",
      trackingUrl: "https://carrier.example/track/abc-123",
    }),
    "https://carrier.example/track/abc-123",
  );
});
