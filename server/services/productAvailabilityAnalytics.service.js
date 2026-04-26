import mongoose from "mongoose";
import AnalyticsEventModel from "../models/analyticsEvent.model.js";
import ProductModel from "../models/product.model.js";
import StockNotificationModel from "../models/stockNotification.model.js";
import { logger } from "../utils/errorHandler.js";

const NOTIFY_CLICK_EVENT = "notify_click";
const STOCK_OUT_EVENT = "stock_out";
const RESTOCK_CONVERSION_EVENT = "restock_conversion";

const normalizeObjectIdString = (value) => {
  const normalized = String(value || "").trim();
  return normalized && mongoose.Types.ObjectId.isValid(normalized)
    ? normalized
    : "";
};

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getAvailableFromEntry = (entry) => {
  const stock = Number(entry?.stock_quantity ?? entry?.stock ?? 0);
  const reserved = Number(entry?.reserved_quantity ?? 0);
  return Math.max(stock - reserved, 0);
};

const getVariantFromProduct = (product, variantId) => {
  if (!product || !variantId) return null;
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  return (
    variants.find(
      (variant) => String(variant?._id || "") === String(variantId || ""),
    ) || null
  );
};

const resolveAvailability = ({ product, variantId = null }) => {
  const normalizedVariantId = normalizeObjectIdString(variantId);
  if (normalizedVariantId) {
    return getAvailableFromEntry(
      getVariantFromProduct(product, normalizedVariantId) || {},
    );
  }

  return getAvailableFromEntry(product || {});
};

const toStockOutReason = (source = "") => {
  const normalized = String(source || "")
    .trim()
    .toUpperCase();

  if (
    normalized.includes("ADMIN") ||
    normalized.includes("PRODUCT_UPDATE") ||
    normalized.includes("STOCK_UPDATE")
  ) {
    return "admin_update";
  }

  if (
    normalized.includes("PAYMENT") ||
    normalized.includes("ORDER") ||
    normalized.includes("CONFIRM") ||
    normalized.includes("WEBHOOK")
  ) {
    return "order";
  }

  return "reservation";
};

const createAnalyticsEvent = async ({
  eventType,
  productId,
  userId = null,
  email = "",
  metadata = {},
}) => {
  const normalizedProductId = normalizeObjectIdString(productId);
  if (!normalizedProductId || !eventType) return null;

  try {
    return await AnalyticsEventModel.create({
      event_type: String(eventType).trim(),
      product_id: new mongoose.Types.ObjectId(normalizedProductId),
      user_id: normalizeObjectIdString(userId)
        ? new mongoose.Types.ObjectId(normalizeObjectIdString(userId))
        : null,
      email: normalizeEmail(email),
      metadata:
        metadata && typeof metadata === "object" && !Array.isArray(metadata)
          ? metadata
          : {},
    });
  } catch (error) {
    logger.warn("productAnalytics", "Failed to persist analytics event", {
      eventType,
      productId: normalizedProductId,
      userId: normalizeObjectIdString(userId) || null,
      email: normalizeEmail(email) || null,
      error: error?.message || String(error),
    });
    return null;
  }
};

export const trackNotifyClickEvent = async ({
  productId,
  variantId = null,
  userId = null,
  email = "",
  status = "created",
}) =>
  createAnalyticsEvent({
    eventType: NOTIFY_CLICK_EVENT,
    productId,
    userId,
    email,
    metadata: {
      variant_id: normalizeObjectIdString(variantId) || null,
      status: String(status || "created").trim().toLowerCase(),
    },
  });

export const trackStockOutEventIfNeeded = async ({
  productBefore,
  productAfter,
  variantId = null,
  source = "SYSTEM",
}) => {
  const productId =
    normalizeObjectIdString(productAfter?._id) ||
    normalizeObjectIdString(productBefore?._id);
  if (!productId) return null;

  const beforeAvailability = resolveAvailability({
    product: productBefore,
    variantId,
  });
  const afterAvailability = resolveAvailability({
    product: productAfter,
    variantId,
  });

  if (!(beforeAvailability > 0 && afterAvailability <= 0)) {
    return null;
  }

  return createAnalyticsEvent({
    eventType: STOCK_OUT_EVENT,
    productId,
    metadata: {
      variant_id: normalizeObjectIdString(variantId) || null,
      source: String(source || "SYSTEM").trim(),
      reason: toStockOutReason(source),
      available_before: beforeAvailability,
      available_after: afterAvailability,
    },
  });
};

export const createRestockConversionEvent = async ({
  productId,
  variantId = null,
  restockBatchKey,
  source = "INVENTORY_AVAILABLE",
  notifiedUsersCount = 0,
}) =>
  createAnalyticsEvent({
    eventType: RESTOCK_CONVERSION_EVENT,
    productId,
    metadata: {
      variant_id: normalizeObjectIdString(variantId) || null,
      restock_batch_key: String(restockBatchKey || "").trim(),
      source: String(source || "INVENTORY_AVAILABLE").trim(),
      notified_users_count: Math.max(Number(notifiedUsersCount || 0), 0),
      converted_users_count: 0,
    },
  });

export const incrementRestockConversionCount = async ({
  productId,
  restockBatchKey,
  incrementBy = 1,
}) => {
  const normalizedProductId = normalizeObjectIdString(productId);
  const normalizedBatchKey = String(restockBatchKey || "").trim();
  if (!normalizedProductId || !normalizedBatchKey) return null;

  try {
    return await AnalyticsEventModel.findOneAndUpdate(
      {
        event_type: RESTOCK_CONVERSION_EVENT,
        product_id: new mongoose.Types.ObjectId(normalizedProductId),
        "metadata.restock_batch_key": normalizedBatchKey,
      },
      {
        $inc: {
          "metadata.converted_users_count": Math.max(
            Number(incrementBy || 1),
            1,
          ),
        },
      },
      { new: true },
    ).lean();
  } catch (error) {
    logger.warn("productAnalytics", "Failed to increment restock conversion", {
      productId: normalizedProductId,
      restockBatchKey: normalizedBatchKey,
      error: error?.message || String(error),
    });
    return null;
  }
};

const resolveOrderEmail = (order) =>
  normalizeEmail(
    order?.billingDetails?.email ||
      order?.guestDetails?.email ||
      order?.deliveryAddressSnapshot?.email ||
      "",
  );

export const trackRestockConversionsForOrder = async (
  order,
  { source = "ORDER_PAID" } = {},
) => {
  if (!order) return { matched: 0, converted: 0 };

  const userId = normalizeObjectIdString(order?.user);
  const email = resolveOrderEmail(order);
  const orderId = normalizeObjectIdString(order?._id);
  const items = Array.isArray(order?.products) ? order.products : [];

  if (!items.length || (!userId && !email)) {
    return { matched: 0, converted: 0 };
  }

  let matched = 0;
  let converted = 0;

  for (const item of items) {
    const productId = normalizeObjectIdString(item?.productId);
    if (!productId) continue;

    const variantId = normalizeObjectIdString(item?.variantId) || null;
    const filter = {
      product_id: new mongoose.Types.ObjectId(productId),
      restock_batch_key: { $ne: null, $ne: "" },
      converted_at: null,
      $or: [
        ...(userId ? [{ user_id: new mongoose.Types.ObjectId(userId) }] : []),
        ...(email ? [{ email }] : []),
      ],
    };

    if (variantId) {
      filter.variant_id = new mongoose.Types.ObjectId(variantId);
    } else {
      filter.variant_id = null;
    }

    const notifications = await StockNotificationModel.find(filter)
      .select("_id product_id restock_batch_key")
      .lean();

    if (!notifications.length) {
      continue;
    }

    matched += notifications.length;

    for (const notification of notifications) {
      const updateResult = await StockNotificationModel.updateOne(
        {
          _id: notification._id,
          converted_at: null,
        },
        {
          $set: {
            converted_at: new Date(),
            converted_order_id: orderId
              ? new mongoose.Types.ObjectId(orderId)
              : null,
            conversion_source: String(source || "ORDER_PAID").trim(),
          },
        },
      );

      if (updateResult.modifiedCount === 1) {
        converted += 1;
        await incrementRestockConversionCount({
          productId,
          restockBatchKey: notification?.restock_batch_key,
        });
      }
    }
  }

  return { matched, converted };
};

export const getAdminProductDemandSummary = async () => {
  const rows = await StockNotificationModel.aggregate([
    {
      $match: {
        notified: false,
        notification_status: "pending",
      },
    },
    {
      $group: {
        _id: "$product_id",
        waiting_users_count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: ProductModel.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    {
      $project: {
        _id: 0,
        product_id: "$_id",
        product_name: {
          $ifNull: [{ $arrayElemAt: ["$product.name", 0] }, "Unknown Product"],
        },
        waiting_users_count: 1,
      },
    },
    { $sort: { waiting_users_count: -1, product_name: 1 } },
  ]);

  return rows;
};
