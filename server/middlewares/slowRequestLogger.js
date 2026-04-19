const toBoolean = (value, fallback = false) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const toPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizePath = (value) => {
  const normalized = String(value || "")
    .split("?")[0]
    .trim()
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "");
  return normalized || "/";
};

export const slowRequestLogger = (req, res, next) => {
  const enabled = toBoolean(process.env.PERF_SLOW_REQUEST_LOGGER_ENABLED, true);
  if (!enabled) return next();

  const thresholdMs = toPositiveInteger(process.env.PERF_SLOW_REQUEST_MS, 500);
  const startedAtNs = process.hrtime.bigint();

  res.on("finish", () => {
    const elapsedNs = process.hrtime.bigint() - startedAtNs;
    const elapsedMs = Number(elapsedNs / BigInt(1000000));

    if (elapsedMs < thresholdMs) return;

    console.warn("[perf] Slow request detected", {
      method: req.method,
      path: normalizePath(req.originalUrl || req.url || ""),
      statusCode: res.statusCode,
      durationMs: elapsedMs,
    });
  });

  return next();
};

export default slowRequestLogger;
