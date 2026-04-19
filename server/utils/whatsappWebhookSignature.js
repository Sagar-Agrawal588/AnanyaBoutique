import crypto from "crypto";

const SIGNATURE_HEADER_NAMES = ["x-hub-signature-256"];

const normalizeHeaderValue = (value) => {
  if (Array.isArray(value)) {
    return String(value[0] || "").trim();
  }
  return String(value || "").trim();
};

export const createWhatsappWebhookSignature = (rawBody, appSecret) =>
  crypto
    .createHmac("sha256", String(appSecret || ""))
    .update(String(rawBody || ""), "utf8")
    .digest("hex");

export const verifyWhatsappWebhookSignature = ({
  headers = {},
  rawBody = "",
  appSecret = "",
} = {}) => {
  const normalizedSecret = String(appSecret || "").trim();
  if (!normalizedSecret) {
    return {
      ok: false,
      reason: "missing_app_secret",
    };
  }

  const signatureHeader = SIGNATURE_HEADER_NAMES.map((headerName) =>
    normalizeHeaderValue(headers?.[headerName] || headers?.[headerName.toUpperCase()]),
  ).find(Boolean);

  if (!signatureHeader) {
    return {
      ok: false,
      reason: "missing_signature",
    };
  }

  const providedSignature = signatureHeader.replace(/^sha256=/i, "").trim().toLowerCase();
  const expectedSignature = createWhatsappWebhookSignature(rawBody, normalizedSecret);

  if (!providedSignature || providedSignature.length !== expectedSignature.length) {
    return {
      ok: false,
      reason: "signature_mismatch",
    };
  }

  const isValid = crypto.timingSafeEqual(
    Buffer.from(providedSignature, "utf8"),
    Buffer.from(expectedSignature, "utf8"),
  );

  return {
    ok: isValid,
    reason: isValid ? null : "signature_mismatch",
    mode: "x_hub_signature_256",
  };
};
