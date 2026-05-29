import test from "node:test";
import assert from "node:assert/strict";
import invoiceUtils from "../utils/generateInvoicePdf.js";

const { prepareInvoiceData } = invoiceUtils;

test("invoice pricing uses inclusive discount with taxable GST totals", () => {
  const order = {
    _id: "order-invoice-pricing",
    createdAt: new Date("2026-05-29T00:00:00.000Z"),
    products: [
      {
        productId: "product-1",
        productTitle: "Promo Peanut Butter",
        quantity: 1,
        price: 1,
        originalPrice: 499,
        subTotal: 1,
        originalSubTotal: 499,
        hsnCode: "210690",
      },
    ],
    originalPrice: 499,
    subtotal: 0.95,
    tax: 0.05,
    shipping: 0,
    finalAmount: 1,
    totalAmt: 1,
    roundedAmount: 1,
    roundOff: 0,
    gst: {
      rate: 5,
      taxableAmount: 0.95,
      totalTax: 0.05,
      igst: 0.05,
    },
    pricing: {
      originalPrice: 499,
      displayDiscount: 498,
      inclusiveDiscount: 498,
      discountedPrice: 0.95,
      gst: 0.05,
      total: 1,
      roundedTotal: 1,
      roundOff: 0,
      gstRate: 5,
    },
    billingDetails: {
      fullName: "Test Customer",
      address: "Test Address",
      state: "Maharashtra",
      pincode: "400001",
      phone: "9999999999",
      email: "test@example.com",
    },
  };

  const invoiceData = prepareInvoiceData(order, {
    name: "BUY ONE GRAM PRIVATE LIMITED",
    state: "Rajasthan",
    placeOfSupplyStateCode: "08",
  });

  assert.equal(invoiceData.summary.grossSubtotal, 499);
  assert.equal(invoiceData.summary.totalDiscount, 498);
  assert.equal(invoiceData.summary.goodsAmount, 0.95);
  assert.equal(invoiceData.summary.taxAmount, 0.05);
  assert.equal(invoiceData.summary.grandTotal, 1);
  assert.equal(invoiceData.lineItems[0].amount, 0.95);
});
