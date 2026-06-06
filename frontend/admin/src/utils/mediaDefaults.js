const DEFAULT_PRODUCTION_API_URL =
  "https://api.ananyaboutique.com/api";

const sanitizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\/+$/, "");

const normalizeApiBaseUrl = (value) => {
  const normalized = sanitizeBaseUrl(value);
  if (!/^https?:\/\//i.test(normalized)) return "";
  return /\/api$/i.test(normalized) ? normalized : `${normalized}/api`;
};

const shouldUseLocalApiBase = () => {
  if (typeof window === "undefined") {
    return process.env.NODE_ENV !== "production";
  }

  const hostname = String(window.location.hostname || "").toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1";
};

const getMediaApiBaseUrl = () =>
  normalizeApiBaseUrl(
    (shouldUseLocalApiBase() ? process.env.NEXT_PUBLIC_LOCAL_API_URL : "") ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_APP_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      DEFAULT_PRODUCTION_API_URL,
  ) || DEFAULT_PRODUCTION_API_URL;

const buildMediaProxyUrl = (objectPath) =>
  `${getMediaApiBaseUrl()}/media/gcs?path=${encodeURIComponent(objectPath)}`;

export const ADMIN_PLACEHOLDER_IMAGE_PATH =
  "ananyaboutique/system/admin-placeholder.png";
export const DEFAULT_PRODUCT_IMAGE_PATH =
  "ananyaboutique/system/product-default.webp";

export const ADMIN_PLACEHOLDER_IMAGE =
  buildMediaProxyUrl(ADMIN_PLACEHOLDER_IMAGE_PATH);

export const DEFAULT_PRODUCT_IMAGE =
  buildMediaProxyUrl(DEFAULT_PRODUCT_IMAGE_PATH);

export const LEGACY_LOCAL_MEDIA_MAP = {
  "/placeholder.png": ADMIN_PLACEHOLDER_IMAGE,
  "/product_1.png": DEFAULT_PRODUCT_IMAGE,
  "/product_1.webp": DEFAULT_PRODUCT_IMAGE,
  "placeholder.png": ADMIN_PLACEHOLDER_IMAGE,
  "product_1.png": DEFAULT_PRODUCT_IMAGE,
  "product_1.webp": DEFAULT_PRODUCT_IMAGE,
};

export const resolveLegacyLocalMedia = (value = "") =>
  LEGACY_LOCAL_MEDIA_MAP[String(value || "").trim()] || "";
