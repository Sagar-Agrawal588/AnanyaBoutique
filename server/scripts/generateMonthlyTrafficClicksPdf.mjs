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

const buildButtonClickMatch = (from, to) => ({
  timestampDate: {
    $gte: from,
    $lt: to,
  },
  eventType: { $ne: "rage_click" },
  $or: [
    { eventType: { $in: CLICK_INTERACTION_EVENT_TYPES } },
    { eventType: { $regex: CLICK_INTERACTION_EVENT_REGEX } },
    { eventType: { $regex: PRODUCT_CTA_EVENT_REGEX } },
  ],
});

const toPercent = (numerator, denominator) => {
  if (!denominator || denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
};

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatCount = (value) => Number(value || 0).toLocaleString("en-IN");

const parseCliArgs = (argv = []) => {
  const args = {
    month: "",
    output: "",
    help: false,
  };

  for (const arg of argv) {
    const value = String(arg || "").trim();
    if (!value) continue;

    if (value === "--help" || value === "-h") {
      args.help = true;
      continue;
    }

    if (value.startsWith("--month=")) {
      args.month = value.slice("--month=".length).trim();
      continue;
    }

    if (value.startsWith("--output=")) {
      args.output = value.slice("--output=".length).trim();
      continue;
    }
  }

  return args;
};

const parseMonthArg = (value) => {
  const input = String(value || "").trim();
  if (!input) return null;

  const match = input.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new Error(
      "Invalid --month format. Use YYYY-MM, for example --month=2026-03",
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new Error("Invalid --month value.");
  }
  if (month < 1 || month > 12) {
    throw new Error("Invalid month in --month. Must be between 01 and 12.");
  }

  return { year, month };
};

const resolveMonthRange = (monthArg = "") => {
  const explicit = parseMonthArg(monthArg);

  if (explicit) {
    const from = new Date(Date.UTC(explicit.year, explicit.month - 1, 1, 0, 0, 0, 0));
    const to = new Date(Date.UTC(explicit.year, explicit.month, 1, 0, 0, 0, 0));
    const monthKey = `${explicit.year}-${String(explicit.month).padStart(2, "0")}`;

    return {
      from,
      to,
      monthKey,
      monthLabel: new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(from),
    };
  }

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const to = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
  const from = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0, 0));
  const monthKey = `${from.getUTCFullYear()}-${String(from.getUTCMonth() + 1).padStart(2, "0")}`;

  return {
    from,
    to,
    monthKey,
    monthLabel: new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(from),
  };
};

const resolveOutputPath = (outputArg, monthKey) => {
  const provided = String(outputArg || "").trim();
  if (provided) {
    return path.isAbsolute(provided)
      ? provided
      : path.resolve(process.cwd(), provided);
  }

  return path.resolve(
    SERVER_ROOT,
    "..",
    "output",
    `monthly-traffic-click-report-${monthKey}.pdf`,
  );
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
      .text("Monthly Traffic and Button Click Report", { align: "left" });

    doc.moveDown(0.4);
    doc
      .fontSize(11)
      .fillColor("#334155")
      .text(`Month: ${report.monthLabel} (UTC)`)
      .text(`From: ${report.fromIso}`)
      .text(`To: ${report.toIso} (exclusive)`)
      .text(`Generated At: ${report.generatedAtIso}`);

    doc.moveDown(1.2);
    doc
      .fontSize(15)
      .fillColor("#0f172a")
      .text("Key Numbers", { underline: true });

    doc.moveDown(0.5);
    doc
      .fontSize(14)
      .fillColor("#111827")
      .text(`Total visitors last month: ${formatCount(report.totalVisitors)}`)
      .text(`Total button clicks last month: ${formatCount(report.totalButtonClicks)}`)
      .text(
        `Unique visitor sessions with at least one click: ${formatCount(report.sessionsWithClick)}`,
      );

    doc.moveDown(0.8);
    doc
      .fontSize(12)
      .fillColor("#1f2937")
      .text(
        `Session click-through rate: ${report.sessionClickRatePercent.toFixed(2)}%`,
      )
      .text(
        `Average button clicks per visitor: ${report.avgClicksPerVisitor.toFixed(2)}`,
      )
      .text(
        `Average button clicks per clicking session: ${report.avgClicksPerClickingSession.toFixed(2)}`,
      );

    doc.moveDown(1.1);
    doc
      .fontSize(14)
      .fillColor("#0f172a")
      .text("Top Clicked Buttons", { underline: true });

    doc.moveDown(0.4);

    if (!report.topClickedTargets.length) {
      doc
        .fontSize(11)
        .fillColor("#475569")
        .text("No button click events found in this month.");
    } else {
      report.topClickedTargets.forEach((item, index) => {
        const rank = String(index + 1).padStart(2, "0");
        const label = String(item.target || "Unknown Target").slice(0, 90);
        doc
          .fontSize(11)
          .fillColor("#111827")
          .text(`${rank}. ${label}`)
          .fillColor("#475569")
          .text(`   Clicks: ${formatCount(item.clicks)}`);
      });
    }

    doc.moveDown(1.2);
    doc
      .fontSize(9)
      .fillColor("#64748b")
      .text(
        "Definitions: Visitors are quality sessions started in the selected month. Button clicks include click_event, banner_click, product_click, *_click, and product_cta_* events (excluding rage_click).",
      );

    doc.end();
  });
};

const fetchMonthlyMetrics = async ({ db, from, to }) => {
  const [sessions, events] = await Promise.all([
    getAnalyticsCollection(db, "sessions", ["user_sessions"]),
    getAnalyticsCollection(db, "events_raw", ["events"]),
  ]);

  const buttonMatch = buildButtonClickMatch(from, to);

  const targetLabelExpression = {
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
                      "$metadata.ariaLabel",
                      {
                        $ifNull: [
                          "$metadata.title",
                          {
                            $ifNull: [
                              "$metadata.text",
                              {
                                $ifNull: ["$metadata.id", "$target_id"],
                              },
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
        ],
      },
    ],
  };

  const [visitorRows, clickRows, clickedSessionRows, topTargetRows] =
    await Promise.all([
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
              ...buildBehaviorSessionQualityMatch(),
            },
          },
          {
            $count: "totalVisitors",
          },
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
            $match: buttonMatch,
          },
          {
            $count: "totalButtonClicks",
          },
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
              ...buttonMatch,
              sessionId: { $nin: [null, ""] },
            },
          },
          {
            $group: {
              _id: "$sessionId",
            },
          },
          {
            $count: "sessionsWithClick",
          },
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
            $match: buttonMatch,
          },
          {
            $project: {
              targetLabel: {
                $trim: {
                  input: {
                    $convert: {
                      input: targetLabelExpression,
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
            $addFields: {
              normalizedTarget: {
                $cond: [
                  { $eq: ["$targetLabel", ""] },
                  "Unknown Target",
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
          { $limit: 10 },
        ])
        .toArray(),
    ]);

  const totalVisitors = toSafeNumber(visitorRows?.[0]?.totalVisitors, 0);
  const totalButtonClicks = toSafeNumber(clickRows?.[0]?.totalButtonClicks, 0);
  const sessionsWithClick = toSafeNumber(
    clickedSessionRows?.[0]?.sessionsWithClick,
    0,
  );

  return {
    totalVisitors,
    totalButtonClicks,
    sessionsWithClick,
    sessionClickRatePercent: toPercent(sessionsWithClick, totalVisitors),
    avgClicksPerVisitor:
      totalVisitors > 0 ? totalButtonClicks / totalVisitors : 0,
    avgClicksPerClickingSession:
      sessionsWithClick > 0 ? totalButtonClicks / sessionsWithClick : 0,
    topClickedTargets: (topTargetRows || []).map((row) => ({
      target: String(row?._id || "Unknown Target").trim() || "Unknown Target",
      clicks: toSafeNumber(row?.clicks, 0),
    })),
  };
};

const printUsage = () => {
  console.log("Usage:");
  console.log(
    "  node scripts/generateMonthlyTrafficClicksPdf.mjs [--month=YYYY-MM] [--output=path]",
  );
  console.log("");
  console.log("Examples:");
  console.log("  node scripts/generateMonthlyTrafficClicksPdf.mjs");
  console.log(
    "  node scripts/generateMonthlyTrafficClicksPdf.mjs --month=2026-03 --output=../output/march-traffic.pdf",
  );
};

const main = async () => {
  dotenv.config({ path: path.resolve(SERVER_ROOT, ".env") });

  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const range = resolveMonthRange(args.month);
  const outputPath = resolveOutputPath(args.output, range.monthKey);

  const db = await getAnalyticsDb();
  const metrics = await fetchMonthlyMetrics({
    db,
    from: range.from,
    to: range.to,
  });

  const reportPayload = {
    monthLabel: range.monthLabel,
    fromIso: range.from.toISOString(),
    toIso: range.to.toISOString(),
    generatedAtIso: new Date().toISOString(),
    ...metrics,
  };

  await writePdf(reportPayload, outputPath);

  console.log(`[analytics-pdf] Report generated: ${outputPath}`);
  console.log(
    `[analytics-pdf] Visitors=${metrics.totalVisitors}, ButtonClicks=${metrics.totalButtonClicks}`,
  );
};

main()
  .catch((error) => {
    console.error("[analytics-pdf] Failed to generate report:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      const connection = await getAnalyticsConnection();
      await connection.close();
    } catch {
      // Ignore connection close errors.
    }
  });
