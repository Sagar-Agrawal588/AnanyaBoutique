export const BRAND_NAME = "Ananya Boutique";

export const BRAND_DESCRIPTION =
  "Fashion, beauty, and accessories curated with love since 2012.";

export const BRAND_TAGLINE =
  "Fashion, Beauty & Accessories Curated With Love Since 2012";

export const ADMIN_BRAND_TITLE = "Ananya Boutique Admin";

const makeLogo = ({
  slot,
  src,
  alt,
  width,
  height,
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
  replaceNote:
    "Replace this slot source when the final Ananya Boutique logo system is approved.",
});

export const brandAssets = {
  name: BRAND_NAME,
  description: BRAND_DESCRIPTION,
  tagline: BRAND_TAGLINE,
  adminTitle: ADMIN_BRAND_TITLE,
  logos: {
    admin: makeLogo({
      slot: "admin",
      src: "/logo.png",
      alt: "Ananya Boutique admin logo",
      width: 160,
      height: 56,
    }),
    login: makeLogo({
      slot: "login",
      src: "/logo.png",
      alt: "Ananya Boutique login logo",
      width: 160,
      height: 56,
      tagline: "Secure Sign In",
    }),
    header: makeLogo({
      slot: "header",
      src: "/logo.png",
      alt: "Ananya Boutique admin header logo",
      width: 120,
      height: 42,
    }),
    mobile: makeLogo({
      slot: "mobile",
      src: "/logo.png",
      alt: "Ananya Boutique admin mobile logo",
      width: 44,
      height: 44,
      lockup: "AB",
      tagline: "",
    }),
    footer: makeLogo({
      slot: "footer",
      src: "/logo.png",
      alt: "Ananya Boutique admin footer logo",
      width: 120,
      height: 42,
      tagline: "Trusted Since 2012",
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
    alt: "Ananya Boutique admin favicon placeholder",
  },
  appleTouchIcon: {
    src: "/logo.png",
    type: "image/png",
    sizes: "180x180",
    alt: "Ananya Boutique admin app icon placeholder",
  },
  social: {
    openGraphImage: {
      src: "/logo-og-v2.png",
      width: 512,
      height: 512,
      alt: "Ananya Boutique admin social image",
    },
    twitterImage: {
      src: "/logo-og-v2.png",
      width: 512,
      height: 512,
      alt: "Ananya Boutique admin Twitter image",
    },
    shareImage: {
      src: "/logo-og-v2.png",
      width: 512,
      height: 512,
      alt: "Ananya Boutique admin share image",
    },
    socialShareImage: {
      src: "/logo-og-v2.png",
      width: 512,
      height: 512,
      alt: "Ananya Boutique admin social share image",
    },
  },
  email: {
    logo: {
      src: "/logo-og-v2.png",
      alt: "Ananya Boutique email logo placeholder",
    },
    heroPlaceholder: {
      src: "/logo-header.png",
      alt: "Ananya Boutique email hero placeholder",
    },
  },
  pwa: {
    manifest: "/admin/manifest.webmanifest",
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
};

export const getAdminBrandLogo = (slot = "admin") =>
  brandAssets.logos[slot] || brandAssets.logos.admin;

export const getAdminBrandSocialImage = (slot = "openGraphImage") =>
  brandAssets.social[slot] || brandAssets.social.openGraphImage;

export default brandAssets;
