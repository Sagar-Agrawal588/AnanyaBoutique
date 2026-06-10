import AdminLayout from "@/components/AdminLayout";
import {
  ADMIN_BRAND_TITLE,
  BRAND_DESCRIPTION,
  BRAND_NAME,
  brandAssets,
  getAdminBrandSocialImage,
} from "@/config/brandAssets";
import { AdminProvider } from "@/context/AdminContext";
import { withAdminBasePath } from "@/utils/basePath";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const adminUrl = String(
  process.env.NEXT_PUBLIC_ADMIN_URL ||
    "https://ananyaboutique.com/admin",
)
  .trim()
  .replace(/^["']|["']$/g, "")
  .replace(/\/+$/, "");

export const metadata = {
  metadataBase: new URL(adminUrl),
  title: ADMIN_BRAND_TITLE,
  description: `${BRAND_DESCRIPTION} Admin dashboard.`,
  openGraph: {
    title: ADMIN_BRAND_TITLE,
    description: `${BRAND_DESCRIPTION} Admin dashboard.`,
    url: adminUrl,
    type: "website",
    images: [
      {
        url: withAdminBasePath(getAdminBrandSocialImage("openGraphImage").src),
        width: getAdminBrandSocialImage("openGraphImage").width,
        height: getAdminBrandSocialImage("openGraphImage").height,
        alt: getAdminBrandSocialImage("openGraphImage").alt,
      },
    ],
    siteName: BRAND_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: ADMIN_BRAND_TITLE,
    description: `${BRAND_DESCRIPTION} Admin dashboard.`,
    images: [withAdminBasePath(getAdminBrandSocialImage("twitterImage").src)],
  },
  icons: {
    icon: [
      {
        url: withAdminBasePath(brandAssets.favicon.src),
        type: brandAssets.favicon.type,
        sizes: brandAssets.favicon.sizes,
      },
      {
        url: withAdminBasePath(brandAssets.pwa.icon192.src),
        type: brandAssets.pwa.icon192.type,
        sizes: brandAssets.pwa.icon192.sizes,
      },
    ],
    shortcut: withAdminBasePath(brandAssets.favicon.src),
    apple: withAdminBasePath(brandAssets.appleTouchIcon.src),
  },
  manifest: brandAssets.pwa.manifest,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AdminProvider>
          <Toaster position="top-right" />
          <AdminLayout>{children}</AdminLayout>
        </AdminProvider>
      </body>
    </html>
  );
}
