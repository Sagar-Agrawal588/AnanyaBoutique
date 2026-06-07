export const BRAND_NAME = "Ananya Boutique";

export const BRAND_DESCRIPTION =
  "Fashion, beauty, and accessories curated with love since 2012.";

export const BRAND_TAGLINE =
  "Fashion, Beauty & Accessories Curated With Love Since 2012";

export const BRAND_SHORT_NAME = "Ananya";

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
  src,
  alt,
  width,
  height,
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
  replaceNote:
    "Replace this slot source when the final Ananya Boutique logo system is approved.",
});

export const brandAssets = {
  name: BRAND_NAME,
  shortName: BRAND_SHORT_NAME,
  description: BRAND_DESCRIPTION,
  tagline: BRAND_TAGLINE,
  logos: {
    main: makeLogo({
      slot: "main",
      src: "",
      alt: "Ananya Boutique main logo",
      width: 72,
      height: 72,
    }),
    header: makeLogo({
      slot: "header",
      src: "",
      alt: "Ananya Boutique header logo",
      width: 72,
      height: 72,
    }),
    mobile: makeLogo({
      slot: "mobile",
      src: "",
      alt: "Ananya Boutique mobile logo",
      width: 48,
      height: 48,
      lockup: "AB",
      tagline: "",
    }),
    footer: makeLogo({
      slot: "footer",
      src: "",
      alt: "Ananya Boutique footer logo",
      width: 58,
      height: 58,
      tagline: "Trusted Since 2012",
    }),
    admin: makeLogo({
      slot: "admin",
      src: "/logo.png",
      alt: "Ananya Boutique admin logo",
      width: 160,
      height: 56,
      tagline: "Admin",
    }),
    login: makeLogo({
      slot: "login",
      src: "/logo.png",
      alt: "Ananya Boutique login logo",
      width: 160,
      height: 56,
      tagline: "Secure Sign In",
    }),
    invoice: makeLogo({
      slot: "invoice",
      src: "/logo.png",
      alt: "Ananya Boutique invoice logo",
      width: 160,
      height: 56,
      tagline: "Invoice",
    }),
  },
  favicon: {
    src: "/logo.png",
    type: "image/png",
    sizes: "32x32",
    alt: "Ananya Boutique favicon placeholder",
    replaceNote:
      "Replace with final favicon file when the final logo system is approved.",
  },
  appleTouchIcon: {
    src: "/logo.png",
    type: "image/png",
    sizes: "180x180",
    alt: "Ananya Boutique app icon placeholder",
  },
  social: {
    openGraphImage: {
      src: "/logo-og-v2.png",
      width: 512,
      height: 512,
      alt: "Ananya Boutique social sharing image",
    },
    twitterImage: {
      src: "/logo-og-v2.png",
      width: 512,
      height: 512,
      alt: "Ananya Boutique Twitter sharing image",
    },
    shareImage: {
      src: "/logo-og-v2.png",
      width: 512,
      height: 512,
      alt: "Ananya Boutique share image",
    },
    socialShareImage: {
      src: "/logo-og-v2.png",
      width: 512,
      height: 512,
      alt: "Ananya Boutique social share image",
    },
  },
  pwa: {
    manifest: "/manifest.webmanifest",
    themeColor: "#2f1325",
    backgroundColor: "#fffaf6",
    icon192: {
      src: "/logo.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any maskable",
    },
    icon512: {
      src: "/logo-og-v2.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
  },
  notification: {
    icon: "/logo.png",
    badge: "/logo.png",
  },
};

export const getBrandLogo = (slot = "main") =>
  brandAssets.logos[slot] || brandAssets.logos.main;

export const getBrandSocialImage = (slot = "openGraphImage") =>
  brandAssets.social[slot] || brandAssets.social.openGraphImage;

export const getBrandNotificationAsset = (slot = "icon") =>
  brandAssets.notification[slot] || brandAssets.notification.icon;

export default brandAssets;
