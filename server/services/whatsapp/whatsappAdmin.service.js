import CrmContact from "../../models/crmContact.model.js";
import CrmInteraction from "../../models/crmInteraction.model.js";
import {
  buildCrmValidationError,
  normalizeObjectId,
  sanitizeText,
} from "../crm/channelResolver.service.js";
import {
  getWhatsappMessagingConfigSummary,
  listApprovedWhatsappTemplates,
  sendWhatsappMessage,
} from "./whatsappMessaging.service.js";

const MAX_CAMPAIGN_RECIPIENTS = 200;

const normalizePositiveInteger = (value, fallback, max) => {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};

const normalizeWhatsappSegment = (value) => {
  const normalized = sanitizeText(value || "all", {
    maxLength: 40,
  }).toLowerCase();
  if (!normalized) return "all";

  const allowed = new Set([
    "all",
    "leads",
    "customers",
    "repeat_customers",
    "inactive",
    "vip",
  ]);

  if (!allowed.has(normalized)) {
    throw buildCrmValidationError(
      "Invalid WhatsApp audience segment. Use all, leads, customers, repeat_customers, inactive, or vip.",
    );
  }

  return normalized;
};

const buildPhonePresentFilter = () => ({
  phone: {
    $exists: true,
    $nin: [null, ""],
  },
});

const buildWhatsappAudienceFilter = ({
  segment = "all",
  inactiveDays = 45,
} = {}) => {
  const normalizedSegment = normalizeWhatsappSegment(segment);
  const cutoff = new Date(
    Date.now() -
      normalizePositiveInteger(inactiveDays, 45, 365) * 24 * 60 * 60 * 1000,
  );

  const filter = {
    ...buildPhonePresentFilter(),
    "consent.whatsapp": true,
    status: { $ne: "lost" },
  };

  if (normalizedSegment === "leads") {
    filter.lifecycleStage = { $in: ["lead", "prospect"] };
  }

  if (normalizedSegment === "customers") {
    filter.lifecycleStage = { $in: ["customer", "repeat_customer"] };
  }

  if (normalizedSegment === "repeat_customers") {
    filter.lifecycleStage = "repeat_customer";
  }

  if (normalizedSegment === "inactive") {
    filter.$or = [
      { lastInteractionAt: { $lt: cutoff } },
      { lastInteractionAt: null },
    ];
  }

  if (normalizedSegment === "vip") {
    filter.tags = "vip";
  }

  return filter;
};

const toPlainAudienceContact = (contact = {}) => ({
  id: String(contact?._id || ""),
  name: contact?.name || "",
  email: contact?.email || "",
  phone: contact?.phone || "",
  lifecycleStage: contact?.lifecycleStage || "lead",
  status: contact?.status || "open",
  tags: Array.isArray(contact?.tags) ? contact.tags : [],
  consent: contact?.consent || {},
  lastInteractionAt: contact?.lastInteractionAt || null,
});

const toPlainWhatsappEvent = (interaction = {}) => ({
  id: String(interaction?._id || ""),
  contactId:
    typeof interaction?.contact === "object" && interaction?.contact?._id
      ? String(interaction.contact._id)
      : String(interaction?.contact || ""),
  contact:
    typeof interaction?.contact === "object" && interaction?.contact?._id
      ? {
          id: String(interaction.contact._id),
          name: interaction.contact.name || "",
          email: interaction.contact.email || "",
          phone: interaction.contact.phone || "",
        }
      : null,
  direction: interaction?.direction || "system",
  eventType: interaction?.eventType || "custom",
  eventName: interaction?.eventName || "",
  message: interaction?.message || "",
  happenedAt: interaction?.happenedAt || null,
  metadata: interaction?.metadata || {},
});

const getWhatsappAudienceContacts = async ({
  segment = "all",
  inactiveDays = 45,
  limit = 100,
} = {}) => {
  const filter = buildWhatsappAudienceFilter({ segment, inactiveDays });

  return CrmContact.find(filter)
    .sort({ lastInteractionAt: -1, updatedAt: -1 })
    .limit(normalizePositiveInteger(limit, 100, MAX_CAMPAIGN_RECIPIENTS))
    .lean();
};

export const getWhatsappAudiencePreview = async (query = {}) => {
  const segment = normalizeWhatsappSegment(query.segment || "all");
  const inactiveDays = normalizePositiveInteger(query.inactiveDays, 45, 365);
  const filter = buildWhatsappAudienceFilter({ segment, inactiveDays });
  const [count, sample] = await Promise.all([
    CrmContact.countDocuments(filter),
    CrmContact.find(filter)
      .sort({ lastInteractionAt: -1, updatedAt: -1 })
      .limit(8)
      .lean(),
  ]);

  return {
    segment,
    inactiveDays,
    count,
    sample: sample.map(toPlainAudienceContact),
  };
};

export const getWhatsappAdminOverview = async () => {
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const config = getWhatsappMessagingConfigSummary();

  const [
    totalWhatsappReachableContacts,
    totalConsentedWhatsappContacts,
    inboundLast30Days,
    outboundLast30Days,
    statusBreakdown,
    recentWhatsappEvents,
    templateResult,
  ] = await Promise.all([
    CrmContact.countDocuments(buildPhonePresentFilter()),
    CrmContact.countDocuments({
      ...buildPhonePresentFilter(),
      "consent.whatsapp": true,
    }),
    CrmInteraction.countDocuments({
      channel: "whatsapp",
      direction: "inbound",
      happenedAt: { $gte: last30Days },
    }),
    CrmInteraction.countDocuments({
      channel: "whatsapp",
      direction: "outbound",
      happenedAt: { $gte: last30Days },
    }),
    CrmInteraction.aggregate([
      {
        $match: {
          channel: "whatsapp",
          eventType: "message_status",
          happenedAt: { $gte: last30Days },
        },
      },
      {
        $group: {
          _id: "$metadata.status",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1, _id: 1 },
      },
    ]),
    CrmInteraction.find({ channel: "whatsapp" })
      .sort({ happenedAt: -1, createdAt: -1 })
      .limit(8)
      .populate("contact", "name email phone")
      .lean(),
    listApprovedWhatsappTemplates().catch(() => ({
      configured: false,
      templates: [],
    })),
  ]);

  const templates = Array.isArray(templateResult?.templates)
    ? templateResult.templates
    : [];

  return {
    configuration: config,
    summary: {
      totalWhatsappReachableContacts,
      totalConsentedWhatsappContacts,
      inboundLast30Days,
      outboundLast30Days,
    },
    statusBreakdown: statusBreakdown.map((entry) => ({
      status: sanitizeText(entry?._id || "unknown", {
        maxLength: 40,
      }).toLowerCase(),
      count: Number(entry?.count || 0),
    })),
    templates: {
      configured: Boolean(templateResult?.configured),
      total: templates.length,
      approved: templates.filter((item) => item.status === "approved").length,
      marketing: templates.filter((item) => item.category === "marketing")
        .length,
      utility: templates.filter((item) => item.category === "utility").length,
      authentication: templates.filter(
        (item) => item.category === "authentication",
      ).length,
    },
    recentEvents: recentWhatsappEvents.map(toPlainWhatsappEvent),
  };
};

export const getWhatsappTemplateCatalog = async () => {
  const result = await listApprovedWhatsappTemplates();
  return {
    configuration: getWhatsappMessagingConfigSummary(),
    templates: Array.isArray(result?.templates) ? result.templates : [],
  };
};

export const sendWhatsappMessageToContact = async (
  contactId,
  payload = {},
  adminUserId = "",
) => {
  const normalizedContactId = normalizeObjectId(contactId);
  if (!normalizedContactId) {
    throw buildCrmValidationError(
      "Valid CRM contactId is required for WhatsApp send.",
    );
  }

  return sendWhatsappMessage({
    contactId: normalizedContactId,
    body: payload?.body,
    previewUrl: payload?.previewUrl,
    mediaType: payload?.mediaType,
    mediaUrl: payload?.mediaUrl,
    caption: payload?.caption,
    fileName: payload?.fileName,
    templateName: payload?.templateName,
    languageCode: payload?.languageCode,
    bodyVariables: payload?.bodyVariables,
    headerVariables: payload?.headerVariables,
    headerMediaType: payload?.headerMediaType,
    headerMediaUrl: payload?.headerMediaUrl,
    campaignName: payload?.campaignName,
    adminUserId,
  });
};

export const sendWhatsappCampaign = async (payload = {}, adminUserId = "") => {
  const templateName = sanitizeText(payload?.templateName || "", {
    maxLength: 120,
  });
  if (!templateName) {
    throw buildCrmValidationError(
      "WhatsApp campaign send requires an approved templateName.",
    );
  }

  const segment = normalizeWhatsappSegment(payload?.segment || "all");
  const inactiveDays = normalizePositiveInteger(payload?.inactiveDays, 45, 365);
  const campaignName =
    sanitizeText(payload?.campaignName || "", { maxLength: 160 }) ||
    templateName.replaceAll("_", " ");
  const audience = await getWhatsappAudienceContacts({
    segment,
    inactiveDays,
    limit: payload?.limit || MAX_CAMPAIGN_RECIPIENTS,
  });

  if (audience.length === 0) {
    return {
      attempted: 0,
      sent: 0,
      failed: 0,
      recipients: [],
      failures: [],
      segment,
      inactiveDays,
      campaignName,
    };
  }

  let sent = 0;
  let failed = 0;
  const recipients = [];
  const failures = [];

  for (const contact of audience) {
    try {
      const result = await sendWhatsappMessage({
        contactId: String(contact._id),
        templateName,
        languageCode: payload?.languageCode,
        bodyVariables: payload?.bodyVariables,
        headerVariables: payload?.headerVariables,
        headerMediaType: payload?.headerMediaType,
        headerMediaUrl: payload?.headerMediaUrl,
        campaignName,
        segment,
        adminUserId,
      });

      sent += 1;
      recipients.push({
        contactId: String(contact._id),
        name: contact.name || "",
        phone: contact.phone || "",
        messageId: result.messageId || "",
      });
    } catch (error) {
      failed += 1;
      failures.push({
        contactId: String(contact._id),
        name: contact.name || "",
        phone: contact.phone || "",
        error: error?.message || "Failed to send WhatsApp template message.",
      });
    }
  }

  return {
    attempted: audience.length,
    sent,
    failed,
    recipients: recipients.slice(0, 12),
    failures: failures.slice(0, 12),
    segment,
    inactiveDays,
    campaignName,
  };
};
