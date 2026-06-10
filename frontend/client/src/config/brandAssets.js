export const BRAND_NAME = "Ananya Boutique";

export const BRAND_DESCRIPTION =
  "Fashion, beauty, and accessories curated with love since 2012.";

export const BRAND_TAGLINE =
  "Fashion, Beauty & Accessories Curated With Love Since 2012";

export const BRAND_SHORT_NAME = "Ananya";

export const OFFICIAL_BRAND_LOGO_SRC = "/ab_logo.png";
export const OFFICIAL_BRAND_LOGO_WIDTH = 1254;
export const OFFICIAL_BRAND_LOGO_HEIGHT = 1254;

const LEGACY_BRAND_REPLACEMENTS = [
  [/Healthy OneGram/gi, BRAND_NAME],
  [/Healthy One Gram/gi, BRAND_NAME],
  [/HealthyOneGram/gi, BRAND_NAME],
  [/Buy One Gram/gi, BRAND_NAME],
  [/Buy OneGram/gi, BRAND_NAME],
  [/BuyOneGram/gi, BRAND_NAME],
  [/HealthyOne/gi, BRAND_NAME],
  [/OneGram/gi, BRAND_NAME],
  [/Premium Health Products/gi, "Curated Fashion Boutique"],
  [
    /peanut butter,\s*healthy food,\s*organic,\s*natural,\s*protein/gi,
    "boutique fashion, sarees, suits, kurtis, cosmetics, jewellery, accessories",
  ],
  [
    /premium quality peanut butter and healthy food products/gi,
    "boutique fashion, beauty, and accessories curated with love",
  ],
  [
    /peanut butter and healthy food products/gi,
    "boutique fashion, beauty, and accessories",
  ],
  [/peanut butter/gi, "boutique fashion"],
  [/healthy food/gi, "boutique style"],
  [/Healthy living, trusted choices/gi, BRAND_TAGLINE],
  [/healthy living/gi, "curated boutique style"],
  [/health-focused families/gi, "boutique customers"],
  [/healthy food products/gi, "boutique fashion and accessories"],
];

export const sanitizeBrandText = (value, fallback = "") => {
  const raw = String(value || "").trim();
  const fallbackText = String(fallback || "").trim();
  let next = raw || fallbackText;

  LEGACY_BRAND_REPLACEMENTS.forEach(([pattern, replacement]) => {
    next = next.replace(pattern, replacement);
  });

  return next.trim() || fallbackText;
};

const makeLogo = ({
  slot,
  src = OFFICIAL_BRAND_LOGO_SRC,
  alt,
  width = OFFICIAL_BRAND_LOGO_WIDTH,
  height = OFFICIAL_BRAND_LOGO_HEIGHT,
  lockup = BRAND_NAME,
  tagline = BRAND_TAGLINE,
}) => ({
  slot,
  src,
  alt,
  width,
  height,
  lockup,
  tagline,
  official: true,
});

export const brandAssets = {
  name: BRAND_NAME,
  shortName: BRAND_SHORT_NAME,
  description: BRAND_DESCRIPTION,
  tagline: BRAND_TAGLINE,
  logos: {
    main: makeLogo({
      slot: "main",
      alt: "Ananya Boutique main logo",
    }),
    header: makeLogo({
      slot: "header",
      alt: "Ananya Boutique header logo",
    }),
    mobile: makeLogo({
      slot: "mobile",
      alt: "Ananya Boutique mobile logo",
      lockup: "AB",
      tagline: "",
    }),
    footer: makeLogo({
      slot: "footer",
      alt: "Ananya Boutique footer logo",
      tagline: "Trusted Since 2012",
    }),
    admin: makeLogo({
      slot: "admin",
      alt: "Ananya Boutique admin logo",
      tagline: "Admin",
    }),
    login: makeLogo({
      slot: "login",
      alt: "Ananya Boutique login logo",
      tagline: "Secure Sign In",
    }),
    invoice: makeLogo({
      slot: "invoice",
      alt: "Ananya Boutique invoice logo",
      tagline: "Invoice",
    }),
  },
  favicon: {
    src: "/favicon.ico",
    type: "image/x-icon",
    sizes: "32x32",
    alt: "Ananya Boutique favicon",
  },
  appleTouchIcon: {
    src: "/favicon.png",
    type: "image/png",
    sizes: "180x180",
    alt: "Ananya Boutique app icon",
  },
  social: {
    openGraphImage: {
      src: OFFICIAL_BRAND_LOGO_SRC,
      width: OFFICIAL_BRAND_LOGO_WIDTH,
      height: OFFICIAL_BRAND_LOGO_HEIGHT,
      alt: "Ananya Boutique social sharing image",
    },
    twitterImage: {
      src: OFFICIAL_BRAND_LOGO_SRC,
      width: OFFICIAL_BRAND_LOGO_WIDTH,
      height: OFFICIAL_BRAND_LOGO_HEIGHT,
      alt: "Ananya Boutique Twitter sharing image",
    },
    shareImage: {
      src: OFFICIAL_BRAND_LOGO_SRC,
      width: OFFICIAL_BRAND_LOGO_WIDTH,
      height: OFFICIAL_BRAND_LOGO_HEIGHT,
      alt: "Ananya Boutique share image",
    },
    socialShareImage: {
      src: OFFICIAL_BRAND_LOGO_SRC,
      width: OFFICIAL_BRAND_LOGO_WIDTH,
      height: OFFICIAL_BRAND_LOGO_HEIGHT,
      alt: "Ananya Boutique social share image",
    },
  },
  pwa: {
    manifest: "/manifest.webmanifest",
    themeColor: "#050505",
    backgroundColor: "#050505",
    icon192: {
      src: "/ab-icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any maskable",
    },
    icon512: {
      src: "/ab-icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
  },
  notification: {
    icon: "/ab-icon-192.png",
    badge: "/ab-icon-192.png",
  },
};

export const getBrandLogo = (slot = "main") =>
  brandAssets.logos[slot] || brandAssets.logos.main;

export const getBrandSocialImage = (slot = "openGraphImage") =>
  brandAssets.social[slot] || brandAssets.social.openGraphImage;

export const getBrandNotificationAsset = (slot = "icon") =>
  brandAssets.notification[slot] || brandAssets.notification.icon;

export default brandAssets;
