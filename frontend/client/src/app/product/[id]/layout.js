const DEFAULT_SITE_URL = "https://healthyonegram.com";

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

const getSiteUrl = () =>
  sanitizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL) || DEFAULT_SITE_URL;

const getApiCandidates = () => {
  const configured = [
    process.env.NEXT_PUBLIC_LOCAL_API_URL,
    process.env.NEXT_PUBLIC_APP_API_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ]
    .map(sanitizeBaseUrl)
    .filter(Boolean)
    .map(removeApiSuffix)
    .filter(Boolean);

  const siteUrl = getSiteUrl();
  const localFallbacks = ["http://127.0.0.1:8002", "http://127.0.0.1:8001"];

  return [
    ...new Set([siteUrl, ...configured, ...localFallbacks].filter(Boolean)),
  ];
};

const resolveProductImage = (product, apiBaseUrl) => {
  const siteUrl = getSiteUrl();
  const imageCandidates = [
    product?.thumbnail,
    product?.image,
    ...(Array.isArray(product?.images) ? product.images : []),
  ]
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);

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
            return `${siteUrl}${imagePath}`;
          }
          return `${siteUrl}/logo-og-v2.png`;
        }
      } catch {
        // If URL parsing fails, fall through to return original.
      }

      return candidate;
    }

    const normalizedPath = toCanonicalPath(candidate);
    if (!normalizedPath) continue;

    if (/^\/uploads\//i.test(normalizedPath)) {
      return `${siteUrl}${normalizedPath}`;
    }

    return `${siteUrl}${normalizedPath}`;
  }

  return `${getSiteUrl()}/logo-og-v2.png`;
};

const fetchProductForMetadata = async (id) => {
  const apiCandidates = getApiCandidates();

  for (const apiBase of apiCandidates) {
    const endpoint = `${apiBase}/api/products/${encodeURIComponent(id)}`;
    try {
      const response = await fetch(endpoint, { next: { revalidate: 300 } });
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
  const routeId = safeDecode(params?.id).trim();
  const siteUrl = getSiteUrl();

  if (!routeId) {
    return {
      title: "Product | Healthy One Gram",
      description: "Explore healthy products from Healthy One Gram.",
    };
  }

  const { product, apiBase } = await fetchProductForMetadata(routeId);
  if (!product) {
    return {
      title: "Product | Healthy One Gram",
      description: "Explore healthy products from Healthy One Gram.",
    };
  }

  const slugOrId = String(product?.slug || product?._id || routeId);
  const title = `${String(product?.name || "Product").trim()} | Healthy One Gram`;
  const description =
    stripHtml(product?.shortDescription || product?.description) ||
    "Premium healthy products from Healthy One Gram.";
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
      type: "product",
      images: [
        {
          url: imageUrl,
          alt: String(product?.name || "Healthy One Gram Product"),
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
