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

const LOCAL_PRODUCT_FALLBACK_IMAGE = "/product-boutique-placeholder.svg";
const LOCAL_HOME_SLIDE_FALLBACK_IMAGES = [
  "/logo-og-v2.png",
  "/logo-header.png",
  "/logo.png",
];
const LOCAL_BANNER_FALLBACK_IMAGES = [
  "/logo-og-v2.png",
  "/logo-header.png",
  "/logo.png",
];

export const DEFAULT_PRODUCT_IMAGE_PATH =
  "ananyaboutique/system/product-default.webp";
export const DEFAULT_HOME_SLIDE_PATHS = [
  "ananyaboutique/system/home-slide-default-1.webp",
  "ananyaboutique/system/home-slide-default-2.webp",
  "ananyaboutique/system/home-slide-default-3.webp",
];
export const DEFAULT_BANNER_IMAGE_PATHS = [
  "ananyaboutique/system/banner-default-1.webp",
  "ananyaboutique/system/banner-default-2.webp",
  "ananyaboutique/system/banner-default-3.webp",
];

export const DEFAULT_PRODUCT_IMAGE = LOCAL_PRODUCT_FALLBACK_IMAGE;

export const DEFAULT_HOME_SLIDES = LOCAL_HOME_SLIDE_FALLBACK_IMAGES;

export const DEFAULT_BANNER_IMAGES = LOCAL_BANNER_FALLBACK_IMAGES;

export const DEFAULT_MEDIA_VIDEO_POSTER = DEFAULT_PRODUCT_IMAGE;

export const LEGACY_LOCAL_MEDIA_MAP = {
  [DEFAULT_PRODUCT_IMAGE_PATH]: DEFAULT_PRODUCT_IMAGE,
  [`/${DEFAULT_PRODUCT_IMAGE_PATH}`]: DEFAULT_PRODUCT_IMAGE,
  [buildMediaProxyUrl(DEFAULT_PRODUCT_IMAGE_PATH)]: DEFAULT_PRODUCT_IMAGE,
  [DEFAULT_HOME_SLIDE_PATHS[0]]: DEFAULT_HOME_SLIDES[0],
  [DEFAULT_HOME_SLIDE_PATHS[1]]: DEFAULT_HOME_SLIDES[1],
  [DEFAULT_HOME_SLIDE_PATHS[2]]: DEFAULT_HOME_SLIDES[2],
  [`/${DEFAULT_HOME_SLIDE_PATHS[0]}`]: DEFAULT_HOME_SLIDES[0],
  [`/${DEFAULT_HOME_SLIDE_PATHS[1]}`]: DEFAULT_HOME_SLIDES[1],
  [`/${DEFAULT_HOME_SLIDE_PATHS[2]}`]: DEFAULT_HOME_SLIDES[2],
  [buildMediaProxyUrl(DEFAULT_HOME_SLIDE_PATHS[0])]: DEFAULT_HOME_SLIDES[0],
  [buildMediaProxyUrl(DEFAULT_HOME_SLIDE_PATHS[1])]: DEFAULT_HOME_SLIDES[1],
  [buildMediaProxyUrl(DEFAULT_HOME_SLIDE_PATHS[2])]: DEFAULT_HOME_SLIDES[2],
  [DEFAULT_BANNER_IMAGE_PATHS[0]]: DEFAULT_BANNER_IMAGES[0],
  [DEFAULT_BANNER_IMAGE_PATHS[1]]: DEFAULT_BANNER_IMAGES[1],
  [DEFAULT_BANNER_IMAGE_PATHS[2]]: DEFAULT_BANNER_IMAGES[2],
  [`/${DEFAULT_BANNER_IMAGE_PATHS[0]}`]: DEFAULT_BANNER_IMAGES[0],
  [`/${DEFAULT_BANNER_IMAGE_PATHS[1]}`]: DEFAULT_BANNER_IMAGES[1],
  [`/${DEFAULT_BANNER_IMAGE_PATHS[2]}`]: DEFAULT_BANNER_IMAGES[2],
  [buildMediaProxyUrl(DEFAULT_BANNER_IMAGE_PATHS[0])]: DEFAULT_BANNER_IMAGES[0],
  [buildMediaProxyUrl(DEFAULT_BANNER_IMAGE_PATHS[1])]: DEFAULT_BANNER_IMAGES[1],
  [buildMediaProxyUrl(DEFAULT_BANNER_IMAGE_PATHS[2])]: DEFAULT_BANNER_IMAGES[2],
  "/product_placeholder.png": DEFAULT_PRODUCT_IMAGE,
  "/product_1.png": DEFAULT_PRODUCT_IMAGE,
  "/product_1.webp": DEFAULT_PRODUCT_IMAGE,
  "/logo-og-v2.png": DEFAULT_PRODUCT_IMAGE,
  "/logo-header.png": DEFAULT_PRODUCT_IMAGE,
  "/slide_1.webp": DEFAULT_HOME_SLIDES[0],
  "/slide_2.webp": DEFAULT_HOME_SLIDES[1],
  "/slide_3.webp": DEFAULT_HOME_SLIDES[2],
  "/prodImage1.webp": DEFAULT_BANNER_IMAGES[0],
  "/prodImage2.webp": DEFAULT_BANNER_IMAGES[1],
  "/prodImage3.webp": DEFAULT_BANNER_IMAGES[2],
  "product_placeholder.png": DEFAULT_PRODUCT_IMAGE,
  "product_1.png": DEFAULT_PRODUCT_IMAGE,
  "product_1.webp": DEFAULT_PRODUCT_IMAGE,
  "logo-og-v2.png": DEFAULT_PRODUCT_IMAGE,
  "logo-header.png": DEFAULT_PRODUCT_IMAGE,
  "slide_1.webp": DEFAULT_HOME_SLIDES[0],
  "slide_2.webp": DEFAULT_HOME_SLIDES[1],
  "slide_3.webp": DEFAULT_HOME_SLIDES[2],
  "prodImage1.webp": DEFAULT_BANNER_IMAGES[0],
  "prodImage2.webp": DEFAULT_BANNER_IMAGES[1],
  "prodImage3.webp": DEFAULT_BANNER_IMAGES[2],
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
