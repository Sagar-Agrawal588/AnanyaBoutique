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

    if (value.startsWith("--output=")) {
      args.output = value.slice("--output=".length).trim();
    }
  }

  return args;
};

const resolveLastWeekRange = () => {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);

  const dayKey = `${to.getUTCFullYear()}-${String(to.getUTCMonth() + 1).padStart(2, "0")}-${String(to.getUTCDate()).padStart(2, "0")}`;

  return {
    from,
    to,
    dayKey,
    rangeLabel: "Last 7 days",
  };
};

const resolveOutputPath = (outputArg, dayKey) => {
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
    `last-week-visitors-report-${dayKey}.pdf`,
  );
};

const formatCount = (value) => Number(value || 0).toLocaleString("en-IN");

const fetchLastWeekVisitors = async ({ db, from, to }) => {
  const sessions = await getAnalyticsCollection(db, "sessions", ["user_sessions"]);

  const [totalRows, dailyRows] = await Promise.all([
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
        { $count: "totalVisitors" },
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
            ...buildBehaviorSessionQualityMatch(),
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
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
  ]);

  const totalVisitors = Number(totalRows?.[0]?.totalVisitors || 0);

  return {
    totalVisitors,
    dailyVisitors: (dailyRows || []).map((row) => ({
      day: String(row?._id || ""),
      visitors: Number(row?.visitors || 0),
    })),
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
      .text("Last Week Visitor Report", { align: "left" });

    doc.moveDown(0.4);
    doc
      .fontSize(11)
      .fillColor("#334155")
      .text(`Range: ${report.rangeLabel} (UTC)`)
      .text(`From: ${report.fromIso}`)
      .text(`To: ${report.toIso} (exclusive)`)
      .text(`Generated At: ${report.generatedAtIso}`);

    doc.moveDown(1.1);
    doc
      .fontSize(16)
      .fillColor("#0f172a")
      .text(`Total people came to site: ${formatCount(report.totalVisitors)}`);

    doc.moveDown(1.0);
    doc
      .fontSize(14)
      .fillColor("#0f172a")
      .text("Day-wise Visitors", { underline: true });

    doc.moveDown(0.4);

    if (!report.dailyVisitors.length) {
      doc.fontSize(11).fillColor("#475569").text("No visitor sessions found in the last 7 days.");
    } else {
      for (const item of report.dailyVisitors) {
        doc
          .fontSize(11)
          .fillColor("#111827")
          .text(`${item.day}: ${formatCount(item.visitors)}`);
      }
    }

    doc.end();
  });
};

const printUsage = () => {
  console.log("Usage:");
  console.log("  node scripts/generateLastWeekVisitorsPdf.mjs [--output=path]");
};

const main = async () => {
  dotenv.config({ path: path.resolve(SERVER_ROOT, ".env") });

  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const range = resolveLastWeekRange();
  const outputPath = resolveOutputPath(args.output, range.dayKey);

  const db = await getAnalyticsDb();
  const metrics = await fetchLastWeekVisitors({
    db,
    from: range.from,
    to: range.to,
  });

  const reportPayload = {
    rangeLabel: range.rangeLabel,
    fromIso: range.from.toISOString(),
    toIso: range.to.toISOString(),
    generatedAtIso: new Date().toISOString(),
    ...metrics,
  };

  await writePdf(reportPayload, outputPath);

  console.log(`[visitors-pdf] Report generated: ${outputPath}`);
  console.log(`[visitors-pdf] Last-week visitors=${metrics.totalVisitors}`);
};

main()
  .catch((error) => {
    console.error("[visitors-pdf] Failed to generate report:", error?.message || error);
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
