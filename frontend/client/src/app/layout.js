import FlavorThemeProvider from "@/context/ThemeContext";
import ThemeProvider from "@/context/theme-provider";
import { resolvePublicSiteUrl } from "@/utils/siteUrl";
import { Inter, Playfair_Display, Poppins } from "next/font/google";
import Script from "next/script";
import ClientLayout from "./ClientLayout.jsx";
import "./globals.css";
import "../styles/themes.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fashion-serif",
});

const buildDefaultMetadata = (siteUrl) => ({
  metadataBase: new URL(siteUrl),
  title: "Ananya Boutique - Fashion Created With Love Since 2012",
  description:
    "Discover sarees, suits, kurtis, leggings, cosmetics, jewellery, and curated occasion edits from a family-owned boutique trusted since 2012.",
  keywords:
    "boutique fashion, sarees, suits, kurtis, leggings, cosmetics, artificial jewellery, accessories, occasion wear, ananya boutique",
  authors: [{ name: "Ananya Boutique" }],
  openGraph: {
    title: "Ananya Boutique - Fashion Created With Love Since 2012",
    description:
      "Fashion created with love, trust, and years of dedication by a founder-led family boutique.",
    url: siteUrl,
    type: "website",
    locale: "en_IN",
    siteName: "Ananya Boutique",
    images: [
      {
        url: "/logo-og-v2.png",
        width: 512,
        height: 512,
        alt: "Ananya Boutique",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ananya Boutique - Fashion Created With Love Since 2012",
    description:
      "A boutique built by a mother, trusted by women since 2012.",
    images: ["/logo-og-v2.png"],
  },
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png", sizes: "32x32" },
      { url: "/logo.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  robots: {
    index: true,
    follow: true,
  },
});

const normalizeApiBase = (value) =>
  String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "");
const DEFAULT_PUBLIC_SITE_URL = "https://ananyaboutique.com";
const DEFAULT_API_BASE_URL = "https://api.ananyaboutique.com";
const PUBLIC_SETTINGS_REVALIDATE_SECONDS = 300;
const PUBLIC_SETTINGS_FETCH_TIMEOUT_MS = 2500;

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    PUBLIC_SETTINGS_FETCH_TIMEOUT_MS,
  );

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const headerBackgroundBootstrapScript = `(function () {
  try {
    var key = "ananya_header_background_color";
    var legacyKey = "hog_header_background_color";
    var color = localStorage.getItem(key) || localStorage.getItem(legacyKey) || "";
    var valid = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color);
    if (valid) {
      var normalized = color.toLowerCase();
      if (normalized.length === 4) {
        normalized =
          "#" +
          normalized[1] + normalized[1] +
          normalized[2] + normalized[2] +
          normalized[3] + normalized[3];
      }
      localStorage.setItem(key, normalized);
      document.documentElement.style.setProperty("--header-bg-color", normalized);
    }
  } catch (e) {}
})();`;

export async function generateMetadata({ request }) {
  let defaultMetadata = buildDefaultMetadata(DEFAULT_PUBLIC_SITE_URL);

  try {
    const pathname = request?.nextUrl?.pathname || "/";
    const requestHost =
      request?.headers?.get("x-forwarded-host") || request?.headers?.get("host") || "";
    const requestProtocol =
      request?.headers?.get("x-forwarded-proto") || "https:";
    const siteUrl = resolvePublicSiteUrl({ requestHost, requestProtocol });
    defaultMetadata = buildDefaultMetadata(siteUrl);
    const apiBase = normalizeApiBase(
      process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL,
    );
    const resp = await fetchWithTimeout(`${apiBase}/api/settings/public`, {
      next: { revalidate: PUBLIC_SETTINGS_REVALIDATE_SECONDS },
    });
    if (!resp.ok) return defaultMetadata;
    const json = await resp.json();
    const seo = json?.data?.seoSettings;
    if (seo && Array.isArray(seo.pages)) {
      // Try exact match first, then startsWith
      let page = seo.pages.find((p) => String(p.path || "") === pathname);
      if (!page) {
        page = seo.pages.find((p) => pathname.startsWith(String(p.path || "")) && p.path !== "/");
      }
      if (page) {
        return {
          metadataBase: defaultMetadata.metadataBase,
          title: page.metaTitle || defaultMetadata.title,
          description: page.metaDescription || defaultMetadata.description,
          keywords: page.keywords || defaultMetadata.keywords,
          openGraph: {
            ...defaultMetadata.openGraph,
            title: page.metaTitle || defaultMetadata.openGraph.title,
            description: page.metaDescription || defaultMetadata.openGraph.description,
          },
          robots: { index: Boolean(page.indexable !== false), follow: true },
        };
      }
    }
  } catch (e) {
    // ignore and return defaults
  }

  return defaultMetadata;
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${poppins.variable} ${playfair.variable} ${inter.className}`}
      >
        <Script
          id="header-bg-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: headerBackgroundBootstrapScript }}
        />
        <FlavorThemeProvider>
          <ThemeProvider>
            <ClientLayout inter={inter}>{children}</ClientLayout>
          </ThemeProvider>
        </FlavorThemeProvider>
      </body>
    </html>
  );
}
