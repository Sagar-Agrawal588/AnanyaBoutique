import dotenv from "dotenv";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import PDFDocument from "pdfkit";
import { fileURLToPath } from "url";
import {
  getBehaviorAnalyticsEngagement,
  getBehaviorAnalyticsOverview,
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
  const totalSeconds = Math.max(
    0,
    Math.floor(toNumber(milliseconds, 0) / 1000),
  );
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const formatPercent = (value, digits = 2) =>
  `${toNumber(value).toFixed(digits)}%`;
const formatCurrency = (value) =>
  `INR ${formatCount(Math.round(toNumber(value, 0)))}`;

const humanizeLabel = (value, fallback = "-") => {
  const text = String(value || "").trim();
  if (!text) return fallback;

  return text
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const shortSessionId = (value) => {
  const text = String(value || "").trim();
  if (!text) return "-";
  if (text.length <= 12) return text;
  return `${text.slice(0, 12)}...`;
};

const buildBeginnerInsights = (report = {}) => {
  const insights = [];

  const totalSessions = toNumber(report?.overview?.totalSessions);
  const activeUsers = toNumber(report?.overview?.activeUsers);
  const bounceRate = toNumber(report?.overview?.bounceRate);
  const conversionRate = toNumber(report?.overview?.conversionRate);
  const revenue = toNumber(report?.overview?.revenue);
  const guestSessions = toNumber(report?.sessions?.totals?.guest);
  const loggedInSessions = toNumber(report?.sessions?.totals?.loggedIn);
  const rageClicks = toNumber(report?.engagement?.rageClickCount);
  const topButton = report?.engagement?.movementTargets?.[0];
  const topAttractiveButton = report?.engagement?.attractiveButtons?.[0];

  if (totalSessions > 0) {
    insights.push(
      `This report covers ${formatCount(totalSessions)} total visit sessions in the selected time range.`,
    );
  }

  if (guestSessions >= loggedInSessions) {
    insights.push(
      `Most visits were from guests (not signed in): ${formatCount(guestSessions)} guest sessions vs ${formatCount(loggedInSessions)} logged-in sessions.`,
    );
  } else {
    insights.push(
      `Most visits were from logged-in users: ${formatCount(loggedInSessions)} logged-in sessions vs ${formatCount(guestSessions)} guest sessions.`,
    );
  }

  if (bounceRate >= 60) {
    insights.push(
      `Bounce rate is ${formatPercent(bounceRate)}, which means many visitors are leaving quickly after a short interaction.`,
    );
  } else if (bounceRate > 0) {
    insights.push(
      `Bounce rate is ${formatPercent(bounceRate)}, showing that a fair portion of visitors continue beyond their first interaction.`,
    );
  }

  if (conversionRate > 0) {
    insights.push(
      `Conversion rate is ${formatPercent(conversionRate)}. This is the share of sessions that ended in a purchase action.`,
    );
  }

  if (activeUsers > 0) {
    insights.push(
      `At report time, ${formatCount(activeUsers)} users were active.`,
    );
  }

  insights.push(
    `Estimated revenue attributed in this window: ${formatCurrency(revenue)}.`,
  );

  if (topButton?.target) {
    insights.push(
      `Most interacted button/element: "${topButton.target}" with ${formatCount(topButton.total)} interactions.`,
    );
  }

  if (topAttractiveButton?.target) {
    insights.push(
      `Most attention-grabbing button: "${topAttractiveButton.target}" with attention score ${toNumber(topAttractiveButton.score).toFixed(2)}.`,
    );
  }

  if (rageClicks > 0) {
    insights.push(
      `Rage clicks detected: ${formatCount(rageClicks)}. Rage clicks are repeated rapid clicks, often indicating user frustration.`,
    );
  }

  return insights;
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
    throw new Error(
      "Invalid --from or --to date. Use ISO format, e.g. 2026-04-18T00:00:00.000Z",
    );
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
    doc
      .fontSize(11)
      .fillColor("#475569")
      .text("No data found for this time range.");
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
      .text("Live Behavior Analytics Report (Beginner Friendly)", {
        align: "left",
      });

    doc.moveDown(0.4);
    doc
      .fontSize(11)
      .fillColor("#334155")
      .text(`From: ${report.scope.from}`)
      .text(`To: ${report.scope.to}`)
      .text(`Generated At: ${report.generatedAt}`);

    writeSection(doc, "How To Read This Report");
    writeList(doc, [
      "A session means one visitor journey (from entry to exit).",
      "Guest means not signed in. Logged-in means signed in.",
      "Bounce rate means visitors who leave quickly after minimal interaction.",
      "Conversion rate means sessions that completed a purchase action.",
      "Rage clicks means repeated fast clicks and may indicate confusion/frustration.",
      "Use this report to understand what visitors did and where they struggled.",
    ]);

    writeSection(doc, "Plain-English Highlights");
    writeList(doc, buildBeginnerInsights(report));

    writeSection(doc, "Quick Summary (What happened in this time range?)");
    writeList(doc, [
      `Total visit sessions: ${formatCount(report.overview.totalSessions)}`,
      `Users active right now: ${formatCount(report.overview.activeUsers)}`,
      `Average active time per session: ${formatDuration(report.overview.avgActiveTimeMs)}`,
      `Bounce rate: ${formatPercent(report.overview.bounceRate)}`,
      `Conversion rate: ${formatPercent(report.overview.conversionRate)}`,
      `Revenue estimate: ${formatCurrency(report.overview.revenue)}`,
    ]);

    writeSection(doc, "Who visited?");
    writeList(doc, [
      `All sessions: ${formatCount(report.sessions?.totals?.all)}`,
      `Guest sessions (not signed in): ${formatCount(report.sessions?.totals?.guest)}`,
      `Logged-in sessions: ${formatCount(report.sessions?.totals?.loggedIn)}`,
      `Report page in dataset: ${formatCount(report.sessions?.pagination?.page)} of ${formatCount(report.sessions?.pagination?.totalPages)}`,
    ]);

    writeSection(doc, "Recent Visit Snapshots (simple view)");
    writeList(
      doc,
      (report.sessions?.items || []).map((item) => {
        const visitorType = item?.userId
          ? "Logged-in visitor"
          : "Guest visitor";
        return `Session ${shortSessionId(item.sessionId)} | ${visitorType} | pages viewed: ${formatCount(item.pageViews)} | actions: ${formatCount(item.eventCount)} | active time: ${formatDuration(item.totalActiveTime)} | started: ${item.startedAt || "-"}`;
      }),
    );

    writeSection(doc, "Guest vs Logged-in Activity");
    writeList(doc, [
      `Guest visitors: ${formatCount(report.engagement?.userTypeMatrix?.guest?.sessions)} sessions | ${formatCount(report.engagement?.userTypeMatrix?.guest?.events)} actions | ${formatCount(report.engagement?.userTypeMatrix?.guest?.clickEvents)} clicks | ${formatCount(report.engagement?.userTypeMatrix?.guest?.rageClicks)} rage clicks`,
      `Logged-in visitors: ${formatCount(report.engagement?.userTypeMatrix?.logged_in?.sessions)} sessions | ${formatCount(report.engagement?.userTypeMatrix?.logged_in?.events)} actions | ${formatCount(report.engagement?.userTypeMatrix?.logged_in?.clickEvents)} clicks | ${formatCount(report.engagement?.userTypeMatrix?.logged_in?.rageClicks)} rage clicks`,
    ]);

    writeSection(doc, "What Actions People Performed Most");
    writeList(
      doc,
      Object.entries(report.engagement?.movementByEvent || {}).map(
        ([eventName, value]) =>
          `${humanizeLabel(eventName)} | total: ${formatCount(value?.total)} | guest: ${formatCount(value?.guest)} | logged-in: ${formatCount(value?.loggedIn)} | avg active time: ${formatDuration(value?.avgDurationMs)}`,
      ),
    );

    writeSection(doc, "Most Clicked Buttons/Elements");
    writeList(
      doc,
      (report.engagement?.movementTargets || []).map(
        (row) =>
          `${row.target} | total interactions: ${formatCount(row.total)} | guest: ${formatCount(row.guest)} | logged-in: ${formatCount(row.loggedIn)}`,
      ),
    );

    writeSection(doc, "Buttons That Attracted Attention");
    writeList(
      doc,
      (report.engagement?.attractiveButtons || []).map(
        (row) =>
          `${row.target} | attention score: ${toNumber(row.score).toFixed(2)} | interactions: ${formatCount(row.totalInteractions)} | avg wait before click: ${formatDuration(row.avgPreClickDwellMs)} | rage clicks: ${formatCount(row.rageClicks)} | guest: ${formatCount(row.guestEvents)} | logged-in: ${formatCount(row.loggedInEvents)}`,
      ),
    );

    writeSection(doc, "Buttons That Led To Purchases");
    writeList(
      doc,
      (report.engagement?.topConvertingButtonsByProduct || []).map(
        (row) =>
          `${row.target} | product: ${row.productId} | sessions with click: ${formatCount(row.sessionsClicked)} | sessions with purchase: ${formatCount(row.sessionsWithPurchase)} | click-to-purchase: ${formatPercent(row.clickToPurchaseRate)}`,
      ),
    );

    writeSection(doc, "Sections Where Visitors Spent Time");
    writeList(
      doc,
      (report.engagement?.sectionEngagementHeatmap || []).map(
        (row) =>
          `${row.sectionName} on ${row.pageUrl || "-"} | views: ${formatCount(row.views)} | avg time spent: ${formatDuration(row.avgDurationMs)}`,
      ),
    );

    writeSection(doc, "Banner Performance");
    writeList(
      doc,
      (report.engagement?.bannerPerformance || []).map(
        (row) =>
          `${row.target || row.bannerName || row.bannerId || "banner"} | interactions: ${formatCount(row.totalInteractions)} | clicks: ${formatCount(row.clicks)} | guest clicks: ${formatCount(row.guestClicks)} | logged-in clicks: ${formatCount(row.loggedInClicks)}`,
      ),
    );

    writeSection(doc, "System Health Snapshot");
    writeList(doc, [
      `Total background workers: ${formatCount(report.performance?.workerHealth?.totalWorkers)}`,
      `Healthy workers: ${formatCount(report.performance?.workerHealth?.healthyWorkers)}`,
      `Unhealthy workers: ${formatCount(report.performance?.workerHealth?.unhealthyWorkers)}`,
      `Estimated event backlog: ${formatCount(report.performance?.pubSubBacklog?.estimatedMessages)}`,
    ]);

    writeSection(doc, "Activity Trend By Minute (Last 60 Minutes)");
    writeList(
      doc,
      (report.performance?.eventsPerMinute || []).map(
        (row) => `${row.minute}: ${formatCount(row.events)} tracked actions`,
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
      failed?.payload?.message ||
        "Failed to fetch one or more behavior analytics datasets",
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
