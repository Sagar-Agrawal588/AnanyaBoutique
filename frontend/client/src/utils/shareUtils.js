/**
 * Share Utility - Generate product share URLs with UTM tracking
 */

export const generateUTMLink = (baseUrl, productId, productName, platform) => {
  const url = new URL(baseUrl);

  // Add UTM parameters for tracking
  url.searchParams.set("utm_source", platform);
  url.searchParams.set("utm_medium", "social_share");
  url.searchParams.set("utm_campaign", `product_${String(productId || "")}`);
  url.searchParams.set("utm_content", productName || "product");

  return url.toString();
};

const DEFAULT_PUBLIC_SITE_URL = "https://healthyonegram.com";

const sanitizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\/+$/, "");

const getPublicSiteOrigin = () => {
  const configured = sanitizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;

  if (typeof window === "undefined") return DEFAULT_PUBLIC_SITE_URL;

  const origin = sanitizeBaseUrl(window.location?.origin);
  const hostname = String(window.location?.hostname || "").toLowerCase();
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

  if (!origin || isLocalhost) return DEFAULT_PUBLIC_SITE_URL;
  return origin;
};

const getProductShareUrl = (productId, productName = "Product") => {
  const origin = getPublicSiteOrigin();
  return `${origin}/product/${encodeURIComponent(String(productId || "").trim())}`;
};

const buildTrackedProductUrl = (
  productId,
  productName = "Product",
  source = "direct_share",
  medium = "copy_link",
) => {
  const url = getProductShareUrl(productId, productName);
  const baseUrl = new URL(url);

  baseUrl.searchParams.set("utm_source", source);
  baseUrl.searchParams.set("utm_medium", medium);
  baseUrl.searchParams.set(
    "utm_campaign",
    `product_${String(productId || "")}`,
  );
  baseUrl.searchParams.set("utm_content", productName || "product");

  return baseUrl.toString();
};

export const buildProductShareDetailsText = ({
  productName = "Product",
  brand,
  price,
  originalPrice,
  variantName,
  sku,
  url,
} = {}) => {
  const lines = [
    `${productName}`,
    brand ? `Brand: ${brand}` : null,
    variantName ? `Size: ${variantName}` : null,
    typeof price === "number" ? `Price: Rs ${price}` : null,
    typeof originalPrice === "number" && originalPrice > price
      ? `MRP: Rs ${originalPrice}`
      : null,
    sku ? `SKU: ${sku}` : null,
    url ? `Link: ${url}` : null,
  ].filter(Boolean);

  return lines.join("\n");
};

export const generateShareLinks = (productId, productName = "Product") => {
  if (typeof window === "undefined") {
    return {};
  }

  const baseUrl = getProductShareUrl(productId, productName);

  const getEncodedTrackedUrl = (platform) =>
    encodeURIComponent(
      generateUTMLink(baseUrl, productId, productName, platform),
    );

  const productNameEncoded = encodeURIComponent(
    productName || "Check this out!",
  );

  return {
    facebook: {
      url: `https://www.facebook.com/sharer/sharer.php?u=${getEncodedTrackedUrl("facebook")}`,
      platform: "facebook",
      label: "Facebook",
      icon: "facebook",
    },
    twitter: {
      url: `https://twitter.com/intent/tweet?url=${getEncodedTrackedUrl("twitter")}&text=${productNameEncoded}`,
      platform: "twitter",
      label: "Twitter",
      icon: "twitter",
    },
    whatsapp: {
      url: `https://wa.me/?text=${productNameEncoded}%20${getEncodedTrackedUrl("whatsapp")}`,
      platform: "whatsapp",
      label: "WhatsApp",
      icon: "whatsapp",
    },
    linkedin: {
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${getEncodedTrackedUrl("linkedin")}`,
      platform: "linkedin",
      label: "LinkedIn",
      icon: "linkedin",
    },
    pinterest: {
      url: `https://pinterest.com/pin/create/button/?url=${getEncodedTrackedUrl("pinterest")}&description=${productNameEncoded}`,
      platform: "pinterest",
      label: "Pinterest",
      icon: "pinterest",
    },
    email: {
      url: `mailto:?subject=${productNameEncoded}&body=${productNameEncoded}%20${getEncodedTrackedUrl("email")}`,
      platform: "email",
      label: "Email",
      icon: "email",
    },
    telegram: {
      url: `https://t.me/share/url?url=${getEncodedTrackedUrl("telegram")}&text=${productNameEncoded}`,
      platform: "telegram",
      label: "Telegram",
      icon: "telegram",
    },
    reddit: {
      url: `https://reddit.com/submit?url=${getEncodedTrackedUrl("reddit")}&title=${productNameEncoded}`,
      platform: "reddit",
      label: "Reddit",
      icon: "reddit",
    },
    sms: {
      url: `sms:?&body=${productNameEncoded}%20${getEncodedTrackedUrl("sms")}`,
      platform: "sms",
      label: "SMS",
      icon: "sms",
    },
    skype: {
      url: `https://web.skype.com/share?url=${getEncodedTrackedUrl("skype")}&text=${productNameEncoded}`,
      platform: "skype",
      label: "Skype",
      icon: "skype",
    },
  };
};

export const shareToSocialMedia = (
  platform,
  productId,
  productName = "Product",
) => {
  const links = generateShareLinks(productId, productName);
  const link = links[platform];

  if (!link) {
    console.warn(`Platform ${platform} not supported`);
    return;
  }

  // Track share event for analytics
  if (typeof window !== "undefined" && window.trackEvent) {
    window.trackEvent("product_shared", {
      productId,
      productName,
      platform,
    });
  }

  const width = 600;
  const height = 400;
  const left = (window.innerWidth - width) / 2;
  const top = (window.innerHeight - height) / 2;

  window.open(
    link.url,
    "_blank",
    `width=${width},height=${height},left=${left},top=${top}`,
  );
};

export const copyToClipboard = async (productId, productName = "Product") => {
  try {
    const fullUrl = buildTrackedProductUrl(
      productId,
      productName,
      "direct_share",
      "copy_link",
    );

    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(fullUrl);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = fullUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    // Track analytics
    if (typeof window !== "undefined" && window.trackEvent) {
      window.trackEvent("product_link_copied", {
        productId,
        productName,
      });
    }

    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
};

export const copyProductDetailsToClipboard = async ({
  productId,
  productName = "Product",
  brand,
  price,
  originalPrice,
  variantName,
  sku,
} = {}) => {
  try {
    const shareUrl = buildTrackedProductUrl(
      productId,
      productName,
      "direct_share",
      "copy_details",
    );
    const detailsText = buildProductShareDetailsText({
      productName,
      brand,
      price,
      originalPrice,
      variantName,
      sku,
      url: shareUrl,
    });

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(detailsText);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = detailsText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    if (typeof window !== "undefined" && window.trackEvent) {
      window.trackEvent("product_details_copied", {
        productId,
        productName,
      });
    }

    return true;
  } catch (error) {
    console.error("Failed to copy product details:", error);
    return false;
  }
};

export const shareViaNative = async ({
  productId,
  productName = "Product",
  brand,
  price,
  originalPrice,
  variantName,
  sku,
} = {}) => {
  try {
    if (
      typeof navigator === "undefined" ||
      typeof navigator.share !== "function"
    ) {
      return { ok: false, reason: "not_supported" };
    }

    const shareUrl = buildTrackedProductUrl(
      productId,
      productName,
      "native_share",
      "web_share_api",
    );

    const text = buildProductShareDetailsText({
      productName,
      brand,
      price,
      originalPrice,
      variantName,
      sku,
      url: shareUrl,
    });

    await navigator.share({
      title: productName,
      text,
      url: shareUrl,
    });

    if (typeof window !== "undefined" && window.trackEvent) {
      window.trackEvent("product_shared", {
        productId,
        productName,
        platform: "native_share",
      });
    }

    return { ok: true };
  } catch (error) {
    if (error?.name === "AbortError") {
      return { ok: false, reason: "aborted" };
    }
    console.error("Native share failed:", error);
    return { ok: false, reason: "failed" };
  }
};
