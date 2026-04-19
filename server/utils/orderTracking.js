const DEFAULT_XPRESSBEES_TRACKING_URL_TEMPLATE =
  "https://www.xpressbees.com/shipment/tracking?awbNo=${AWB}";
const AWB_PLACEHOLDER = "${AWB}";

const sanitizeText = (value) => String(value || "").trim();
const isXpressbeesHost = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .includes("xpressbees.com");

const normalizeTrackingTemplate = (value) => {
  const rawTemplate = sanitizeText(
    value || process.env.XPRESSBEES_TRACKING_URL_TEMPLATE,
  );
  const baseTemplate =
    rawTemplate || DEFAULT_XPRESSBEES_TRACKING_URL_TEMPLATE;
  const normalizedTemplate = baseTemplate.replace(
    /([?&])awb=\$\{AWB\}/i,
    `$1awbNo=${AWB_PLACEHOLDER}`,
  );

  if (normalizedTemplate.includes(AWB_PLACEHOLDER)) {
    return normalizedTemplate;
  }

  return normalizedTemplate.includes("?")
    ? `${normalizedTemplate}&awbNo=${AWB_PLACEHOLDER}`
    : `${normalizedTemplate}?awbNo=${AWB_PLACEHOLDER}`;
};

export const resolveOrderAwb = (order = {}) =>
  sanitizeText(
    order?.awbNo ||
      order?.awb_no ||
      order?.awb_number ||
      order?.awbNumber ||
      order?.shipment?.awbNo ||
      order?.shipment?.awb_no ||
      order?.shipment?.awb_number ||
      order?.shipment?.awb ||
      order?.shipping?.awbNo ||
      order?.shipping?.awb_no ||
      order?.shipping?.awb_number ||
      order?.shipping?.awb ||
      "",
  );

export const buildXpressbeesTrackingUrl = (awb, template) => {
  const normalizedAwb = sanitizeText(awb);
  if (!normalizedAwb) return "";

  const resolvedUrl = normalizeTrackingTemplate(template).replace(
    new RegExp(`\\$\\{AWB\\}`, "g"),
    encodeURIComponent(normalizedAwb),
  );

  try {
    const parsed = new URL(resolvedUrl);
    if (!isXpressbeesHost(parsed.hostname)) {
      return resolvedUrl;
    }

    parsed.pathname = "/shipment/tracking";
    parsed.search = "";
    parsed.searchParams.set("awbNo", normalizedAwb);
    return parsed.toString();
  } catch {
    return resolvedUrl;
  }
};

export const resolveOrderTrackingUrl = (order = {}, template) => {
  const explicitUrl = sanitizeText(
    order?.trackingUrl || order?.tracking_url || order?.shipmentTrackingUrl,
  );
  const awb = resolveOrderAwb(order);

  if (!explicitUrl) {
    return buildXpressbeesTrackingUrl(awb, template);
  }

  if (!awb) {
    return explicitUrl;
  }

  try {
    const parsed = new URL(explicitUrl);
    if (!isXpressbeesHost(parsed.hostname)) {
      return explicitUrl;
    }

    return buildXpressbeesTrackingUrl(awb, explicitUrl);
  } catch {
    return explicitUrl.includes("${AWB}")
      ? explicitUrl.replace(/\$\{AWB\}/g, encodeURIComponent(awb))
      : explicitUrl;
  }
};

export const DEFAULT_ORDER_TRACKING_URL_TEMPLATE =
  DEFAULT_XPRESSBEES_TRACKING_URL_TEMPLATE;
