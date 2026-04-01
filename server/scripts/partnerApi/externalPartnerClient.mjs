import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const readArg = (name) => {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return match ? match.slice(name.length + 3).trim() : "";
};

const readBoolArg = (name, fallback = false) => {
  const value = readArg(name);
  if (!value) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const readIntArg = (name, fallback) => {
  const value = readArg(name);
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatNow = () => new Date().toISOString();

const parseJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const isRateLimitedPayload = (statusCode, payload) => {
  if (statusCode === 429) return true;
  const code = String(payload?.error?.code || payload?.code || "").toUpperCase();
  return code === "RATE_LIMIT_EXCEEDED" || code === "DAILY_LIMIT_EXCEEDED";
};

const summarizeData = (endpointPath, payload) => {
  if (!payload) return "No response body";
  const data = payload?.data;

  if (endpointPath.startsWith("/products") && Array.isArray(data)) {
    return `products=${data.length}`;
  }

  if (endpointPath.startsWith("/inventory") && Array.isArray(data)) {
    return `inventoryItems=${data.length}`;
  }

  if (typeof data === "object" && data !== null) {
    const keys = Object.keys(data);
    return `keys=${keys.slice(0, 5).join(",") || "none"}`;
  }

  return "ok";
};

const run = async () => {
  const baseUrl = (
    readArg("baseUrl") ||
    process.env.PARTNER_API_BASE_URL ||
    "https://healthyonegram.com/api/v1/partner"
  )
    .trim()
    .replace(/\/+$/, "");

  let apiKey = (readArg("apiKey") || process.env.PARTNER_API_KEY || "").trim();

  if (!apiKey) {
    const rl = readline.createInterface({ input, output });
    apiKey = (await rl.question("Enter Partner API Key: ")).trim();
    rl.close();
  }

  if (!apiKey) {
    console.error("[client] Missing API key. Use --apiKey=... or PARTNER_API_KEY env var.");
    process.exit(1);
  }

  const productsIntervalMs = Math.max(25, readIntArg("productsIntervalMs", 2000));
  const inventoryIntervalMs = Math.max(25, readIntArg("inventoryIntervalMs", 5000));
  const disableInventory = readBoolArg("disableInventory", false);
  const durationSec = Math.max(0, readIntArg("durationSec", 0));

  let stopped = false;
  let productsInFlight = false;
  let inventoryInFlight = false;
  let productsTimer = null;
  let inventoryTimer = null;
  let durationTimer = null;

  const stats = {
    startedAt: new Date().toISOString(),
    baseUrl,
    productsIntervalMs,
    inventoryIntervalMs: disableInventory ? 0 : inventoryIntervalMs,
    durationSec,
    totals: {
      requests: 0,
      success: 0,
      errors: 0,
      throttled429: 0,
      networkFailures: 0,
    },
    byEndpoint: {
      products: { requests: 0, success: 0, errors: 0 },
      inventory: { requests: 0, success: 0, errors: 0 },
    },
    latencyMs: {
      count: 0,
      avg: 0,
      max: 0,
    },
    stoppedReason: "",
  };

  const endpointKey = (endpointPath) =>
    String(endpointPath || "").startsWith("/inventory") ? "inventory" : "products";

  const updateLatency = (elapsedMs) => {
    const count = stats.latencyMs.count + 1;
    stats.latencyMs.avg = Math.round(
      ((stats.latencyMs.avg * stats.latencyMs.count) + elapsedMs) / count,
    );
    stats.latencyMs.count = count;
    stats.latencyMs.max = Math.max(stats.latencyMs.max, elapsedMs);
  };

  const stopClient = async (reason) => {
    if (stopped) return;
    stopped = true;
    stats.stoppedReason = reason;
    console.log(`[client] ${formatNow()} stopping client: ${reason}`);

    if (productsTimer) clearInterval(productsTimer);
    if (inventoryTimer) clearInterval(inventoryTimer);
    if (durationTimer) clearTimeout(durationTimer);

    // Allow any in-flight request to complete logging before exit.
    for (let i = 0; i < 10 && (productsInFlight || inventoryInFlight); i += 1) {
      await sleep(150);
    }

    const summary = {
      ...stats,
      endedAt: new Date().toISOString(),
    };
    console.log(`[summary] ${JSON.stringify(summary)}`);

    process.exit(0);
  };

  const callEndpoint = async (endpointPath) => {
    const started = performance.now();

    let response;
    let payload;

    try {
      stats.totals.requests += 1;
      stats.byEndpoint[endpointKey(endpointPath)].requests += 1;
      response = await fetch(`${baseUrl}${endpointPath}`, {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          Accept: "application/json",
        },
      });

      payload = await parseJsonSafe(response);
      const elapsedMs = Math.round(performance.now() - started);
      updateLatency(elapsedMs);

      if (response.ok) {
        stats.totals.success += 1;
        stats.byEndpoint[endpointKey(endpointPath)].success += 1;
        console.log(
          `[ok] ${formatNow()} ${endpointPath} status=${response.status} timeMs=${elapsedMs} ${summarizeData(endpointPath, payload)}`,
        );
        return;
      }

      stats.totals.errors += 1;
      stats.byEndpoint[endpointKey(endpointPath)].errors += 1;

      const errorCode = payload?.error?.code || payload?.code || "UNKNOWN_ERROR";
      const message = payload?.error?.message || payload?.message || "Request failed";
      console.error(
        `[error] ${formatNow()} ${endpointPath} status=${response.status} code=${errorCode} message=${message}`,
      );

      if (isRateLimitedPayload(response.status, payload)) {
        stats.totals.throttled429 += 1;
        await stopClient(`rate limit exceeded on ${endpointPath}`);
      }
    } catch (error) {
      const elapsedMs = Math.round(performance.now() - started);
      updateLatency(elapsedMs);
      stats.totals.errors += 1;
      stats.totals.networkFailures += 1;
      stats.byEndpoint[endpointKey(endpointPath)].errors += 1;
      console.error(
        `[error] ${formatNow()} ${endpointPath} networkFailure timeMs=${elapsedMs} message=${error?.message || "Unknown network error"}`,
      );
    }
  };

  const tickProducts = async () => {
    if (stopped || productsInFlight) return;
    productsInFlight = true;
    try {
      await callEndpoint("/products?limit=5&page=1");
    } finally {
      productsInFlight = false;
    }
  };

  const tickInventory = async () => {
    if (stopped || inventoryInFlight) return;
    inventoryInFlight = true;
    try {
      await callEndpoint("/inventory?limit=5&page=1");
    } finally {
      inventoryInFlight = false;
    }
  };

  console.log("[client] External Partner API client started");
  console.log(`[client] baseUrl=${baseUrl}`);
  console.log(
    `[client] polling: products every ${productsIntervalMs}ms${disableInventory ? ", inventory disabled" : `, inventory every ${inventoryIntervalMs}ms`}`,
  );
  if (durationSec > 0) {
    console.log(`[client] auto-stop after ${durationSec}s`);
  }

  process.on("SIGINT", async () => {
    await stopClient("received SIGINT");
  });

  process.on("SIGTERM", async () => {
    await stopClient("received SIGTERM");
  });

  await tickProducts();
  if (!disableInventory) {
    await tickInventory();
  }

  productsTimer = setInterval(tickProducts, productsIntervalMs);
  if (!disableInventory) {
    inventoryTimer = setInterval(tickInventory, inventoryIntervalMs);
  }
  if (durationSec > 0) {
    durationTimer = setTimeout(() => {
      stopClient(`duration reached (${durationSec}s)`).catch(() => null);
    }, durationSec * 1000);
  }
};

run().catch((error) => {
  console.error("[client] fatal error:", error?.message || error);
  process.exit(1);
});
