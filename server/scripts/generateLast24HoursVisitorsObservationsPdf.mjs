import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import PDFDocument from "pdfkit";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import {
  getAnalyticsConnection,
  getAnalyticsDb,
} from "../services/analytics/analyticsDb.service.js";
import { getAnalyticsCollection } from "../services/analytics/collectionResolver.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_ROOT = path.resolve(__dirname, "..");

const CLICK_INTERACTION_EVENT_TYPES = [
  "click_event",
  "banner_click",
  "product_click",
];
const CLICK_INTERACTION_EVENT_REGEX = /_click$/i;
const PRODUCT_CTA_EVENT_REGEX = /^product_cta_/i;
const ACTIVE_WINDOW_MINUTES = 5;

const toDateExpression = (fieldExpression) => ({
  $convert: {
    input: fieldExpression,
    to: "date",
    onError: null,
    onNull: null,
  },
});

const toNumberExpression = (fieldExpression, fallback = 0) => ({
  $convert: {
    input: fieldExpression,
    to: "double",
    onError: fallback,
    onNull: fallback,
  },
});

const buildBehaviorSessionQualityMatch = () => ({
  $or: [
    { pageViewsValue: { $gt: 0 } },
    { totalActiveTimeValue: { $gt: 0 } },
    { eventCountValue: { $gt: 1 } },
  ],
});

const toPercent = (numerator, denominator) => {
  if (!denominator || denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
};

const toFixed = (value, digits = 2) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(digits));
};

const formatCount = (value) => Number(value || 0).toLocaleString("en-IN");

const formatDuration = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor(Number(milliseconds || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

const LOCAL_HOST_REGEX =
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/i;

const normalizeHost = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const extractHostFromUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    return normalizeHost(parsed.hostname || "");
  } catch {
    const hostLike = raw.match(/^https?:\/\/([^/]+)/i)?.[1] || "";
    return normalizeHost(hostLike.split(":")[0]);
  }
};

const isLiveHost = (host) => {
  const normalized = normalizeHost(host);
  if (!normalized) return false;
  return !LOCAL_HOST_REGEX.test(normalized);
};

const parseCliArgs = (argv = []) => {
  const args = {
    output: "",
    liveOnly: false,
    help: false,
  };

  for (const arg of argv) {
    const value = String(arg || "").trim();
    if (!value) continue;

    if (value === "--help" || value === "-h") {
      args.help = true;
      continue;
    }

    if (value.startsWith("--output=")) {
      args.output = value.slice("--output=".length).trim();
      continue;
    }

    if (value === "--live-only") {
      args.liveOnly = true;
      continue;
    }

    if (value === "--all-traffic") {
      args.liveOnly = false;
    }
  }

  return args;
};

const resolveLast24HoursRange = () => {
  const to = new Date();
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
  const dayKey = `${to.getUTCFullYear()}-${String(to.getUTCMonth() + 1).padStart(2, "0")}-${String(to.getUTCDate()).padStart(2, "0")}`;

  return {
    from,
    to,
    dayKey,
    rangeLabel: "Last 24 hours",
  };
};

const resolveOutputPath = (outputArg, dayKey, liveOnly = false) => {
  const provided = String(outputArg || "").trim();
  if (provided) {
    return path.isAbsolute(provided)
      ? provided
      : path.resolve(process.cwd(), provided);
  }

  const scopeSuffix = liveOnly ? "-live" : "";

  return path.resolve(
    SERVER_ROOT,
    "..",
    "output",
    `last-24-hours-visitor-observations${scopeSuffix}-${dayKey}.pdf`,
  );
};

const resolveLiveTrafficSessionScope = async ({ events, pageViews, from, to }) => {
  const [eventRows, pageRows] = await Promise.all([
    events
      .aggregate([
        {
          $addFields: {
            timestampDate: toDateExpression("$timestamp"),
            sourceDomainValue: {
              $toLower: {
                $trim: {
                  input: {
                    $ifNull: ["$sourceDomain", ""],
                  },
                },
              },
            },
          },
        },
        {
          $match: {
            timestampDate: {
              $gte: from,
              $lt: to,
            },
            sessionId: { $nin: [null, ""] },
            sourceDomainValue: { $nin: [""] },
          },
        },
        {
          $project: {
            _id: 0,
            sessionId: 1,
            host: "$sourceDomainValue",
          },
        },
      ])
      .toArray(),
    pageViews
      .aggregate([
        {
          $addFields: {
            startedAtDate: toDateExpression({
              $ifNull: ["$startedAt", "$timestamp"],
            }),
            pageUrlValue: {
              $ifNull: ["$pageUrl", "$url"],
            },
          },
        },
        {
          $match: {
            startedAtDate: {
              $gte: from,
              $lt: to,
            },
            sessionId: { $nin: [null, ""] },
            pageUrlValue: { $nin: [null, ""] },
          },
        },
        {
          $project: {
            _id: 0,
            sessionId: 1,
            pageUrlValue: 1,
          },
        },
      ])
      .toArray(),
  ]);

  const sessionIds = new Set();
  const hostHitMap = new Map();

  const registerLiveHost = (sessionId, host) => {
    if (!sessionId || !isLiveHost(host)) return;

    const normalizedSessionId = String(sessionId).trim();
    if (!normalizedSessionId) return;

    const normalizedHost = normalizeHost(host);
    sessionIds.add(normalizedSessionId);
    hostHitMap.set(normalizedHost, Number(hostHitMap.get(normalizedHost) || 0) + 1);
  };

  for (const row of eventRows || []) {
    registerLiveHost(row?.sessionId, row?.host);
  }

  for (const row of pageRows || []) {
    const host = extractHostFromUrl(row?.pageUrlValue);
    registerLiveHost(row?.sessionId, host);
  }

  const liveHosts = [...hostHitMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([host, hits]) => ({ host, hits }));

  return {
    liveSessionIds: [...sessionIds],
    liveHosts,
  };
};

const ensureSpace = (doc, requiredHeight = 70) => {
  const pageHeight = doc.page.height;
  const bottom = doc.page.margins.bottom;
  if (doc.y + requiredHeight > pageHeight - bottom) {
    doc.addPage();
  }
};

const writeSection = (doc, title) => {
  ensureSpace(doc, 40);
  doc.moveDown(0.8);
  doc.fontSize(14).fillColor("#0f172a").text(title, { underline: true });
  doc.moveDown(0.35);
};

const writeList = (doc, items = []) => {
  const normalizedItems = (items || [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  if (!normalizedItems.length) {
    ensureSpace(doc, 25);
    doc.fontSize(11).fillColor("#475569").text("No data found for this section.");
    return;
  }

  for (const item of normalizedItems) {
    ensureSpace(doc, 24);
    doc
      .fontSize(11)
      .fillColor("#111827")
      .text(`- ${item}`);
  }
};

const fetchLast24HoursObservations = async ({ db, from, to, liveOnly = false }) => {
  const activeThreshold = new Date(Date.now() - ACTIVE_WINDOW_MINUTES * 60 * 1000);

  const [sessions, events, pageViews, sectionViews, purchases, searchEvents] = await Promise.all([
    getAnalyticsCollection(db, "sessions", ["user_sessions"]),
    getAnalyticsCollection(db, "events_raw", ["events"]),
    getAnalyticsCollection(db, "page_views", []),
    getAnalyticsCollection(db, "section_views", []),
    getAnalyticsCollection(db, "purchases", []),
    getAnalyticsCollection(db, "search_events", []),
  ]);

  const liveScope = liveOnly
    ? await resolveLiveTrafficSessionScope({
        events,
        pageViews,
        from,
        to,
      })
    : { liveSessionIds: [], liveHosts: [] };

  const scopedSessionIds = liveOnly ? liveScope.liveSessionIds : [];
  const scopedSessionMatch = liveOnly
    ? {
        sessionId: {
          $in: scopedSessionIds,
        },
      }
    : {};

  const [
    overviewRows,
    activeNowRows,
    conversionRows,
    topPagesRows,
    topSectionsRows,
    topClicksRows,
    searchKeywordRows,
    trafficSourceRows,
    hourlyRows,
    deviceRows,
    countryRows,
    rageClickRows,
  ] = await Promise.all([
    sessions
      .aggregate([
        {
          $addFields: {
            startedAtDate: toDateExpression("$startedAt"),
            endedAtDate: toDateExpression("$endedAt"),
            lastSeenAtDate: toDateExpression("$lastSeenAt"),
            totalActiveTimeValue: toNumberExpression("$totalActiveTime", 0),
            durationMsValue: toNumberExpression("$durationMs", 0),
            pageViewsValue: toNumberExpression("$pageViews", 0),
            eventCountValue: toNumberExpression("$eventCount", 0),
          },
        },
        {
          $match: {
            startedAtDate: {
              $gte: from,
              $lt: to,
            },
            ...scopedSessionMatch,
            ...buildBehaviorSessionQualityMatch(),
          },
        },
        {
          $project: {
            userId: 1,
            pageViewsValue: 1,
            eventCountValue: 1,
            isBounce: {
              $or: [
                { $lte: ["$pageViewsValue", 1] },
                { $lte: ["$eventCountValue", 1] },
              ],
            },
            activeTimeMs: {
              $let: {
                vars: {
                  endDate: { $ifNull: ["$endedAtDate", "$lastSeenAtDate"] },
                },
                in: {
                  $cond: [
                    { $gt: ["$totalActiveTimeValue", 0] },
                    "$totalActiveTimeValue",
                    {
                      $cond: [
                        { $gt: ["$durationMsValue", 0] },
                        "$durationMsValue",
                        {
                          $cond: [
                            {
                              $and: [
                                { $ne: ["$startedAtDate", null] },
                                { $ne: ["$$endDate", null] },
                              ],
                            },
                            {
                              $max: [
                                {
                                  $subtract: ["$$endDate", "$startedAtDate"],
                                },
                                0,
                              ],
                            },
                            0,
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalVisitors: { $sum: 1 },
            guestVisitors: {
              $sum: {
                $cond: [{ $in: ["$userId", [null, ""]] }, 1, 0],
              },
            },
            loggedInVisitors: {
              $sum: {
                $cond: [{ $in: ["$userId", [null, ""]] }, 0, 1],
              },
            },
            totalPageViews: { $sum: "$pageViewsValue" },
            totalEvents: { $sum: "$eventCountValue" },
            bounceSessions: {
              $sum: {
                $cond: ["$isBounce", 1, 0],
              },
            },
            avgActiveTimeMs: { $avg: "$activeTimeMs" },
          },
        },
      ])
      .toArray(),
    sessions
      .aggregate([
        {
          $addFields: {
            startedAtDate: toDateExpression("$startedAt"),
            lastSeenAtDate: toDateExpression("$lastSeenAt"),
          },
        },
        {
          $match: {
            startedAtDate: {
              $gte: from,
              $lt: to,
            },
            ...scopedSessionMatch,
            isActive: true,
            lastSeenAtDate: {
              $gte: activeThreshold,
            },
          },
        },
        {
          $group: {
            _id: null,
            activeSessionsNow: { $sum: 1 },
            activeLoggedInUsersSet: {
              $addToSet: {
                $cond: [
                  {
                    $in: ["$userId", [null, ""]],
                  },
                  null,
                  "$userId",
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            activeSessionsNow: 1,
            activeLoggedInUsersNow: {
              $size: {
                $filter: {
                  input: "$activeLoggedInUsersSet",
                  as: "userId",
                  cond: {
                    $not: [
                      {
                        $in: ["$$userId", [null, ""]],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      ])
      .toArray(),
    purchases
      .aggregate([
        {
          $addFields: {
            timestampDate: toDateExpression("$timestamp"),
            amountValue: toNumberExpression("$amount", 0),
          },
        },
        {
          $match: {
            timestampDate: {
              $gte: from,
              $lt: to,
            },
            ...scopedSessionMatch,
          },
        },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: "$amountValue" },
            purchaseSessionsSet: {
              $addToSet: {
                $cond: [
                  {
                    $in: ["$sessionId", [null, ""]],
                  },
                  null,
                  "$sessionId",
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            orders: 1,
            revenue: 1,
            purchaseSessions: {
              $size: {
                $filter: {
                  input: "$purchaseSessionsSet",
                  as: "sessionId",
                  cond: {
                    $not: [
                      {
                        $in: ["$$sessionId", [null, ""]],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      ])
      .toArray(),
    pageViews
      .aggregate([
        {
          $addFields: {
            startedAtDate: toDateExpression({
              $ifNull: ["$startedAt", "$timestamp"],
            }),
            durationMsValue: toNumberExpression("$durationMs", 0),
            pageUrlValue: {
              $ifNull: ["$pageUrl", "$url"],
            },
          },
        },
        {
          $match: {
            startedAtDate: {
              $gte: from,
              $lt: to,
            },
            ...scopedSessionMatch,
          },
        },
        {
          $group: {
            _id: "$pageUrlValue",
            views: { $sum: 1 },
            avgDurationMs: { $avg: "$durationMsValue" },
          },
        },
        {
          $match: {
            _id: { $nin: [null, ""] },
          },
        },
        { $sort: { views: -1 } },
        { $limit: 12 },
      ])
      .toArray(),
    sectionViews
      .aggregate([
        {
          $addFields: {
            startedAtDate: toDateExpression("$startedAt"),
            durationMsValue: toNumberExpression("$durationMs", 0),
          },
        },
        {
          $match: {
            startedAtDate: {
              $gte: from,
              $lt: to,
            },
            ...scopedSessionMatch,
          },
        },
        {
          $group: {
            _id: {
              sectionName: "$sectionName",
              pageUrl: "$pageUrl",
            },
            views: { $sum: 1 },
            avgDurationMs: { $avg: "$durationMsValue" },
          },
        },
        { $sort: { views: -1 } },
        { $limit: 12 },
      ])
      .toArray(),
    events
      .aggregate([
        {
          $addFields: {
            timestampDate: toDateExpression("$timestamp"),
            targetLabel: {
              $trim: {
                input: {
                  $convert: {
                    input: {
                      $ifNull: [
                        "$metadata.buttonLabel",
                        {
                          $ifNull: [
                            "$metadata.trackName",
                            {
                              $ifNull: [
                                "$metadata.targetId",
                                {
                                  $ifNull: [
                                    "$metadata.target_id",
                                    {
                                      $ifNull: [
                                        "$metadata.href",
                                        "$eventType",
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    to: "string",
                    onError: "",
                    onNull: "",
                  },
                },
              },
            },
          },
        },
        {
          $match: {
            timestampDate: {
              $gte: from,
              $lt: to,
            },
            ...scopedSessionMatch,
            eventType: {
              $ne: "rage_click",
            },
            $or: [
              { eventType: { $in: CLICK_INTERACTION_EVENT_TYPES } },
              { eventType: { $regex: CLICK_INTERACTION_EVENT_REGEX } },
              { eventType: { $regex: PRODUCT_CTA_EVENT_REGEX } },
            ],
          },
        },
        {
          $addFields: {
            normalizedTarget: {
              $cond: [
                { $eq: ["$targetLabel", ""] },
                "unknown_target",
                "$targetLabel",
              ],
            },
          },
        },
        {
          $group: {
            _id: "$normalizedTarget",
            clicks: { $sum: 1 },
          },
        },
        { $sort: { clicks: -1 } },
        { $limit: 12 },
      ])
      .toArray(),
    searchEvents
      .aggregate([
        {
          $addFields: {
            timestampDate: toDateExpression("$timestamp"),
          },
        },
        {
          $match: {
            timestampDate: {
              $gte: from,
              $lt: to,
            },
            ...scopedSessionMatch,
            keyword: { $nin: [null, ""] },
          },
        },
        {
          $group: {
            _id: "$keyword",
            searches: { $sum: 1 },
          },
        },
        { $sort: { searches: -1 } },
        { $limit: 12 },
      ])
      .toArray(),
    events
      .aggregate([
        {
          $addFields: {
            timestampDate: toDateExpression("$timestamp"),
            sourceDomainValue: {
              $ifNull: ["$sourceDomain", "direct_or_unknown"],
            },
          },
        },
        {
          $match: {
            timestampDate: {
              $gte: from,
              $lt: to,
            },
            ...scopedSessionMatch,
            eventType: {
              $in: ["page_view_started", "page_view_ended", "page_view"],
            },
          },
        },
        {
          $group: {
            _id: "$sourceDomainValue",
            visits: { $sum: 1 },
          },
        },
        { $sort: { visits: -1 } },
        { $limit: 10 },
      ])
      .toArray(),
    sessions
      .aggregate([
        {
          $addFields: {
            startedAtDate: toDateExpression("$startedAt"),
            totalActiveTimeValue: toNumberExpression("$totalActiveTime", 0),
            pageViewsValue: toNumberExpression("$pageViews", 0),
            eventCountValue: toNumberExpression("$eventCount", 0),
          },
        },
        {
          $match: {
            startedAtDate: {
              $gte: from,
              $lt: to,
            },
            ...scopedSessionMatch,
            ...buildBehaviorSessionQualityMatch(),
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d %H:00",
                date: "$startedAtDate",
                timezone: "UTC",
              },
            },
            visitors: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    sessions
      .aggregate([
        {
          $addFields: {
            startedAtDate: toDateExpression("$startedAt"),
            totalActiveTimeValue: toNumberExpression("$totalActiveTime", 0),
            pageViewsValue: toNumberExpression("$pageViews", 0),
            eventCountValue: toNumberExpression("$eventCount", 0),
            deviceTypeValue: {
              $ifNull: ["$deviceType", "unknown"],
            },
            browserValue: {
              $ifNull: ["$browser", "unknown"],
            },
          },
        },
        {
          $match: {
            startedAtDate: {
              $gte: from,
              $lt: to,
            },
            ...scopedSessionMatch,
            ...buildBehaviorSessionQualityMatch(),
          },
        },
        {
          $group: {
            _id: {
              deviceType: "$deviceTypeValue",
              browser: "$browserValue",
            },
            sessions: { $sum: 1 },
          },
        },
        { $sort: { sessions: -1 } },
        { $limit: 12 },
      ])
      .toArray(),
    sessions
      .aggregate([
        {
          $addFields: {
            startedAtDate: toDateExpression("$startedAt"),
            totalActiveTimeValue: toNumberExpression("$totalActiveTime", 0),
            pageViewsValue: toNumberExpression("$pageViews", 0),
            eventCountValue: toNumberExpression("$eventCount", 0),
            countryValue: {
              $ifNull: ["$location.country", "unknown"],
            },
          },
        },
        {
          $match: {
            startedAtDate: {
              $gte: from,
              $lt: to,
            },
            ...scopedSessionMatch,
            ...buildBehaviorSessionQualityMatch(),
          },
        },
        {
          $group: {
            _id: "$countryValue",
            visitors: { $sum: 1 },
          },
        },
        { $sort: { visitors: -1 } },
        { $limit: 10 },
      ])
      .toArray(),
    events
      .aggregate([
        {
          $addFields: {
            timestampDate: toDateExpression("$timestamp"),
          },
        },
        {
          $match: {
            timestampDate: {
              $gte: from,
              $lt: to,
            },
            ...scopedSessionMatch,
            eventType: "rage_click",
          },
        },
        {
          $count: "rageClicks",
        },
      ])
      .toArray(),
  ]);

  const overview = overviewRows?.[0] || {};
  const activeNow = activeNowRows?.[0] || {};
  const conversion = conversionRows?.[0] || {};

  const totalVisitors = Number(overview.totalVisitors || 0);
  const guestVisitors = Number(overview.guestVisitors || 0);
  const loggedInVisitors = Number(overview.loggedInVisitors || 0);
  const totalPageViews = Number(overview.totalPageViews || 0);
  const totalEvents = Number(overview.totalEvents || 0);
  const bounceSessions = Number(overview.bounceSessions || 0);
  const avgActiveTimeMs = Number(overview.avgActiveTimeMs || 0);

  const activeSessionsNow = Number(activeNow.activeSessionsNow || 0);
  const activeLoggedInUsersNow = Number(activeNow.activeLoggedInUsersNow || 0);

  const orders = Number(conversion.orders || 0);
  const revenue = Number(conversion.revenue || 0);
  const sessionsWithPurchase = Number(conversion.purchaseSessions || 0);

  const bounceRate = toPercent(bounceSessions, totalVisitors);
  const conversionRate = toPercent(sessionsWithPurchase, totalVisitors);
  const guestShare = toPercent(guestVisitors, totalVisitors);
  const loggedInShare = toPercent(loggedInVisitors, totalVisitors);
  const avgPagesPerVisitor = toFixed(totalPageViews / (totalVisitors || 1), 2);
  const avgEventsPerVisitor = toFixed(totalEvents / (totalVisitors || 1), 2);

  const hourlyVisitors = (hourlyRows || []).map((row) => ({
    bucket: String(row?._id || ""),
    visitors: Number(row?.visitors || 0),
  }));

  const topPages = (topPagesRows || []).map((row) => ({
    page: String(row?._id || "").trim() || "unknown",
    views: Number(row?.views || 0),
    avgDurationMs: Number(row?.avgDurationMs || 0),
  }));

  const topSections = (topSectionsRows || []).map((row) => ({
    sectionName: String(row?._id?.sectionName || "").trim() || "unknown",
    page: String(row?._id?.pageUrl || "").trim() || "unknown",
    views: Number(row?.views || 0),
    avgDurationMs: Number(row?.avgDurationMs || 0),
  }));

  const topClickTargets = (topClicksRows || []).map((row) => ({
    target: String(row?._id || "").trim() || "unknown_target",
    clicks: Number(row?.clicks || 0),
  }));

  const topSearchKeywords = (searchKeywordRows || []).map((row) => ({
    keyword: String(row?._id || "").trim() || "unknown",
    searches: Number(row?.searches || 0),
  }));

  const trafficSources = (trafficSourceRows || []).map((row) => ({
    source: String(row?._id || "").trim() || "direct_or_unknown",
    visits: Number(row?.visits || 0),
  }));

  const deviceBreakdown = (deviceRows || []).map((row) => ({
    deviceType: String(row?._id?.deviceType || "unknown"),
    browser: String(row?._id?.browser || "unknown"),
    sessions: Number(row?.sessions || 0),
  }));

  const countryBreakdown = (countryRows || []).map((row) => ({
    country: String(row?._id || "unknown"),
    visitors: Number(row?.visitors || 0),
  }));

  const rageClicks = Number(rageClickRows?.[0]?.rageClicks || 0);

  const busiestHour = hourlyVisitors.reduce(
    (acc, item) => {
      if (item.visitors > acc.visitors) return item;
      return acc;
    },
    { bucket: "n/a", visitors: 0 },
  );

  const observations = [
    liveOnly
      ? "Data scope: live site traffic only (localhost/private-network traffic excluded)."
      : "Data scope: all traffic (includes local and live).",
    `Total visitors in last 24 hours: ${formatCount(totalVisitors)}.`,
    `Guest visitors: ${formatCount(guestVisitors)} (${guestShare.toFixed(2)}%). Logged-in visitors: ${formatCount(loggedInVisitors)} (${loggedInShare.toFixed(2)}%).`,
    `Average active time per visitor: ${formatDuration(avgActiveTimeMs)}.`,
    `Total page views: ${formatCount(totalPageViews)}. Average pages per visitor: ${avgPagesPerVisitor}.`,
    `Total tracked events: ${formatCount(totalEvents)}. Average events per visitor: ${avgEventsPerVisitor}.`,
    `Bounce sessions: ${formatCount(bounceSessions)} (${bounceRate.toFixed(2)}%).`,
    `Current active sessions (last ${ACTIVE_WINDOW_MINUTES} minutes): ${formatCount(activeSessionsNow)}. Active logged-in users now: ${formatCount(activeLoggedInUsersNow)}.`,
    `Sessions with purchase: ${formatCount(sessionsWithPurchase)}. Conversion rate: ${conversionRate.toFixed(2)}%.`,
    `Orders placed: ${formatCount(orders)}. Revenue: INR ${formatCount(revenue)}.`,
    `Rage clicks recorded: ${formatCount(rageClicks)}.`,
    `Busiest hour (UTC): ${busiestHour.bucket} with ${formatCount(busiestHour.visitors)} visitors.`,
    topPages[0]
      ? `Most viewed page: ${topPages[0].page} (${formatCount(topPages[0].views)} views).`
      : "Most viewed page: no data.",
    topClickTargets[0]
      ? `Top click target: ${topClickTargets[0].target} (${formatCount(topClickTargets[0].clicks)} clicks).`
      : "Top click target: no data.",
    topSearchKeywords[0]
      ? `Top searched keyword: ${topSearchKeywords[0].keyword} (${formatCount(topSearchKeywords[0].searches)} searches).`
      : "Top searched keyword: no data.",
  ];

  if (liveOnly) {
    if (liveScope.liveHosts.length) {
      const hostSummary = liveScope.liveHosts
        .slice(0, 8)
        .map((item) => `${item.host} (${formatCount(item.hits)} hits)`)
        .join(", ");
      observations.push(`Live hostnames observed: ${hostSummary}.`);
    } else {
      observations.push("No live hostnames observed in the selected window.");
    }
  }

  return {
    isLiveOnly: liveOnly,
    liveHosts: liveScope.liveHosts,
    totalVisitors,
    guestVisitors,
    loggedInVisitors,
    guestShare,
    loggedInShare,
    totalPageViews,
    totalEvents,
    avgPagesPerVisitor,
    avgEventsPerVisitor,
    bounceSessions,
    bounceRate,
    avgActiveTimeMs,
    activeSessionsNow,
    activeLoggedInUsersNow,
    sessionsWithPurchase,
    conversionRate,
    orders,
    revenue,
    rageClicks,
    busiestHour,
    hourlyVisitors,
    topPages,
    topSections,
    topClickTargets,
    topSearchKeywords,
    trafficSources,
    deviceBreakdown,
    countryBreakdown,
    observations,
  };
};

const writePdf = async (report, outputPath) => {
  await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = fs.createWriteStream(outputPath);

    stream.on("finish", resolve);
    stream.on("error", reject);

    doc.pipe(stream);

    doc
      .fontSize(22)
      .fillColor("#0f172a")
      .text("Last 24 Hours Visitors and Observations Report", { align: "left" });

    doc.moveDown(0.4);
    doc
      .fontSize(11)
      .fillColor("#334155")
      .text(`Range: ${report.rangeLabel} (UTC)`)
      .text(`From: ${report.fromIso}`)
      .text(`To: ${report.toIso} (exclusive)`)
      .text(`Generated At: ${report.generatedAtIso}`);

    writeSection(doc, "Visitor Summary");
    writeList(doc, [
      `Scope: ${report.isLiveOnly ? "Live site only" : "All traffic"}`,
      `Visitors: ${formatCount(report.totalVisitors)}`,
      `Guest: ${formatCount(report.guestVisitors)} (${report.guestShare.toFixed(2)}%)`,
      `Logged-in: ${formatCount(report.loggedInVisitors)} (${report.loggedInShare.toFixed(2)}%)`,
      `Active sessions now: ${formatCount(report.activeSessionsNow)}`,
      `Active logged-in users now: ${formatCount(report.activeLoggedInUsersNow)}`,
      report.isLiveOnly
        ? `Live hosts detected: ${report.liveHosts?.length ? report.liveHosts.slice(0, 6).map((item) => item.host).join(", ") : "none"}`
        : "",
    ]);

    writeSection(doc, "Engagement");
    writeList(doc, [
      `Total page views: ${formatCount(report.totalPageViews)}`,
      `Average pages per visitor: ${report.avgPagesPerVisitor}`,
      `Total events: ${formatCount(report.totalEvents)}`,
      `Average events per visitor: ${report.avgEventsPerVisitor}`,
      `Average active time per visitor: ${formatDuration(report.avgActiveTimeMs)}`,
      `Bounce sessions: ${formatCount(report.bounceSessions)} (${report.bounceRate.toFixed(2)}%)`,
      `Rage clicks: ${formatCount(report.rageClicks)}`,
      `Busiest hour (UTC): ${report.busiestHour.bucket} (${formatCount(report.busiestHour.visitors)} visitors)`,
    ]);

    writeSection(doc, "Commerce");
    writeList(doc, [
      `Sessions with purchase: ${formatCount(report.sessionsWithPurchase)}`,
      `Conversion rate: ${report.conversionRate.toFixed(2)}%`,
      `Orders: ${formatCount(report.orders)}`,
      `Revenue: INR ${formatCount(report.revenue)}`,
    ]);

    writeSection(doc, "Top Pages");
    writeList(
      doc,
      report.topPages.map(
        (item) => `${item.page} | views: ${formatCount(item.views)} | avg duration: ${formatDuration(item.avgDurationMs)}`,
      ),
    );

    writeSection(doc, "Top Click Targets");
    writeList(
      doc,
      report.topClickTargets.map(
        (item) => `${item.target} | clicks: ${formatCount(item.clicks)}`,
      ),
    );

    writeSection(doc, "Top Search Keywords");
    writeList(
      doc,
      report.topSearchKeywords.map(
        (item) => `${item.keyword} | searches: ${formatCount(item.searches)}`,
      ),
    );

    writeSection(doc, "Traffic Sources");
    writeList(
      doc,
      report.trafficSources.map(
        (item) => `${item.source} | visits: ${formatCount(item.visits)}`,
      ),
    );

    writeSection(doc, "Device Breakdown");
    writeList(
      doc,
      report.deviceBreakdown.map(
        (item) => `${item.deviceType} / ${item.browser} | sessions: ${formatCount(item.sessions)}`,
      ),
    );

    writeSection(doc, "Country Breakdown");
    writeList(
      doc,
      report.countryBreakdown.map(
        (item) => `${item.country} | visitors: ${formatCount(item.visitors)}`,
      ),
    );

    writeSection(doc, "Hourly Visitors (UTC)");
    writeList(
      doc,
      report.hourlyVisitors.map(
        (item) => `${item.bucket} | visitors: ${formatCount(item.visitors)}`,
      ),
    );

    writeSection(doc, "Top Sections");
    writeList(
      doc,
      report.topSections.map(
        (item) => `${item.sectionName} on ${item.page} | views: ${formatCount(item.views)} | avg duration: ${formatDuration(item.avgDurationMs)}`,
      ),
    );

    writeSection(doc, "Complete Observations");
    writeList(doc, report.observations);

    doc.end();
  });
};

const printUsage = () => {
  console.log("Usage:");
  console.log("  node scripts/generateLast24HoursVisitorsObservationsPdf.mjs [--live-only] [--all-traffic] [--output=path]");
};

const main = async () => {
  dotenv.config({ path: path.resolve(SERVER_ROOT, ".env") });

  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const range = resolveLast24HoursRange();
  const outputPath = resolveOutputPath(args.output, range.dayKey, args.liveOnly);

  const db = await getAnalyticsDb();
  const metrics = await fetchLast24HoursObservations({
    db,
    from: range.from,
    to: range.to,
    liveOnly: args.liveOnly,
  });

  const reportPayload = {
    rangeLabel: range.rangeLabel,
    fromIso: range.from.toISOString(),
    toIso: range.to.toISOString(),
    generatedAtIso: new Date().toISOString(),
    ...metrics,
  };

  await writePdf(reportPayload, outputPath);

  console.log(`[visitors24h] Report generated: ${outputPath}`);
  console.log(`[visitors24h] Visitors=${metrics.totalVisitors}`);
  console.log(
    `[visitors24h] Summary=${JSON.stringify({
      isLiveOnly: args.liveOnly,
      liveHosts: metrics.liveHosts,
      totalVisitors: metrics.totalVisitors,
      guestVisitors: metrics.guestVisitors,
      loggedInVisitors: metrics.loggedInVisitors,
      totalPageViews: metrics.totalPageViews,
      totalEvents: metrics.totalEvents,
      bounceRate: metrics.bounceRate,
      conversionRate: metrics.conversionRate,
      orders: metrics.orders,
      revenue: metrics.revenue,
      busiestHour: metrics.busiestHour,
      topPage: metrics.topPages?.[0] || null,
      topClickTarget: metrics.topClickTargets?.[0] || null,
      topSearchKeyword: metrics.topSearchKeywords?.[0] || null,
    })}`,
  );
  console.log(
    `[visitors24h] Details=${JSON.stringify({
      observations: metrics.observations,
      topPages: metrics.topPages,
      topClickTargets: metrics.topClickTargets,
      topSearchKeywords: metrics.topSearchKeywords,
      trafficSources: metrics.trafficSources,
      deviceBreakdown: metrics.deviceBreakdown,
      countryBreakdown: metrics.countryBreakdown,
      hourlyVisitors: metrics.hourlyVisitors,
      topSections: metrics.topSections,
    })}`,
  );
};

main()
  .catch((error) => {
    console.error("[visitors24h] Failed to generate report:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      const connection = await getAnalyticsConnection();
      await connection.close();
    } catch {
      // Ignore close errors.
    }
  });
