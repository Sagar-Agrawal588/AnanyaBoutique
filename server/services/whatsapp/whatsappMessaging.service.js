import { randomUUID } from "node:crypto";
import CrmContact from "../../models/crmContact.model.js";
import CrmInteraction from "../../models/crmInteraction.model.js";
import { logger } from "../../utils/errorHandler.js";
import { captureCrmTouchpointSafely } from "../crm/crmTracking.service.js";
import {
  buildCrmValidationError,
  normalizeObjectId,
  normalizePhone,
  sanitizeText,
} from "../crm/channelResolver.service.js";

const DEFAULT_GRAPH_API_VERSION = "v22.0";
const DEFAULT_TIMEOUT_MS = 15000;
const WHATSAPP_PROVIDER = "meta_cloud_api";
const WHATSAPP_SOURCE = "whatsapp_admin_api";

const normalizeStringList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeText(entry, { maxLength: 500, allowNewLines: true }))
      .filter(Boolean);
  }

  return String(value || "")
    .split(/[\n,]+/)
    .map((entry) => sanitizeText(entry, { maxLength: 500, allowNewLines: true }))
    .filter(Boolean);
};

const buildWhatsAppServiceError = (message, statusCode = 500, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (details) {
    error.details = details;
  }
  return error;
};

const resolveWhatsappConfig = () => {
  const accessToken = String(process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
  const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();
  const businessAccountId = String(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "").trim();
  const graphApiVersion =
    sanitizeText(process.env.WHATSAPP_GRAPH_API_VERSION || "", { maxLength: 16 }) ||
    DEFAULT_GRAPH_API_VERSION;

  return {
    accessToken,
    phoneNumberId,
    businessAccountId,
    graphApiVersion,
  };
};

const ensureWhatsappMessagingConfig = () => {
  const config = resolveWhatsappConfig();
  const missing = [];

  if (!config.accessToken) missing.push("WHATSAPP_ACCESS_TOKEN");
  if (!config.phoneNumberId) missing.push("WHATSAPP_PHONE_NUMBER_ID");

  if (missing.length > 0) {
    throw buildWhatsAppServiceError(
      `WhatsApp messaging is not configured. Missing: ${missing.join(", ")}`,
      503,
      { missing },
    );
  }

  return config;
};

const buildFetchSignal = (timeoutMs = DEFAULT_TIMEOUT_MS) => {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }

  return undefined;
};

const safeParseJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const buildTextPayload = ({ to, body, previewUrl = false, replyToMessageId = "" }) => ({
  messaging_product: "whatsapp",
  recipient_type: "individual",
  to,
  type: "text",
  ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
  text: {
    body,
    preview_url: Boolean(previewUrl),
  },
});

const buildTemplateComponents = ({
  bodyVariables = [],
  headerVariables = [],
} = {}) => {
  const components = [];

  if (headerVariables.length > 0) {
    components.push({
      type: "header",
      parameters: headerVariables.map((value) => ({
        type: "text",
        text: value,
      })),
    });
  }

  if (bodyVariables.length > 0) {
    components.push({
      type: "body",
      parameters: bodyVariables.map((value) => ({
        type: "text",
        text: value,
      })),
    });
  }

  return components;
};

const buildTemplatePayload = ({
  to,
  templateName,
  languageCode = "en",
  bodyVariables = [],
  headerVariables = [],
}) => {
  const components = buildTemplateComponents({
    bodyVariables,
    headerVariables,
  });

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      ...(components.length > 0 ? { components } : {}),
    },
  };
};

const buildTemplateSummary = (templateName, bodyVariables = []) => {
  const variablesSummary =
    bodyVariables.length > 0 ? ` | ${bodyVariables.join(" | ")}` : "";
  return `Template: ${templateName}${variablesSummary}`;
};

const executeWhatsappRequest = async ({
  endpoint,
  method = "GET",
  payload,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  requirePhoneNumberId = true,
}) => {
  if (typeof fetchImpl !== "function") {
    throw buildWhatsAppServiceError("Fetch implementation is not available.", 500);
  }

  const config = resolveWhatsappConfig();
  const missing = [];
  if (!config.accessToken) missing.push("WHATSAPP_ACCESS_TOKEN");
  if (requirePhoneNumberId && !config.phoneNumberId) {
    missing.push("WHATSAPP_PHONE_NUMBER_ID");
  }

  if (missing.length > 0) {
    throw buildWhatsAppServiceError(
      `WhatsApp messaging is not configured. Missing: ${missing.join(", ")}`,
      503,
      { missing },
    );
  }

  const url = `https://graph.facebook.com/${config.graphApiVersion}/${endpoint}`;

  const response = await fetchImpl(url, {
    method,
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
    signal: buildFetchSignal(timeoutMs),
  });

  const data = await safeParseJson(response);

  if (!response.ok) {
    const providerMessage = sanitizeText(
      data?.error?.message || response.statusText || "WhatsApp API request failed.",
      { maxLength: 400 },
    );
    throw buildWhatsAppServiceError(providerMessage, response.status, {
      providerCode: data?.error?.code ?? null,
      providerType: sanitizeText(data?.error?.type || "", { maxLength: 80 }) || null,
      providerSubcode: data?.error?.error_subcode ?? null,
      raw: data,
    });
  }

  return data;
};

const countTemplatePlaceholders = (text = "") => {
  const matches = String(text || "").match(/{{\d+}}/g);
  return Array.isArray(matches) ? matches.length : 0;
};

const toPlainWhatsappTemplate = (template = {}) => {
  const components = Array.isArray(template?.components) ? template.components : [];
  const bodyComponent = components.find(
    (entry) => String(entry?.type || "").toUpperCase() === "BODY",
  );

  return {
    id: String(template?.id || ""),
    name: sanitizeText(template?.name || "", { maxLength: 120 }),
    status: sanitizeText(template?.status || "", { maxLength: 40 }).toLowerCase(),
    category: sanitizeText(template?.category || "", { maxLength: 40 }).toLowerCase(),
    language: sanitizeText(template?.language || "", { maxLength: 40 }).toLowerCase(),
    bodyVariableCount: countTemplatePlaceholders(bodyComponent?.text || ""),
    bodyPreview: sanitizeText(bodyComponent?.text || "", {
      maxLength: 220,
      allowNewLines: true,
    }),
  };
};

const findWhatsappContact = async ({ contactId = "", phone = "" }) => {
  const normalizedContactId = normalizeObjectId(contactId);
  if (normalizedContactId) {
    return CrmContact.findById(normalizedContactId).lean();
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;

  return CrmContact.findOne({
    phone: { $in: [normalizedPhone, normalizedPhone.replace(/^\+/, "")] },
  }).lean();
};

const recordFailedWhatsappAttempt = async ({
  contact,
  phone,
  useTemplate,
  templateName,
  languageCode,
  body,
  bodyVariables,
  headerVariables,
  campaignName,
  segment,
  adminUserId,
  error,
}) => {
  await captureCrmTouchpointSafely({
    userId: contact?.user || null,
    email: contact?.email || "",
    phone: contact?.phone || phone,
    name: contact?.name || "",
    channel: "whatsapp",
    eventType: "custom",
    direction: "system",
    source: WHATSAPP_SOURCE,
    eventName: "whatsapp_send_failed",
    message: sanitizeText(
      `Failed to send WhatsApp ${useTemplate ? "template" : "text"} message: ${
        error?.message || "Unknown provider error"
      }`,
      { maxLength: 4000, allowNewLines: true },
    ),
    happenedAt: new Date(),
    idempotencyKey: `whatsapp:send_failed:${randomUUID()}`,
    ...(campaignName
      ? {
          campaign: {
            source: WHATSAPP_SOURCE,
            medium: useTemplate ? "template" : "text",
            campaign: campaignName,
            content: segment || "",
          },
        }
      : {}),
    metadata: {
      source: WHATSAPP_SOURCE,
      provider: WHATSAPP_PROVIDER,
      status: "failed",
      messageType: useTemplate ? "template" : "text",
      templateName: templateName || null,
      languageCode: languageCode || null,
      bodyPreview: useTemplate
        ? buildTemplateSummary(templateName, bodyVariables)
        : sanitizeText(body || "", { maxLength: 220, allowNewLines: true }),
      bodyVariables,
      headerVariables,
      segment: segment || null,
      sentByAdminId: adminUserId ? String(adminUserId) : null,
    },
  });
};

export const getWhatsappMessagingConfigSummary = () => {
  const config = resolveWhatsappConfig();
  const missing = [];

  if (!config.accessToken) missing.push("WHATSAPP_ACCESS_TOKEN");
  if (!config.phoneNumberId) missing.push("WHATSAPP_PHONE_NUMBER_ID");
  if (!config.businessAccountId) missing.push("WHATSAPP_BUSINESS_ACCOUNT_ID");

  return {
    messagingReady: Boolean(config.accessToken && config.phoneNumberId),
    templateSyncReady: Boolean(config.accessToken && config.businessAccountId),
    graphApiVersion: config.graphApiVersion,
    missing,
  };
};

export const listApprovedWhatsappTemplates = async ({
  fetchImpl = globalThis.fetch,
} = {}) => {
  const config = resolveWhatsappConfig();
  if (!config.accessToken || !config.businessAccountId) {
    return {
      configured: false,
      templates: [],
    };
  }

  const data = await executeWhatsappRequest({
    endpoint: `${config.businessAccountId}/message_templates?limit=200&fields=name,status,category,language,components`,
    fetchImpl,
    requirePhoneNumberId: false,
  });

  return {
    configured: true,
    templates: (Array.isArray(data?.data) ? data.data : [])
      .map(toPlainWhatsappTemplate)
      .filter((template) => template.name),
  };
};

export const sendWhatsappMessage = async ({
  contactId = "",
  to = "",
  body = "",
  previewUrl = false,
  templateName = "",
  languageCode = "en",
  bodyVariables = [],
  headerVariables = [],
  campaignName = "",
  segment = "",
  adminUserId = "",
  fetchImpl = globalThis.fetch,
} = {}) => {
  const normalizedTemplateName = sanitizeText(templateName || "", { maxLength: 120 });
  const normalizedBody = sanitizeText(body || "", {
    maxLength: 4000,
    allowNewLines: true,
  });
  const normalizedLanguageCode =
    sanitizeText(languageCode || "", { maxLength: 20 }).toLowerCase() || "en";
  const normalizedBodyVariables = normalizeStringList(bodyVariables);
  const normalizedHeaderVariables = normalizeStringList(headerVariables);
  const useTemplate = Boolean(normalizedTemplateName);
  const contact = await findWhatsappContact({
    contactId,
    phone: to,
  });
  const recipientPhone = normalizePhone(to || contact?.phone || "");

  if (!recipientPhone) {
    throw buildCrmValidationError("A valid customer WhatsApp phone number is required.");
  }

  if (!useTemplate && !normalizedBody) {
    throw buildCrmValidationError("Message text is required for personal WhatsApp sends.");
  }

  if (contact?.consent?.whatsapp === false) {
    throw buildCrmValidationError(
      "This CRM contact has WhatsApp consent disabled, so the message was blocked.",
    );
  }

  if (!useTemplate && contact?._id) {
    const hasInboundConversation = Boolean(
      await CrmInteraction.exists({
        contact: contact._id,
        channel: "whatsapp",
        direction: "inbound",
      }),
    );

    if (!hasInboundConversation && contact?.consent?.whatsapp !== true) {
      throw buildCrmValidationError(
        "Text WhatsApp replies are safest for active conversations. Use a template for first outreach or promotional messaging.",
      );
    }
  }

  const recipientForApi = recipientPhone.replace(/^\+/, "");
  const payload = useTemplate
    ? buildTemplatePayload({
        to: recipientForApi,
        templateName: normalizedTemplateName,
        languageCode: normalizedLanguageCode,
        bodyVariables: normalizedBodyVariables,
        headerVariables: normalizedHeaderVariables,
      })
    : buildTextPayload({
        to: recipientForApi,
        body: normalizedBody,
        previewUrl,
      });

  try {
    const config = ensureWhatsappMessagingConfig();
    const data = await executeWhatsappRequest({
      endpoint: `${config.phoneNumberId}/messages`,
      method: "POST",
      payload,
      fetchImpl,
    });

    const messageId = sanitizeText(data?.messages?.[0]?.id || "", { maxLength: 220 });
    const summary = useTemplate
      ? buildTemplateSummary(normalizedTemplateName, normalizedBodyVariables)
      : normalizedBody;

    await captureCrmTouchpointSafely({
      userId: contact?.user || null,
      email: contact?.email || "",
      phone: contact?.phone || recipientPhone,
      name: contact?.name || "",
      channel: "whatsapp",
      eventType: "chat_message",
      direction: "outbound",
      source: WHATSAPP_SOURCE,
      eventName: useTemplate ? "whatsapp_template" : "whatsapp_text",
      message: summary,
      happenedAt: new Date(),
      idempotencyKey: messageId
        ? `whatsapp:message:${messageId}`
        : `whatsapp:outbound:${randomUUID()}`,
      ...(campaignName
        ? {
            campaign: {
              source: WHATSAPP_SOURCE,
              medium: useTemplate ? "template" : "text",
              campaign: campaignName,
              content: segment || "",
            },
          }
        : {}),
      metadata: {
        source: WHATSAPP_SOURCE,
        provider: WHATSAPP_PROVIDER,
        phoneNumberId: config.phoneNumberId,
        messageId: messageId || null,
        messageType: useTemplate ? "template" : "text",
        templateName: useTemplate ? normalizedTemplateName : null,
        languageCode: useTemplate ? normalizedLanguageCode : null,
        bodyVariables: normalizedBodyVariables,
        headerVariables: normalizedHeaderVariables,
        previewUrl: Boolean(previewUrl),
        segment: segment || null,
        sentByAdminId: adminUserId ? String(adminUserId) : null,
        responseContactWaId: sanitizeText(data?.contacts?.[0]?.wa_id || "", {
          maxLength: 80,
        }),
        responseInput: sanitizeText(data?.contacts?.[0]?.input || "", {
          maxLength: 80,
        }),
      },
    });

    return {
      accepted: true,
      mode: useTemplate ? "template" : "text",
      to: recipientPhone,
      messageId: messageId || "",
      templateName: normalizedTemplateName || "",
      languageCode: useTemplate ? normalizedLanguageCode : "",
      contact: contact
        ? {
            id: String(contact._id),
            name: contact.name || "",
            email: contact.email || "",
            phone: contact.phone || recipientPhone,
          }
        : null,
    };
  } catch (error) {
    await recordFailedWhatsappAttempt({
      contact,
      phone: recipientPhone,
      useTemplate,
      templateName: normalizedTemplateName,
      languageCode: normalizedLanguageCode,
      body: normalizedBody,
      bodyVariables: normalizedBodyVariables,
      headerVariables: normalizedHeaderVariables,
      campaignName,
      segment,
      adminUserId,
      error,
    });

    logger.error("whatsapp.send", "Failed to send WhatsApp message", {
      contactId: contact?._id ? String(contact._id) : null,
      phone: recipientPhone,
      mode: useTemplate ? "template" : "text",
      templateName: normalizedTemplateName || null,
      error: error?.message || String(error),
    });

    throw error;
  }
};
