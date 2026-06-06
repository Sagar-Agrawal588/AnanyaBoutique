import AdminLayout from "@/components/AdminLayout";
import { AdminProvider } from "@/context/AdminContext";
import { withAdminBasePath } from "@/utils/basePath";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

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
    "https://admin.ananyaboutique.com/admin",
)
  .trim()
  .replace(/^["']|["']$/g, "")
  .replace(/\/+$/, "");

export const metadata = {
  metadataBase: new URL(adminUrl),
  title: "Ananya Boutique Admin Panel",
  description: "Admin dashboard for Ananya Boutique Fashion Boutique",
  openGraph: {
    title: "Ananya Boutique Admin Panel",
    description: "Admin dashboard for Ananya Boutique Fashion Boutique",
    url: adminUrl,
    type: "website",
    images: [
      {
        url: withAdminBasePath("/logo-og-v2.png"),
        width: 512,
        height: 512,
        alt: "Ananya Boutique Admin",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ananya Boutique Admin Panel",
    description: "Admin dashboard for Ananya Boutique Fashion Boutique",
    images: [withAdminBasePath("/logo-og-v2.png")],
  },
  icons: {
    icon: [
      {
        url: withAdminBasePath("/logo.png"),
        type: "image/png",
        sizes: "32x32",
      },
      {
        url: withAdminBasePath("/logo.png"),
        type: "image/png",
        sizes: "192x192",
      },
    ],
    shortcut: withAdminBasePath("/logo.png"),
    apple: withAdminBasePath("/logo.png"),
  },
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
