const humanizeConstant = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

export const resolveOrderPaymentMethodLabel = (value) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (!normalized || normalized === "PENDING") {
    return "Pending confirmation";
  }
  if (normalized === "PHONEPE") return "PhonePe";
  if (normalized === "PAYTM") return "Paytm";
  if (normalized === "COD") return "Cash on Delivery";
  if (normalized === "TEST") return "Test Payment";
  return humanizeConstant(normalized);
};

export const buildOrderProductDescriptor = (item = {}) => {
  const title = String(
    item?.productTitle || item?.comboName || item?.title || "",
  ).trim();
  const variantName = String(item?.variantName || "").trim();
  return [title, variantName].filter(Boolean).join(" - ");
};

export const resolveOrderTransactionReference = (order = {}) =>
  String(
    order?.upiReferenceNumber ||
      order?.phonepeTransactionId ||
      order?.paytmTransactionId ||
      order?.utr ||
      order?.paymentId ||
      "",
  ).trim();

export const summarizeComplaintProducts = (productNames = [], maxVisible = 4) => {
  const visibleProductNames = Array.from(
    new Set(
      (Array.isArray(productNames) ? productNames : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );

  if (visibleProductNames.length === 0) return "Not available";

  const visibleItems = visibleProductNames.slice(0, maxVisible);
  const remainingCount = Math.max(visibleProductNames.length - maxVisible, 0);
  if (remainingCount <= 0) {
    return visibleItems.join(", ");
  }

  return `${visibleItems.join(", ")} +${remainingCount} more`;
};

export const buildOrderComplaintHref = ({
  routeOrderId = "",
  displayOrderId = "",
  productNames = [],
  paymentMethodLabel = "",
  paymentStatusLabel = "",
  transactionReference = "",
} = {}) => {
  const normalizedRouteOrderId = String(routeOrderId || "").trim();
  const normalizedDisplayOrderId = String(displayOrderId || "").trim();
  const normalizedTransactionReference = String(transactionReference || "").trim();
  const complaintSubject =
    normalizedDisplayOrderId && normalizedDisplayOrderId !== "N/A"
      ? `Complaint for order ${normalizedDisplayOrderId}`
      : "Order complaint";
  const complaintPrefillMessage = [
    "Hello Team,",
    "",
    "I need help with this order.",
    `Order ID: ${normalizedDisplayOrderId || "Not available"}`,
    `Product(s): ${summarizeComplaintProducts(productNames)}`,
    `Payment Method: ${paymentMethodLabel || "Not available"}`,
    `Payment Status: ${paymentStatusLabel || "Not available"}`,
    `UTR / Transaction No.: ${normalizedTransactionReference || "Not available"}`,
    "",
    "Please describe the issue here:",
  ].join("\n");

  const params = new URLSearchParams();
  if (normalizedRouteOrderId) {
    params.set("orderId", normalizedRouteOrderId);
  }
  if (normalizedDisplayOrderId) {
    params.set("orderLabel", normalizedDisplayOrderId);
  }
  params.set("subject", complaintSubject);
  params.set("message", complaintPrefillMessage);

  return `/contact?${params.toString()}#support-form`;
};
