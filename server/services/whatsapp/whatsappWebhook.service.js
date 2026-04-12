import { captureCrmTouchpointSafely } from "../crm/crmTracking.service.js";
import { isPlainObject, normalizePhone, sanitizeText } from "../crm/channelResolver.service.js";

const WHATSAPP_PROVIDER = "meta_cloud_api";
const WHATSAPP_SOURCE = "whatsapp_meta_webhook";

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const toDateFromUnixSeconds = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return new Date();
  }
  return new Date(parsed * 1000);
};

const summarizeError = (error = {}) => {
  if (!isPlainObject(error)) return "";
  const details = [
    sanitizeText(error.title || "", { maxLength: 160 }),
    sanitizeText(error.message || "", { maxLength: 300 }),
    sanitizeText(error.code || "", { maxLength: 40 }),
  ].filter(Boolean);
  return details.join(" | ");
};

const summarizeWhatsappMessage = (message = {}) => {
  const type = sanitizeText(message?.type || "unknown", { maxLength: 80 }).toLowerCase();

  if (type === "text") {
    return sanitizeText(message?.text?.body || "", {
      maxLength: 4000,
      allowNewLines: true,
    });
  }

  if (type === "button") {
    const label = sanitizeText(message?.button?.text || message?.button?.payload || "", {
      maxLength: 300,
    });
    return label ? `Button reply: ${label}` : "Button reply";
  }

  if (type === "interactive") {
    const replyType = sanitizeText(message?.interactive?.type || "", { maxLength: 80 });
    const buttonTitle = sanitizeText(
      message?.interactive?.button_reply?.title ||
        message?.interactive?.button_reply?.id ||
        "",
      { maxLength: 300 },
    );
    const listTitle = sanitizeText(
      message?.interactive?.list_reply?.title ||
        message?.interactive?.list_reply?.description ||
        message?.interactive?.list_reply?.id ||
        "",
      { maxLength: 300 },
    );
    const summary = buttonTitle || listTitle || replyType;
    return summary ? `Interactive reply: ${summary}` : "Interactive reply";
  }

  if (type === "image") {
    const caption = sanitizeText(message?.image?.caption || "", {
      maxLength: 300,
      allowNewLines: true,
    });
    return caption ? `[Image] ${caption}` : "[Image]";
  }

  if (type === "video") {
    const caption = sanitizeText(message?.video?.caption || "", {
      maxLength: 300,
      allowNewLines: true,
    });
    return caption ? `[Video] ${caption}` : "[Video]";
  }

  if (type === "document") {
    const filename = sanitizeText(message?.document?.filename || "", { maxLength: 160 });
    return filename ? `[Document] ${filename}` : "[Document]";
  }

  if (type === "audio") return "[Audio]";
  if (type === "sticker") return "[Sticker]";
  if (type === "reaction") {
    const emoji = sanitizeText(message?.reaction?.emoji || "", { maxLength: 20 });
    return emoji ? `Reaction: ${emoji}` : "Reaction";
  }
  if (type === "location") return "[Location shared]";
  if (type === "contacts") return "[Contact shared]";

  return `WhatsApp ${type || "message"}`;
};

const resolveMessageEventName = (message = {}) => {
  const type = sanitizeText(message?.type || "message", { maxLength: 80 }).toLowerCase();
  if (!type) return "whatsapp_message";

  if (type === "interactive") {
    const replyType = sanitizeText(message?.interactive?.type || "", {
      maxLength: 80,
    }).toLowerCase();
    return replyType ? `whatsapp_${replyType}` : "whatsapp_interactive";
  }

  return `whatsapp_${type}`;
};

const buildContactMap = (contacts = []) => {
  const map = new Map();

  normalizeArray(contacts).forEach((contact) => {
    const waId = sanitizeText(contact?.wa_id || "", { maxLength: 40 });
    if (!waId) return;
    map.set(waId, {
      name: sanitizeText(contact?.profile?.name || "", { maxLength: 120 }),
      phone: normalizePhone(waId),
    });
  });

  return map;
};

export const verifyWhatsappWebhookSubscription = ({
  mode = "",
  verifyToken = "",
  challenge = "",
  expectedVerifyToken = "",
} = {}) => {
  const normalizedMode = String(mode || "").trim();
  const normalizedVerifyToken = String(verifyToken || "").trim();
  const normalizedChallenge = String(challenge || "").trim();
  const normalizedExpectedToken = String(expectedVerifyToken || "").trim();

  if (!normalizedExpectedToken) {
    return {
      ok: false,
      statusCode: 503,
      message: "WhatsApp webhook verify token is not configured.",
      reason: "missing_verify_token",
    };
  }

  if (normalizedMode !== "subscribe") {
    return {
      ok: false,
      statusCode: 400,
      message: "Unsupported WhatsApp webhook mode.",
      reason: "unsupported_mode",
    };
  }

  if (!normalizedChallenge) {
    return {
      ok: false,
      statusCode: 400,
      message: "Missing WhatsApp webhook challenge.",
      reason: "missing_challenge",
    };
  }

  if (normalizedVerifyToken !== normalizedExpectedToken) {
    return {
      ok: false,
      statusCode: 403,
      message: "Invalid WhatsApp webhook verify token.",
      reason: "invalid_verify_token",
    };
  }

  return {
    ok: true,
    statusCode: 200,
    challenge: normalizedChallenge,
  };
};

export const extractWhatsappWebhookTouchpoints = (payload = {}) => {
  if (!isPlainObject(payload) || payload?.object !== "whatsapp_business_account") {
    return [];
  }

  const touchpoints = [];

  normalizeArray(payload.entry).forEach((entry) => {
    normalizeArray(entry?.changes).forEach((change) => {
      if (String(change?.field || "").trim() !== "messages") return;

      const value = isPlainObject(change?.value) ? change.value : {};
      const contactsByWaId = buildContactMap(value?.contacts);
      const phoneNumberId = sanitizeText(value?.metadata?.phone_number_id || "", {
        maxLength: 80,
      });
      const displayPhoneNumber = sanitizeText(
        value?.metadata?.display_phone_number || "",
        { maxLength: 80 },
      );

      normalizeArray(value?.messages).forEach((message) => {
        const from = sanitizeText(message?.from || "", { maxLength: 40 });
        const identity = contactsByWaId.get(from) || {};
        const phone = identity.phone || normalizePhone(from);
        if (!phone) return;

        const messageId = sanitizeText(message?.id || "", { maxLength: 200 });
        const messageType = sanitizeText(message?.type || "", { maxLength: 80 });
        const contextMessageId = sanitizeText(message?.context?.id || "", {
          maxLength: 200,
        });

        touchpoints.push({
          channel: "whatsapp",
          eventType: "chat_message",
          direction: "inbound",
          phone,
          name: identity.name || "",
          source: WHATSAPP_SOURCE,
          eventName: resolveMessageEventName(message),
          message: summarizeWhatsappMessage(message),
          happenedAt: toDateFromUnixSeconds(message?.timestamp),
          idempotencyKey: messageId ? `whatsapp:message:${messageId}` : "",
          metadata: {
            source: WHATSAPP_SOURCE,
            provider: WHATSAPP_PROVIDER,
            phoneNumberId,
            displayPhoneNumber,
            messageId,
            messageType,
            from,
            contextMessageId: contextMessageId || null,
          },
        });
      });

      normalizeArray(value?.statuses).forEach((statusEntry) => {
        const recipientId = sanitizeText(statusEntry?.recipient_id || "", {
          maxLength: 40,
        });
        const phone = normalizePhone(recipientId);
        if (!phone) return;

        const statusValue = sanitizeText(statusEntry?.status || "unknown", {
          maxLength: 80,
        }).toLowerCase();
        const statusMessageId = sanitizeText(statusEntry?.id || "", {
          maxLength: 200,
        });
        const errors = normalizeArray(statusEntry?.errors)
          .map((entry) => summarizeError(entry))
          .filter(Boolean);
        const summary = errors.length
          ? `WhatsApp message ${statusValue}: ${errors.join("; ")}`
          : `WhatsApp message ${statusValue}`;

        touchpoints.push({
          channel: "whatsapp",
          eventType: "message_status",
          direction: "system",
          phone,
          source: WHATSAPP_SOURCE,
          eventName: statusValue ? `whatsapp_status_${statusValue}` : "whatsapp_status",
          message: summary,
          happenedAt: toDateFromUnixSeconds(statusEntry?.timestamp),
          idempotencyKey:
            statusMessageId && statusValue
              ? `whatsapp:status:${statusMessageId}:${statusValue}:${String(statusEntry?.timestamp || "")}`
              : "",
          metadata: {
            source: WHATSAPP_SOURCE,
            provider: WHATSAPP_PROVIDER,
            phoneNumberId,
            displayPhoneNumber,
            messageId: statusMessageId,
            status: statusValue || "unknown",
            recipientId,
            conversationId: sanitizeText(statusEntry?.conversation?.id || "", {
              maxLength: 120,
            }),
            conversationOrigin: sanitizeText(
              statusEntry?.conversation?.origin?.type || "",
              { maxLength: 80 },
            ),
            pricingCategory: sanitizeText(statusEntry?.pricing?.category || "", {
              maxLength: 80,
            }),
            pricingModel: sanitizeText(statusEntry?.pricing?.pricing_model || "", {
              maxLength: 80,
            }),
            billable:
              typeof statusEntry?.pricing?.billable === "boolean"
                ? statusEntry.pricing.billable
                : null,
            errors,
          },
        });
      });
    });
  });

  return touchpoints;
};

export const ingestWhatsappWebhookPayload = async (
  payload = {},
  { captureTouchpoint = captureCrmTouchpointSafely } = {},
) => {
  const touchpoints = extractWhatsappWebhookTouchpoints(payload);
  let processedCount = 0;

  for (const touchpoint of touchpoints) {
    await captureTouchpoint(touchpoint, {
      defaultChannel: "whatsapp",
    });
    processedCount += 1;
  }

  return {
    processedCount,
    touchpoints,
  };
};
