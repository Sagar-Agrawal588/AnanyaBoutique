import Banners from "@/components/Banners";
import CatSlider from "@/components/CatSlider";
import HomeComboDeals from "@/components/HomeComboDeals";
import HomeSlider from "@/components/HomeSlider";
import MembershipCTA from "@/components/MembershipCTA";
import PopularProducts from "@/components/PopularProducts";

const sanitizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\/+$/, "");

const API_BASE_URL = sanitizeBaseUrl(
  process.env.NEXT_PUBLIC_APP_API_URL || process.env.NEXT_PUBLIC_API_URL,
);
const SERVER_FETCH_TIMEOUT_MS = 3000;

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

const getHomepageData = async (path) => {
  if (!API_BASE_URL) {
    return [];
  }

  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    return Array.isArray(payload?.data) ? payload.data : [];
  } catch {
    return [];
  }
};

export default async function Home() {
  const [homeSlides, banners] = await Promise.all([
    getHomepageData("/api/home-slides"),
    getHomepageData("/api/banners"),
  ]);

  return (
    <>
      <div
        className="sliderWrapper pb-0 w-full overflow-x-hidden"
        style={{
          background: "var(--flavor-gradient)",
          transition: "background 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <HomeSlider initialSlides={homeSlides} />
        <CatSlider />
        <Banners initialBanners={banners} />
        <HomeComboDeals />
        <PopularProducts />
        <MembershipCTA />
      </div>
    </>
  );
}
