export const BRAND_NAME = "Ananya Boutique";

export const BRAND_DESCRIPTION =
  "Fashion, beauty, and accessories curated with love since 2012.";

export const BRAND_TAGLINE =
  "Fashion, Beauty & Accessories Curated With Love Since 2012";

export const ADMIN_BRAND_TITLE = "Ananya Boutique Admin";
export const OFFICIAL_BRAND_LOGO_SRC = "/ab_logo.png";
export const OFFICIAL_BRAND_LOGO_WIDTH = 1254;
export const OFFICIAL_BRAND_LOGO_HEIGHT = 1254;

const makeLogo = ({
  slot,
  src = OFFICIAL_BRAND_LOGO_SRC,
  alt,
  width = OFFICIAL_BRAND_LOGO_WIDTH,
  height = OFFICIAL_BRAND_LOGO_HEIGHT,
  lockup = BRAND_NAME,
  tagline = "Admin",
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
  description: BRAND_DESCRIPTION,
  tagline: BRAND_TAGLINE,
  adminTitle: ADMIN_BRAND_TITLE,
  logos: {
    admin: makeLogo({
      slot: "admin",
      alt: "Ananya Boutique admin logo",
    }),
    login: makeLogo({
      slot: "login",
      alt: "Ananya Boutique login logo",
      tagline: "Secure Sign In",
    }),
    header: makeLogo({
      slot: "header",
      alt: "Ananya Boutique admin header logo",
    }),
    mobile: makeLogo({
      slot: "mobile",
      alt: "Ananya Boutique admin mobile logo",
      lockup: "AB",
      tagline: "",
    }),
    footer: makeLogo({
      slot: "footer",
      alt: "Ananya Boutique admin footer logo",
      tagline: "Trusted Since 2012",
    }),
    invoice: makeLogo({
      slot: "invoice",
      alt: "Ananya Boutique invoice logo",
      tagline: "Invoice",
    }),
  },
  favicon: {
    src: "/ab-icon-192.png",
    type: "image/png",
    sizes: "192x192",
    alt: "Ananya Boutique admin favicon",
  },
  appleTouchIcon: {
    src: "/ab-icon-192.png",
    type: "image/png",
    sizes: "192x192",
    alt: "Ananya Boutique admin app icon",
  },
  social: {
    openGraphImage: {
      src: OFFICIAL_BRAND_LOGO_SRC,
      width: OFFICIAL_BRAND_LOGO_WIDTH,
      height: OFFICIAL_BRAND_LOGO_HEIGHT,
      alt: "Ananya Boutique admin social image",
    },
    twitterImage: {
      src: OFFICIAL_BRAND_LOGO_SRC,
      width: OFFICIAL_BRAND_LOGO_WIDTH,
      height: OFFICIAL_BRAND_LOGO_HEIGHT,
      alt: "Ananya Boutique admin Twitter image",
    },
    shareImage: {
      src: OFFICIAL_BRAND_LOGO_SRC,
      width: OFFICIAL_BRAND_LOGO_WIDTH,
      height: OFFICIAL_BRAND_LOGO_HEIGHT,
      alt: "Ananya Boutique admin share image",
    },
    socialShareImage: {
      src: OFFICIAL_BRAND_LOGO_SRC,
      width: OFFICIAL_BRAND_LOGO_WIDTH,
      height: OFFICIAL_BRAND_LOGO_HEIGHT,
      alt: "Ananya Boutique admin social share image",
    },
  },
  email: {
    logo: {
      src: OFFICIAL_BRAND_LOGO_SRC,
      alt: "Ananya Boutique email logo",
    },
    heroPlaceholder: {
      src: OFFICIAL_BRAND_LOGO_SRC,
      alt: "Ananya Boutique email hero",
    },
  },
  pwa: {
    manifest: "/admin/manifest.webmanifest",
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
};

export const getAdminBrandLogo = (slot = "admin") =>
  brandAssets.logos[slot] || brandAssets.logos.admin;

export const getAdminBrandSocialImage = (slot = "openGraphImage") =>
  brandAssets.social[slot] || brandAssets.social.openGraphImage;

export default brandAssets;
