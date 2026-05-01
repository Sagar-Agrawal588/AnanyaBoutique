import crypto from "node:crypto";
import { captureCrmTouchpointSafely } from "./crmTracking.service.js";
import { normalizeEmail, normalizePhone, sanitizeText } from "./channelResolver.service.js";

const buildStableUserSyncKey = (user = {}) => {
  const userId = String(user?._id || "").trim();
  const email = normalizeEmail(user?.email || "");
  const phone = normalizePhone(user?.mobile || user?.phone || "");
  const name = sanitizeText(user?.name || "", { maxLength: 120 }).toLowerCase();
  const baseId = userId || email || phone;
  if (!baseId) return "";

  const fingerprint = crypto
    .createHash("sha1")
    .update(JSON.stringify({ email, phone, name }))
    .digest("hex")
    .slice(0, 20);

  return `crm:user:${baseId}:identity:${fingerprint}`;
};

export const syncUserIdentityToCrmSafely = async ({
  user = {},
  req = null,
  source = "user_identity_sync",
  pageUrl = "/register",
} = {}) => {
  const userId = String(user?._id || "").trim();
  const email = normalizeEmail(user?.email || "");
  const phone = normalizePhone(user?.mobile || user?.phone || "");
  const name = sanitizeText(user?.name || "", { maxLength: 120 });
  const idempotencyKey = buildStableUserSyncKey(user);

  if (!userId && !email && !phone && !idempotencyKey) {
    return null;
  }

  return captureCrmTouchpointSafely({
    channel: "website",
    eventType: "lead_capture",
    userId: userId || null,
    email,
    phone,
    name,
    pageUrl,
    referrer: req?.headers?.referer || "",
    happenedAt: user?.createdAt || new Date(),
    idempotencyKey,
    consent: {
      email: email ? !Boolean(user?.email_opt_out) : null,
      push:
        typeof user?.notificationSettings?.pushNotifications === "boolean"
          ? user.notificationSettings.pushNotifications
          : null,
    },
    metadata: {
      source,
      provider: sanitizeText(user?.provider || "", { maxLength: 40 }) || "local",
      role: sanitizeText(user?.role || "", { maxLength: 40 }) || "User",
      verifyEmail: Boolean(user?.verifyEmail),
    },
  });
};

export const syncOrderContactToCrmSafely = async ({
  req = null,
  email = "",
  userId = null,
  name = "",
  phone = "",
  orderId = null,
  orderAmount = 0,
  sessionId = "",
  affiliateSource = null,
  influencerCode = null,
  isSavedOrder = false,
} = {}) => {
  const normalizedOrderId = String(orderId || "").trim();
  if (!normalizedOrderId) return null;

  return captureCrmTouchpointSafely({
    channel: "website",
    eventType: "order_created",
    userId,
    email: normalizeEmail(email || ""),
    phone: normalizePhone(phone || ""),
    name: sanitizeText(name || "", { maxLength: 120 }),
    orderId: normalizedOrderId,
    orderAmount,
    sessionId: sanitizeText(sessionId || "", { maxLength: 128 }),
    pageUrl: "/checkout",
    referrer: req?.headers?.referer || "",
    happenedAt: new Date(),
    idempotencyKey: `crm:order:${normalizedOrderId}:created`,
    metadata: {
      source: "order_create",
      affiliateSource: affiliateSource || null,
      influencerCode: influencerCode || null,
      isSavedOrder: Boolean(isSavedOrder),
    },
  });
};
