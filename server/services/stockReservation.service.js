import mongoose from "mongoose";
import StockReservationModel from "../models/stockReservation.model.js";

const toObjectIdOrNull = (value) => {
  const candidate =
    value && typeof value === "object" && value._id ? value._id : value;
  const normalized = String(candidate || "").trim();
  return mongoose.Types.ObjectId.isValid(normalized) ? candidate : null;
};

const normalizeOrderItems = (order) => {
  const items = Array.isArray(order?.products) ? order.products : [];

  return items
    .map((item) => {
      const productId = toObjectIdOrNull(item?.productId || item?.product);
      const variantId = toObjectIdOrNull(item?.variantId || item?.variant);
      const quantity = Math.max(Number(item?.quantity || 0), 0);
      if (!productId || quantity <= 0) {
        return null;
      }

      return {
        productId,
        variantId: variantId || null,
        quantity,
      };
    })
    .filter(Boolean);
};

const buildOrderScope = (order) => {
  const orderId = toObjectIdOrNull(order?._id);
  if (!orderId) return null;

  return {
    orderId,
    userId: toObjectIdOrNull(order?.user) || null,
    sessionId: String(order?.trackingSessionId || "").trim(),
  };
};

export const syncActiveStockReservations = async (
  order,
  { source = "ORDER_CREATE" } = {},
) => {
  const scope = buildOrderScope(order);
  if (!scope) return { status: "noop", reason: "missing_order_id" };

  const items = normalizeOrderItems(order);
  if (items.length === 0) {
    await StockReservationModel.deleteMany({ orderId: scope.orderId });
    return { status: "noop", reason: "no_items" };
  }

  const activeKeys = new Set();
  const expiresAt = order?.reservationExpiresAt || null;

  for (const item of items) {
    activeKeys.add(`${String(item.productId)}::${String(item.variantId || "")}`);
    await StockReservationModel.updateOne(
      {
        orderId: scope.orderId,
        productId: item.productId,
        variantId: item.variantId,
      },
      {
        $set: {
          userId: scope.userId,
          sessionId: scope.sessionId,
          quantity: item.quantity,
          expiresAt,
          status: "ACTIVE",
          source,
        },
      },
      { upsert: true },
    );
  }

  const existingReservations = await StockReservationModel.find({
    orderId: scope.orderId,
  })
    .select("_id productId variantId")
    .lean();

  const staleIds = existingReservations
    .filter((reservation) => {
      const key = `${String(reservation?.productId || "")}::${String(
        reservation?.variantId || "",
      )}`;
      return !activeKeys.has(key);
    })
    .map((reservation) => reservation._id);

  if (staleIds.length > 0) {
    await StockReservationModel.deleteMany({ _id: { $in: staleIds } });
  }

  return { status: "active", count: items.length };
};

export const markOrderReservationsCompleted = async (
  order,
  { source = "PAYMENT_SUCCESS" } = {},
) => {
  const scope = buildOrderScope(order);
  if (!scope) return { status: "noop", reason: "missing_order_id" };

  await StockReservationModel.updateMany(
    { orderId: scope.orderId },
    {
      $set: {
        status: "COMPLETED",
        expiresAt: null,
        source,
      },
    },
  );

  return { status: "completed" };
};

export const markOrderReservationsExpired = async (
  order,
  { source = "RESERVATION_EXPIRED" } = {},
) => {
  const scope = buildOrderScope(order);
  if (!scope) return { status: "noop", reason: "missing_order_id" };

  await StockReservationModel.updateMany(
    { orderId: scope.orderId, status: { $ne: "COMPLETED" } },
    {
      $set: {
        status: "EXPIRED",
        expiresAt: null,
        source,
      },
    },
  );

  return { status: "expired" };
};
