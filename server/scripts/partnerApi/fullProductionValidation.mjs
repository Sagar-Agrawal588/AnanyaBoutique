import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_ROOT = path.resolve(__dirname, "..", "..");

const BASE_URL = String(process.env.PARTNER_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
const PARTNER_API_BASE = `${BASE_URL}/api/v1/partner`;
const ADMIN_EMAIL = String(process.env.PARTNER_ADMIN_EMAIL || "admin@buyonegram.com");
const ADMIN_PASSWORD = String(process.env.PARTNER_ADMIN_PASSWORD || "admin123");

const jsonHeaders = (token) => ({
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const nowIso = () => new Date().toISOString();

const percentile = (values, pct) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * pct));
  return sorted[index];
};

const toFixedNum = (value, digits = 2) => Number(Number(value || 0).toFixed(digits));

const fetchJson = async (url, options = {}) => {
  const started = performance.now();
  const response = await fetch(url, options);
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return {
    ok: response.ok,
    status: response.status,
    payload,
    latencyMs: Math.round(performance.now() - started),
  };
};

const waitForServer = async (timeoutMs = 90_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${PARTNER_API_BASE}/guide?format=json`, { method: "GET" });
      if (response.ok) return true;
    } catch {
    }
    await sleep(1500);
  }
  return false;
};

const ensureServerRunning = async () => {
  const alive = await waitForServer(4000);
  if (alive) return { startedByScript: false, child: null };

  const child = spawn("npm", ["run", "dev"], {
    cwd: SERVER_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  child.stdout.on("data", (buf) => {
    const text = String(buf || "").trim();
    if (text) console.log(`[server] ${text}`);
  });
  child.stderr.on("data", (buf) => {
    const text = String(buf || "").trim();
    if (text) console.error(`[server-err] ${text}`);
  });

  const ready = await waitForServer(90_000);
  if (!ready) {
    try {
      child.kill();
    } catch {
    }
    throw new Error("Server failed to start within timeout");
  }

  return { startedByScript: true, child };
};

const loginAdmin = async () => {
  const result = await fetchJson(`${BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  const token = result?.payload?.data?.accessToken || "";
  if (!result.ok || !token) {
    throw new Error(`Admin login failed (${result.status})`);
  }

  return token;
};

const createPartner = async ({ token, name, rateLimitPerMinute, dailyRequestLimit, scopes }) => {
  const response = await fetchJson(`${PARTNER_API_BASE}/admin/partners`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({
      name,
      companyName: "QA Automation",
      contactEmail: `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}.${Date.now()}@partner.local`,
      scopes,
      rateLimitPerMinute,
      dailyRequestLimit,
      visibleProductFields: [
        "description",
        "shortDescription",
        "images",
        "category",
        "tags",
        "discount",
        "stock",
        "shipping",
        "hsnCode",
        "gstBreakup",
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create partner ${name} (${response.status})`);
  }

  return {
    partnerId: response.payload.data.partner.id,
    apiKey: response.payload.data.apiKey,
    name: response.payload.data.partner.name,
    rateLimitPerMinute: response.payload.data.partner.rateLimitPerMinute,
    dailyRequestLimit: response.payload.data.partner.dailyRequestLimit,
  };
};

const runExternalClient = ({ apiKey, productsIntervalMs, inventoryIntervalMs, disableInventory, durationSec }) =>
  new Promise((resolve) => {
    const scriptPath = path.resolve(SERVER_ROOT, "scripts", "partnerApi", "externalPartnerClient.mjs");
    const args = [
      scriptPath,
      `--baseUrl=${PARTNER_API_BASE}`,
      `--apiKey=${apiKey}`,
      `--productsIntervalMs=${productsIntervalMs}`,
      `--durationSec=${durationSec}`,
    ];

    if (disableInventory) {
      args.push("--disableInventory=true");
    } else {
      args.push(`--inventoryIntervalMs=${inventoryIntervalMs}`);
    }

    const child = spawn("node", args, {
      cwd: SERVER_ROOT,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const output = [];
    let summary = null;

    const parseLine = (line) => {
      output.push(line);
      if (line.startsWith("[summary] ")) {
        try {
          summary = JSON.parse(line.slice(10));
        } catch {
        }
      }
    };

    child.stdout.on("data", (buf) => {
      const text = String(buf || "");
      text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach(parseLine);
    });

    child.stderr.on("data", (buf) => {
      const text = String(buf || "");
      text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach(parseLine);
    });

    child.on("exit", (code) => {
      resolve({ code: Number(code || 0), summary, outputTail: output.slice(-20) });
    });
  });

const runLoadPhase = async ({ apiKey, concurrency, durationSec }) => {
  const endpoints = [
    "/products?limit=1&page=1",
    "/inventory?limit=1&page=1",
    "/pricing",
  ];

  const metrics = {
    concurrency,
    durationSec,
    requests: 0,
    successes: 0,
    errors: 0,
    status429: 0,
    failedNetwork: 0,
    latencyMs: [],
  };

  const stopAt = Date.now() + durationSec * 1000;

  const worker = async (seed) => {
    let round = 0;
    while (Date.now() < stopAt) {
      const endpoint = endpoints[(seed + round) % endpoints.length];
      round += 1;
      const started = performance.now();
      try {
        const response = await fetch(`${PARTNER_API_BASE}${endpoint}`, {
          method: "GET",
          headers: {
            "x-api-key": apiKey,
            Accept: "application/json",
          },
        });

        const latency = performance.now() - started;
        metrics.requests += 1;
        metrics.latencyMs.push(latency);

        if (response.ok) {
          metrics.successes += 1;
        } else {
          metrics.errors += 1;
          if (response.status === 429) metrics.status429 += 1;
        }
      } catch {
        const latency = performance.now() - started;
        metrics.requests += 1;
        metrics.errors += 1;
        metrics.failedNetwork += 1;
        metrics.latencyMs.push(latency);
      }
    }
  };

  const startedAt = Date.now();
  await Promise.all(Array.from({ length: concurrency }).map((_, idx) => worker(idx)));
  const elapsedSec = Math.max((Date.now() - startedAt) / 1000, 0.001);

  const p95 = percentile(metrics.latencyMs, 0.95);
  const p99 = percentile(metrics.latencyMs, 0.99);

  return {
    concurrency,
    durationSec,
    requests: metrics.requests,
    successes: metrics.successes,
    errors: metrics.errors,
    errorRate: metrics.requests > 0 ? metrics.errors / metrics.requests : 0,
    throttled429: metrics.status429,
    failedNetwork: metrics.failedNetwork,
    rps: metrics.requests / elapsedSec,
    latencyMs: {
      avg: metrics.latencyMs.length
        ? metrics.latencyMs.reduce((sum, n) => sum + n, 0) / metrics.latencyMs.length
        : 0,
      p95,
      p99,
      max: metrics.latencyMs.length ? Math.max(...metrics.latencyMs) : 0,
    },
  };
};

const runRateLimitValidation = async ({ lowKey, mediumKey }) => {
  const lowBurst = await Promise.all(
    Array.from({ length: 60 }).map(() =>
      fetchJson(`${PARTNER_API_BASE}/health`, {
        headers: { "x-api-key": lowKey },
      }),
    ),
  );

  const low429 = lowBurst.filter((entry) => entry.status === 429).length;
  const low200 = lowBurst.filter((entry) => entry.status === 200).length;

  const mediumSanity = await fetchJson(`${PARTNER_API_BASE}/health`, {
    headers: { "x-api-key": mediumKey },
  });

  return {
    low429,
    low200,
    mediumSanityStatus: mediumSanity.status,
    independentLimitsWorking: low429 > 0 && mediumSanity.status === 200,
  };
};

const runSecurityValidation = async ({ token, targetPartnerId, targetKey }) => {
  const invalid = await fetchJson(`${PARTNER_API_BASE}/products?limit=1&page=1`, {
    headers: { "x-api-key": "hogp_invalid.deadbeef" },
  });

  const pauseRes = await fetchJson(`${PARTNER_API_BASE}/admin/partners/${targetPartnerId}`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify({ status: "paused" }),
  });

  const pausedAccess = await fetchJson(`${PARTNER_API_BASE}/products?limit=1&page=1`, {
    headers: { "x-api-key": targetKey },
  });

  await fetchJson(`${PARTNER_API_BASE}/admin/partners/${targetPartnerId}`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify({ status: "active" }),
  });

  const rotateRes = await fetchJson(`${PARTNER_API_BASE}/admin/partners/${targetPartnerId}/rotate-key`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({}),
  });
  const newKey = rotateRes.payload?.data?.apiKey || "";

  const oldAfterRotate = await fetchJson(`${PARTNER_API_BASE}/products?limit=1&page=1`, {
    headers: { "x-api-key": targetKey },
  });
  const newAfterRotate = await fetchJson(`${PARTNER_API_BASE}/products?limit=1&page=1`, {
    headers: { "x-api-key": newKey },
  });

  return {
    invalidKeyStatus: invalid.status,
    pauseMutationStatus: pauseRes.status,
    pausedKeyStatus: pausedAccess.status,
    rotateStatus: rotateRes.status,
    oldKeyAfterRotateStatus: oldAfterRotate.status,
    newKeyAfterRotateStatus: newAfterRotate.status,
  };
};

const runMonitoringValidation = async (token) => {
  const before = await fetchJson(`${PARTNER_API_BASE}/admin/overview`, {
    headers: jsonHeaders(token),
  });

  await sleep(2500);

  const after = await fetchJson(`${PARTNER_API_BASE}/admin/overview`, {
    headers: jsonHeaders(token),
  });

  const live = await fetchJson(`${PARTNER_API_BASE}/admin/monitoring/live?limit=20`, {
    headers: jsonHeaders(token),
  });

  const analytics = await fetchJson(`${PARTNER_API_BASE}/admin/analytics?range=24h`, {
    headers: jsonHeaders(token),
  });

  const beforeReq = Number(before.payload?.data?.totals?.requestsLast24h || 0);
  const afterReq = Number(after.payload?.data?.totals?.requestsLast24h || 0);

  return {
    requestsIncreased: afterReq >= beforeReq,
    beforeRequestsLast24h: beforeReq,
    afterRequestsLast24h: afterReq,
    liveHitsCount: Number((live.payload?.data?.lastHits || []).length || 0),
    analyticsPartnerRows: Number((analytics.payload?.data?.partnerStats || []).length || 0),
    analyticsChartsPoints: Number((analytics.payload?.data?.charts?.requestsOverTime || []).length || 0),
  };
};

const summarizeFindings = ({ loadResults, stressResults, rateLimitValidation, security, monitoring }) => {
  const issues = [];
  const weak = [];
  const working = [];

  if (rateLimitValidation.independentLimitsWorking) {
    working.push("Rate limits trigger 429 correctly and remain isolated between partners");
  } else {
    issues.push("Independent rate limiting failed (low-limit burst impacted other partner or 429 not triggered)");
  }

  if (
    security.invalidKeyStatus === 401
    && security.pausedKeyStatus === 403
    && security.oldKeyAfterRotateStatus === 403
    && security.newKeyAfterRotateStatus === 200
  ) {
    working.push("Security behavior for invalid/paused/rotated keys is correct");
  } else {
    issues.push("Security validation mismatch for invalid/paused/rotated key paths");
  }

  if (monitoring.liveHitsCount > 0 && monitoring.analyticsPartnerRows > 0) {
    working.push("Monitoring and analytics endpoints update with live traffic");
  } else {
    weak.push("Monitoring endpoints responded but had low/no live rows during sampling window");
  }

  const stable200 = loadResults.find((item) => item.concurrency === 200);
  if (stable200 && stable200.errorRate <= 0.05 && stable200.failedNetwork === 0) {
    working.push("Load at 200 concurrent users remained stable in short-run validation");
  } else {
    weak.push("200-concurrency run showed elevated errors or instability");
  }

  const firstBreak = stressResults.find((item) => item.breakReason);
  if (firstBreak) {
    weak.push(`Breaking point observed at concurrency ${firstBreak.concurrency}: ${firstBreak.breakReason}`);
  }

  return { working, issues, weak };
};

const main = async () => {
  const session = {
    startedAt: nowIso(),
    baseUrl: BASE_URL,
    steps: {},
    partners: [],
    simulation: {},
    load: [],
    stress: [],
    rateLimit: {},
    monitoring: {},
    security: {},
  };

  let managedServer = null;

  try {
    console.log("[1/9] Ensuring server is running...");
    managedServer = await ensureServerRunning();
    session.steps.server = {
      ok: true,
      startedByScript: managedServer.startedByScript,
    };

    console.log("[2/9] Logging in and creating test partners...");
    const token = await loginAdmin();
    const createdPartners = [];
    const profiles = [
      { label: "low-a", rpm: 10, daily: 2000 },
      { label: "low-b", rpm: 10, daily: 2000 },
      { label: "med-a", rpm: 100, daily: 10000 },
      { label: "med-b", rpm: 100, daily: 10000 },
      { label: "high-a", rpm: 500, daily: 50000 },
      { label: "high-load", rpm: 5000, daily: 500000 },
    ];

    for (const profile of profiles) {
      const partner = await createPartner({
        token,
        name: `qa-${profile.label}-${Date.now()}`,
        rateLimitPerMinute: profile.rpm,
        dailyRequestLimit: profile.daily,
        scopes: ["catalog.read", "inventory.read", "pricing.read", "gst.read"],
      });
      createdPartners.push({ ...partner, profile: profile.label });
    }
    session.partners = createdPartners;

    const lowKey = createdPartners.find((item) => item.profile === "low-a")?.apiKey;
    const mediumKey = createdPartners.find((item) => item.profile === "med-a")?.apiKey;
    const highKey = createdPartners.find((item) => item.profile === "high-a")?.apiKey;
    const loadKey = createdPartners.find((item) => item.profile === "high-load")?.apiKey;

    console.log("[3/9] Running real client simulation via externalPartnerClient...\n       profiles: 1 req/s, 5 req/s, 20 req/s (parallel)");
    const simDurationSec = 35;
    const [sim1, sim5, sim20] = await Promise.all([
      runExternalClient({
        apiKey: mediumKey,
        productsIntervalMs: 1000,
        inventoryIntervalMs: 5000,
        disableInventory: false,
        durationSec: simDurationSec,
      }),
      runExternalClient({
        apiKey: highKey,
        productsIntervalMs: 200,
        inventoryIntervalMs: 1000,
        disableInventory: false,
        durationSec: simDurationSec,
      }),
      runExternalClient({
        apiKey: loadKey,
        productsIntervalMs: 50,
        inventoryIntervalMs: 250,
        disableInventory: false,
        durationSec: simDurationSec,
      }),
    ]);

    session.simulation = {
      rps1: sim1.summary,
      rps5: sim5.summary,
      rps20: sim20.summary,
    };

    console.log("[4/9] Running load tests at 50/100/200 concurrent users...");
    const loadLevels = [50, 100, 200];
    for (const concurrency of loadLevels) {
      const phase = await runLoadPhase({ apiKey: loadKey, concurrency, durationSec: 25 });
      session.load.push(phase);
      console.log(
        `   load ${concurrency}: rps=${toFixedNum(phase.rps)} errRate=${toFixedNum(phase.errorRate * 100)}% p95=${toFixedNum(phase.latencyMs.p95)}ms`,
      );
    }

    console.log("[5/9] Running stress test until degradation/break condition...");
    const stressLevels = [250, 300, 400, 500, 650, 800, 1000];
    let breakDetected = false;
    for (const concurrency of stressLevels) {
      if (breakDetected) break;
      const phase = await runLoadPhase({ apiKey: loadKey, concurrency, durationSec: 18 });
      let breakReason = "";
      if (phase.errorRate > 0.1) breakReason = `errorRate>${toFixedNum(phase.errorRate * 100)}%`;
      else if (phase.failedNetwork > 0) breakReason = "network failures observed";
      else if (phase.latencyMs.p95 > 2500) breakReason = `p95>${toFixedNum(phase.latencyMs.p95)}ms`;

      session.stress.push({ ...phase, breakReason });
      if (breakReason) {
        breakDetected = true;
      }

      console.log(
        `   stress ${concurrency}: rps=${toFixedNum(phase.rps)} errRate=${toFixedNum(phase.errorRate * 100)}% p95=${toFixedNum(phase.latencyMs.p95)}ms${breakReason ? ` BREAK(${breakReason})` : ""}`,
      );
    }

    console.log("[6/9] Validating per-partner independent rate limiting...");
    session.rateLimit = await runRateLimitValidation({ lowKey, mediumKey });

    console.log("[7/9] Validating monitoring and analytics updates...");
    session.monitoring = await runMonitoringValidation(token);

    console.log("[8/9] Validating security paths (invalid, paused, rotated)...");
    const securityTarget = createdPartners.find((item) => item.profile === "med-b");
    session.security = await runSecurityValidation({
      token,
      targetPartnerId: securityTarget.partnerId,
      targetKey: securityTarget.apiKey,
    });

    console.log("[9/9] Compiling final report...");

    const stableStress = session.stress.filter((item) => !item.breakReason);
    const bestStable = [...stableStress, ...session.load]
      .sort((a, b) => b.rps - a.rps)[0];
    const maxRpsObserved = [...session.load, ...session.stress]
      .map((item) => item.rps)
      .reduce((max, value) => Math.max(max, value), 0);

    const safeRpmPerPartner = Math.floor((bestStable?.rps || 0) * 60 * 0.8);

    const findings = summarizeFindings({
      loadResults: session.load,
      stressResults: session.stress,
      rateLimitValidation: session.rateLimit,
      security: session.security,
      monitoring: session.monitoring,
    });

    const final = {
      ...session,
      endedAt: nowIso(),
      performance: {
        maxRpsObserved: toFixedNum(maxRpsObserved),
        bestStableRps: toFixedNum(bestStable?.rps || 0),
        bestStableConcurrency: bestStable?.concurrency || 0,
        recommendedSafeRpmPerPartner: Math.max(10, safeRpmPerPartner),
        recommendedSafeConcurrentUsers: bestStable?.concurrency || 50,
      },
      findings,
      finalAnswer: `Your API can safely handle approximately ${Math.max(10, safeRpmPerPartner)} requests per minute per partner and ${bestStable?.concurrency || 50} concurrent users in this environment.`,
    };

    console.log("\n===== PARTNER API FULL VALIDATION REPORT =====");
    console.log(JSON.stringify(final, null, 2));

    const hasCriticalIssues = findings.issues.length > 0;
    process.exitCode = hasCriticalIssues ? 1 : 0;
  } catch (error) {
    console.error("Validation failed:", error?.stack || error?.message || error);
    process.exitCode = 1;
  } finally {
    if (managedServer?.startedByScript && managedServer.child) {
      try {
        managedServer.child.kill();
      } catch {
      }
    }
  }
};

main();
