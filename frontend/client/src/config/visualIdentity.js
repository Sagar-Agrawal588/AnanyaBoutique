import { getBrandLogo } from "./brandAssets";
import {
  artworkRegistry,
  getArtwork,
  getArtworkSource,
  getCategoryArtwork,
  normalizeArtworkSlug,
} from "./artworkRegistry";

export {
  artworkRegistry,
  getArtwork,
  getArtworkSource,
  getCategoryArtwork,
  normalizeArtworkSlug,
};

export const brandDesignTokens = {
  colors: {
    softPink: "#FCE7F3",
    blushPink: "#F8D7E7",
    lavender: "#EDE9FE",
    white: "#FFFFFF",
    champagneGold: "#E8C67A",
    deepPlum: "#2F1325",
    roseGold: "#CC7A9B",
  },
  gradients: {
    page: "linear-gradient(180deg,#fffaf6 0%,#ffffff 34%,#fff3f8 70%,#ffffff 100%)",
    hero: "linear-gradient(135deg,#fff8f2 0%,#ffffff 46%,#f2e5ff 100%)",
    blush: "linear-gradient(135deg,#fff1f7 0%,#ffffff 44%,#ede2ff 100%)",
    plum: "linear-gradient(135deg,#2f1325 0%,#4b1f3a 56%,#7c2d62 100%)",
    goldLine:
      "linear-gradient(90deg,transparent,rgba(232,198,122,0.75),transparent)",
  },
  shadows: {
    soft: "0 18px 60px rgba(93,45,74,0.12)",
    premium: "0 28px 90px rgba(93,45,74,0.16)",
    deep: "0 30px 100px rgba(47,19,37,0.28)",
    gold: "0 20px 70px rgba(157,107,25,0.16)",
  },
  borders: {
    soft: "1px solid rgba(240,216,223,0.9)",
    gold: "1px solid rgba(232,198,122,0.55)",
    white: "1px solid rgba(255,255,255,0.85)",
  },
  cards: {
    radius: "2rem",
    background: "rgba(255,255,255,0.9)",
    backdrop: "blur(18px)",
  },
};

export const brandIdentity = {
  name: "Ananya Boutique",
  foundedYear: "2012",
  founderRole: "Homemaker, mother, and boutique founder",
  coreMessage: "Fashion created with love, trust, and years of dedication.",
  supportingMessage:
    "A boutique built by a mother, trusted by women since 2012.",
  founderSignature:
    "Every order supports a dream that started inside a home.",
  founderStory:
    "Ananya Boutique began as a homemaker's dream and grew through care, family support, and years of customer trust.",
  positioning:
    "Founder-led fashion that feels emotional, elegant, trustworthy, feminine, inspirational, premium, and affordable.",
};

export const brandPillars = [
  {
    id: "trust-since-2012",
    title: "Trust Since 2012",
    description:
      "Years of dedication, repeat customers, and boutique relationships built patiently.",
  },
  {
    id: "family-owned-boutique",
    title: "Family-Owned Boutique",
    description:
      "A real family business shaped by care, responsibility, and everyday courage.",
  },
  {
    id: "affordable-fashion",
    title: "Affordable Fashion",
    description:
      "Elegant styles selected to feel special without feeling unreachable.",
  },
  {
    id: "women-centric-style",
    title: "Women-Centric Style",
    description:
      "Fashion chosen for celebrations, daily confidence, comfort, and self-expression.",
  },
  {
    id: "personal-customer-care",
    title: "Personal Customer Care",
    description:
      "Warm product guidance, order support, and boutique attention when customers need help.",
  },
];

export const founderStoryBadges = [
  "Founded in 2012",
  "Family-Owned",
  "Trusted Boutique",
  "Curated with Love",
];

export const globalTrustMessages = {
  banner: "Serving customers since 2012",
  founder: "Every order supports a dream that started inside a home.",
  messages: [
    "Curated by Ananya Boutique",
    "Loved by women since 2012",
    "Fashion selected with care",
    "Supporting a family-owned business",
  ],
};

export const fashionMicrocopy = {
  shopProducts: "Discover Your Style",
  shopCollection: "Discover Your Style",
  shopTheEdit: "Explore the Edit",
  viewAll: "Discover More",
  addToCart: "Add To Wardrobe",
  removeFromCart: "Remove From Wardrobe",
  cartTitle: "Wardrobe Bag",
  cartItems: "Wardrobe Picks",
  emptyCartTitle: "Your wardrobe bag is waiting",
  emptyCartCopy: "Discover pieces selected with care by Ananya Boutique.",
  checkout: "Secure Checkout",
  productsPageTitle: "Discover Your Style",
  productsPageSubtitle:
    "Boutique fashion selected with love, trust, and years of dedication.",
};

export const getFashionMicrocopy = (key, fallback = "") =>
  fashionMicrocopy[key] || fallback;

const toLegacyLogoVariant = (slot, overrides = {}) => {
  const logo = getBrandLogo(slot);
  return {
    asset: logo.src,
    label: logo.alt,
    lockup: logo.lockup,
    tagline: logo.tagline,
    width: logo.width,
    height: logo.height,
    ...overrides,
  };
};

export const logoRegistry = {
  main: toLegacyLogoVariant("main"),
  header: toLegacyLogoVariant("header"),
  icon: toLegacyLogoVariant("mobile", {
    label: "Ananya Boutique icon",
    width: 52,
    height: 52,
  }),
  mobile: toLegacyLogoVariant("mobile"),
  footer: toLegacyLogoVariant("footer"),
  admin: toLegacyLogoVariant("admin"),
  login: toLegacyLogoVariant("login"),
  invoice: toLegacyLogoVariant("invoice"),
};

export const getLogoVariant = (variant = "main") =>
  logoRegistry[variant] || logoRegistry.main;

const visualIdentity = {
  brandDesignTokens,
  brandIdentity,
  brandPillars,
  founderStoryBadges,
  globalTrustMessages,
  fashionMicrocopy,
  getFashionMicrocopy,
  logoRegistry,
  artworkRegistry,
  getArtwork,
  getArtworkSource,
  getCategoryArtwork,
  getLogoVariant,
  normalizeArtworkSlug,
};

export default visualIdentity;
