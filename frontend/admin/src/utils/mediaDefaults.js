const DEFAULT_PRODUCTION_API_URL =
  "https://ananya-boutique-api.onrender.com/api";

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

const LOCAL_ADMIN_PLACEHOLDER_IMAGE = "/ab_logo.png";
const LOCAL_PRODUCT_FALLBACK_IMAGE = "/ab_logo.png";

export const ADMIN_PLACEHOLDER_IMAGE_PATH =
  "ananyaboutique/system/admin-placeholder.png";
export const DEFAULT_PRODUCT_IMAGE_PATH =
  "ananyaboutique/system/product-default.webp";

export const ADMIN_PLACEHOLDER_IMAGE = LOCAL_ADMIN_PLACEHOLDER_IMAGE;

export const DEFAULT_PRODUCT_IMAGE = LOCAL_PRODUCT_FALLBACK_IMAGE;

export const LEGACY_LOCAL_MEDIA_MAP = {
  [ADMIN_PLACEHOLDER_IMAGE_PATH]: ADMIN_PLACEHOLDER_IMAGE,
  [`/${ADMIN_PLACEHOLDER_IMAGE_PATH}`]: ADMIN_PLACEHOLDER_IMAGE,
  [buildMediaProxyUrl(ADMIN_PLACEHOLDER_IMAGE_PATH)]: ADMIN_PLACEHOLDER_IMAGE,
  [DEFAULT_PRODUCT_IMAGE_PATH]: DEFAULT_PRODUCT_IMAGE,
  [`/${DEFAULT_PRODUCT_IMAGE_PATH}`]: DEFAULT_PRODUCT_IMAGE,
  [buildMediaProxyUrl(DEFAULT_PRODUCT_IMAGE_PATH)]: DEFAULT_PRODUCT_IMAGE,
  "/placeholder.png": ADMIN_PLACEHOLDER_IMAGE,
  "/product_1.png": DEFAULT_PRODUCT_IMAGE,
  "/product_1.webp": DEFAULT_PRODUCT_IMAGE,
  "placeholder.png": ADMIN_PLACEHOLDER_IMAGE,
  "product_1.png": DEFAULT_PRODUCT_IMAGE,
  "product_1.webp": DEFAULT_PRODUCT_IMAGE,
};

const resolveLegacyProxyMedia = (value = "") => {
  const normalized = String(value || "").trim();
  if (!/\/api\/media\/gcs/i.test(normalized)) return "";

  try {
    const parsed = new URL(
      normalized.startsWith("http")
        ? normalized
        : `https://local.invalid${
            normalized.startsWith("/") ? "" : "/"
          }${normalized}`,
    );
    const objectPath = decodeURIComponent(
      parsed.searchParams.get("path") || "",
    );
    return LEGACY_LOCAL_MEDIA_MAP[objectPath] || "";
  } catch {
    return "";
  }
};

export const resolveLegacyLocalMedia = (value = "") => {
  const normalized = String(value || "").trim();
  return LEGACY_LOCAL_MEDIA_MAP[normalized] || resolveLegacyProxyMedia(normalized);
};
