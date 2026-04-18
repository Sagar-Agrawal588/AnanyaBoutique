import mongoose from "mongoose";
import CrmContact from "../../models/crmContact.model.js";
import CrmInteraction from "../../models/crmInteraction.model.js";
import {
  buildCrmValidationError,
  isPlainObject,
  normalizeBooleanLike,
  normalizeChannel,
  normalizeContactStatus,
  normalizeDateInput,
  normalizeDirection,
  normalizeEmail,
  normalizeInteractionEventType,
  normalizeLifecycleStage,
  normalizeObjectId,
  normalizePhone,
  normalizeTagList,
  sanitizeText,
} from "./channelResolver.service.js";

const CONTACT_STAGE_RANK = {
  inactive: 0,
  lead: 1,
  prospect: 2,
  customer: 3,
  repeat_customer: 4,
};

const CONTACT_STATUS_RANK = {
  lost: 0,
  open: 1,
  contacted: 2,
  qualified: 3,
  converted: 4,
};

const isDuplicateKeyError = (error) => Number(error?.code || 0) === 11000;

const roundCurrency = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const normalizePhoneDigits = (value) => String(value || "").replace(/\D/g, "");

const arePhonesEquivalent = (left, right) => {
  const leftDigits = normalizePhoneDigits(left);
  const rightDigits = normalizePhoneDigits(right);
  if (!leftDigits || !rightDigits) return false;
  if (leftDigits === rightDigits) return true;
  return leftDigits.length > 10 &&
    rightDigits.length > 10 &&
    leftDigits.slice(-10) === rightDigits.slice(-10)
    ? true
    : leftDigits.slice(-10) === rightDigits.slice(-10);
};

const buildPhoneSearchVariants = (phone) => {
  const normalizedPhone = normalizePhone(phone);
  const digits = normalizePhoneDigits(normalizedPhone);
  if (!digits) return [];

  const variants = new Set([normalizedPhone, digits, `+${digits}`]);
  if (digits.length > 10) {
    const tail = digits.slice(-10);
    variants.add(tail);
    variants.add(`+${tail}`);
  }

  return [...variants]
    .map((value) => normalizePhone(value))
    .filter(Boolean);
};

const maxDate = (left, right) => {
  const leftTime = left instanceof Date ? left.getTime() : NaN;
  const rightTime = right instanceof Date ? right.getTime() : NaN;
  if (Number.isNaN(leftTime)) return right || null;
  if (Number.isNaN(rightTime)) return left || null;
  return leftTime >= rightTime ? left : right;
};

const pickStage = (currentStage, nextStage, { explicit = false } = {}) => {
  if (!nextStage) return currentStage || "lead";
  if (explicit || !currentStage) return nextStage;
  const currentRank = CONTACT_STAGE_RANK[currentStage] ?? 0;
  const nextRank = CONTACT_STAGE_RANK[nextStage] ?? 0;
  return nextRank >= currentRank ? nextStage : currentStage;
};

const pickStatus = (currentStatus, nextStatus, { explicit = false } = {}) => {
  if (!nextStatus) return currentStatus || "open";
  if (explicit || !currentStatus) return nextStatus;
  const currentRank = CONTACT_STATUS_RANK[currentStatus] ?? 0;
  const nextRank = CONTACT_STATUS_RANK[nextStatus] ?? 0;
  return nextRank >= currentRank ? nextStatus : currentStatus;
};

const normalizeCampaign = (campaign, metadata = {}) => {
  const source =
    sanitizeText(campaign?.source || metadata?.utmSource || "", {
      maxLength: 120,
    }) || "";
  const medium =
    sanitizeText(campaign?.medium || metadata?.utmMedium || "", {
      maxLength: 120,
    }) || "";
  const campaignName =
    sanitizeText(campaign?.campaign || metadata?.utmCampaign || "", {
      maxLength: 160,
    }) || "";
  const term =
    sanitizeText(campaign?.term || metadata?.utmTerm || "", {
      maxLength: 160,
    }) || "";
  const content =
    sanitizeText(campaign?.content || metadata?.utmContent || "", {
      maxLength: 160,
    }) || "";

  if (!source && !medium && !campaignName && !term && !content) {
    return null;
  }

  return {
    source,
    medium,
    campaign: campaignName,
    term,
    content,
  };
};

const buildAttributionSnapshot = ({
  channel,
  source,
  pageUrl,
  referrer,
  sessionId,
  happenedAt,
  campaign,
}) => {
  const normalizedSource = sanitizeText(source, { maxLength: 120 });
  const normalizedPageUrl = sanitizeText(pageUrl, { maxLength: 1000 });
  const normalizedReferrer = sanitizeText(referrer, { maxLength: 1000 });
  const normalizedSessionId = sanitizeText(sessionId, { maxLength: 128 });
  const campaignName = sanitizeText(campaign?.campaign || "", { maxLength: 160 });

  if (
    !channel &&
    !normalizedSource &&
    !normalizedPageUrl &&
    !normalizedReferrer &&
    !normalizedSessionId &&
    !campaignName
  ) {
    return null;
  }

  return {
    channel: channel || null,
    source: normalizedSource,
    campaign: campaignName,
    referrer: normalizedReferrer,
    pageUrl: normalizedPageUrl,
    sessionId: normalizedSessionId,
    happenedAt,
  };
};

const resolveDerivedLifecycleStage = ({ eventType, contact, explicitStage }) => {
  if (explicitStage) return explicitStage;

  if (eventType === "order_paid") {
    return Number(contact?.totalOrders || 0) >= 1 ? "repeat_customer" : "customer";
  }

  if (eventType === "order_created") {
    return "customer";
  }

  if (
    ["support_ticket_created", "support_ticket_updated", "chat_message"].includes(
      eventType,
    )
  ) {
    return "prospect";
  }

  if (
    [
      "lead_capture",
      "newsletter_subscribed",
      "notification_registered",
      "campaign_click",
      "campaign_open",
    ].includes(eventType)
  ) {
    return "lead";
  }

  return null;
};

const resolveDerivedStatus = ({ eventType, explicitStatus }) => {
  if (explicitStatus) return explicitStatus;

  if (eventType === "order_paid") return "converted";
  if (eventType === "order_created") return "qualified";

  if (
    ["support_ticket_created", "support_ticket_updated", "chat_message"].includes(
      eventType,
    )
  ) {
    return "contacted";
  }

  if (
    [
      "lead_capture",
      "newsletter_subscribed",
      "notification_registered",
      "campaign_click",
      "campaign_open",
    ].includes(eventType)
  ) {
    return "open";
  }

  return null;
};

const extractOrderAmount = (value, metadata = {}) => {
  const rawValue =
    value ??
    metadata?.orderAmount ??
    metadata?.revenue ??
    metadata?.amount ??
    metadata?.finalAmount ??
    0;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? roundCurrency(parsed) : 0;
};

const normalizeConsentPatch = (value = {}) => {
  if (!isPlainObject(value)) return {};

  return {
    email: normalizeBooleanLike(value.email),
    whatsapp: normalizeBooleanLike(value.whatsapp),
    sms: normalizeBooleanLike(value.sms),
    push: normalizeBooleanLike(value.push),
  };
};

const deriveConsentPatch = ({
  eventType,
  channel,
  direction,
  consent = {},
}) => {
  const derived = { ...consent };

  if (eventType === "newsletter_subscribed" || channel === "email") {
    if (derived.email === null || derived.email === undefined) derived.email = true;
  }
  if (
    eventType === "newsletter_unsubscribed" ||
    eventType === "promotional_unsubscribed"
  ) {
    derived.email = false;
  }
  if (eventType === "notification_registered" || channel === "push") {
    if (derived.push === null || derived.push === undefined) derived.push = true;
  }
  if (
    channel === "whatsapp" &&
    direction === "inbound" &&
    eventType === "chat_message" &&
    (derived.whatsapp === null || derived.whatsapp === undefined)
  ) {
    derived.whatsapp = true;
  }

  return derived;
};

const ensureObjectId = (value) => {
  const normalized = normalizeObjectId(value);
  return normalized ? new mongoose.Types.ObjectId(normalized) : null;
};

const resolveContactCandidates = async ({ userId, email, phone, sessionId }) => {
  const candidates = [];

  if (userId) {
    const byUser = await CrmContact.findOne({ user: userId });
    if (byUser) candidates.push(byUser);
  }

  if (email) {
    const byEmail = await CrmContact.findOne({ email });
    if (byEmail && !candidates.some((entry) => String(entry._id) === String(byEmail._id))) {
      candidates.push(byEmail);
    }
  }

  if (phone) {
    const phoneVariants = buildPhoneSearchVariants(phone);
    const phoneMatches = await CrmContact.find({
      phone: { $in: phoneVariants },
    }).limit(5);
    for (const byPhone of phoneMatches) {
      if (!candidates.some((entry) => String(entry._id) === String(byPhone._id))) {
        candidates.push(byPhone);
      }
    }
  }

  if (sessionId) {
    const bySession = await CrmContact.findOne({ sessionId });
    if (
      bySession &&
      !candidates.some((entry) => String(entry._id) === String(bySession._id))
    ) {
      candidates.push(bySession);
    }
  }

  return candidates;
};

const pickContact = (candidates = []) => {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  return (
    candidates.find((entry) => entry?.user) ||
    candidates.find((entry) => entry?.email) ||
    candidates.find((entry) => entry?.phone) ||
    candidates[0]
  );
};

const sanitizeMetadata = (value) => {
  if (!isPlainObject(value)) return {};
  return { ...value };
};

const buildNormalizedTouchpoint = (input = {}, options = {}) => {
  const userId = normalizeObjectId(input.userId || input.user || "");
  const email = normalizeEmail(input.email || input?.contact?.email || "");
  const phone = normalizePhone(input.phone || input?.contact?.phone || "");
  const sessionId = sanitizeText(
    input.sessionId || input.session_id || options.sessionId || "",
    { maxLength: 128 },
  );
  const name = sanitizeText(input.name || input?.contact?.name || "", {
    maxLength: 120,
  });
  const rawChannel = input.channel;
  const normalizedChannel = normalizeChannel(rawChannel);
  const hasExplicitChannel = String(rawChannel || "").trim().length > 0;
  const channel = normalizedChannel || options.defaultChannel || "website";

  if (hasExplicitChannel && !normalizedChannel) {
    throw buildCrmValidationError("Invalid CRM channel supplied.", {
      channel: rawChannel,
    });
  }

  const rawLifecycleStage = input.lifecycleStage || input.lifecycle_stage || "";
  const lifecycleStage = normalizeLifecycleStage(rawLifecycleStage);
  if (String(rawLifecycleStage || "").trim() && !lifecycleStage) {
    throw buildCrmValidationError("Invalid CRM lifecycle stage supplied.", {
      lifecycleStage: rawLifecycleStage,
    });
  }

  const rawStatus = input.status || "";
  const status = normalizeContactStatus(rawStatus);
  if (String(rawStatus || "").trim() && !status) {
    throw buildCrmValidationError("Invalid CRM contact status supplied.", {
      status: rawStatus,
    });
  }

  const rawDirection = input.direction || "";
  const resolvedDirection = normalizeDirection(rawDirection);
  if (String(rawDirection || "").trim() && !resolvedDirection) {
    throw buildCrmValidationError("Invalid CRM interaction direction supplied.", {
      direction: rawDirection,
    });
  }

  const rawEventType = input.eventType || input.event_type || input.type || "lead_capture";
  const normalizedEventType = normalizeInteractionEventType(rawEventType);
  const eventType = normalizedEventType || "custom";
  const eventName = sanitizeText(
    normalizedEventType ? input.eventName || "" : rawEventType || input.eventName || "",
    { maxLength: 160 },
  );
  const rawHappenedAt = input.happenedAt || input.happened_at || null;
  const parsedHappenedAt = normalizeDateInput(rawHappenedAt);
  if (rawHappenedAt && !parsedHappenedAt) {
    throw buildCrmValidationError("Invalid CRM happenedAt value supplied.");
  }
  const happenedAt = parsedHappenedAt || new Date();

  if (!userId && !email && !phone && !sessionId) {
    throw buildCrmValidationError(
      "At least one CRM identifier is required: userId, email, phone, or sessionId.",
    );
  }

  const orderId = normalizeObjectId(input.orderId || input.order_id || "");
  const supportTicketId = normalizeObjectId(
    input.supportTicketId || input.support_ticket_id || "",
  );

  return {
    userId,
    email,
    phone,
    sessionId,
    name,
    channel,
    hasExplicitChannel,
    lifecycleStage,
    status,
    direction: resolvedDirection || "system",
    eventType,
    eventName,
    happenedAt,
    orderId,
    supportTicketId,
    idempotencyKey: sanitizeText(input.idempotencyKey || "", { maxLength: 200 }),
    message: sanitizeText(input.message || "", {
      maxLength: 4000,
      allowNewLines: true,
    }),
    pageUrl: sanitizeText(
      input.pageUrl || input.page_url || options.pageUrl || "",
      { maxLength: 1000 },
    ),
    referrer: sanitizeText(input.referrer || options.referrer || "", {
      maxLength: 1000,
    }),
    source: sanitizeText(input.source || "", { maxLength: 120 }),
    newsletterSource: sanitizeText(input.newsletterSource || "", {
      maxLength: 80,
    }),
    tags: normalizeTagList(input.tags),
    metadata: sanitizeMetadata(input.metadata),
    campaign: normalizeCampaign(input.campaign, input.metadata),
    consent: deriveConsentPatch({
      eventType,
      channel,
      direction: resolvedDirection || "system",
      consent: normalizeConsentPatch(input.consent),
    }),
    orderAmount: extractOrderAmount(input.orderAmount, input.metadata),
  };
};

const applyIdentityUpdates = (contact, touchpoint) => {
  if (touchpoint.userId && !contact.user) {
    contact.user = ensureObjectId(touchpoint.userId);
  }
  if (touchpoint.sessionId) {
    contact.sessionId = touchpoint.sessionId;
  }
  if (touchpoint.name && (!contact.name || touchpoint.name.length > contact.name.length)) {
    contact.name = touchpoint.name;
  }
  if (touchpoint.email) {
    contact.email = touchpoint.email;
  }
  if (
    touchpoint.phone &&
    (!contact.phone || !arePhonesEquivalent(contact.phone, touchpoint.phone))
  ) {
    contact.phone = touchpoint.phone;
  }
  if (
    touchpoint.hasExplicitChannel &&
    touchpoint.channel &&
    (!contact.sourceChannel || contact.sourceChannel === "other")
  ) {
    contact.sourceChannel = touchpoint.channel;
  }

  contact.tags = [...new Set([...(contact.tags || []), ...touchpoint.tags])];
  contact.consent = {
    email: touchpoint.consent.email ?? contact.consent?.email ?? null,
    whatsapp: touchpoint.consent.whatsapp ?? contact.consent?.whatsapp ?? null,
    sms: touchpoint.consent.sms ?? contact.consent?.sms ?? null,
    push: touchpoint.consent.push ?? contact.consent?.push ?? null,
  };

  if (isPlainObject(touchpoint.metadata) && Object.keys(touchpoint.metadata).length > 0) {
    contact.metadata = {
      ...(isPlainObject(contact.metadata) ? contact.metadata : {}),
      ...touchpoint.metadata,
    };
  }
};

const applyContactMetricsFromInteraction = (contact, touchpoint) => {
  contact.interactionCount = Number(contact.interactionCount || 0) + 1;
  contact.lastInteractionAt = maxDate(contact.lastInteractionAt, touchpoint.happenedAt);
  contact.lastSeenAt = maxDate(contact.lastSeenAt, touchpoint.happenedAt);
  if (!contact.firstSeenAt) {
    contact.firstSeenAt = touchpoint.happenedAt;
  }

  const derivedStage = resolveDerivedLifecycleStage({
    eventType: touchpoint.eventType,
    contact,
    explicitStage: touchpoint.lifecycleStage,
  });
  const derivedStatus = resolveDerivedStatus({
    eventType: touchpoint.eventType,
    explicitStatus: touchpoint.status,
  });

  contact.lifecycleStage = pickStage(contact.lifecycleStage, derivedStage, {
    explicit: Boolean(touchpoint.lifecycleStage),
  });
  contact.status = pickStatus(contact.status, derivedStatus, {
    explicit: Boolean(touchpoint.status),
  });

  if (touchpoint.eventType === "order_paid") {
    contact.totalOrders = Number(contact.totalOrders || 0) + 1;
    contact.totalSpent = roundCurrency(
      Number(contact.totalSpent || 0) + Number(touchpoint.orderAmount || 0),
    );
    contact.lastOrderAt = maxDate(contact.lastOrderAt, touchpoint.happenedAt);
  } else if (touchpoint.eventType === "order_created") {
    contact.lastOrderAt = maxDate(contact.lastOrderAt, touchpoint.happenedAt);
  }

  const attribution = buildAttributionSnapshot({
    channel: touchpoint.channel,
    source: touchpoint.source || touchpoint.campaign?.source || "",
    pageUrl: touchpoint.pageUrl,
    referrer: touchpoint.referrer,
    sessionId: touchpoint.sessionId,
    happenedAt: touchpoint.happenedAt,
    campaign: touchpoint.campaign,
  });

  if (attribution) {
    if (!contact.firstAttribution?.happenedAt) {
      contact.firstAttribution = attribution;
    }
    contact.lastAttribution = attribution;
  }
};

const buildInteractionDocument = (contact, touchpoint) => ({
  contact: contact._id,
  user: ensureObjectId(touchpoint.userId),
  channel: touchpoint.channel,
  eventType: touchpoint.eventType,
  eventName: touchpoint.eventName,
  direction: touchpoint.direction,
  message: touchpoint.message,
  pageUrl: touchpoint.pageUrl,
  referrer: touchpoint.referrer,
  sessionId: touchpoint.sessionId,
  orderId: ensureObjectId(touchpoint.orderId),
  supportTicketId: ensureObjectId(touchpoint.supportTicketId),
  newsletterSource: touchpoint.newsletterSource,
  campaign: touchpoint.campaign || undefined,
  happenedAt: touchpoint.happenedAt,
  idempotencyKey: touchpoint.idempotencyKey || null,
  metadata: touchpoint.metadata,
});

export const recordCrmTouchpoint = async (input = {}, options = {}) => {
  const touchpoint = buildNormalizedTouchpoint(input, options);

  if (touchpoint.idempotencyKey) {
    const existingInteraction = await CrmInteraction.findOne({
      idempotencyKey: touchpoint.idempotencyKey,
    }).populate("contact");
    if (existingInteraction?.contact) {
      return {
        created: false,
        deduped: true,
        contact: existingInteraction.contact,
        interaction: existingInteraction,
      };
    }
  }

  const contactCandidates = await resolveContactCandidates({
    userId: touchpoint.userId,
    email: touchpoint.email,
    phone: touchpoint.phone,
    sessionId: touchpoint.sessionId,
  });
  let contact = pickContact(contactCandidates);

  if (!contact) {
    contact = new CrmContact({
      user: ensureObjectId(touchpoint.userId),
      sessionId: touchpoint.sessionId || null,
      name: touchpoint.name,
      email: touchpoint.email || null,
      phone: touchpoint.phone || null,
      sourceChannel: touchpoint.channel,
      lifecycleStage: touchpoint.lifecycleStage || "lead",
      status: touchpoint.status || "open",
      tags: touchpoint.tags,
      firstSeenAt: touchpoint.happenedAt,
      lastSeenAt: touchpoint.happenedAt,
      metadata: touchpoint.metadata,
      consent: {
        email: touchpoint.consent.email ?? null,
        whatsapp: touchpoint.consent.whatsapp ?? null,
        sms: touchpoint.consent.sms ?? null,
        push: touchpoint.consent.push ?? null,
      },
    });
  } else {
    applyIdentityUpdates(contact, touchpoint);
  }

  try {
    await contact.save();
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
    const retryCandidates = await resolveContactCandidates({
      userId: touchpoint.userId,
      email: touchpoint.email,
      phone: touchpoint.phone,
      sessionId: touchpoint.sessionId,
    });
    contact = pickContact(retryCandidates);
    if (!contact) throw error;
    applyIdentityUpdates(contact, touchpoint);
    await contact.save();
  }

  let interaction = null;
  try {
    interaction = await CrmInteraction.create(buildInteractionDocument(contact, touchpoint));
  } catch (error) {
    if (touchpoint.idempotencyKey && isDuplicateKeyError(error)) {
      const existingInteraction = await CrmInteraction.findOne({
        idempotencyKey: touchpoint.idempotencyKey,
      }).populate("contact");
      if (existingInteraction?.contact) {
        return {
          created: false,
          deduped: true,
          contact: existingInteraction.contact,
          interaction: existingInteraction,
        };
      }
    }
    throw error;
  }

  applyIdentityUpdates(contact, touchpoint);
  applyContactMetricsFromInteraction(contact, touchpoint);
  await contact.save();

  return {
    created: true,
    deduped: false,
    contact,
    interaction,
  };
};

export const captureCrmTouchpointSafely = async (input = {}, options = {}) => {
  try {
    return await recordCrmTouchpoint(input, options);
  } catch (error) {
    console.error("CRM touchpoint capture failed:", {
      message: error?.message || String(error),
      eventType: input?.eventType || input?.type || "",
      channel: input?.channel || "",
      idempotencyKey: input?.idempotencyKey || "",
    });
    return null;
  }
};
