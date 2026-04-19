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

const hasAuthContext = (req) => {
  const authorizationHeader = String(req.headers?.authorization || "").trim();
  if (authorizationHeader) return true;

  const cookieHeader = String(req.headers?.cookie || "");
  if (!cookieHeader) return false;

  return /(?:^|;\s*)(?:accessToken|refreshToken)=/i.test(cookieHeader);
};

const buildCacheControl = (ttlSeconds) => {
  const ttl = Math.max(1, ttlSeconds);
  return `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=${ttl}`;
};

const resolvePathTtlSeconds = (path) => {
  const bannersTtl = toPositiveInteger(
    process.env.PERF_CACHE_BANNERS_TTL_SECONDS,
    60,
  );
  const homeSlidesTtl = toPositiveInteger(
    process.env.PERF_CACHE_HOME_SLIDES_TTL_SECONDS,
    60,
  );
  const maintenanceTtl = toPositiveInteger(
    process.env.PERF_CACHE_MAINTENANCE_STATUS_TTL_SECONDS,
    30,
  );

  if (path.startsWith("/api/banners") && !path.includes("/admin")) {
    return bannersTtl;
  }

  if (path.startsWith("/api/home-slides") && !path.includes("/admin")) {
    return homeSlidesTtl;
  }

  if (path === "/api/settings/maintenance-status") {
    return maintenanceTtl;
  }

  return 0;
};

export const publicCacheHeadersMiddleware = (req, res, next) => {
  const enabled = toBoolean(process.env.PERF_HTTP_CACHE_HEADERS_ENABLED, true);
  if (!enabled) return next();

  const method = String(req.method || "")
    .trim()
    .toUpperCase();
  if (method !== "GET" && method !== "HEAD") return next();
  if (hasAuthContext(req)) return next();

  const requestPath = normalizePath(req.originalUrl || req.url || "");
  const ttlSeconds = resolvePathTtlSeconds(requestPath);
  if (!ttlSeconds) return next();

  res.set("Cache-Control", buildCacheControl(ttlSeconds));
  return next();
};

export default publicCacheHeadersMiddleware;
