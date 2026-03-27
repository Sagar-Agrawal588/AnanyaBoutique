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

const getProductShareUrl = (productId, productName = "Product") => {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/product/${productId}`;
};

export const generateShareLinks = (productId, productName = "Product") => {
  if (typeof window === "undefined") {
    return {};
  }

  const baseUrl = getProductShareUrl(productId, productName);

  const getEncodedTrackedUrl = (platform) =>
    encodeURIComponent(generateUTMLink(baseUrl, productId, productName, platform));

  const productNameEncoded = encodeURIComponent(productName || "Check this out!");

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
  };
};

export const shareToSocialMedia = (platform, productId, productName = "Product") => {
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

  window.open(link.url, "_blank", `width=${width},height=${height},left=${left},top=${top}`);
};

export const copyToClipboard = async (productId, productName = "Product") => {
  try {
    const url = getProductShareUrl(productId, productName);
    const baseUrl = new URL(url);

    // Add UTM parameters to copied link
    baseUrl.searchParams.set("utm_source", "direct_share");
    baseUrl.searchParams.set("utm_medium", "copy_link");
    baseUrl.searchParams.set("utm_campaign", `product_${String(productId || "")}`);
    baseUrl.searchParams.set("utm_content", productName || "product");

    const fullUrl = baseUrl.toString();

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
