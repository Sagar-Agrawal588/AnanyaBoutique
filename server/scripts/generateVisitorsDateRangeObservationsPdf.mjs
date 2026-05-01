import dotenv from "dotenv";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import PDFDocument from "pdfkit";
import { fileURLToPath } from "url";
import {
  getAnalyticsConnection,
  getAnalyticsDb,
} from "../services/analytics/analyticsDb.service.js";
import { getAnalyticsCollection } from "../services/analytics/collectionResolver.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_ROOT = path.resolve(__dirname, "..");

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

const parseCliArgs = (argv = []) => {
  const args = {
    fromDate: "2026-04-19",
    toDate: "2026-04-21",
    output: "",
    timezone: "Asia/Kolkata",
    help: false,
  };

  for (const arg of argv) {
    const value = String(arg || "").trim();
    if (!value) continue;

    if (value === "--help" || value === "-h") {
      args.help = true;
      continue;
    }

    if (value.startsWith("--from-date=")) {
      args.fromDate = value.slice("--from-date=".length).trim();
      continue;
    }

    if (value.startsWith("--to-date=")) {
      args.toDate = value.slice("--to-date=".length).trim();
      continue;
    }

    if (value.startsWith("--output=")) {
      args.output = value.slice("--output=".length).trim();
      continue;
    }

    if (value.startsWith("--timezone=")) {
      args.timezone = value.slice("--timezone=".length).trim() || args.timezone;
    }
  }

  return args;
};

const addDaysToDateString = (dateString, days = 0) => {
  const base = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return "";
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
};

const compareDateStrings = (left, right) =>
  new Date(`${left}T00:00:00Z`).getTime() -
  new Date(`${right}T00:00:00Z`).getTime();

const buildDayList = (fromDate, toDate) => {
  const days = [];
  let cursor = fromDate;
  while (compareDateStrings(cursor, toDate) <= 0) {
    days.push(cursor);
    cursor = addDaysToDateString(cursor, 1);
  }
  return days;
};

const formatCount = (value) => Number(value || 0).toLocaleString("en-IN");
const formatPercent = (value, digits = 1) =>
  `${Number(value || 0).toFixed(digits)}%`;
const toPercent = (numerator, denominator) => {
  if (!denominator || denominator <= 0) return 0;
  return (Number(numerator || 0) / Number(denominator || 0)) * 100;
};

const getTodayDateInTimezone = (timezone) => {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

const resolveOutputPath = (provided, fromDate, toDate) => {
  const output = String(provided || "").trim();
  if (output) {
    return path.isAbsolute(output)
      ? output
      : path.resolve(process.cwd(), output);
  }

  return path.resolve(
    SERVER_ROOT,
    "..",
    "output",
    `visitors-${fromDate}-to-${toDate}-detailed-observations.pdf`,
  );
};

const buildDetailedObservations = (
  dailyVisitors = [],
  { fromDate = "", toDate = "", timezone = "Asia/Kolkata" } = {},
) => {
  const entries = dailyVisitors.map((item) => ({
    day: String(item?.day || ""),
    visitors: Number(item?.visitors || 0),
  }));
  const total = entries.reduce((sum, item) => sum + item.visitors, 0);
  const observations = [];

  if (!entries.length) {
    return ["No date rows were found for this report."];
  }

  if (total <= 0) {
    observations.push(
      "No quality visitor sessions were recorded in this date range.",
    );
    observations.push(
      "This usually means traffic was very low or tracking data did not arrive.",
    );
    return observations;
  }

  const avg = total / entries.length;
  const busiest = entries.reduce((best, item) =>
    item.visitors > best.visitors ? item : best,
  );
  const quietest = entries.reduce((best, item) =>
    item.visitors < best.visitors ? item : best,
  );
  const busiestShare = toPercent(busiest.visitors, total);
  const quietestShare = toPercent(quietest.visitors, total);

  observations.push(
    `From ${fromDate} to ${toDate}, your site received ${formatCount(total)} visitors in total.`,
  );
  observations.push(
    `Average traffic was around ${formatCount(Math.round(avg))} visitors per day.`,
  );
  observations.push(
    `${busiest.day} was the strongest day with ${formatCount(busiest.visitors)} visitors (${formatPercent(busiestShare)} of total traffic).`,
  );
  observations.push(
    `${quietest.day} was the weakest day with ${formatCount(quietest.visitors)} visitors (${formatPercent(quietestShare)} of total traffic).`,
  );
  observations.push(
    `Difference between highest and lowest day was ${formatCount(Math.abs(busiest.visitors - quietest.visitors))} visitors.`,
  );

  for (let index = 1; index < entries.length; index += 1) {
    const previous = entries[index - 1];
    const current = entries[index];
    const delta = current.visitors - previous.visitors;

    if (previous.visitors <= 0) {
      if (delta > 0) {
        observations.push(
          `Traffic moved from zero to ${formatCount(current.visitors)} on ${current.day}.`,
        );
      } else {
        observations.push(
          `Traffic stayed very low from ${previous.day} to ${current.day}.`,
        );
      }
      continue;
    }

    const changePct = toPercent(Math.abs(delta), previous.visitors);

    if (delta > 0) {
      observations.push(
        `Visitors increased by ${formatCount(delta)} (${formatPercent(changePct)} up) from ${previous.day} to ${current.day}.`,
      );
    } else if (delta < 0) {
      observations.push(
        `Visitors dropped by ${formatCount(Math.abs(delta))} (${formatPercent(changePct)} down) from ${previous.day} to ${current.day}.`,
      );
    } else {
      observations.push(
        `Visitor count stayed the same from ${previous.day} to ${current.day}.`,
      );
    }
  }

  const firstDay = entries[0]?.visitors || 0;
  const lastDay = entries[entries.length - 1]?.visitors || 0;
  const overallDelta = lastDay - firstDay;

  if (firstDay > 0) {
    const overallDeltaPct = toPercent(Math.abs(overallDelta), firstDay);
    if (overallDelta > 0) {
      observations.push(
        `Overall, traffic ended ${formatCount(overallDelta)} visitors higher (${formatPercent(overallDeltaPct)} up) than the first day.`,
      );
    } else if (overallDelta < 0) {
      observations.push(
        `Overall, traffic ended ${formatCount(Math.abs(overallDelta))} visitors lower (${formatPercent(overallDeltaPct)} down) than the first day.`,
      );
    } else {
      observations.push(
        "Overall, traffic ended at the same level as the first day.",
      );
    }
  }

  const todayInTimezone = getTodayDateInTimezone(timezone);
  if (toDate === todayInTimezone) {
    observations.push(
      `Note: ${toDate} is today's date in report timezone, so this day's number can still grow by the end of day.`,
    );
  }

  return observations;
};

const fetchVisitorsByDay = async ({ db, fromDate, toDate, timezone }) => {
  const sessions = await getAnalyticsCollection(db, "sessions", [
    "user_sessions",
  ]);

  const nextDate = addDaysToDateString(toDate, 1);
  const rangeStart = new Date(`${fromDate}T00:00:00+05:30`);
  const rangeEndExclusive = new Date(`${nextDate}T00:00:00+05:30`);

  const rows = await sessions
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
            $gte: rangeStart,
            $lt: rangeEndExclusive,
          },
          ...buildBehaviorSessionQualityMatch(),
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$startedAtDate",
              timezone,
            },
          },
          visitors: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  const countByDay = new Map(
    (rows || []).map((item) => [
      String(item?._id || ""),
      Number(item?.visitors || 0),
    ]),
  );

  const dailyVisitors = buildDayList(fromDate, toDate).map((day) => ({
    day,
    visitors: Number(countByDay.get(day) || 0),
  }));

  const totalVisitors = dailyVisitors.reduce(
    (sum, item) => sum + Number(item.visitors || 0),
    0,
  );

  return {
    totalVisitors,
    dailyVisitors,
    fromDate,
    toDate,
    timezone,
  };
};

const writePdf = async ({ report, outputPath }) => {
  await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = fs.createWriteStream(outputPath);

    stream.on("finish", resolve);
    stream.on("error", reject);

    doc.pipe(stream);

    doc
      .fontSize(20)
      .fillColor("#0f172a")
      .text("Visitor Report (Detailed Observations)", { align: "left" });

    doc.moveDown(0.5);
    doc
      .fontSize(11)
      .fillColor("#334155")
      .text(`Dates: ${report.fromDate} to ${report.toDate}`)
      .text(`Timezone: ${report.timezone}`)
      .text(`Generated At: ${new Date().toISOString()}`);

    doc.moveDown(0.9);
    doc
      .fontSize(15)
      .fillColor("#0f172a")
      .text(`Total Visitors: ${formatCount(report.totalVisitors)}`);

    doc.moveDown(0.8);
    doc.fontSize(13).fillColor("#0f172a").text("Day-wise Visitors", {
      underline: true,
    });
    doc.moveDown(0.35);

    for (const item of report.dailyVisitors || []) {
      doc
        .fontSize(11)
        .fillColor("#111827")
        .text(`${item.day}: ${formatCount(item.visitors)}`);
    }

    doc.moveDown(0.8);
    doc
      .fontSize(13)
      .fillColor("#0f172a")
      .text("Detailed Observations (Simple Language)", { underline: true });
    doc.moveDown(0.35);

    const observations = buildDetailedObservations(report.dailyVisitors, {
      fromDate: report.fromDate,
      toDate: report.toDate,
      timezone: report.timezone,
    });
    for (const line of observations) {
      doc.fontSize(11).fillColor("#111827").text(`- ${line}`);
    }

    doc.end();
  });
};

const printUsage = () => {
  console.log("Usage:");
  console.log(
    "  node scripts/generateVisitorsDateRangeObservationsPdf.mjs [--from-date=YYYY-MM-DD] [--to-date=YYYY-MM-DD] [--timezone=Asia/Kolkata] [--output=path]",
  );
};

const validateArgs = (args) => {
  if (!DATE_REGEX.test(args.fromDate) || !DATE_REGEX.test(args.toDate)) {
    throw new Error(
      "Invalid date format. Use YYYY-MM-DD for --from-date and --to-date.",
    );
  }

  if (compareDateStrings(args.fromDate, args.toDate) > 0) {
    throw new Error("--from-date must be less than or equal to --to-date.");
  }
};

const main = async () => {
  dotenv.config({ path: path.resolve(SERVER_ROOT, ".env") });

  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  validateArgs(args);

  const report = await fetchVisitorsByDay({
    db: await getAnalyticsDb(),
    fromDate: args.fromDate,
    toDate: args.toDate,
    timezone: args.timezone,
  });

  const outputPath = resolveOutputPath(args.output, args.fromDate, args.toDate);
  await writePdf({ report, outputPath });

  console.log(`[visitors-range-pdf] Report generated: ${outputPath}`);
  console.log(
    `[visitors-range-pdf] Total visitors=${report.totalVisitors}; Day-wise=${JSON.stringify(report.dailyVisitors)}`,
  );
};

main()
  .catch((error) => {
    console.error(
      "[visitors-range-pdf] Failed to generate report:",
      error?.message || error,
    );
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
