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

export const logoRegistry = {
  main: {
    asset: "/logo-header.png",
    label: "Ananya Boutique",
    lockup: "Ananya Boutique",
    tagline: "Fashion & Beauty Boutique",
    width: 72,
    height: 72,
  },
  icon: {
    asset: "/logo-header.png",
    label: "Ananya Boutique icon",
    lockup: "AB",
    width: 52,
    height: 52,
  },
  mobile: {
    asset: "/logo-header.png",
    label: "Ananya Boutique mobile logo",
    lockup: "AB",
    width: 48,
    height: 48,
  },
  footer: {
    asset: "/logo-header.png",
    label: "Ananya Boutique footer logo",
    lockup: "Ananya Boutique",
    tagline: "Trusted Since 2012",
    width: 58,
    height: 58,
  },
};

const baseArtwork = {
  source: "",
  status: "ai-ready",
  replacementNote:
    "Replace source with a generated image path when final AI artwork is approved.",
};

export const artworkRegistry = {
  homepage: {
    heroDesktop: {
      ...baseArtwork,
      key: "homepage.heroDesktop",
      title: "Fashion That Celebrates Every Woman",
      copy: "Desktop hero artwork for a premium fashion boutique campaign.",
      aspect: "hero",
      palette: "blush",
      prompt:
        "Elegant Indian boutique fashion campaign, sarees, suits, kurtis, cosmetics and jewellery, soft pink lavender white champagne gold, premium editorial lighting, no text.",
    },
    heroMobile: {
      ...baseArtwork,
      key: "homepage.heroMobile",
      title: "Mobile Boutique Edit",
      copy: "Portrait hero artwork optimized for mobile first screens.",
      aspect: "portrait",
      palette: "blush",
      prompt:
        "Mobile portrait fashion illustration for Ananya Boutique, graceful feminine styling, soft pink and lavender, champagne gold accents, no text.",
    },
    founderPortrait: {
      ...baseArtwork,
      key: "homepage.founderPortrait",
      title: "Founder Portrait",
      copy: "Illustration placeholder for the woman behind Ananya Boutique.",
      aspect: "portrait",
      palette: "blush",
      prompt:
        "Warm founder-led Indian boutique portrait illustration, homemaker mother entrepreneur, elegant feminine fashion studio, soft blush lavender champagne palette, no text.",
    },
    dreamSection: {
      ...baseArtwork,
      key: "homepage.dreamSection",
      title: "Every Order Supports A Dream",
      copy: "Illustration placeholder for the dream that started inside a home.",
      aspect: "wide",
      palette: "gold",
      prompt:
        "Emotional Indian family boutique dream illustration, mother entrepreneur, home beginning, sarees and parcels, warm premium light, no text.",
    },
    instagramShowcase: {
      ...baseArtwork,
      key: "homepage.instagramShowcase",
      title: "Follow Our Journey",
      copy: "Illustration placeholder for Instagram moments and boutique updates.",
      aspect: "wide",
      palette: "rose",
      prompt:
        "Instagram-style boutique fashion showcase illustration, six elegant fashion moments, sarees jewellery beauty details, soft feminine palette, no text.",
    },
    finalCta: {
      ...baseArtwork,
      key: "homepage.finalCta",
      title: "Join The Ananya Boutique Family",
      copy: "Illustration placeholder for the final emotional homepage call to action.",
      aspect: "wide",
      palette: "plum",
      prompt:
        "Premium emotional boutique family call-to-action illustration, women supporting woman entrepreneur, fashion chosen with love, no text.",
    },
    categoryBanner: {
      ...baseArtwork,
      key: "homepage.categoryBanner",
      title: "Category Story Banner",
      copy: "Wide banner structure for category-led shopping moments.",
      aspect: "wide",
      palette: "lavender",
      prompt:
        "Luxury category banner collage for Indian boutique fashion, sarees suits kurtis cosmetics jewellery accessories, airy premium layout, no text.",
    },
    fashionGallery: {
      ...baseArtwork,
      key: "homepage.fashionGallery",
      title: "Fashion Gallery",
      copy: "Campaign artwork slots for seasonal edits and visual merchandising.",
      aspect: "wide",
      palette: "blush",
      prompt:
        "Premium fashion gallery illustration panels, festive drapes, jewellery details, beauty essentials, soft feminine palette, no text.",
    },
    testimonials: {
      ...baseArtwork,
      key: "homepage.testimonials",
      title: "Customer Love",
      copy: "Soft community artwork for testimonials and customer stories.",
      aspect: "wide",
      palette: "gold",
      prompt:
        "Warm customer community fashion boutique illustration, women smiling, shopping experience, soft pink champagne gold, no text.",
    },
  },
  categories: {
    sarees: {
      ...baseArtwork,
      key: "categories.sarees",
      title: "Sarees",
      copy: "Elegant drapes for celebration and everyday grace.",
      aspect: "banner",
      palette: "blush",
    },
    suits: {
      ...baseArtwork,
      key: "categories.suits",
      title: "Suits",
      copy: "Coordinated looks for work, visits, and special moments.",
      aspect: "banner",
      palette: "lavender",
    },
    kurtis: {
      ...baseArtwork,
      key: "categories.kurtis",
      title: "Kurtis",
      copy: "Easy everyday elegance with boutique detail.",
      aspect: "banner",
      palette: "rose",
    },
    leggings: {
      ...baseArtwork,
      key: "categories.leggings",
      title: "Leggings",
      copy: "Essential comfort for polished daily styling.",
      aspect: "banner",
      palette: "lavender",
    },
    cosmetics: {
      ...baseArtwork,
      key: "categories.cosmetics",
      title: "Cosmetics",
      copy: "Beauty essentials for the final glow.",
      aspect: "banner",
      palette: "blush",
    },
    "artificial-jewellery": {
      ...baseArtwork,
      key: "categories.artificial-jewellery",
      title: "Artificial Jewellery",
      copy: "Statement details and delicate finishing pieces.",
      aspect: "banner",
      palette: "gold",
    },
    "fashion-accessories": {
      ...baseArtwork,
      key: "categories.fashion-accessories",
      title: "Fashion Accessories",
      copy: "Finishing touches for every outfit story.",
      aspect: "banner",
      palette: "rose",
    },
  },
  story: {
    founder: {
      ...baseArtwork,
      key: "story.founder",
      title: "Founder Story",
      copy: "A mother, a dream, and the courage to begin.",
      aspect: "portrait",
      palette: "blush",
    },
    homemaker: {
      ...baseArtwork,
      key: "story.homemaker",
      title: "Homemaker Journey",
      copy: "A business built between care, work, and responsibility.",
      aspect: "wide",
      palette: "gold",
    },
    family: {
      ...baseArtwork,
      key: "story.family",
      title: "Family Support",
      copy: "The encouragement behind every milestone.",
      aspect: "wide",
      palette: "lavender",
    },
    growth: {
      ...baseArtwork,
      key: "story.growth",
      title: "Boutique Growth",
      copy: "Fashion, beauty, accessories, and customer trust.",
      aspect: "portrait",
      palette: "rose",
    },
    community: {
      ...baseArtwork,
      key: "story.community",
      title: "Community Impact",
      copy: "Every customer becomes part of the journey.",
      aspect: "wide",
      palette: "blush",
    },
  },
  membership: {
    hero: {
      ...baseArtwork,
      key: "membership.hero",
      title: "Fashion Insider Club Hero",
      copy: "A private style world with rewards and boutique care.",
      aspect: "portrait",
      palette: "blush",
    },
    rewards: {
      ...baseArtwork,
      key: "membership.rewards",
      title: "Rewards",
      copy: "A polished rewards dashboard visual for fashion points.",
      aspect: "wide",
      palette: "gold",
    },
    vip: {
      ...baseArtwork,
      key: "membership.vip",
      title: "VIP Experience",
      copy: "Private launches, premium support, and elevated member care.",
      aspect: "portrait",
      palette: "plum",
    },
    tiers: {
      ...baseArtwork,
      key: "membership.tiers",
      title: "Membership Tiers",
      copy: "Luxury tier cards and club level storytelling.",
      aspect: "wide",
      palette: "lavender",
    },
  },
  contact: {
    whatsapp: {
      ...baseArtwork,
      key: "contact.whatsapp",
      title: "WhatsApp Styling Consultation",
      copy: "Instant styling, product, and order support.",
      aspect: "wide",
      palette: "blush",
    },
    location: {
      ...baseArtwork,
      key: "contact.location",
      title: "Boutique Location",
      copy: "An elegant location card ready for storefront artwork.",
      aspect: "wide",
      palette: "gold",
    },
    support: {
      ...baseArtwork,
      key: "contact.support",
      title: "Customer Support",
      copy: "A warm support experience across phone, email, and WhatsApp.",
      aspect: "wide",
      palette: "lavender",
    },
    community: {
      ...baseArtwork,
      key: "contact.community",
      title: "Community Connection",
      copy: "Instagram journey, customer stories, and behind-the-scenes moments.",
      aspect: "wide",
      palette: "rose",
    },
  },
};

export const getArtwork = (path, fallback = null) => {
  const segments = String(path || "").split(".").filter(Boolean);
  let current = artworkRegistry;
  for (const segment of segments) {
    current = current?.[segment];
    if (!current) return fallback;
  }
  return current || fallback;
};

const normalizeArtworkSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const getCategoryArtwork = (slug) =>
  artworkRegistry.categories[normalizeArtworkSlug(slug)] ||
  artworkRegistry.homepage.categoryBanner;

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
  getCategoryArtwork,
  getLogoVariant,
};

export default visualIdentity;
