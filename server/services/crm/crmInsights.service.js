import CrmContact from "../../models/crmContact.model.js";
import CrmInteraction from "../../models/crmInteraction.model.js";
import OrderModel from "../../models/order.model.js";
import { normalizeOrderForResponse } from "../../utils/calculateOrderTotal.js";
import {
  buildCrmValidationError,
  isPlainObject,
  normalizeBooleanLike,
  normalizeChannel,
  normalizeContactStatus,
  normalizeEmail,
  normalizeLifecycleStage,
  normalizeObjectId,
  normalizePhone,
  normalizeTagList,
  sanitizeText,
} from "./channelResolver.service.js";

const escapeRegExp = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizePageLimit = (value, fallback = 20, max = 100) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), 1), max);
};

const normalizePage = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(Math.floor(parsed), 1);
};

const normalizePhoneDigits = (value) => String(value || "").replace(/\D/g, "");

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

const toPlainContact = (contact = {}) => ({
  id: String(contact?._id || ""),
  userId:
    typeof contact?.user === "object" && contact?.user?._id
      ? String(contact.user._id)
      : String(contact?.user || ""),
  name: contact?.name || "",
  email: contact?.email || "",
  phone: contact?.phone || "",
  sessionId: contact?.sessionId || "",
  sourceChannel: contact?.sourceChannel || "website",
  lifecycleStage: contact?.lifecycleStage || "lead",
  status: contact?.status || "open",
  tags: Array.isArray(contact?.tags) ? contact.tags : [],
  consent: contact?.consent || {},
  firstSeenAt: contact?.firstSeenAt || null,
  lastSeenAt: contact?.lastSeenAt || null,
  firstAttribution: contact?.firstAttribution || null,
  lastAttribution: contact?.lastAttribution || null,
  totalOrders: Number(contact?.totalOrders || 0),
  totalSpent: Number(contact?.totalSpent || 0),
  interactionCount: Number(contact?.interactionCount || 0),
  lastOrderAt: contact?.lastOrderAt || null,
  lastInteractionAt: contact?.lastInteractionAt || null,
  metadata: isPlainObject(contact?.metadata) ? contact.metadata : {},
  createdAt: contact?.createdAt || null,
  updatedAt: contact?.updatedAt || null,
});

const toPlainInteraction = (interaction = {}) => ({
  id: String(interaction?._id || ""),
  contactId:
    typeof interaction?.contact === "object" && interaction?.contact?._id
      ? String(interaction.contact._id)
      : String(interaction?.contact || ""),
  userId:
    typeof interaction?.user === "object" && interaction?.user?._id
      ? String(interaction.user._id)
      : String(interaction?.user || ""),
  channel: interaction?.channel || "website",
  eventType: interaction?.eventType || "custom",
  eventName: interaction?.eventName || "",
  direction: interaction?.direction || "system",
  message: interaction?.message || "",
  pageUrl: interaction?.pageUrl || "",
  referrer: interaction?.referrer || "",
  sessionId: interaction?.sessionId || "",
  orderId:
    typeof interaction?.orderId === "object" && interaction?.orderId?._id
      ? String(interaction.orderId._id)
      : String(interaction?.orderId || ""),
  supportTicketId:
    typeof interaction?.supportTicketId === "object" &&
    interaction?.supportTicketId?._id
      ? String(interaction.supportTicketId._id)
      : String(interaction?.supportTicketId || ""),
  newsletterSource: interaction?.newsletterSource || "",
  campaign: interaction?.campaign || {},
  happenedAt: interaction?.happenedAt || null,
  metadata: isPlainObject(interaction?.metadata) ? interaction.metadata : {},
  createdAt: interaction?.createdAt || null,
  updatedAt: interaction?.updatedAt || null,
  contact:
    typeof interaction?.contact === "object" && interaction?.contact?._id
      ? {
          id: String(interaction.contact._id),
          name: interaction.contact.name || "",
          email: interaction.contact.email || "",
          phone: interaction.contact.phone || "",
          lifecycleStage: interaction.contact.lifecycleStage || "lead",
          status: interaction.contact.status || "open",
        }
      : null,
});

const toPlainRecentOrder = (order = {}) => {
  const normalizedOrder = normalizeOrderForResponse(order);
  return {
    id: String(normalizedOrder?._id || normalizedOrder?.id || ""),
    displayOrderId:
      normalizedOrder?.displayOrderId || normalizedOrder?.orderNumber || "N/A",
    createdAt: normalizedOrder?.createdAt || null,
    orderStatus: normalizedOrder?.order_status || "pending",
    paymentStatus: normalizedOrder?.payment_status || "pending",
    shipmentStatus:
      normalizedOrder?.shipmentStatus || normalizedOrder?.shipment_status || "pending",
    awbNumber: normalizedOrder?.awbNumber || normalizedOrder?.awb_number || "",
    trackingUrl: normalizedOrder?.trackingUrl || "",
    courierName:
      normalizedOrder?.courierName ||
      normalizedOrder?.shipping_provider ||
      "Xpressbees",
    totalAmount:
      Number(
        normalizedOrder?.pricing?.total ??
          normalizedOrder?.finalAmount ??
          normalizedOrder?.totalAmt ??
          0,
      ) || 0,
  };
};

const getCrmContactRecentOrders = async (contact, limit = 6) => {
  const clauses = [];
  const normalizedUserId =
    typeof contact?.user === "object" && contact?.user?._id
      ? normalizeObjectId(contact.user._id)
      : normalizeObjectId(contact?.user);
  const normalizedEmail = normalizeEmail(contact?.email || "");
  const phoneVariants = buildPhoneSearchVariants(contact?.phone || "");

  if (normalizedUserId) {
    clauses.push({ user: normalizedUserId });
  }

  if (normalizedEmail) {
    const emailPattern = new RegExp(`^${escapeRegExp(normalizedEmail)}$`, "i");
    clauses.push({ "billingDetails.email": emailPattern });
    clauses.push({ "guestDetails.email": emailPattern });
    clauses.push({ "deliveryAddressSnapshot.email": emailPattern });
  }

  for (const phone of phoneVariants) {
    clauses.push({ "billingDetails.phone": phone });
    clauses.push({ "guestDetails.phone": phone });
    clauses.push({ "deliveryAddressSnapshot.order_mobile": phone });
  }

  if (clauses.length === 0) {
    return [];
  }

  const orders = await OrderModel.find({ $or: clauses })
    .select(
      [
        "_id",
        "orderNumber",
        "displayOrderId",
        "createdAt",
        "order_status",
        "payment_status",
        "shipment_status",
        "shipmentStatus",
        "awbNumber",
        "awb_number",
        "trackingUrl",
        "shipping_provider",
        "courierName",
        "finalAmount",
        "totalAmt",
      ].join(" "),
    )
    .sort({ createdAt: -1 })
    .limit(Math.max(Number(limit || 0), 1))
    .lean();

  return orders.map(toPlainRecentOrder);
};

export const getCrmOverview = async () => {
  const [
    totalContacts,
    totalCustomers,
    openLeads,
    activeLast30Days,
    stageBreakdown,
    statusBreakdown,
    channelBreakdown,
    recentInteractions,
  ] = await Promise.all([
    CrmContact.countDocuments({}),
    CrmContact.countDocuments({
      lifecycleStage: { $in: ["customer", "repeat_customer"] },
    }),
    CrmContact.countDocuments({
      lifecycleStage: { $in: ["lead", "prospect"] },
      status: { $ne: "lost" },
    }),
    CrmContact.countDocuments({
      lastInteractionAt: {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    }),
    CrmContact.aggregate([
      { $group: { _id: "$lifecycleStage", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),
    CrmContact.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),
    CrmContact.aggregate([
      { $group: { _id: "$sourceChannel", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),
    CrmInteraction.find({})
      .sort({ happenedAt: -1, createdAt: -1 })
      .limit(12)
      .populate("contact", "name email phone lifecycleStage status")
      .lean(),
  ]);

  return {
    summary: {
      totalContacts,
      totalCustomers,
      openLeads,
      activeLast30Days,
    },
    stageBreakdown: stageBreakdown.map((entry) => ({
      stage: entry._id || "unknown",
      count: Number(entry.count || 0),
    })),
    statusBreakdown: statusBreakdown.map((entry) => ({
      status: entry._id || "unknown",
      count: Number(entry.count || 0),
    })),
    channelBreakdown: channelBreakdown.map((entry) => ({
      channel: entry._id || "unknown",
      count: Number(entry.count || 0),
    })),
    recentInteractions: recentInteractions.map(toPlainInteraction),
  };
};

export const getCrmContacts = async (query = {}) => {
  const page = normalizePage(query.page);
  const limit = normalizePageLimit(query.limit, 20, 100);
  const skip = (page - 1) * limit;
  const filter = {};

  const channel = normalizeChannel(query.channel);
  if (String(query.channel || "").trim() && !channel) {
    throw buildCrmValidationError("Invalid CRM channel filter.");
  }
  if (channel) {
    filter.sourceChannel = channel;
  }

  const lifecycleStage = normalizeLifecycleStage(query.lifecycleStage);
  if (String(query.lifecycleStage || "").trim() && !lifecycleStage) {
    throw buildCrmValidationError("Invalid CRM lifecycle stage filter.");
  }
  if (lifecycleStage) {
    filter.lifecycleStage = lifecycleStage;
  }

  const status = normalizeContactStatus(query.status);
  if (String(query.status || "").trim() && !status) {
    throw buildCrmValidationError("Invalid CRM status filter.");
  }
  if (status) {
    filter.status = status;
  }

  const tag = sanitizeText(query.tag || "", { maxLength: 40 }).toLowerCase();
  if (tag) {
    filter.tags = tag;
  }

  const search = sanitizeText(query.q || "", { maxLength: 120 });
  if (search) {
    const regex = new RegExp(escapeRegExp(search), "i");
    filter.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { tags: regex },
    ];
  }

  const [contacts, total] = await Promise.all([
    CrmContact.find(filter)
      .sort({ lastInteractionAt: -1, updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "_id name email mobile")
      .lean(),
    CrmContact.countDocuments(filter),
  ]);

  return {
    contacts: contacts.map(toPlainContact),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
};

export const getCrmContactTimeline = async (contactId, query = {}) => {
  const normalizedContactId = normalizeObjectId(contactId);
  if (!normalizedContactId) {
    throw buildCrmValidationError("Valid contactId is required.");
  }

  const page = normalizePage(query.page);
  const limit = normalizePageLimit(query.limit, 25, 100);
  const skip = (page - 1) * limit;

  const contact = await CrmContact.findById(normalizedContactId).lean();
  if (!contact) {
    throw Object.assign(new Error("CRM contact not found."), { statusCode: 404 });
  }

  const [interactions, total, recentOrders] = await Promise.all([
    CrmInteraction.find({ contact: normalizedContactId })
      .sort({ happenedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CrmInteraction.countDocuments({ contact: normalizedContactId }),
    getCrmContactRecentOrders(contact),
  ]);

  return {
    contact: toPlainContact(contact),
    interactions: interactions.map(toPlainInteraction),
    recentOrders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
};

export const updateCrmContactAdmin = async (contactId, payload = {}) => {
  const normalizedContactId = normalizeObjectId(contactId);
  if (!normalizedContactId) {
    throw buildCrmValidationError("Valid contactId is required.");
  }

  const contact = await CrmContact.findById(normalizedContactId);
  if (!contact) {
    throw Object.assign(new Error("CRM contact not found."), { statusCode: 404 });
  }

  let hasChanges = false;

  if (Object.prototype.hasOwnProperty.call(payload, "lifecycleStage")) {
    const lifecycleStage = normalizeLifecycleStage(payload.lifecycleStage);
    if (!lifecycleStage) {
      throw buildCrmValidationError("Invalid CRM lifecycle stage supplied.");
    }
    contact.lifecycleStage = lifecycleStage;
    hasChanges = true;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "status")) {
    const status = normalizeContactStatus(payload.status);
    if (!status) {
      throw buildCrmValidationError("Invalid CRM contact status supplied.");
    }
    contact.status = status;
    hasChanges = true;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "sourceChannel")) {
    const sourceChannel = normalizeChannel(payload.sourceChannel);
    if (!sourceChannel) {
      throw buildCrmValidationError("Invalid CRM source channel supplied.");
    }
    contact.sourceChannel = sourceChannel;
    hasChanges = true;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "tags")) {
    contact.tags = normalizeTagList(payload.tags);
    hasChanges = true;
  }

  if (isPlainObject(payload.consent)) {
    contact.consent = {
      email:
        normalizeBooleanLike(payload.consent.email) ?? contact.consent?.email ?? null,
      whatsapp:
        normalizeBooleanLike(payload.consent.whatsapp) ??
        contact.consent?.whatsapp ??
        null,
      sms: normalizeBooleanLike(payload.consent.sms) ?? contact.consent?.sms ?? null,
      push:
        normalizeBooleanLike(payload.consent.push) ?? contact.consent?.push ?? null,
    };
    hasChanges = true;
  }

  if (isPlainObject(payload.metadata)) {
    contact.metadata = {
      ...(isPlainObject(contact.metadata) ? contact.metadata : {}),
      ...payload.metadata,
    };
    hasChanges = true;
  }

  if (!hasChanges) {
    throw buildCrmValidationError(
      "No valid CRM fields supplied. Update lifecycleStage, status, sourceChannel, tags, consent, or metadata.",
    );
  }

  await contact.save();
  return toPlainContact(contact.toObject());
};
