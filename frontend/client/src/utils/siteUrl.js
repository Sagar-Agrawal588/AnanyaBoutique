const DEFAULT_PUBLIC_SITE_URL = "https://ananyaboutique.com";

const HEALTHY_ONE_GRAM_HOSTS = new Set([
  "ananyaboutique.com",
  "www.ananyaboutique.com",
]);

const isHostedAppHost = (hostname) =>
  String(hostname || "").toLowerCase().endsWith(".hosted.app");

const sanitizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\/+$/, "");

const resolveUrlFromHost = (host, protocol = "https:") => {
  const hostname = String(host || "").trim().toLowerCase();
  if (!hostname) return "";
  if (hostname === "localhost" || hostname === "127.0.0.1") return "";
  if (
    HEALTHY_ONE_GRAM_HOSTS.has(hostname) ||
    isHostedAppHost(hostname)
  ) {
    return `${String(protocol || "https:").replace(/:$/, "")}//${hostname}`;
  }
  return "";
};

export const resolvePublicSiteUrl = ({ requestHost, requestProtocol } = {}) => {
  const configured = sanitizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL);

  if (requestHost) {
    return (
      resolveUrlFromHost(requestHost, requestProtocol) ||
      configured ||
      DEFAULT_PUBLIC_SITE_URL
    );
  }

  if (typeof window !== "undefined") {
    const host = String(window.location.hostname || "").toLowerCase();
    const origin = sanitizeBaseUrl(window.location.origin);

    if (host === "localhost" || host === "127.0.0.1") {
      return configured || DEFAULT_PUBLIC_SITE_URL;
    }

    return resolveUrlFromHost(host, window.location.protocol) || origin || configured || DEFAULT_PUBLIC_SITE_URL;
  }

  return configured || DEFAULT_PUBLIC_SITE_URL;
};
