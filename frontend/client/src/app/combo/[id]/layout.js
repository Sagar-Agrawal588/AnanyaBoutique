const DEFAULT_SITE_URL = "https://healthyonegram.com";
const DEFAULT_API_ORIGIN = "https://healthyonegram-api-v2-xb7znoco6a-uc.a.run.app";

const sanitizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\/+$/, "");

const removeApiSuffix = (value) => String(value || "").replace(/\/api$/i, "");

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(String(value || ""));

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

const isObjectId = (value) => /^[0-9a-f]{24}$/i.test(String(value || ""));

const toCanonicalPath = (value = "") => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const getSiteUrl = () =>
  sanitizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL) || DEFAULT_SITE_URL;

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

const resolveComboImage = (combo, apiBaseUrl) => {
  const siteUrl = getSiteUrl();
  const itemImages = (Array.isArray(combo?.items) ? combo.items : [])
    .map((item) => normalizeImageInput(item?.image))
    .filter(Boolean);
  const candidates = [
    combo?.comboThumbnail,
    combo?.combo_thumbnail,
    combo?.thumbnail,
    combo?.image,
    ...(Array.isArray(combo?.comboImages) ? combo.comboImages : []),
    ...(Array.isArray(combo?.combo_images) ? combo.combo_images : []),
    ...itemImages,
  ].map(normalizeImageInput).filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.startsWith("data:image/")) {
      return candidate;
    }

    if (candidate.startsWith("res.cloudinary.com/")) {
      return `https://${candidate}`;
    }

    if (isAbsoluteUrl(candidate)) {
      return candidate;
    }

    const normalizedPath = toCanonicalPath(candidate);
    if (!normalizedPath) continue;

    if (/^\/uploads\//i.test(normalizedPath)) {
      return `${apiBaseUrl || siteUrl}${normalizedPath}`;
    }

    return `${siteUrl}${normalizedPath}`;
  }

  return `${getSiteUrl()}/logo-og-v2.png`;
};

const fetchComboForMetadata = async (id) => {
  const apiCandidates = getApiCandidates();
  const slugMode = !isObjectId(id);

  for (const apiBase of apiCandidates) {
    const lookupChain = slugMode
      ? [
          `${apiBase}/api/combos/slug/${encodeURIComponent(id)}`,
          `${apiBase}/api/combos/${encodeURIComponent(id)}`,
        ]
      : [`${apiBase}/api/combos/${encodeURIComponent(id)}`];

    for (const endpoint of lookupChain) {
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok) continue;
        const payload = await response.json();
        const combo = payload?.data?.data || payload?.data || null;
        if (combo?._id || combo?.slug) {
          return { combo, apiBase };
        }
      } catch {
        // Keep trying candidates.
      }
    }
  }

  return { combo: null, apiBase: "" };
};

export async function generateMetadata({ params }) {
  const routeId = safeDecode(params?.id).trim();
  const siteUrl = getSiteUrl();

  if (!routeId) {
    return {
      title: "Combo Deal | Healthy One Gram",
      description: "Explore combo offers from Healthy One Gram.",
    };
  }

  const { combo, apiBase } = await fetchComboForMetadata(routeId);
  if (!combo) {
    return {
      title: "Combo Deal | Healthy One Gram",
      description: "Explore combo offers from Healthy One Gram.",
    };
  }

  const slugOrId = String(combo?.slug || combo?._id || routeId);
  const title = `${String(combo?.name || "Combo Deal").trim()} | Healthy One Gram`;
  const description =
    stripHtml(combo?.shortDescription || combo?.description) ||
    "Handpicked combo savings from Healthy One Gram.";
  const url = `${siteUrl}/combo/${encodeURIComponent(slugOrId)}`;
  const imageUrl = resolveComboImage(combo, apiBase);

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
      siteName: "Healthy One Gram",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: String(combo?.name || "Healthy One Gram Combo"),
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

export default function ComboRouteLayout({ children }) {
  return children;
}
