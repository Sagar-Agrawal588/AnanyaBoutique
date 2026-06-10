export const DEFAULT_PRODUCTION_API_ORIGIN = "https://api.ananyaboutique.com";
export const DEFAULT_PRODUCTION_API_URL = `${DEFAULT_PRODUCTION_API_ORIGIN}/api`;

export const sanitizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\/+$/, "");

export const removeApiSuffix = (value) =>
  String(value || "").replace(/\/api$/i, "");

export const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || ""));

export const isLocalhostUrl = (value) => {
  try {
    const parsed = new URL(String(value || ""));
    const hostname = parsed.hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
};

export const normalizeApiOrigin = (value) => {
  const normalized = removeApiSuffix(sanitizeBaseUrl(value));
  return isHttpUrl(normalized) ? normalized : "";
};

export const normalizeApiUrl = (value) => {
  const origin = normalizeApiOrigin(value);
  return origin ? `${origin}/api` : "";
};

export const pickApiOrigin = (...values) => {
  const allowLocalhost = process.env.NODE_ENV !== "production";

  for (const value of values) {
    const candidate = normalizeApiOrigin(value);
    if (!candidate) continue;
    if (!allowLocalhost && isLocalhostUrl(candidate)) continue;
    return candidate;
  }

  return DEFAULT_PRODUCTION_API_ORIGIN;
};

export const pickApiUrl = (...values) => `${pickApiOrigin(...values)}/api`;
