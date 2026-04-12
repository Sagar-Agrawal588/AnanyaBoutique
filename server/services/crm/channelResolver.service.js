import mongoose from "mongoose";

export const CRM_CHANNELS = Object.freeze([
  "website",
  "whatsapp",
  "facebook",
  "instagram",
  "email",
  "push",
  "support",
  "phone",
  "admin",
  "other",
]);

export const CRM_CONTACT_LIFECYCLE_STAGES = Object.freeze([
  "lead",
  "prospect",
  "customer",
  "repeat_customer",
  "inactive",
]);

export const CRM_CONTACT_STATUSES = Object.freeze([
  "open",
  "contacted",
  "qualified",
  "converted",
  "lost",
]);

export const CRM_DIRECTIONS = Object.freeze([
  "inbound",
  "outbound",
  "system",
]);

export const CRM_INTERACTION_EVENT_TYPES = Object.freeze([
  "lead_capture",
  "chat_message",
  "message_status",
  "support_ticket_created",
  "support_ticket_updated",
  "order_created",
  "order_paid",
  "newsletter_subscribed",
  "newsletter_unsubscribed",
  "promotional_unsubscribed",
  "notification_registered",
  "campaign_click",
  "campaign_open",
  "custom",
]);

const normalizeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const normalizeAllowedValue = (value, aliases, allowedValues) => {
  const normalized = normalizeKey(value);
  if (!normalized) return null;
  const resolved = aliases.get(normalized) || normalized;
  return allowedValues.includes(resolved) ? resolved : null;
};

const channelAliases = new Map([
  ["site", "website"],
  ["web", "website"],
  ["store", "website"],
  ["whats_app", "whatsapp"],
  ["wa", "whatsapp"],
  ["fb", "facebook"],
  ["messenger", "facebook"],
  ["ig", "instagram"],
  ["mail", "email"],
  ["email_marketing", "email"],
  ["fcm", "push"],
  ["notification", "push"],
  ["notifications", "push"],
  ["customer_support", "support"],
  ["customer_care", "support"],
  ["call", "phone"],
]);

const lifecycleAliases = new Map([
  ["new", "lead"],
  ["interested", "prospect"],
  ["repeatcustomer", "repeat_customer"],
]);

const statusAliases = new Map([
  ["new", "open"],
  ["in_progress", "contacted"],
  ["won", "converted"],
  ["closed_won", "converted"],
  ["closed_lost", "lost"],
]);

const directionAliases = new Map([
  ["incoming", "inbound"],
  ["outgoing", "outbound"],
  ["internal", "system"],
  ["automated", "system"],
]);

const interactionAliases = new Map([
  ["lead", "lead_capture"],
  ["message", "chat_message"],
  ["status_update", "message_status"],
  ["delivery_status", "message_status"],
  ["support_created", "support_ticket_created"],
  ["support_updated", "support_ticket_updated"],
  ["ticket_created", "support_ticket_created"],
  ["ticket_updated", "support_ticket_updated"],
  ["purchase", "order_paid"],
  ["payment_success", "order_paid"],
  ["subscribed", "newsletter_subscribed"],
  ["unsubscribed", "newsletter_unsubscribed"],
  ["promo_unsubscribed", "promotional_unsubscribed"],
  ["push_registered", "notification_registered"],
  ["click", "campaign_click"],
  ["open", "campaign_open"],
]);

export const normalizeChannel = (value) =>
  normalizeAllowedValue(value, channelAliases, CRM_CHANNELS);

export const normalizeLifecycleStage = (value) =>
  normalizeAllowedValue(value, lifecycleAliases, CRM_CONTACT_LIFECYCLE_STAGES);

export const normalizeContactStatus = (value) =>
  normalizeAllowedValue(value, statusAliases, CRM_CONTACT_STATUSES);

export const normalizeDirection = (value) =>
  normalizeAllowedValue(value, directionAliases, CRM_DIRECTIONS);

export const normalizeInteractionEventType = (value) =>
  normalizeAllowedValue(value, interactionAliases, CRM_INTERACTION_EVENT_TYPES);

export const normalizeEmail = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return "";
  }
  return normalized;
};

export const normalizePhone = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const keepPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return "";
  return keepPlus ? `+${digits}` : digits;
};

export const normalizeObjectId = (value) => {
  const raw = String(value || "").trim();
  return raw && mongoose.Types.ObjectId.isValid(raw) ? raw : "";
};

export const normalizeDateInput = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const sanitizeText = (value, { maxLength = 200, allowNewLines = false } = {}) => {
  const normalized = String(value || "")
    .replace(allowNewLines ? /\r/g : /\s+/g, allowNewLines ? "" : " ")
    .trim();
  if (!normalized) return "";
  const safeValue = allowNewLines
    ? normalized
        .split("\n")
        .map((line) => line.trim())
        .join("\n")
        .trim()
    : normalized;
  return safeValue.slice(0, maxLength);
};

export const normalizeBooleanLike = (value) => {
  if (value === true || value === false) return value;
  const normalized = normalizeKey(value);
  if (!normalized) return null;
  if (["1", "true", "yes", "y", "on", "subscribed", "enabled"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off", "unsubscribed", "disabled"].includes(normalized)) {
    return false;
  }
  return null;
};

export const normalizeTagList = (value) => {
  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return [
    ...new Set(
      list
        .map((entry) =>
          sanitizeText(entry, {
            maxLength: 40,
          }).toLowerCase(),
        )
        .filter(Boolean),
    ),
  ];
};

export const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const buildCrmValidationError = (message, details = null) => {
  const error = new Error(message);
  error.name = "CrmValidationError";
  error.statusCode = 400;
  if (details) {
    error.details = details;
  }
  return error;
};
