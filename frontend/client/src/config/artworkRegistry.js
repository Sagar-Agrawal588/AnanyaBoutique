const CLOUDINARY_CLOUD_NAME = String(
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "",
).trim();

const CLOUDINARY_UPLOAD_BASE_URL = CLOUDINARY_CLOUD_NAME
  ? `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`
  : "";

const AI_ARTWORK_STATUS = "ai-ready";
const REPLACEMENT_NOTE =
  "Replace the desktop/mobile src values or Cloudinary public IDs when final AI artwork is approved.";

const ARTWORK_PROFILES = {
  hero: {
    aspect: "hero",
    desktop: { width: 1920, height: 1080, profile: "heroDesktop" },
    mobile: { width: 1080, height: 1350, profile: "heroMobile" },
  },
  portrait: {
    aspect: "portrait",
    desktop: { width: 1200, height: 1500, profile: "gallery" },
    mobile: { width: 900, height: 1200, profile: "heroMobile" },
  },
  wide: {
    aspect: "wide",
    desktop: { width: 1600, height: 1000, profile: "content" },
    mobile: { width: 960, height: 960, profile: "gallery" },
  },
  banner: {
    aspect: "banner",
    desktop: { width: 1920, height: 640, profile: "bannerDesktop" },
    mobile: { width: 1080, height: 1350, profile: "bannerMobile" },
  },
  card: {
    aspect: "card",
    desktop: { width: 900, height: 1080, profile: "card" },
    mobile: { width: 720, height: 900, profile: "card" },
  },
  square: {
    aspect: "square",
    desktop: { width: 1080, height: 1080, profile: "card" },
    mobile: { width: 900, height: 900, profile: "card" },
  },
};

const palettePrompts = {
  blush: "soft blush pink, white, lavender, champagne gold",
  lavender: "lavender, white, soft pink, delicate silver",
  rose: "rose pink, warm white, muted plum, soft gold",
  gold: "warm champagne gold, cream white, blush pink",
  plum: "deep plum, rose gold, white highlights, premium contrast",
  green: "soft boutique green, white, blush accents",
};

const normalizePathSegment = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['`]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const normalizeArtworkSlug = normalizePathSegment;

const buildCloudinaryUrl = (publicId = "", transforms = "f_auto,q_auto:good") => {
  const id = String(publicId || "").trim().replace(/^\/+/, "");
  if (!CLOUDINARY_UPLOAD_BASE_URL || !id) return "";
  const transformPath = String(transforms || "").trim();
  return `${CLOUDINARY_UPLOAD_BASE_URL}/${transformPath ? `${transformPath}/` : ""}${id}`;
};

const makeVariant = ({
  src = "",
  width,
  height,
  profile,
  cloudinaryPublicId = "",
  cloudinaryTransforms = "f_auto,q_auto:good",
} = {}) => ({
  src,
  width,
  height,
  profile,
  cloudinaryPublicId,
  cloudinaryTransforms,
  cloudinaryUrl: buildCloudinaryUrl(cloudinaryPublicId, cloudinaryTransforms),
});

const resolveVariantSource = (variant = {}) =>
  String(variant.src || variant.cloudinaryUrl || "").trim();

const makeArtwork = ({
  key,
  section,
  slot,
  title,
  copy,
  aspect = "wide",
  palette = "blush",
  prompt = "",
  alt = "",
  desktop = {},
  mobile = {},
  placeholderLabel = "Ananya Boutique",
}) => {
  const profile = ARTWORK_PROFILES[aspect] || ARTWORK_PROFILES.wide;
  const desktopVariant = makeVariant({ ...profile.desktop, ...desktop });
  const mobileVariant = makeVariant({ ...profile.mobile, ...mobile });

  return {
    key,
    section,
    slot,
    title,
    copy,
    alt: alt || `${title} artwork`,
    aspect: profile.aspect,
    palette,
    status: AI_ARTWORK_STATUS,
    replacementNote: REPLACEMENT_NOTE,
    cloudinary: {
      ready: true,
      folder: `ananya-boutique/artwork/${section}`,
      desktopPublicId: desktopVariant.cloudinaryPublicId,
      mobilePublicId: mobileVariant.cloudinaryPublicId,
    },
    variants: {
      desktop: desktopVariant,
      mobile: mobileVariant,
    },
    placeholder: {
      enabled: true,
      label: placeholderLabel,
      prompt:
        prompt ||
        `AI-generated ${title} artwork for Ananya Boutique, ${palettePrompts[palette] || palettePrompts.blush}, premium Indian boutique fashion style, no text, no real human photo.`,
    },
    source: resolveVariantSource(desktopVariant),
    mobileSource: resolveVariantSource(mobileVariant),
  };
};

const makeCategory = ({ slug, title, copy, palette = "blush", prompt = "" }) => {
  const baseKey = `categories.${slug}`;
  const section = `categories/${slug}`;
  const basePrompt =
    prompt ||
    `AI-generated ${title} boutique category artwork, Indian fashion ecommerce, ${palettePrompts[palette] || palettePrompts.blush}, no text, no real human photo.`;

  const desktopBanner = makeArtwork({
    key: `${baseKey}.desktopBanner`,
    section,
    slot: "desktopBanner",
    title: `${title} Desktop Banner`,
    copy,
    aspect: "banner",
    palette,
    prompt: `${basePrompt} Wide desktop banner composition.`,
  });
  const mobileBanner = makeArtwork({
    key: `${baseKey}.mobileBanner`,
    section,
    slot: "mobileBanner",
    title: `${title} Mobile Banner`,
    copy,
    aspect: "portrait",
    palette,
    prompt: `${basePrompt} Tall mobile banner composition.`,
  });
  const card = makeArtwork({
    key: `${baseKey}.card`,
    section,
    slot: "card",
    title,
    copy,
    aspect: "card",
    palette,
    prompt: `${basePrompt} Compact category card crop.`,
  });

  return {
    ...desktopBanner,
    key: baseKey,
    slug,
    title,
    copy,
    desktopBanner,
    mobileBanner,
    card,
  };
};

const homepage = {
  hero: makeArtwork({
    key: "homepage.hero",
    section: "homepage",
    slot: "hero",
    title: "Fashion That Celebrates Every Woman",
    copy: "Hero artwork for a premium founder-led fashion boutique campaign.",
    aspect: "hero",
    palette: "blush",
    prompt:
      "Elegant AI-generated Indian boutique fashion campaign, sarees, suits, kurtis, cosmetics and jewellery, soft pink lavender white champagne gold, premium editorial lighting, no text, no real human photo.",
  }),
  founderStory: makeArtwork({
    key: "homepage.founderStory",
    section: "homepage",
    slot: "founderStory",
    title: "Founder Story",
    copy: "Artwork space for the woman-led story behind Ananya Boutique.",
    aspect: "portrait",
    palette: "blush",
    prompt:
      "Warm AI-generated founder-led Indian boutique illustration, homemaker mother entrepreneur, elegant fashion studio, no text, no real human photo.",
  }),
  dreamSupport: makeArtwork({
    key: "homepage.dreamSupport",
    section: "homepage",
    slot: "dreamSupport",
    title: "Every Order Supports A Dream",
    copy: "Artwork space for the dream that started inside a home.",
    aspect: "wide",
    palette: "gold",
    prompt:
      "AI-generated emotional Indian family boutique dream illustration, home beginning, sarees and parcels, warm premium light, no text, no real human photo.",
  }),
  instagram: makeArtwork({
    key: "homepage.instagram",
    section: "homepage",
    slot: "instagram",
    title: "Follow Our Journey",
    copy: "Artwork space for Instagram moments and boutique updates.",
    aspect: "wide",
    palette: "rose",
    prompt:
      "AI-generated Instagram-style boutique fashion showcase, six elegant fashion moments, sarees jewellery beauty details, no text, no real human photo.",
  }),
  finalCta: makeArtwork({
    key: "homepage.finalCta",
    section: "homepage",
    slot: "finalCta",
    title: "Join The Ananya Boutique Family",
    copy: "Artwork space for the final emotional homepage call to action.",
    aspect: "wide",
    palette: "plum",
    prompt:
      "AI-generated premium boutique family call-to-action illustration, women supporting a woman entrepreneur, no text, no real human photo.",
  }),
  categoryBanner: makeArtwork({
    key: "homepage.categoryBanner",
    section: "homepage",
    slot: "categoryBanner",
    title: "Category Story Banner",
    copy: "Wide banner structure for category-led shopping moments.",
    aspect: "banner",
    palette: "lavender",
    prompt:
      "AI-generated luxury category banner collage for Indian boutique fashion, sarees suits kurtis cosmetics jewellery accessories, no text, no real human photo.",
  }),
};

homepage.heroDesktop = homepage.hero;
homepage.heroMobile = homepage.hero;
homepage.founderPortrait = homepage.founderStory;
homepage.dreamSection = homepage.dreamSupport;
homepage.instagramShowcase = homepage.instagram;

const categories = {
  sarees: makeCategory({
    slug: "sarees",
    title: "Sarees",
    copy: "Elegant drapes for celebration and everyday grace.",
    palette: "blush",
  }),
  suits: makeCategory({
    slug: "suits",
    title: "Suits",
    copy: "Coordinated looks for work, visits, and special moments.",
    palette: "lavender",
  }),
  kurtis: makeCategory({
    slug: "kurtis",
    title: "Kurtis",
    copy: "Easy everyday elegance with boutique detail.",
    palette: "rose",
  }),
  leggings: makeCategory({
    slug: "leggings",
    title: "Leggings",
    copy: "Essential comfort for polished daily styling.",
    palette: "lavender",
  }),
  cosmetics: makeCategory({
    slug: "cosmetics",
    title: "Cosmetics",
    copy: "Beauty essentials for the final glow.",
    palette: "blush",
  }),
  "artificial-jewellery": makeCategory({
    slug: "artificial-jewellery",
    title: "Artificial Jewellery",
    copy: "Statement details and delicate finishing pieces.",
    palette: "gold",
  }),
  "fashion-accessories": makeCategory({
    slug: "fashion-accessories",
    title: "Fashion Accessories",
    copy: "Finishing touches for every outfit story.",
    palette: "rose",
  }),
};

const about = {
  hero: makeArtwork({
    key: "about.hero",
    section: "about",
    slot: "hero",
    title: "A Dream That Grew With Love",
    copy: "A founder's journey held in soft colour, quiet strength, and family belief.",
    aspect: "portrait",
    palette: "blush",
  }),
  founder: makeArtwork({
    key: "about.founder",
    section: "about",
    slot: "founder",
    title: "The First Dream",
    copy: "A quiet beginning, a brave heart, and a home full of hope.",
    aspect: "portrait",
    palette: "blush",
  }),
  homemaker: makeArtwork({
    key: "about.homemaker",
    section: "about",
    slot: "homemaker",
    title: "Built Between Responsibilities",
    copy: "A business built between care, work, and responsibility.",
    aspect: "wide",
    palette: "gold",
  }),
  family: makeArtwork({
    key: "about.family",
    section: "about",
    slot: "family",
    title: "Strength At Home",
    copy: "The encouragement behind every milestone.",
    aspect: "wide",
    palette: "lavender",
  }),
  growth: makeArtwork({
    key: "about.growth",
    section: "about",
    slot: "growth",
    title: "Growing Beyond Fashion",
    copy: "A new chapter of beauty, accessories, and finishing details.",
    aspect: "portrait",
    palette: "rose",
  }),
  community: makeArtwork({
    key: "about.community",
    section: "about",
    slot: "community",
    title: "A Shared Journey",
    copy: "Every order supports determination, confidence, and possibility.",
    aspect: "wide",
    palette: "blush",
  }),
};

const membership = {
  hero: makeArtwork({
    key: "membership.hero",
    section: "membership",
    slot: "hero",
    title: "Fashion Insider Club Hero",
    copy: "A private style world with rewards and boutique care.",
    aspect: "portrait",
    palette: "blush",
  }),
  rewards: makeArtwork({
    key: "membership.rewards",
    section: "membership",
    slot: "rewards",
    title: "Rewards Section",
    copy: "A polished rewards dashboard visual for fashion points.",
    aspect: "wide",
    palette: "gold",
  }),
  vip: makeArtwork({
    key: "membership.vip",
    section: "membership",
    slot: "vip",
    title: "VIP Experience",
    copy: "Private launches, premium support, and elevated member care.",
    aspect: "portrait",
    palette: "plum",
  }),
  tierCards: makeArtwork({
    key: "membership.tierCards",
    section: "membership",
    slot: "tierCards",
    title: "Membership Tier Cards",
    copy: "Luxury tier cards and club level storytelling.",
    aspect: "wide",
    palette: "lavender",
  }),
  finalCta: makeArtwork({
    key: "membership.finalCta",
    section: "membership",
    slot: "finalCta",
    title: "The Insider Invitation",
    copy: "A lifestyle invitation into rewards, confidence, and private fashion moments.",
    aspect: "wide",
    palette: "plum",
  }),
};

membership.tiers = membership.tierCards;

const contact = {
  whatsapp: makeArtwork({
    key: "contact.whatsapp",
    section: "contact",
    slot: "whatsapp",
    title: "WhatsApp Consultation",
    copy: "Instant styling, product, and order support.",
    aspect: "wide",
    palette: "green",
  }),
  location: makeArtwork({
    key: "contact.location",
    section: "contact",
    slot: "location",
    title: "Boutique Location",
    copy: "An elegant location card ready for storefront artwork.",
    aspect: "wide",
    palette: "gold",
  }),
  support: makeArtwork({
    key: "contact.support",
    section: "contact",
    slot: "support",
    title: "Customer Support",
    copy: "A warm support experience across phone, email, and WhatsApp.",
    aspect: "wide",
    palette: "lavender",
  }),
  community: makeArtwork({
    key: "contact.community",
    section: "contact",
    slot: "community",
    title: "Community Connection",
    copy: "Instagram journey, customer stories, and behind-the-scenes moments.",
    aspect: "wide",
    palette: "rose",
  }),
};

const blog = {
  hero: makeArtwork({
    key: "blog.hero",
    section: "blog",
    slot: "hero",
    title: "Journal Hero",
    copy: "Fashion inspiration, styling guides, and boutique stories.",
    aspect: "wide",
    palette: "blush",
  }),
  featuredTopics: makeArtwork({
    key: "blog.featuredTopics",
    section: "blog",
    slot: "featuredTopics",
    title: "Featured Topics",
    copy: "Editorial theme artwork across styling, beauty, jewellery, and boutique stories.",
    aspect: "card",
    palette: "lavender",
  }),
  founderInsights: makeArtwork({
    key: "blog.founderInsights",
    section: "blog",
    slot: "founderInsights",
    title: "Founder Insights",
    copy: "Editorial artwork for lessons from a boutique built with love.",
    aspect: "wide",
    palette: "gold",
  }),
  styleGuides: makeArtwork({
    key: "blog.styleGuides",
    section: "blog",
    slot: "styleGuides",
    title: "Style Guides",
    copy: "Reference artwork for seasonal guides and outfit advice.",
    aspect: "card",
    palette: "rose",
  }),
  instagramShowcase: makeArtwork({
    key: "blog.instagramShowcase",
    section: "blog",
    slot: "instagramShowcase",
    title: "Instagram Showcase",
    copy: "Journal-ready Instagram artwork slots for new arrivals and style notes.",
    aspect: "wide",
    palette: "rose",
  }),
};

export const artworkRegistry = {
  homepage,
  categories,
  about,
  story: about,
  membership,
  contact,
  blog,
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

export const getArtworkSource = (artwork, variant = "desktop") => {
  const resolvedArtwork = artwork || {};
  const selectedVariant =
    resolvedArtwork.variants?.[variant] ||
    resolvedArtwork.variants?.desktop ||
    resolvedArtwork.variants?.mobile ||
    {};

  return resolveVariantSource(selectedVariant);
};

export const getCategoryArtwork = (slug, slot = "card") => {
  const category =
    artworkRegistry.categories[normalizeArtworkSlug(slug)] ||
    artworkRegistry.categories.sarees;

  return category?.[slot] || category?.card || category;
};

export default artworkRegistry;
