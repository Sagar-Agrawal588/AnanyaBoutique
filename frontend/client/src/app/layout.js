import FlavorThemeProvider from "@/context/ThemeContext";
import ThemeProvider from "@/context/theme-provider";
import {
  BRAND_DESCRIPTION,
  BRAND_NAME,
  brandAssets,
  getBrandSocialImage,
  sanitizeBrandText,
} from "@/config/brandAssets";
import { pickApiOrigin } from "@/utils/apiBaseUrl";
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

const normalizeCmsImage = (value, fallback) => {
  const src = String(value || "").trim();
  if (!src) return fallback;
  return {
    ...fallback,
    src,
  };
};

const buildDefaultMetadata = (siteUrl, mediaOverrides = {}) => {
  const openGraphImage = normalizeCmsImage(
    mediaOverrides.openGraphImage,
    getBrandSocialImage("openGraphImage"),
  );
  const twitterImage = normalizeCmsImage(
    mediaOverrides.twitterImage || mediaOverrides.openGraphImage,
    getBrandSocialImage("twitterImage"),
  );

  return {
    metadataBase: new URL(siteUrl),
    title: BRAND_NAME,
    description: BRAND_DESCRIPTION,
    keywords:
      "boutique fashion, sarees, suits, kurtis, leggings, cosmetics, artificial jewellery, accessories, occasion wear, ananya boutique",
    authors: [{ name: BRAND_NAME }],
    openGraph: {
      title: BRAND_NAME,
      description: BRAND_DESCRIPTION,
      url: siteUrl,
      type: "website",
      locale: "en_IN",
      siteName: BRAND_NAME,
      images: [
        {
          url: openGraphImage.src,
          width: openGraphImage.width,
          height: openGraphImage.height,
          alt: openGraphImage.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: BRAND_NAME,
      description: BRAND_DESCRIPTION,
      images: [twitterImage.src],
    },
    icons: {
      icon: [
        {
          url: brandAssets.favicon.src,
          type: brandAssets.favicon.type,
          sizes: brandAssets.favicon.sizes,
        },
        {
          url: brandAssets.pwa.icon192.src,
          type: brandAssets.pwa.icon192.type,
          sizes: brandAssets.pwa.icon192.sizes,
        },
      ],
      shortcut: brandAssets.favicon.src,
      apple: brandAssets.appleTouchIcon.src,
    },
    manifest: brandAssets.pwa.manifest,
    robots: {
      index: true,
      follow: true,
    },
  };
};

const DEFAULT_PUBLIC_SITE_URL = "https://ananyaboutique.com";
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
    var legacyKey = ["h", "o", "g"].join("") + "_header_background_color";
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
    const apiBase = pickApiOrigin(process.env.NEXT_PUBLIC_API_URL);
    const resp = await fetchWithTimeout(`${apiBase}/api/settings/public`, {
      next: { revalidate: PUBLIC_SETTINGS_REVALIDATE_SECONDS },
    });
    if (!resp.ok) return defaultMetadata;
    const json = await resp.json();
    const openGraphImages =
      json?.data?.storefrontContent?.mediaSlots?.openGraphImages || {};
    const cmsOpenGraphImage =
      openGraphImages.default ||
      openGraphImages.openGraphImage ||
      openGraphImages.socialShare ||
      "";
    const cmsTwitterImage =
      openGraphImages.twitter ||
      openGraphImages.twitterImage ||
      cmsOpenGraphImage ||
      "";
    if (cmsOpenGraphImage || cmsTwitterImage) {
      defaultMetadata = buildDefaultMetadata(siteUrl, {
        openGraphImage: cmsOpenGraphImage,
        twitterImage: cmsTwitterImage,
      });
    }

    const seo = json?.data?.seoSettings;
    if (seo && Array.isArray(seo.pages)) {
      // Try exact match first, then startsWith
      let page = seo.pages.find((p) => String(p.path || "") === pathname);
      if (!page) {
        page = seo.pages.find((p) => pathname.startsWith(String(p.path || "")) && p.path !== "/");
      }
      if (page) {
        const title = sanitizeBrandText(page.metaTitle, defaultMetadata.title);
        const description = sanitizeBrandText(
          page.metaDescription,
          defaultMetadata.description,
        );
        const keywords = sanitizeBrandText(
          page.keywords,
          defaultMetadata.keywords,
        );
        return {
          ...defaultMetadata,
          metadataBase: defaultMetadata.metadataBase,
          title,
          description,
          keywords,
          openGraph: {
            ...defaultMetadata.openGraph,
            title,
            description,
          },
          twitter: {
            ...defaultMetadata.twitter,
            title,
            description,
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
