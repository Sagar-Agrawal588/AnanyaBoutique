import path from "path";
import { fileURLToPath } from "url";

const configFilePath = fileURLToPath(import.meta.url);
const configDir = path.dirname(configFilePath);
const DEFAULT_PUBLIC_API_URL = "https://api.ananyaboutique.com/api";
const rawConfiguredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const rawLocalDevApiUrl = process.env.NEXT_PUBLIC_LOCAL_API_URL?.trim();

const sanitizeUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");
const isLocalhostUrl = (value) => {
  try {
    const parsed = new URL(String(value || ""));
    const hostname = String(parsed.hostname || "").toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
};
const normalizeLoopbackUrl = (value) => {
  const sanitized = sanitizeUrl(value);
  if (!sanitized || !isLocalhostUrl(sanitized)) {
    return sanitized;
  }

  try {
    const parsed = new URL(sanitized);
    parsed.hostname = "127.0.0.1";
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return sanitized;
  }
};

const rawApiUrl =
  process.env.NODE_ENV === "production" && isLocalhostUrl(rawConfiguredApiUrl)
    ? DEFAULT_PUBLIC_API_URL
    : rawConfiguredApiUrl || DEFAULT_PUBLIC_API_URL;

const normalizedApiUrl = rawApiUrl.replace(/\/+$/, "").replace(/\/api$/i, "");
const normalizedLocalDevApiUrl = rawLocalDevApiUrl
  ? normalizeLoopbackUrl(sanitizeUrl(rawLocalDevApiUrl).replace(/\/api$/i, ""))
  : "";
const resolvedDevApiUrl =
  process.env.NODE_ENV !== "production" && normalizedLocalDevApiUrl
    ? normalizedLocalDevApiUrl
    : normalizedApiUrl;
const parsedApiUrl = new URL(normalizedApiUrl);
const parsedDevApiUrl = new URL(resolvedDevApiUrl);
const firebaseProjectId = String(
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
).trim();
const firebaseProjectHost = firebaseProjectId
  ? `https://${firebaseProjectId}.firebaseapp.com`
  : "";
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
  ...(resolvedDevApiUrl !== normalizedApiUrl
    ? [
        {
          protocol: parsedDevApiUrl.protocol.replace(":", ""),
          hostname: parsedDevApiUrl.hostname,
          ...(parsedDevApiUrl.port ? { port: parsedDevApiUrl.port } : {}),
          pathname: "/uploads/**",
        },
        {
          protocol: parsedDevApiUrl.protocol.replace(":", ""),
          hostname: parsedDevApiUrl.hostname,
          ...(parsedDevApiUrl.port ? { port: parsedDevApiUrl.port } : {}),
          pathname: "/api/media/**",
        },
      ]
    : []),
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
const sharedSecurityHeaders = [
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
];

const nextConfig = {
  outputFileTracingRoot: configDir,
  turbopack: {
    root: configDir,
  },
  images: {
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1600, 1920],
    imageSizes: [32, 48, 64, 96, 128, 160, 240, 320, 420, 640],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2678400,
    remotePatterns: [
      ...apiImagePattern,
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/products/:slug",
        destination: "/product/:slug",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const rewrites = [];

    if (firebaseProjectHost) {
      rewrites.push(
        {
          source: "/__/auth/:path*",
          destination: `${firebaseProjectHost}/__/auth/:path*`,
        },
        {
          source: "/__/firebase/:path*",
          destination: `${firebaseProjectHost}/__/firebase/:path*`,
        },
      );
    }

    if (process.env.NODE_ENV === "production") {
      return rewrites;
    }

    return [
      ...rewrites,
      {
        source: "/api/:path*",
        destination: `${resolvedDevApiUrl}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${resolvedDevApiUrl}/uploads/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: sharedSecurityHeaders,
      },
      {
        source:
          "/:path((?!_next/|api/|.*\\.(?:avif|bmp|css|gif|ico|jpe?g|js|json|map|png|svg|txt|webp|woff2?|xml)$).*)",
        headers: freshDocumentHeaders,
      },
    ];
  },
};

export default nextConfig;
