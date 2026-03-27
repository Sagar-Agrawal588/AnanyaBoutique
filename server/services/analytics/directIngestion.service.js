import { ensureAnalyticsIndexes, getAnalyticsDb } from "./analyticsDb.service.js";

const RAW_EVENTS_TTL_DAYS = Math.max(Number(process.env.ANALYTICS_RAW_EVENTS_TTL_DAYS || 90), 1);

const toDate = (value) => {
  const parsed = new Date(value || Date.now());
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
};

const toSafeString = (value, fallback = "") => String(value ?? fallback).trim();

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const shouldTrackAsPageView = (eventType) => String(eventType || "").trim().toLowerCase() === "page_view_started";

const shouldTrackAsProductEvent = (eventType) => {
  const normalized = String(eventType || "").trim().toLowerCase();
  return ["product_view", "hover_duration", "product_click"].includes(normalized);
};

const shouldTrackAsCartEvent = (eventType) => {
  const normalized = String(eventType || "").trim().toLowerCase();
  return ["add_to_cart", "remove_from_cart", "checkout_started"].includes(normalized);
};

const shouldTrackAsPurchase = (eventType) => String(eventType || "").trim().toLowerCase() === "purchase_completed";

const normalizeEvent = (event = {}) => {
  const timestamp = toDate(event.timestamp);
  const eventType = toSafeString(event.eventType || event.event_name).toLowerCase();
  const metadata = event?.metadata && typeof event.metadata === "object" ? event.metadata : {};

  const productId =
    toSafeString(metadata.productId || metadata.product_id || metadata.id || metadata?.product?._id || metadata?.product?.id) ||
    null;
  const productName =
    toSafeString(metadata.productName || metadata.name || metadata?.product?.name) || null;

  return {
    eventId: toSafeString(event.eventId),
    eventType,
    sessionId: toSafeString(event.sessionId || event.session_id),
    userId: toSafeString(event.userId || event.user_id) || null,
    timestamp,
    pageUrl: toSafeString(event.pageUrl || event.page || ""),
    referrer: toSafeString(event.referrer || ""),
    ipAddress: toSafeString(event.ipAddress || "0.0.0.0"),
    userAgent: toSafeString(event.userAgent || "unknown"),
    deviceType: toSafeString(event.deviceType || "desktop"),
    browser: toSafeString(event.browser || "Other"),
    location:
      event?.location && typeof event.location === "object"
        ? {
            country: toSafeString(event.location.country || "unknown") || "unknown",
            city: toSafeString(event.location.city || "unknown") || "unknown",
          }
        : { country: "unknown", city: "unknown" },
    metadata,
    productId,
    productName,
    orderId: toSafeString(metadata.orderId || "") || null,
    amount: toFiniteNumber(metadata.revenue ?? metadata.total ?? metadata.amount, 0),
    quantity: toFiniteNumber(metadata.quantity, 0),
  };
};

export const persistTrackingBatchDirect = async ({
  sessionId,
  events = [],
  source = "tracking_api",
  consent = "unknown",
}) => {
  if (!Array.isArray(events) || events.length === 0) {
    return { insertedEvents: 0, duplicateEvents: 0, mode: "direct" };
  }

  await ensureAnalyticsIndexes();
  const db = await getAnalyticsDb();

  const processedAt = new Date();
  const expireAt = new Date(processedAt.getTime() + RAW_EVENTS_TTL_DAYS * 24 * 60 * 60 * 1000);
  const normalizedEvents = events.map((event) => normalizeEvent({ ...event, sessionId }));

  const rawOps = normalizedEvents.map((event) => ({
    updateOne: {
      filter: { eventId: event.eventId },
      update: {
        $setOnInsert: {
          eventId: event.eventId,
          eventType: event.eventType,
          sessionId: event.sessionId,
          userId: event.userId,
          timestamp: event.timestamp,
          pageUrl: event.pageUrl,
          referrer: event.referrer,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          deviceType: event.deviceType,
          browser: event.browser,
          location: event.location,
          metadata: event.metadata,
          consent,
          source,
          expiresAt: expireAt,
          createdAt: processedAt,
        },
        $set: {
          updatedAt: processedAt,
        },
      },
      upsert: true,
    },
  }));

  const writeResult = await db.collection("events_raw").bulkWrite(rawOps, {
    ordered: false,
  });

  const upsertedIndexes = new Set(Object.keys(writeResult?.upsertedIds || {}).map((key) => Number(key)));
  const freshEvents = normalizedEvents.filter((_, index) => upsertedIndexes.has(index));
  const duplicateEvents = Math.max(normalizedEvents.length - freshEvents.length, 0);

  if (freshEvents.length === 0) {
    return { insertedEvents: 0, duplicateEvents, mode: "direct" };
  }

  const sessionOps = [];
  const productOps = [];
  const cartOps = [];
  const purchaseOps = [];

  for (const event of freshEvents) {
    sessionOps.push({
      updateOne: {
        filter: { sessionId: event.sessionId },
        update: {
          $setOnInsert: {
            sessionId: event.sessionId,
            createdAt: processedAt,
          },
          $set: {
            updatedAt: processedAt,
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            deviceType: event.deviceType,
            browser: event.browser,
            location: event.location,
            isActive: event.eventType !== "session_end",
            ...(event.userId ? { userId: event.userId } : {}),
          },
          $min: { startedAt: event.timestamp },
          $max: { lastSeenAt: event.timestamp },
          $inc: {
            eventCount: 1,
            pageViews: shouldTrackAsPageView(event.eventType) ? 1 : 0,
          },
        },
        upsert: true,
      },
    });

    if (shouldTrackAsProductEvent(event.eventType)) {
      productOps.push({
        updateOne: {
          filter: { eventId: event.eventId },
          update: {
            $setOnInsert: {
              eventId: event.eventId,
              eventType: event.eventType,
              sessionId: event.sessionId,
              userId: event.userId,
              timestamp: event.timestamp,
              pageUrl: event.pageUrl,
              metadata: event.metadata,
              productId: event.productId,
              productName: event.productName,
              createdAt: processedAt,
              updatedAt: processedAt,
            },
          },
          upsert: true,
        },
      });
    }

    if (shouldTrackAsCartEvent(event.eventType)) {
      cartOps.push({
        updateOne: {
          filter: { eventId: event.eventId },
          update: {
            $setOnInsert: {
              eventId: event.eventId,
              eventType: event.eventType,
              sessionId: event.sessionId,
              userId: event.userId,
              timestamp: event.timestamp,
              pageUrl: event.pageUrl,
              metadata: event.metadata,
              productId: event.productId,
              productName: event.productName,
              quantity: event.quantity,
              createdAt: processedAt,
              updatedAt: processedAt,
            },
          },
          upsert: true,
        },
      });
    }

    if (shouldTrackAsPurchase(event.eventType)) {
      purchaseOps.push({
        updateOne: {
          filter: { eventId: event.eventId },
          update: {
            $setOnInsert: {
              eventId: event.eventId,
              sessionId: event.sessionId,
              userId: event.userId,
              timestamp: event.timestamp,
              orderId: event.orderId,
              amount: event.amount,
              currency: toSafeString(event.metadata?.currency || "INR") || "INR",
              paymentMethod: toSafeString(event.metadata?.paymentMethod || "unknown") || "unknown",
              products: Array.isArray(event.metadata?.items) ? event.metadata.items.slice(0, 200) : [],
              createdAt: processedAt,
              updatedAt: processedAt,
            },
          },
          upsert: true,
        },
      });
    }
  }

  if (sessionOps.length) {
    await db.collection("sessions").bulkWrite(sessionOps, { ordered: false });
  }
  if (productOps.length) {
    await db.collection("product_events").bulkWrite(productOps, { ordered: false });
  }
  if (cartOps.length) {
    await db.collection("cart_events").bulkWrite(cartOps, { ordered: false });
  }
  if (purchaseOps.length) {
    await db.collection("purchases").bulkWrite(purchaseOps, { ordered: false });
  }

  return {
    insertedEvents: freshEvents.length,
    duplicateEvents,
    mode: "direct",
  };
};

export const hasActiveAnalyticsWorker = async ({ staleThresholdMs = 60_000 } = {}) => {
  await ensureAnalyticsIndexes();
  const db = await getAnalyticsDb();

  const activeThreshold = new Date(Date.now() - Math.max(Number(staleThresholdMs) || 60_000, 1_000));
  const count = await db.collection("worker_health").countDocuments({
    updatedAt: { $gte: activeThreshold },
  });

  return count > 0;
};
