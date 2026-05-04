import mongoose from "mongoose";
import connectDb from "../config/connectDb.js";
import { getAnalyticsDb } from "../services/analytics/analyticsDb.service.js";

const DEFAULT_START = "2026-05-03";
const DEFAULT_END = "2026-05-04";
const DEFAULT_TZ = "IST";
const DEFAULT_LIMIT = 20;

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
  const limit = Number(parseArg("limit") || DEFAULT_LIMIT);

  const { startUtc, endUtcExclusive, offsetMinutes } = buildUtcRange({
    start,
    end,
    tz,
  });

  await connectDb();
  const db = await getAnalyticsDb();
  const purchases = await db
    .collection("purchases")
    .aggregate([
      {
        $addFields: {
          timestampDate: {
            $cond: [
              { $eq: [{ $type: "$timestamp" }, "date"] },
              "$timestamp",
              {
                $cond: [
                  { $eq: [{ $type: "$timestamp" }, "string"] },
                  { $toDate: "$timestamp" },
                  null,
                ],
              },
            ],
          },
          amountValue: {
            $convert: {
              input: "$amount",
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
        },
      },
      {
        $match: {
          timestampDate: { $gte: startUtc, $lt: endUtcExclusive },
        },
      },
      {
        $group: {
          _id: "$orderId",
          amount: { $sum: "$amountValue" },
          count: { $sum: 1 },
          lastTimestamp: { $max: "$timestampDate" },
          paymentMethod: { $last: "$paymentMethod" },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: Math.max(limit, 1) },
    ])
    .toArray();

  const totals = await db
    .collection("purchases")
    .aggregate([
      {
        $addFields: {
          timestampDate: {
            $cond: [
              { $eq: [{ $type: "$timestamp" }, "date"] },
              "$timestamp",
              {
                $cond: [
                  { $eq: [{ $type: "$timestamp" }, "string"] },
                  { $toDate: "$timestamp" },
                  null,
                ],
              },
            ],
          },
          amountValue: {
            $convert: {
              input: "$amount",
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
        },
      },
      {
        $match: {
          timestampDate: { $gte: startUtc, $lt: endUtcExclusive },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$amountValue" },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

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
        totals: totals?.[0] || { revenue: 0, count: 0 },
        topPurchases: purchases.map((row) => ({
          orderId: row._id || null,
          amount: Number(row.amount || 0),
          count: Number(row.count || 0),
          paymentMethod: row.paymentMethod || null,
          lastTimestamp: row.lastTimestamp || null,
        })),
      },
      null,
      2,
    ),
  );
};

run()
  .catch((error) => {
    console.error(
      "inspectPurchasesByDateRange failed:",
      error?.message || error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect failures
    }
  });
