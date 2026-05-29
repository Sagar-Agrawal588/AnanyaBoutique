const DEFAULT_PRODUCTION_API_URL =
  "https://healthyonegram-api-v2-xb7znoco6a-uc.a.run.app/api";

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

export const DEFAULT_PRODUCT_IMAGE_PATH =
  "buyonegram/system/product-default.webp";
export const DEFAULT_HOME_SLIDE_PATHS = [
  "buyonegram/system/home-slide-default-1.webp",
  "buyonegram/system/home-slide-default-2.webp",
  "buyonegram/system/home-slide-default-3.webp",
];
export const DEFAULT_BANNER_IMAGE_PATHS = [
  "buyonegram/system/banner-default-1.webp",
  "buyonegram/system/banner-default-2.webp",
  "buyonegram/system/banner-default-3.webp",
];

export const DEFAULT_PRODUCT_IMAGE =
  buildMediaProxyUrl(DEFAULT_PRODUCT_IMAGE_PATH);

export const DEFAULT_HOME_SLIDES =
  DEFAULT_HOME_SLIDE_PATHS.map(buildMediaProxyUrl);

export const DEFAULT_BANNER_IMAGES =
  DEFAULT_BANNER_IMAGE_PATHS.map(buildMediaProxyUrl);

export const DEFAULT_MEDIA_VIDEO_POSTER = DEFAULT_PRODUCT_IMAGE;

export const LEGACY_LOCAL_MEDIA_MAP = {
  "/product_placeholder.png": DEFAULT_PRODUCT_IMAGE,
  "/product_1.png": DEFAULT_PRODUCT_IMAGE,
  "/product_1.webp": DEFAULT_PRODUCT_IMAGE,
  "/slide_1.webp": DEFAULT_HOME_SLIDES[0],
  "/slide_2.webp": DEFAULT_HOME_SLIDES[1],
  "/slide_3.webp": DEFAULT_HOME_SLIDES[2],
  "/prodImage1.webp": DEFAULT_BANNER_IMAGES[0],
  "/prodImage2.webp": DEFAULT_BANNER_IMAGES[1],
  "/prodImage3.webp": DEFAULT_BANNER_IMAGES[2],
  "product_placeholder.png": DEFAULT_PRODUCT_IMAGE,
  "product_1.png": DEFAULT_PRODUCT_IMAGE,
  "product_1.webp": DEFAULT_PRODUCT_IMAGE,
  "slide_1.webp": DEFAULT_HOME_SLIDES[0],
  "slide_2.webp": DEFAULT_HOME_SLIDES[1],
  "slide_3.webp": DEFAULT_HOME_SLIDES[2],
  "prodImage1.webp": DEFAULT_BANNER_IMAGES[0],
  "prodImage2.webp": DEFAULT_BANNER_IMAGES[1],
  "prodImage3.webp": DEFAULT_BANNER_IMAGES[2],
};

export const resolveLegacyLocalMedia = (value = "") =>
  LEGACY_LOCAL_MEDIA_MAP[String(value || "").trim()] || "";
