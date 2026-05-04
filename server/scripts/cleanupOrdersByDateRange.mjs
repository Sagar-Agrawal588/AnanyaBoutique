import mongoose from "mongoose";
import connectDb from "../config/connectDb.js";
import InvoiceModel from "../models/invoice.model.js";
import OrderModel from "../models/order.model.js";
import { getAnalyticsDb } from "../services/analytics/analyticsDb.service.js";

const DEFAULT_START = "2026-05-03";
const DEFAULT_END = "2026-05-04";
const DEFAULT_TZ = "IST";

const parseArg = (name) => {
  const prefix = `--${name}=`;
  const entry = process.argv.find((value) => value.startsWith(prefix));
  if (!entry) return "";
  return entry.slice(prefix.length).trim();
};

const parseDateParts = (value) => {
  const match = /^\d{4}-\d{2}-\d{2}$/.exec(String(value || "").trim());
  if (!match) return null;
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }
  return { year, month, day };
};

const addDaysUtc = (date, days) => {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const resolveTimezoneOffsetMinutes = (tz) => {
  const normalized = String(tz || "")
    .trim()
    .toUpperCase();
  if (normalized === "IST") return 330;
  if (normalized === "UTC") return 0;
  return 330;
};

const buildUtcRange = ({ start, end, tz }) => {
  const startParts = parseDateParts(start);
  const endParts = parseDateParts(end);
  if (!startParts || !endParts) {
    throw new Error("Invalid date format. Use YYYY-MM-DD.");
  }

  const offsetMinutes = resolveTimezoneOffsetMinutes(tz);
  const offsetMs = offsetMinutes * 60 * 1000;

  const startBaseUtc = new Date(
    Date.UTC(startParts.year, startParts.month - 1, startParts.day, 0, 0, 0, 0),
  );
  const endBaseUtc = new Date(
    Date.UTC(endParts.year, endParts.month - 1, endParts.day, 0, 0, 0, 0),
  );
  const endExclusiveUtc = addDaysUtc(endBaseUtc, 1);

  return {
    startUtc: new Date(startBaseUtc.getTime() - offsetMs),
    endUtcExclusive: new Date(endExclusiveUtc.getTime() - offsetMs),
    offsetMinutes,
  };
};

const run = async () => {
  const start = parseArg("start") || DEFAULT_START;
  const end = parseArg("end") || DEFAULT_END;
  const tz = parseArg("tz") || DEFAULT_TZ;

  const { startUtc, endUtcExclusive, offsetMinutes } = buildUtcRange({
    start,
    end,
    tz,
  });

  await connectDb();

  const orderFilter = {
    createdAt: {
      $gte: startUtc,
      $lt: endUtcExclusive,
    },
  };

  const orders = await OrderModel.find(orderFilter)
    .select("_id displayOrderId couponCode paymentMethod createdAt")
    .sort({ createdAt: -1 })
    .lean();
  const orderIds = orders.map((order) => order._id);

  const deletedOrders = orderIds.length
    ? await OrderModel.deleteMany({ _id: { $in: orderIds } })
    : { deletedCount: 0 };
  const deletedInvoices = orderIds.length
    ? await InvoiceModel.deleteMany({ orderId: { $in: orderIds } })
    : { deletedCount: 0 };

  const analyticsDb = await getAnalyticsDb();
  const orderIdStrings = orderIds.map((id) => String(id));
  const testPaymentFilter = { paymentMethod: "TEST" };
  const purchaseFilter = {
    $or: [
      { orderId: { $in: orderIdStrings } },
      {
        eventType: "purchase_completed",
        timestamp: { $gte: startUtc, $lt: endUtcExclusive },
      },
      {
        eventType: "purchase_completed",
        createdAt: { $gte: startUtc, $lt: endUtcExclusive },
      },
      {
        eventType: "purchase_completed",
        ...testPaymentFilter,
      },
      testPaymentFilter,
    ],
  };
  const comboPurchaseFilter = {
    $or: [
      { orderId: { $in: orderIdStrings } },
      {
        eventType: "combo_purchase",
        timestamp: { $gte: startUtc, $lt: endUtcExclusive },
      },
      {
        eventType: "combo_purchase",
        createdAt: { $gte: startUtc, $lt: endUtcExclusive },
      },
      {
        eventType: "combo_purchase",
        ...testPaymentFilter,
      },
      testPaymentFilter,
    ],
  };
  const rawPurchaseFilter = {
    $or: [
      { orderId: { $in: orderIdStrings } },
      {
        eventType: "purchase_completed",
        timestamp: { $gte: startUtc, $lt: endUtcExclusive },
      },
      {
        eventType: "purchase_completed",
        createdAt: { $gte: startUtc, $lt: endUtcExclusive },
      },
      {
        eventType: "purchase_completed",
        ...testPaymentFilter,
      },
      testPaymentFilter,
    ],
  };

  const purchasesResult = await analyticsDb
    .collection("purchases")
    .deleteMany(purchaseFilter);
  const comboEventsResult = await analyticsDb
    .collection("combo_events")
    .deleteMany(comboPurchaseFilter);
  const rawEventsResult = await analyticsDb
    .collection("events_raw")
    .deleteMany(rawPurchaseFilter);

  console.log(
    JSON.stringify(
      {
        range: {
          start,
          end,
          tz,
          offsetMinutes,
          startUtc: startUtc.toISOString(),
          endUtcExclusive: endUtcExclusive.toISOString(),
        },
        ordersMatched: orders.length,
        ordersDeleted: Number(deletedOrders?.deletedCount || 0),
        invoicesDeleted: Number(deletedInvoices?.deletedCount || 0),
        analyticsDeleted: {
          purchases: Number(purchasesResult?.deletedCount || 0),
          comboEvents: Number(comboEventsResult?.deletedCount || 0),
          rawPurchaseEvents: Number(rawEventsResult?.deletedCount || 0),
        },
        sampleOrderIds: orderIdStrings.slice(0, 20),
      },
      null,
      2,
    ),
  );
};

run()
  .catch((error) => {
    console.error("cleanupOrdersByDateRange failed:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect failures
    }
  });
