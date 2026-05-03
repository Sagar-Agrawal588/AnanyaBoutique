const DEFAULT_GST_RATE = 5;

const round2 = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const toPaise = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100);

const fromPaise = (paise) => Number(paise || 0) / 100;

export const formatDateTimeIST = (value) => {
  const parsed = new Date(value || Date.now());
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  }

  return `${parsed
    .toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\bam\b/g, "AM")
    .replace(/\bpm\b/g, "PM")} IST`;
};

export const calculateInclusiveOrderPricing = ({
  originalPrice,
  discount = 0,
  gstRate = DEFAULT_GST_RATE,
  shipping = 0,
  coinRedemption = 0,
  state = "",
} = {}) => {
  const safeOriginalPrice = Math.max(round2(originalPrice), 0);
  const safeDiscount = Math.max(Math.min(round2(discount), safeOriginalPrice), 0);
  const safeRate = Number.isFinite(Number(gstRate)) ? Math.max(Number(gstRate), 0) : DEFAULT_GST_RATE;

  const basePrice =
    safeRate > 0
      ? round2(safeOriginalPrice / (1 + safeRate / 100))
      : safeOriginalPrice;
  const discountedPrice = round2(Math.max(safeOriginalPrice - safeDiscount, 0));
  const gst = round2((discountedPrice * safeRate) / 100);
  const shippingAmount = Math.max(round2(shipping), 0);
  const coinRedemptionAmount = Math.max(round2(coinRedemption), 0);
  const total = round2(discountedPrice + gst + shippingAmount - coinRedemptionAmount);
  const roundedTotal = Math.max(Math.round(total), 0);
  const roundOff = round2(roundedTotal - total);

  return {
    originalPrice: safeOriginalPrice,
    basePrice,
    discount: safeDiscount,
    discountedPrice,
    gst,
    total,
    roundedTotal,
    roundOff,
    shipping: shippingAmount,
    coinRedemptionAmount,
    gstRate: safeRate,
    state: state || "",
    taxableAmount: discountedPrice,
  };
};

export const calculateGstBreakdownFromInclusiveAmount = (
  inclusiveAmount,
  rate = DEFAULT_GST_RATE,
  state = "",
) => {
  const pricing = calculateInclusiveOrderPricing({
    originalPrice: inclusiveAmount,
    discount: 0,
    gstRate: rate,
    state,
  });

  return {
    rate: pricing.gstRate,
    state: pricing.state,
    taxableAmount: pricing.taxableAmount,
    tax: pricing.gst,
    totalTax: pricing.gst,
    cgst: 0,
    sgst: 0,
    igst: pricing.gst,
    mode: "IGST",
  };
};

export default {
  calculateInclusiveOrderPricing,
  calculateGstBreakdownFromInclusiveAmount,
  formatDateTimeIST,
};
