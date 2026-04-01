import PartnerApiRequestLog from "../models/partnerApiRequestLog.model.js";

const MAX_RECENT_HITS = 500;
const activeRequestsByKey = new Map();
const recentHits = [];

const clampNonNegativeInt = (value, fallback = 0) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
};

const ACTIVE_KEY_WINDOW_MS = Math.max(
  1_000,
  clampNonNegativeInt(process.env.PARTNER_API_ACTIVE_KEY_WINDOW_MS, 15_000),
);

const getGeoHintFromIp = (ipAddress = "") => {
  const ip = String(ipAddress || "").trim();
  if (!ip) return "Unknown";
  if (ip.startsWith("127.") || ip === "::1" || ip.startsWith("::ffff:127.")) {
    return "Local";
  }
  return "Unknown";
};

const normalizeEndpoint = (originalUrl = "") => {
  const input = String(originalUrl || "").trim();
  if (!input) return "/";
  const [pathname] = input.split("?");
  return pathname || "/";
};

const pushRecentHit = (entry) => {
  recentHits.unshift(entry);
  if (recentHits.length > MAX_RECENT_HITS) {
    recentHits.length = MAX_RECENT_HITS;
  }
};

const incrementActive = (key) => {
  const current = clampNonNegativeInt(activeRequestsByKey.get(key), 0);
  activeRequestsByKey.set(key, current + 1);
};

const decrementActive = (key) => {
  const current = clampNonNegativeInt(activeRequestsByKey.get(key), 0);
  if (current <= 1) {
    activeRequestsByKey.delete(key);
    return;
  }
  activeRequestsByKey.set(key, current - 1);
};

export const partnerApiActivityTracker = (req, res, next) => {
  if (/^\/admin(\/|$)/i.test(String(req.path || ""))) {
    return next();
  }

  const startedAt = Date.now();
  const ipAddress = String(req.ip || req.socket?.remoteAddress || "");
  const endpoint = normalizeEndpoint(req.originalUrl || req.url);
  let finalized = false;

  const identifyActiveKey = () => {
    const partnerId = String(req.partner?._id || "").trim() || "anonymous";
    const keyPrefix = String(req.partnerKey?.keyPrefix || "").trim() || "unknown";
    return `${partnerId}:${keyPrefix}`;
  };

  let activeKey = identifyActiveKey();
  incrementActive(activeKey);

  const finalize = () => {
    if (finalized) return;
    finalized = true;

    const resolvedActiveKey = identifyActiveKey();
    if (resolvedActiveKey !== activeKey) {
      decrementActive(activeKey);
      activeKey = resolvedActiveKey;
      incrementActive(activeKey);
    }

    decrementActive(activeKey);

    const responseTimeMs = Math.max(Date.now() - startedAt, 0);
    const entry = {
      createdAt: new Date(),
      partnerId: req.partner?._id ? String(req.partner._id) : null,
      partnerName: req.partner?.name || null,
      keyPrefix: String(req.partnerKey?.keyPrefix || "").trim() || null,
      endpoint,
      method: String(req.method || "GET").toUpperCase(),
      statusCode: clampNonNegativeInt(res.statusCode, 0),
      ipAddress,
      location: getGeoHintFromIp(ipAddress),
      userAgent: String(req.headers?.["user-agent"] || "").slice(0, 280),
      responseTimeMs,
      scope: String(req.requiredPartnerScope || ""),
      errorCode: String(res.locals?.partnerErrorCode || ""),
      tokensUsed: clampNonNegativeInt(req.partnerTokensUsed || 0, 0),
    };

    pushRecentHit(entry);

    PartnerApiRequestLog.create({
      partnerId: entry.partnerId,
      keyPrefix: entry.keyPrefix || "",
      endpoint: entry.endpoint,
      method: entry.method,
      statusCode: entry.statusCode,
      ipAddress: entry.ipAddress,
      location: entry.location,
      userAgent: entry.userAgent,
      responseTimeMs: entry.responseTimeMs,
      scope: entry.scope,
      errorCode: entry.errorCode,
      tokensUsed: entry.tokensUsed,
      createdAt: entry.createdAt,
      updatedAt: entry.createdAt,
    }).catch(() => null);
  };

  res.on("finish", finalize);
  res.on("close", finalize);

  next();
};

export const getPartnerLiveSnapshot = ({ limit = 20 } = {}) => {
  const now = Date.now();
  const active = Array.from(activeRequestsByKey.entries()).map(([key, count]) => {
    const [partnerId, keyPrefix] = String(key).split(":");
    return {
      partnerId,
      keyPrefix,
      activeRequests: clampNonNegativeInt(count, 0),
      recentHits: 0,
      lastSeenAt: null,
    };
  });

  const activeByKey = new Map(
    active.map((item) => [`${item.partnerId}:${item.keyPrefix}`, item]),
  );

  for (const hit of recentHits) {
    const partnerId = String(hit?.partnerId || "").trim();
    const keyPrefix = String(hit?.keyPrefix || "").trim();
    if (!partnerId || partnerId === "anonymous" || !keyPrefix || keyPrefix === "unknown") {
      continue;
    }

    const createdAt = new Date(hit.createdAt || 0).getTime();
    if (!Number.isFinite(createdAt) || now - createdAt > ACTIVE_KEY_WINDOW_MS) {
      continue;
    }

    const key = `${partnerId}:${keyPrefix}`;
    const existing = activeByKey.get(key);
    if (existing) {
      existing.recentHits += 1;
      existing.lastSeenAt =
        !existing.lastSeenAt || createdAt > new Date(existing.lastSeenAt).getTime()
          ? new Date(createdAt).toISOString()
          : existing.lastSeenAt;
      continue;
    }

    activeByKey.set(key, {
      partnerId,
      keyPrefix,
      activeRequests: 0,
      recentHits: 1,
      lastSeenAt: new Date(createdAt).toISOString(),
    });
  }

  const activeApiKeys = Array.from(activeByKey.values())
    .filter((item) => item.partnerId !== "anonymous")
    .map((item) => ({
      partnerId: item.partnerId,
      keyPrefix: item.keyPrefix,
      activeRequests:
        item.activeRequests > 0 ? item.activeRequests : Math.min(item.recentHits, 1),
      inFlightRequests: item.activeRequests,
      recentHits: item.recentHits,
      lastSeenAt: item.lastSeenAt,
    }))
    .sort((a, b) => {
      if (b.activeRequests !== a.activeRequests) return b.activeRequests - a.activeRequests;
      if (b.recentHits !== a.recentHits) return b.recentHits - a.recentHits;
      return new Date(b.lastSeenAt || 0).getTime() - new Date(a.lastSeenAt || 0).getTime();
    });

  return {
    activeApiKeys,
    lastHits: recentHits.slice(0, Math.max(1, Math.min(Number(limit) || 20, 100))),
  };
};
