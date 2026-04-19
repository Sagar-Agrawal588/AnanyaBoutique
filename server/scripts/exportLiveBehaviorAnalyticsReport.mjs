import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import PDFDocument from "pdfkit";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import {
  getBehaviorAnalyticsOverview,
  getBehaviorAnalyticsEngagement,
  getBehaviorAnalyticsPerformance,
  getBehaviorSessions,
} from "../controllers/adminAnalytics.controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_ROOT = path.resolve(__dirname, "..");

const formatCount = (value) => Number(value || 0).toLocaleString("en-IN");
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatDuration = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor(toNumber(milliseconds, 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const parseCliArgs = (argv = []) => {
  const args = {
    from: "",
    to: "",
    output: "",
    jsonOutput: "",
    page: "1",
    limit: "250",
    help: false,
  };

  for (const arg of argv) {
    const value = String(arg || "").trim();
    if (!value) continue;

    if (value === "--help" || value === "-h") {
      args.help = true;
      continue;
    }

    if (value.startsWith("--from=")) {
      args.from = value.slice("--from=".length).trim();
      continue;
    }

    if (value.startsWith("--to=")) {
      args.to = value.slice("--to=".length).trim();
      continue;
    }

    if (value.startsWith("--output=")) {
      args.output = value.slice("--output=".length).trim();
      continue;
    }

    if (value.startsWith("--json-output=")) {
      args.jsonOutput = value.slice("--json-output=".length).trim();
      continue;
    }

    if (value.startsWith("--page=")) {
      args.page = value.slice("--page=".length).trim();
      continue;
    }

    if (value.startsWith("--limit=")) {
      args.limit = value.slice("--limit=".length).trim();
    }
  }

  return args;
};

const resolveDateRange = (fromArg, toArg) => {
  const now = new Date();
  const defaultFrom = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - 1,
      0,
      0,
      0,
      0,
    ),
  );

  const from = fromArg ? new Date(fromArg) : defaultFrom;
  const to = toArg ? new Date(toArg) : now;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid --from or --to date. Use ISO format, e.g. 2026-04-18T00:00:00.000Z");
  }

  if (from > to) {
    return { from: to, to: from };
  }

  return { from, to };
};

const resolveOutputPath = (provided, filename) => {
  const cleaned = String(provided || "").trim();
  if (cleaned) {
    return path.isAbsolute(cleaned)
      ? cleaned
      : path.resolve(process.cwd(), cleaned);
  }

  return path.resolve(SERVER_ROOT, "..", "output", filename);
};

const buildFakeReq = (query = {}, params = {}) => ({
  query,
  params,
});

const invokeController = async (handler, req) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ statusCode: this.statusCode, payload });
        return this;
      },
    };

    Promise.resolve(handler(req, res)).catch(reject);
  });

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

const writeList = (doc, rows = []) => {
  const normalizedRows = (rows || [])
    .map((row) => String(row || "").trim())
    .filter(Boolean);

  if (!normalizedRows.length) {
    ensureSpace(doc, 22);
    doc.fontSize(11).fillColor("#475569").text("No data available.");
    return;
  }

  for (const row of normalizedRows) {
    ensureSpace(doc, 22);
    doc.fontSize(11).fillColor("#111827").text(`- ${row}`);
  }
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
      .fontSize(22)
      .fillColor("#0f172a")
      .text("Live Behavior Analytics Report", { align: "left" });

    doc.moveDown(0.4);
    doc
      .fontSize(11)
      .fillColor("#334155")
      .text(`From: ${report.scope.from}`)
      .text(`To: ${report.scope.to}`)
      .text(`Generated At: ${report.generatedAt}`);

    writeSection(doc, "Overview");
    writeList(doc, [
      `Total Sessions: ${formatCount(report.overview.totalSessions)}`,
      `Active Users: ${formatCount(report.overview.activeUsers)}`,
      `Average Active Time: ${formatDuration(report.overview.avgActiveTimeMs)}`,
      `Bounce Rate: ${toNumber(report.overview.bounceRate).toFixed(2)}%`,
      `Conversion Rate: ${toNumber(report.overview.conversionRate).toFixed(2)}%`,
      `Revenue: INR ${formatCount(report.overview.revenue)}`,
    ]);

    writeSection(doc, "Session Totals");
    writeList(doc, [
      `All Sessions: ${formatCount(report.sessions?.totals?.all)}`,
      `Guest Sessions: ${formatCount(report.sessions?.totals?.guest)}`,
      `Logged-in Sessions: ${formatCount(report.sessions?.totals?.loggedIn)}`,
      `Page: ${formatCount(report.sessions?.pagination?.page)} / ${formatCount(report.sessions?.pagination?.totalPages)}`,
    ]);

    writeSection(doc, "Session Explorer Rows");
    writeList(
      doc,
      (report.sessions?.items || []).map((item) => {
        const type = item?.userId ? "Logged In" : "Guest";
        return `${item.sessionId} | ${type} | user: ${item.userId || "-"} | ip: ${item.ipAddress || "-"} | events: ${formatCount(item.eventCount)} | views: ${formatCount(item.pageViews)} | active: ${formatDuration(item.totalActiveTime)} | started: ${item.startedAt || "-"}`;
      }),
    );

    writeSection(doc, "User Type Matrix");
    writeList(doc, [
      `Guest: sessions ${formatCount(report.engagement?.userTypeMatrix?.guest?.sessions)} | events ${formatCount(report.engagement?.userTypeMatrix?.guest?.events)} | click ${formatCount(report.engagement?.userTypeMatrix?.guest?.clickEvents)} | rage ${formatCount(report.engagement?.userTypeMatrix?.guest?.rageClicks)}`,
      `Logged In: sessions ${formatCount(report.engagement?.userTypeMatrix?.logged_in?.sessions)} | events ${formatCount(report.engagement?.userTypeMatrix?.logged_in?.events)} | click ${formatCount(report.engagement?.userTypeMatrix?.logged_in?.clickEvents)} | rage ${formatCount(report.engagement?.userTypeMatrix?.logged_in?.rageClicks)}`,
    ]);

    writeSection(doc, "Movement By Event");
    writeList(
      doc,
      Object.entries(report.engagement?.movementByEvent || {}).map(
        ([eventName, value]) =>
          `${eventName} | total ${formatCount(value?.total)} | guest ${formatCount(value?.guest)} | logged-in ${formatCount(value?.loggedIn)} | avg duration ${formatDuration(value?.avgDurationMs)}`,
      ),
    );

    writeSection(doc, "Most Interacted Buttons");
    writeList(
      doc,
      (report.engagement?.movementTargets || []).map(
        (row) => `${row.target} | total ${formatCount(row.total)} | guest ${formatCount(row.guest)} | logged-in ${formatCount(row.loggedIn)}`,
      ),
    );

    writeSection(doc, "Most Attractive Buttons");
    writeList(
      doc,
      (report.engagement?.attractiveButtons || []).map(
        (row) => `${row.target} | score ${toNumber(row.score).toFixed(2)} | interactions ${formatCount(row.totalInteractions)} | pre-click dwell ${formatDuration(row.avgPreClickDwellMs)} | rage ${formatCount(row.rageClicks)} | guest ${formatCount(row.guestEvents)} | logged-in ${formatCount(row.loggedInEvents)}`,
      ),
    );

    writeSection(doc, "Top Converting Buttons By Product");
    writeList(
      doc,
      (report.engagement?.topConvertingButtonsByProduct || []).map(
        (row) => `${row.target} | product ${row.productId} | clicked sessions ${formatCount(row.sessionsClicked)} | purchase sessions ${formatCount(row.sessionsWithPurchase)} | click->purchase ${toNumber(row.clickToPurchaseRate).toFixed(2)}%`,
      ),
    );

    writeSection(doc, "Section Engagement (Top)");
    writeList(
      doc,
      (report.engagement?.sectionEngagementHeatmap || []).map(
        (row) => `${row.sectionName} on ${row.pageUrl || "-"} | views ${formatCount(row.views)} | avg duration ${formatDuration(row.avgDurationMs)}`,
      ),
    );

    writeSection(doc, "Banner Performance");
    writeList(
      doc,
      (report.engagement?.bannerPerformance || []).map(
        (row) => `${row.target || row.bannerName || row.bannerId || "banner"} | interactions ${formatCount(row.totalInteractions)} | clicks ${formatCount(row.clicks)} | guest ${formatCount(row.guestClicks)} | logged-in ${formatCount(row.loggedInClicks)}`,
      ),
    );

    writeSection(doc, "Performance");
    writeList(doc, [
      `Worker total: ${formatCount(report.performance?.workerHealth?.totalWorkers)}`,
      `Worker healthy: ${formatCount(report.performance?.workerHealth?.healthyWorkers)}`,
      `Worker unhealthy: ${formatCount(report.performance?.workerHealth?.unhealthyWorkers)}`,
      `Estimated backlog: ${formatCount(report.performance?.pubSubBacklog?.estimatedMessages)}`,
    ]);

    writeSection(doc, "Events Per Minute (Last 60 Minutes)");
    writeList(
      doc,
      (report.performance?.eventsPerMinute || []).map(
        (row) => `${row.minute}: ${formatCount(row.events)} events`,
      ),
    );

    doc.end();
  });
};

const printUsage = () => {
  console.log("Usage:");
  console.log(
    "  node scripts/exportLiveBehaviorAnalyticsReport.mjs [--from=ISO] [--to=ISO] [--output=pdfPath] [--json-output=jsonPath] [--page=1] [--limit=250]",
  );
};

const main = async () => {
  dotenv.config({ path: path.resolve(SERVER_ROOT, ".env") });

  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const { from, to } = resolveDateRange(args.from, args.to);
  const dayKey = `${from.toISOString().slice(0, 10)}_to_${to.toISOString().slice(0, 10)}`;

  const pdfPath = resolveOutputPath(
    args.output,
    `live-behavior-analytics-report-${dayKey}.pdf`,
  );
  const jsonPath = resolveOutputPath(
    args.jsonOutput,
    `live-behavior-analytics-data-${dayKey}.json`,
  );

  const query = {
    from: from.toISOString(),
    to: to.toISOString(),
    page: String(args.page || "1"),
    limit: String(args.limit || "250"),
    type: "all",
  };

  const [overviewRes, engagementRes, performanceRes, sessionsRes] =
    await Promise.all([
      invokeController(getBehaviorAnalyticsOverview, buildFakeReq(query)),
      invokeController(getBehaviorAnalyticsEngagement, buildFakeReq(query)),
      invokeController(getBehaviorAnalyticsPerformance, buildFakeReq({})),
      invokeController(getBehaviorSessions, buildFakeReq(query)),
    ]);

  const failed = [overviewRes, engagementRes, performanceRes, sessionsRes].find(
    (result) => result?.statusCode >= 400 || result?.payload?.success !== true,
  );

  if (failed) {
    throw new Error(
      failed?.payload?.message || "Failed to fetch one or more behavior analytics datasets",
    );
  }

  const report = {
    generatedAt: new Date().toISOString(),
    scope: {
      from: query.from,
      to: query.to,
      page: query.page,
      limit: query.limit,
      source: "Live behavior analytics controllers",
    },
    overview: overviewRes.payload.data,
    engagement: engagementRes.payload.data,
    performance: performanceRes.payload.data,
    sessions: {
      ...(sessionsRes.payload.data || {}),
      items: sessionsRes.payload.data?.items || [],
      pagination: sessionsRes.payload.data?.pagination || {},
      totals: sessionsRes.payload.data?.totals || {},
    },
  };

  await fsPromises.mkdir(path.dirname(jsonPath), { recursive: true });
  await fsPromises.writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");

  await writePdf({ report, outputPath: pdfPath });

  console.log(`[behavior-live] PDF generated: ${pdfPath}`);
  console.log(`[behavior-live] JSON generated: ${jsonPath}`);
  console.log(
    `[behavior-live] Snapshot=${JSON.stringify({
      totalSessions: report.overview?.totalSessions,
      activeUsers: report.overview?.activeUsers,
      bounceRate: report.overview?.bounceRate,
      conversionRate: report.overview?.conversionRate,
      revenue: report.overview?.revenue,
      sessionsAll: report.sessions?.totals?.all,
      sessionsGuest: report.sessions?.totals?.guest,
      sessionsLoggedIn: report.sessions?.totals?.loggedIn,
      sessionRows: report.sessions?.items?.length,
    })}`,
  );
};

main().catch((error) => {
  console.error("[behavior-live] Failed:", error?.message || error);
  process.exitCode = 1;
});
