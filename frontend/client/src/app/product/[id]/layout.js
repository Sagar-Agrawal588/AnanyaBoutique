import { DEFAULT_BANNER_IMAGES } from "@/utils/mediaDefaults";
import {
  BRAND_DESCRIPTION,
  BRAND_NAME,
  getBrandSocialImage,
} from "@/config/brandAssets";

const DEFAULT_SITE_URL = "https://ananyaboutique.com";
const DEFAULT_API_ORIGIN = "https://api.ananyaboutique.com";
const DEMO_PRODUCT_ID = "demo-live";
const SERVER_FETCH_TIMEOUT_MS = 3000;

const sanitizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\/+$/, "");

const removeApiSuffix = (value) => String(value || "").replace(/\/api$/i, "");

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(String(value || ""));

const isLocalhostHost = (hostname) => {
  const host = String(hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1";
};

const stripHtml = (value) =>
  String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeImageInput = (imageValue) => {
  if (!imageValue) return "";

  if (typeof imageValue === "string") {
    const normalized = imageValue.trim();
    if (!normalized) return "";
    const lowered = normalized.toLowerCase();
    if (
      lowered === "undefined" ||
      lowered === "null" ||
      lowered === "nan" ||
      lowered === "[object object]"
    ) {
      return "";
    }
    return normalized;
  }

  if (typeof imageValue === "object") {
    if (typeof imageValue.url === "string") return imageValue.url.trim();
    if (typeof imageValue.secure_url === "string") {
      return imageValue.secure_url.trim();
    }
    if (typeof imageValue.src === "string") return imageValue.src.trim();
    if (typeof imageValue.image === "string") return imageValue.image.trim();
  }

  return "";
};

const safeDecode = (value) => {
  const raw = String(value || "");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

const toCanonicalPath = (value = "") => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SERVER_FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const getSiteUrl = () =>
  sanitizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL) || DEFAULT_SITE_URL;
const getDefaultSocialImageUrl = () =>
  `${getSiteUrl()}${getBrandSocialImage("openGraphImage").src}`;

const getApiCandidates = () => {
  const configured = [
    process.env.NODE_ENV === "production"
      ? ""
      : process.env.NEXT_PUBLIC_LOCAL_API_URL,
    process.env.NEXT_PUBLIC_APP_API_URL,
    process.env.NEXT_PUBLIC_API_URL,
  ]
    .map(sanitizeBaseUrl)
    .filter(Boolean)
    .map(removeApiSuffix)
    .filter(Boolean);

  return [
    ...new Set([...configured, DEFAULT_API_ORIGIN].filter(Boolean)),
  ];
};

const resolveProductImage = (product, apiBaseUrl) => {
  const siteUrl = getSiteUrl();
  const imageCandidates = [
    ...(Array.isArray(product?.images) ? product.images : []),
    product?.thumbnail,
    product?.image,
  ].map(normalizeImageInput).filter(Boolean);

  for (const candidate of imageCandidates) {
    if (candidate.startsWith("data:image/")) {
      return candidate;
    }

    if (candidate.startsWith("res.cloudinary.com/")) {
      return `https://${candidate}`;
    }

    if (isAbsoluteUrl(candidate)) {
      try {
        const parsed = new URL(candidate);
        const imagePath = toCanonicalPath(parsed.pathname);
        if (isLocalhostHost(parsed.hostname)) {
          if (/^\/uploads\//i.test(imagePath)) {
            return `${apiBaseUrl || siteUrl}${imagePath}`;
          }
          return getDefaultSocialImageUrl();
        }
      } catch {
        // If URL parsing fails, fall through to return original.
      }

      return candidate;
    }

    const normalizedPath = toCanonicalPath(candidate);
    if (!normalizedPath) continue;

    if (/^\/uploads\//i.test(normalizedPath)) {
      return `${apiBaseUrl || siteUrl}${normalizedPath}`;
    }

    return `${siteUrl}${normalizedPath}`;
  }

  return getDefaultSocialImageUrl();
};

const fetchProductForMetadata = async (id) => {
  const apiCandidates = getApiCandidates();

  for (const apiBase of apiCandidates) {
    const endpoint = `${apiBase}/api/products/${encodeURIComponent(id)}`;
    try {
      const response = await fetchWithTimeout(endpoint, {
        cache: "no-store",
      });
      if (!response.ok) continue;
      const payload = await response.json();
      const product = payload?.data?.data || payload?.data || null;
      if (product?._id || product?.slug) {
        return { product, apiBase };
      }
    } catch {
      // Keep trying candidates.
    }
  }

  return { product: null, apiBase: "" };
};

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const routeId = safeDecode(resolvedParams?.id).trim();
  const siteUrl = getSiteUrl();

  if (!routeId) {
    return {
      title: `Product | ${BRAND_NAME}`,
      description: BRAND_DESCRIPTION,
    };
  }

  if (routeId.toLowerCase() === DEMO_PRODUCT_ID) {
    const title = `Ananya Signature Kurta Set | ${BRAND_NAME}`;
    const description =
      "Preview the upgraded storefront product detail experience with demo data, richer visuals, and conversion-focused layout blocks.";
    const url = `${siteUrl}/product/${DEMO_PRODUCT_ID}`;
    const imageUrl = DEFAULT_BANNER_IMAGES[0];

    return {
      title,
      description,
      alternates: {
        canonical: url,
      },
      openGraph: {
        title,
        description,
        url,
        type: "website",
        locale: "en_IN",
        siteName: BRAND_NAME,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: "Demo product preview",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
    };
  }

  const { product, apiBase } = await fetchProductForMetadata(routeId);
  if (!product) {
    return {
      title: `Product | ${BRAND_NAME}`,
      description: BRAND_DESCRIPTION,
    };
  }

  const slugOrId = String(product?.slug || product?._id || routeId);
  const title = `${String(product?.name || "Product").trim()} | ${BRAND_NAME}`;
  const description =
    stripHtml(product?.shortDescription || product?.description) ||
    BRAND_DESCRIPTION;
  const url = `${siteUrl}/product/${encodeURIComponent(slugOrId)}`;
  const imageUrl = resolveProductImage(product, apiBase);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: "en_IN",
      siteName: BRAND_NAME,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: String(product?.name || `${BRAND_NAME} Product`),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function ProductRouteLayout({ children }) {
  return children;
}
