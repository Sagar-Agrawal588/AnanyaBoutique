import { resolveOrderAwb, resolveOrderTrackingUrl } from "./orderTracking.js";

const round2 = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const roundToNearestRupee = (value) => Math.max(Math.round(Number(value || 0)), 0);

const isGatewayMerchantReference = (value) =>
  /^BOG_/i.test(String(value || "").trim());

const extractUpiRrn = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";

  if (/^\d{12}$/.test(normalized)) {
    return normalized;
  }

  const embedded = normalized.match(/(?:^|[^\d])(\d{12})(?:[^\d]|$)/);
  if (embedded?.[1]) {
    return embedded[1];
  }

  return "";
};

const resolveUpiReferenceNumber = (order = {}) => {
  const directReference = [
    order?.upiRef,
    order?.upiReferenceNumber,
    order?.phonepeTransactionId,
    order?.paytmTransactionId,
    order?.upiReferenceNo,
    order?.utr,
    order?.rrn,
  ]
    .map(extractUpiRrn)
    .find(Boolean);

  if (directReference) return directReference;

  const fallbackPaymentId = String(order?.paymentId || "").trim();
  if (fallbackPaymentId && !isGatewayMerchantReference(fallbackPaymentId)) {
    const normalizedFallback = extractUpiRrn(fallbackPaymentId);
    if (normalizedFallback) {
      return normalizedFallback;
    }
  }

  return null;
};

const toSafeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const resolveOrderDisplayId = (order = {}) => {
  const explicitId =
    order?.final_id ||
    order?.temp_id ||
    order?.displayOrderId ||
    order?.orderNumber ||
    order?.order_id ||
    order?.orderId ||
    "";
  if (String(explicitId || "").trim()) {
    return String(explicitId).trim().toUpperCase();
  }

  const mongoId = String(order?._id || "").trim();
  if (!mongoId) return "N/A";
  return mongoId.slice(-8).toUpperCase();
};

const toCanonicalShipmentStatus = (order = {}) => {
  const explicit = String(order?.shipmentStatus || "")
    .trim()
    .toLowerCase();
  if (explicit) return explicit;

  const legacy = String(order?.shipment_status || "")
    .trim()
    .toLowerCase();
  if (!legacy) return "pending";

  if (legacy === "booked") return "shipment_created";
  if (legacy === "shipped") return "in_transit";
  if (legacy === "delivered") return "delivered";
  if (legacy === "cancelled") return "cancelled";
  if (legacy.startsWith("rto")) return "rto";
  if (legacy === "failed") return "failed";
  return legacy;
};

const calcItemsGross = (order = {}) => {
  const products = Array.isArray(order?.products) ? order.products : [];
  return round2(
    products.reduce((sum, item) => {
      const quantity = Math.max(toSafeNumber(item?.quantity), 0);
      const lineFromSubtotal = toSafeNumber(item?.subTotal);
      const lineFromUnit = toSafeNumber(item?.price) * quantity;
      return sum + (lineFromSubtotal > 0 ? lineFromSubtotal : lineFromUnit);
    }, 0),
  );
};

/**
 * Canonical pricing view for order responses and invoice reconciliation.
 * Keeps backend as the single source of truth for totals.
 */
export const calculateOrderTotal = (order = {}) => {
  const pricingSnapshot =
    order?.pricing && typeof order.pricing === "object" ? order.pricing : null;
  if (pricingSnapshot) {
    const originalPrice = round2(toSafeNumber(pricingSnapshot.originalPrice));
    const basePrice = round2(toSafeNumber(pricingSnapshot.basePrice));
    const discount = round2(toSafeNumber(pricingSnapshot.discount));
    const discountedPrice = round2(
      toSafeNumber(pricingSnapshot.discountedPrice),
    );
    const tax = round2(toSafeNumber(pricingSnapshot.gst ?? pricingSnapshot.tax));
    const shipping = round2(toSafeNumber(pricingSnapshot.shipping));
    const total = round2(
      toSafeNumber(pricingSnapshot.total ?? pricingSnapshot.finalAmount),
    );
    const roundedAmount = roundToNearestRupee(
      pricingSnapshot.roundedTotal ?? pricingSnapshot.roundedAmount ?? total,
    );
    const roundOff = round2(
      Number.isFinite(Number(pricingSnapshot.roundOff))
        ? Number(pricingSnapshot.roundOff)
        : roundedAmount - total,
    );

    return {
      itemsGross: originalPrice,
      subtotal: discountedPrice,
      taxableAmount: discountedPrice,
      basePrice,
      discount,
      totalDiscount: discount,
      couponDiscount: round2(toSafeNumber(order?.discountAmount)),
      comboDiscount: round2(toSafeNumber(order?.comboDiscount)),
      membershipDiscount: round2(toSafeNumber(order?.membershipDiscount)),
      influencerDiscount: round2(toSafeNumber(order?.influencerDiscount)),
      coinRedemptionAmount: round2(toSafeNumber(order?.coinRedemption?.amount)),
      tax,
      gstAmount: tax,
      shipping,
      total,
      finalAmount: total,
      roundedAmount,
      roundOff,
      source: "pricingSnapshot",
      originalPrice,
      discountedPrice,
      roundedTotal: roundedAmount,
      gst: order?.gst || null,
      pricing: pricingSnapshot,
      couponCode: order?.couponCode || null,
      influencerCode: order?.influencerCode || null,
    };
  }

  const itemsGross = calcItemsGross(order);
  const shipping = Math.max(round2(toSafeNumber(order?.shipping)), 0);
  const tax = Math.max(round2(toSafeNumber(order?.tax)), 0);
  const discount = Math.max(round2(toSafeNumber(order?.discount)), 0);
  const couponDiscount = Math.max(
    round2(toSafeNumber(order?.discountAmount)),
    0,
  );
  const membershipDiscount = Math.max(
    round2(toSafeNumber(order?.membershipDiscount)),
    0,
  );
  const comboDiscount = Math.max(round2(toSafeNumber(order?.comboDiscount)), 0);
  const influencerDiscount = Math.max(
    round2(toSafeNumber(order?.influencerDiscount)),
    0,
  );
  const coinRedemptionAmount = Math.max(
    round2(toSafeNumber(order?.coinRedemption?.amount)),
    0,
  );

  const subtotalStored = Math.max(round2(toSafeNumber(order?.subtotal)), 0);
  const totalAmtStored = Math.max(round2(toSafeNumber(order?.totalAmt)), 0);
  const finalAmountStored = Math.max(
    round2(toSafeNumber(order?.finalAmount)),
    0,
  );

  // Prefer explicit final amount, then totalAmt; fallback to computed pieces.
  const total =
    finalAmountStored > 0
      ? finalAmountStored
      : totalAmtStored > 0
        ? totalAmtStored
        : round2(Math.max(itemsGross - discount + shipping, 0));

  // Derive taxable subtotal in a way that always reconciles with total.
  const subtotal =
    subtotalStored > 0
      ? subtotalStored
      : round2(Math.max(total - shipping - tax + coinRedemptionAmount, 0));

  const totalDiscount =
    discount > 0
      ? discount
      : round2(
          membershipDiscount +
            influencerDiscount +
            couponDiscount +
            comboDiscount,
        );
  const roundedAmount =
    Number(order?.roundedAmount || 0) > 0
      ? roundToNearestRupee(order?.roundedAmount)
      : roundToNearestRupee(total);
  const roundOff = round2(
    Number.isFinite(Number(order?.roundOff))
      ? Number(order?.roundOff)
      : roundedAmount - total,
  );

  return {
    itemsGross,
    subtotal,
    taxableAmount: subtotal,
    tax,
    gstAmount: tax,
    shipping,
    total,
    finalAmount: total,
    roundedAmount,
    roundOff,
    totalDiscount,
    couponDiscount,
    comboDiscount,
    membershipDiscount,
    influencerDiscount,
    coinRedemptionAmount,
    couponCode: order?.couponCode || null,
    influencerCode: order?.influencerCode || null,
    source:
      finalAmountStored > 0
        ? "finalAmount"
        : totalAmtStored > 0
          ? "totalAmt"
          : "derived",
  };
};

export const normalizeOrderForResponse = (order) => {
  if (!order) return order;
  const base =
    typeof order.toObject === "function" ? order.toObject() : { ...order };
  const pricing = calculateOrderTotal(base);
  const awbNumber = resolveOrderAwb(base) || null;
  const shipmentStatus = toCanonicalShipmentStatus(base);
  const courierName =
    String(base.courierName || "").trim() ||
    (String(base.shipping_provider || "")
      .trim()
      .toUpperCase() === "XPRESSBEES"
      ? "Xpressbees"
      : "");
  const trackingUrl = resolveOrderTrackingUrl(base) || null;
  const manifestId = base.manifestId || base.shipping_manifest || null;
  const invoiceUrl = base.invoiceUrl || base.invoicePath || null;
  const isInvoiceGenerated = Boolean(base.isInvoiceGenerated || invoiceUrl);
  const deliveryDate = base.deliveryDate || null;
  const upiReferenceNumber = resolveUpiReferenceNumber(base);
  const paymentAppTxnId = String(
    base.paymentAppTxnId ||
      base.paymentId ||
      base.paytmTransactionId ||
      base.phonepeTransactionId ||
      "",
  ).trim();
  const paymentProvider = String(base.paymentProvider || base.paymentMethod || "").trim();

  return {
    ...base,
    pricing,
    displayOrderId: resolveOrderDisplayId(base),
    paymentAppTxnId,
    paymentProvider,
    upiReferenceNumber,
    upiRrn: upiReferenceNumber,
    // Keep legacy consumers stable while normalizing values.
    subtotal: pricing.subtotal,
    tax: pricing.tax,
    shipping: pricing.shipping,
    discount: pricing.totalDiscount,
    finalAmount: pricing.total,
    roundedAmount: pricing.roundedAmount,
    roundOff: pricing.roundOff,
    totalAmt: pricing.total,
    awb_number: awbNumber,
    awbNumber,
    courierName,
    shipment_status: base.shipment_status || "pending",
    shipmentStatus,
    trackingUrl,
    manifestId,
    isInvoiceGenerated,
    invoiceUrl,
    deliveryDate,
  };
};

export default calculateOrderTotal;
