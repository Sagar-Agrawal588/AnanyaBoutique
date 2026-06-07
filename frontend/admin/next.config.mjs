import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

if (!rawApiUrl) {
  throw new Error("NEXT_PUBLIC_API_URL is not defined");
}

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

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/admin",
  outputFileTracingRoot: __dirname,
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
      { source: "/logo.png", destination: "/admin/logo.png" },
      { source: "/profile.png", destination: "/admin/profile.png" },
      { source: "/pattern.png", destination: "/admin/pattern.png" },
    ];
  },
  turbopack: {
    root: __dirname,
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
