import { headers } from "next/headers";
import nextDynamic from "next/dynamic";
import { normalizeStorefrontContent } from "@/config/storefrontContent";
import { pickApiOrigin, sanitizeBaseUrl } from "@/utils/apiBaseUrl";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BoutiqueHomepage = nextDynamic(
  () => import("@/components/BoutiqueHomepage"),
  {
    loading: () => null,
  },
);
const WhatsAppFloatingButton = nextDynamic(
  () => import("@/components/WhatsAppFloatingButton"),
  {
    loading: () => null,
  },
);

const API_BASE_URL = sanitizeBaseUrl(
  pickApiOrigin(
    process.env.NEXT_PUBLIC_APP_API_URL,
    process.env.NEXT_PUBLIC_API_URL,
  ),
);
const LOCAL_DEV_API_BASE_URL = sanitizeBaseUrl(
  process.env.NODE_ENV === "production" ? "" : process.env.NEXT_PUBLIC_LOCAL_API_URL,
);
const HOMEPAGE_FETCH_TIMEOUT_MS = Math.max(
  Number.parseInt(
    String(process.env.NEXT_PUBLIC_HOMEPAGE_FETCH_TIMEOUT_MS || "12000"),
    10,
  ) || 12000,
  500,
);

const fetchWithTimeout = async (url, timeoutMs) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const sanitizeOrigin = (value) => {
  const normalized = sanitizeBaseUrl(value);
  if (!/^https?:\/\//i.test(normalized)) {
    return "";
  }
  return normalized;
};

const getRequestOrigin = async () => {
  if (process.env.NODE_ENV === "production") {
    return "";
  }

  try {
    const headerStore = await headers();
    const host = String(
      headerStore.get("x-forwarded-host") || headerStore.get("host") || "",
    ).trim();
    if (!host) return "";

    const proto = String(
      headerStore.get("x-forwarded-proto") ||
        (process.env.NODE_ENV === "production" ? "https" : "http"),
    ).trim();

    return sanitizeOrigin(`${proto}://${host}`);
  } catch {
    return "";
  }
};

const getHomepageBaseCandidates = (requestOrigin = "") => {
  if (process.env.NODE_ENV === "production") {
    return [API_BASE_URL].filter(Boolean);
  }

  const candidates = [requestOrigin, LOCAL_DEV_API_BASE_URL, API_BASE_URL].filter(
    (candidate, index, arr) => candidate && arr.indexOf(candidate) === index,
  );

  return candidates;
};

const getHomepagePayload = async (path, requestOrigin = "") => {
  const baseCandidates = getHomepageBaseCandidates(requestOrigin);
  if (!baseCandidates.length) {
    return null;
  }

  for (const base of baseCandidates) {
    try {
      const response = await fetchWithTimeout(
        `${base}${path}`,
        HOMEPAGE_FETCH_TIMEOUT_MS,
      );

      if (!response || !response.ok) {
        continue;
      }

      const payload = await response.json();
      if (payload && typeof payload === "object") return payload;
    } catch {
      // Fall through to next candidate.
    }
  }

  return null;
};

const getHomepageData = async (path, requestOrigin = "") => {
  const payload = await getHomepagePayload(path, requestOrigin);
  return Array.isArray(payload?.data) ? payload.data : [];
};

const getHomepageCategories = async (requestOrigin = "") => {
  const payload = await getHomepagePayload("/api/categories", requestOrigin);
  const items = Array.isArray(payload?.data) ? payload.data : [];
  return items.filter((category) => !category?.parent && !category?.parentCategory);
};

const getHomepageFeaturedProducts = async (requestOrigin = "") => {
  const payload = await getHomepagePayload(
    "/api/products/featured?includeCombos=false&limit=8",
    requestOrigin,
  );
  return Array.isArray(payload?.data) ? payload.data : [];
};

const getHomepageNewArrivals = async (requestOrigin = "") => {
  const payload = await getHomepagePayload(
    "/api/products?newArrivals=true&sortBy=createdAt&order=desc&includeCombos=false&limit=8",
    requestOrigin,
  );
  return Array.isArray(payload?.data) ? payload.data : [];
};

const getHomepageBestSellers = async (requestOrigin = "") => {
  const payload = await getHomepagePayload(
    "/api/products?bestSeller=true&sortBy=soldCount&order=desc&includeCombos=false&limit=8",
    requestOrigin,
  );
  return Array.isArray(payload?.data) ? payload.data : [];
};

export default async function Home() {
  const requestOrigin = await getRequestOrigin();
  const [
    homepageCategories,
    featuredProducts,
    newArrivals,
    bestSellers,
    featuredReviews,
    storefrontPayload,
  ] =
    await Promise.all([
      getHomepageCategories(requestOrigin),
      getHomepageFeaturedProducts(requestOrigin),
      getHomepageNewArrivals(requestOrigin),
      getHomepageBestSellers(requestOrigin),
      getHomepageData("/api/reviews/featured/home?limit=6", requestOrigin),
      getHomepagePayload("/api/settings/public/storefrontContent", requestOrigin),
    ]);
  const storefrontContent = normalizeStorefrontContent(storefrontPayload?.data);

  return (
    <main
      className="relative min-h-screen w-full overflow-x-hidden pb-0"
      style={{
        background:
          "linear-gradient(180deg, #fff9fc 0%, #ffffff 45%, #fbf7ff 100%)",
        transition: "background 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <BoutiqueHomepage
        initialCategories={homepageCategories}
        featuredProducts={featuredProducts}
        newArrivals={newArrivals}
        bestSellers={bestSellers}
        featuredReviews={featuredReviews}
        content={storefrontContent.homepage}
        contact={storefrontContent.contact}
        mediaSlots={storefrontContent.mediaSlots}
      />
      <WhatsAppFloatingButton />
    </main>
  );
}
