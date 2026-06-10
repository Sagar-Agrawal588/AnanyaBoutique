import path from "path";
import { fileURLToPath } from "url";

const configFilePath = fileURLToPath(import.meta.url);
const configDir = path.dirname(configFilePath);
const DEFAULT_PUBLIC_API_URL =
  "https://ananya-boutique-api.onrender.com/api";
const rawApiUrl =
  process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_PUBLIC_API_URL;

const parsedApiUrl = new URL(rawApiUrl);
const bareAdminRouteRedirectSources = [
  "/about-page/:path*",
  "/analytics/:path*",
  "/banners/:path*",
  "/behavior-analytics/:path*",
  "/blogs/:path*",
  "/blogs-page/:path*",
  "/cancellation-policy/:path*",
  "/category-list/:path*",
  "/coins/:path*",
  "/combos/:path*",
  "/coupons/:path*",
  "/crm/:path*",
  "/customer-care/:path*",
  "/email-templates/:path*",
  "/forgot-password/:path*",
  "/home-slides/:path*",
  "/influencers/:path*",
  "/login/:path*",
  "/membership/:path*",
  "/newsletter/:path*",
  "/notifications/:path*",
  "/orders/:path*",
  "/partner-api/:path*",
  "/products/:path*",
  "/products-list/:path*",
  "/profile/:path*",
  "/purchase-orders/:path*",
  "/register/:path*",
  "/reset-password/:path*",
  "/reviews/:path*",
  "/sales-analytics/:path*",
  "/seo-pages/:path*",
  "/settings/:path*",
  "/storefront-cms/:path*",
  "/shipping/:path*",
  "/statistics/:path*",
  "/terms-and-conditions/:path*",
  "/users/:path*",
  "/verify/:path*",
  "/whatsapp-crm/:path*",
];

const toAdminDestination = (source) =>
  `/admin${source.replace("/:path*", "/:path*")}`;

const apiImagePattern = [
  {
    protocol: parsedApiUrl.protocol.replace(":", ""),
    hostname: parsedApiUrl.hostname,
    ...(parsedApiUrl.port ? { port: parsedApiUrl.port } : {}),
    pathname: "/uploads/**",
  },
  {
    protocol: parsedApiUrl.protocol.replace(":", ""),
    hostname: parsedApiUrl.hostname,
    ...(parsedApiUrl.port ? { port: parsedApiUrl.port } : {}),
    pathname: "/api/media/**",
  },
];
const freshDocumentHeaders = [
  {
    key: "Cache-Control",
    value: "private, no-cache, no-store, max-age=0, must-revalidate",
  },
  {
    key: "CDN-Cache-Control",
    value: "no-store",
  },
  {
    key: "Surrogate-Control",
    value: "no-store",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/admin",
  outputFileTracingRoot: configDir,
  async redirects() {
    return [
      {
        source: "/",
        destination: "/admin",
        permanent: false,
        basePath: false,
      },
      ...bareAdminRouteRedirectSources.map((source) => ({
        source,
        destination: toAdminDestination(source),
        permanent: false,
        basePath: false,
      })),
    ];
  },
  async rewrites() {
    return [
      { source: "/ab_logo.png", destination: "/admin/ab_logo.png" },
      { source: "/ab-icon-192.png", destination: "/admin/ab-icon-192.png" },
      { source: "/ab-icon-512.png", destination: "/admin/ab-icon-512.png" },
      { source: "/profile.png", destination: "/admin/profile.png" },
      { source: "/pattern.png", destination: "/admin/pattern.png" },
    ];
  },
  async headers() {
    return [
      {
        source: "/",
        headers: freshDocumentHeaders,
      },
      {
        source:
          "/:path((?!_next/|api/|.*\\.(?:avif|bmp|css|gif|ico|jpe?g|js|json|map|png|svg|txt|webp|woff2?|xml)$).*)",
        headers: freshDocumentHeaders,
      },
    ];
  },
  turbopack: {
    root: configDir,
  },
  images: {
    remotePatterns: [
      ...apiImagePattern,
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
