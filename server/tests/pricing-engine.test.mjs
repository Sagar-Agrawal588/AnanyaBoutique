import test from "node:test";
import assert from "node:assert/strict";
import { calculateInclusiveOrderPricing } from "../utils/pricingEngine.js";

test("inclusive pricing matches 399 with 12 percent discount", () => {
  const pricing = calculateInclusiveOrderPricing({
    originalPrice: 399,
    discount: 45.6,
    gstRate: 5,
  });

  assert.equal(pricing.discount, 45.6);
  assert.equal(pricing.discountedPrice, 353.4);
  assert.equal(pricing.gst, 17.67);
  assert.equal(pricing.total, 371.07);
  assert.equal(pricing.roundedTotal, 371);
  assert.equal(pricing.roundOff, -0.07);
});

test("inclusive pricing matches 399 with 10 percent coupon", () => {
  const pricing = calculateInclusiveOrderPricing({
    originalPrice: 399,
    discount: 38,
    gstRate: 5,
  });

  assert.equal(pricing.discountedPrice, 361);
  assert.equal(pricing.gst, 18.05);
  assert.equal(pricing.total, 379.05);
  assert.equal(pricing.roundedTotal, 379);
  assert.equal(pricing.roundOff, -0.05);
});

test("inclusive pricing with no discount keeps GST on the full selling price", () => {
  const pricing = calculateInclusiveOrderPricing({
    originalPrice: 399,
    discount: 0,
    gstRate: 5,
  });

  assert.equal(pricing.discount, 0);
  assert.equal(pricing.discountedPrice, 399);
  assert.equal(pricing.gst, 19.95);
  assert.equal(pricing.total, 418.95);
  assert.equal(pricing.roundedTotal, 419);
  assert.equal(pricing.roundOff, 0.05);
});
