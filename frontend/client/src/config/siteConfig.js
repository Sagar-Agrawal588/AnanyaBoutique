/**
 * ============================================
 * SITE CONFIGURATION - ANANYA BOUTIQUE ECOMMERCE
 * ============================================
 *
 * This file contains all dynamic content that can be managed from admin panel.
 * In production, these values will come from the backend API.
 * For now, they serve as defaults and structure reference.
 */

import {
  BRAND_DESCRIPTION,
  BRAND_NAME,
  BRAND_TAGLINE,
  brandAssets,
  getBrandLogo,
  getBrandSocialImage,
} from "./brandAssets";

const BUSINESS_PHONE = "+91 6396789311";
const BUSINESS_EMAIL = "sagaragrawal.588@gmail.com";
const BUSINESS_INSTAGRAM_URL = "https://www.instagram.com/ananya___boutique";
const BUSINESS_MAP_URL = "https://share.google/9gTvwlEIKp6hVZDbk";

const normalizePhoneDigits = (value = "") =>
  String(value || "").replace(/[^\d]/g, "");

// ========== SITE INFO ==========
export const siteConfig = {
  name: BRAND_NAME,
  tagline: BRAND_TAGLINE,
  description: BRAND_DESCRIPTION,
  logo: getBrandLogo("main").src,
  favicon: brandAssets.favicon.src,

  // Contact Information
  contact: {
    email: BUSINESS_EMAIL,
    phone: BUSINESS_PHONE,
    whatsapp: BUSINESS_PHONE,
    address: "Ananya Boutique",
    mapUrl: BUSINESS_MAP_URL,
  },

  // Social Media Links
  social: {
    instagram: BUSINESS_INSTAGRAM_URL,
    instagramHandle: "@ananya___boutique",
  },

  // SEO Defaults
  seo: {
    title: BRAND_NAME,
    description: BRAND_DESCRIPTION,
    keywords: ["boutique fashion", "sarees", "suits", "kurtis", "leggings", "cosmetics", "artificial jewellery", "fashion accessories", "ananya boutique"],
    ogImage: getBrandSocialImage("openGraphImage").src,
  },
};

export const contactConfig = {
  businessName: siteConfig.name,
  email: BUSINESS_EMAIL,
  phone: BUSINESS_PHONE,
  whatsapp: BUSINESS_PHONE,
  whatsappNumber: normalizePhoneDigits(BUSINESS_PHONE),
  address: siteConfig.contact.address,
  mapUrl: BUSINESS_MAP_URL,
  instagramUrl: BUSINESS_INSTAGRAM_URL,
  instagramHandle: siteConfig.social.instagramHandle,
  instagramTitle: "Follow Our Journey",
  instagramContent:
    "Discover new arrivals, styling inspiration, boutique updates, customer stories, and behind-the-scenes moments from Ananya Boutique.",
  trustSignals: [
    "Trust Since 2012",
    "Family-Owned Boutique",
    "Affordable Fashion",
    "Women-Centric Style",
    "Personal Customer Care",
  ],
  whatsappActions: [
    {
      label: "Chat on WhatsApp",
      message: "Hi Ananya Boutique, I would like to chat on WhatsApp.",
    },
    {
      label: "Get Styling Advice",
      message: "Hi Ananya Boutique, I would like styling advice.",
    },
    {
      label: "Product Assistance",
      message: "Hi Ananya Boutique, I need product assistance.",
    },
    {
      label: "Order Support",
      message: "Hi Ananya Boutique, I need help with my order.",
    },
    {
      label: "Fashion Consultation",
      message: "Hi Ananya Boutique, I would like a fashion consultation.",
    },
  ],
};

export const getPhoneHref = () =>
  `tel:+${normalizePhoneDigits(contactConfig.phone)}`;

export const getMailtoHref = (subject = "") => {
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return `mailto:${contactConfig.email}${query}`;
};

export const getMapHref = () => contactConfig.mapUrl;

export const getWhatsAppHref = (message = "") => {
  const text =
    message || contactConfig.whatsappActions[0]?.message || "Hi Ananya Boutique";
  return `https://wa.me/${contactConfig.whatsappNumber}?text=${encodeURIComponent(text)}`;
};

// ========== NAVIGATION ==========
export const navigationConfig = {
  mainNav: [
    { name: "Home", link: "/", icon: null },
    { name: "Discover Style", link: "/products", icon: null },
    { name: "Categories", link: "/products", icon: null },
    { name: "Blogs", link: "/blogs", icon: null },
    { name: "About Us", link: "/about-us", icon: null },
  ],

  footerNav: {
    products: [
      { name: "Prices Drop", link: "/prices-drop" },
      { name: "New Products", link: "/new-products" },
      { name: "Best Sales", link: "/best-sales" },
      { name: "Contact Us", link: "/contact" },
    ],
    company: [
      { name: "About Us", link: "/about-us" },
      { name: "Terms of Service", link: "/terms" },
      { name: "Privacy Policy", link: "/privacy" },
      { name: "FAQs", link: "/faqs" },
    ],
    account: [
      { name: "My Account", link: "/my-account" },
      { name: "My Orders", link: "/my-orders" },
      { name: "My Wishlist", link: "/my-list" },
      { name: "Track Order", link: "/track-order" },
    ],
  },
};

// ========== HOME PAGE SLIDES ==========
export const homeSlides = [
  {
    id: 1,
    image: "/slides/slide1.jpg",
    title: "New Season Edit",
    subtitle: "Sarees, suits, kurtis, and finishing touches",
    cta: "Discover Your Style",
    link: "/products",
    isActive: true,
  },
  {
    id: 2,
    image: "/slides/slide2.jpg",
    title: "Occasion Ready",
    subtitle: "Elegant looks for celebrations and gifting",
    cta: "Explore the Edit",
    link: "/products?category=occasion-edit",
    isActive: true,
  },
  {
    id: 3,
    image: "/slides/slide3.jpg",
    title: "Everyday Luxury",
    subtitle: "Soft colors, graceful details, easy styling",
    cta: "Meet Our Story",
    link: "/about-us",
    isActive: true,
  },
];

// ========== CATEGORIES ==========
export const categories = [
  {
    id: 1,
    name: "Sarees",
    slug: "sarees",
    image: "/categories/sarees.jpg",
    description: "Elegant drapes for festive, wedding, and everyday occasions",
    isActive: true,
  },
  {
    id: 2,
    name: "Suits",
    slug: "suits",
    image: "/categories/suits.jpg",
    description: "Ready-to-style suits and coordinated ethnic sets",
    isActive: true,
  },
  {
    id: 3,
    name: "Kurtis",
    slug: "kurtis",
    image: "/categories/kurtis.jpg",
    description: "Comfortable kurtis for work, casual wear, and outings",
    isActive: true,
  },
  {
    id: 4,
    name: "Leggings",
    slug: "leggings",
    image: "/categories/leggings.jpg",
    description: "Essential leggings and bottomwear for everyday styling",
    isActive: true,
  },
  {
    id: 5,
    name: "Women's Fashion",
    slug: "womens-fashion",
    image: "/categories/womens-fashion.jpg",
    description: "Fresh fashion picks for daily dressing and occasions",
    isActive: true,
  },
  {
    id: 6,
    name: "Cosmetics",
    slug: "cosmetics",
    image: "/categories/cosmetics.jpg",
    description: "Beauty essentials to complete your look",
    isActive: true,
  },
  {
    id: 7,
    name: "Artificial Jewellery",
    slug: "artificial-jewellery",
    image: "/categories/artificial-jewellery.jpg",
    description: "Statement pieces, earrings, bangles, and delicate accents",
    isActive: true,
  },
  {
    id: 8,
    name: "Fashion Accessories",
    slug: "fashion-accessories",
    image: "/categories/fashion-accessories.jpg",
    description: "Bags, clutches, scarves, and finishing touches",
    isActive: true,
  },
];

// ========== FEATURED PRODUCTS (Sample) ==========
export const featuredProducts = [
  {
    id: 1,
    name: "Ananya Signature Kurta Set",
    slug: "ananya-signature-kurta-set",
    brand: "Ananya Boutique",
    price: 1899,
    originalPrice: 2499,
    discount: 30,
    rating: 4.5,
    reviewCount: 128,
    image: "/products/product1.jpg",
    images: ["/products/product1.jpg", "/products/product1-2.jpg"],
    inStock: true,
    category: "kurtis",
    tags: ["bestseller", "featured"],
    description: "A polished kurta set placeholder for the Ananya Boutique catalogue.",
  },
  {
    id: 2,
    name: "Festive Saree Draped Set",
    slug: "festive-saree-draped-set",
    brand: "Ananya Boutique",
    price: 2499,
    originalPrice: 3299,
    discount: 27,
    rating: 4.8,
    reviewCount: 95,
    image: "/products/product2.jpg",
    images: ["/products/product2.jpg"],
    inStock: true,
    category: "sarees",
    tags: ["new", "featured"],
    description: "A refined saree placeholder for festive and occasion edits.",
  },
];

// ========== PROMO BANNERS ==========
export const promoBanners = [
  {
    id: 1,
    title: "Free Shipping",
    subtitle: "On all orders",
    icon: "shipping",
    isActive: true,
  },
  {
    id: 2,
    title: "Quality Assured",
    subtitle: "100% genuine products",
    icon: "verified",
    isActive: true,
  },
  {
    id: 3,
    title: "Secure Payment",
    subtitle: "100% secure checkout",
    icon: "secure",
    isActive: true,
  },
  {
    id: 4,
    title: "24/7 Support",
    subtitle: "Dedicated support team",
    icon: "support",
    isActive: true,
  },
];

// ========== MEMBERSHIP CONFIG ==========
export const membershipConfig = {
  title: "Join the Ananya Boutique Club",
  description:
    "Become a member today to unlock exclusive rewards, early access to sales, and special member-only gifts.",
  benefits: [
    "10% off on all orders",
    "Early access to new products",
    "Exclusive member-only deals",
    "Free shipping on all orders",
    "Birthday special discounts",
  ],
  link: "/membership",
  ctaText: "Join Membership",
};

// ========== CURRENCY CONFIG ==========
export const currencyConfig = {
  code: "INR",
  symbol: "Rs. ",
  position: "before", // 'before' or 'after'
  decimalPlaces: 0,
};

// ========== SHIPPING CONFIG ==========
export const shippingConfig = {
  freeShippingThreshold: 0,
  standardShippingCost: 0,
  expressShippingCost: 0,
  estimatedDelivery: {
    standard: "5-7 business days",
    express: "2-3 business days",
  },
};

// ========== HELPER FUNCTIONS ==========

/**
 * Format price with currency
 */
export const formatPrice = (price) => {
  const { symbol, position, decimalPlaces } = currencyConfig;
  const formattedPrice = price.toFixed(decimalPlaces);
  return position === "before"
    ? `${symbol}${formattedPrice}`
    : `${formattedPrice}${symbol}`;
};

/**
 * Calculate discount percentage
 */
export const calculateDiscount = (originalPrice, salePrice) => {
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
};

/**
 * Check if product is in stock
 */
export const isInStock = (product) => {
  const available =
    typeof product?.available_quantity === "number"
      ? product.available_quantity
      : Number(product?.stock_quantity ?? product?.stock ?? 0) -
        Number(product?.reserved_quantity ?? 0);
  return product.inStock && available > 0;
};

/**
 * Get active slides only
 */
export const getActiveSlides = () => {
  return homeSlides.filter((slide) => slide.isActive);
};

/**
 * Get active categories
 */
export const getActiveCategories = () => {
  return categories.filter((cat) => cat.isActive);
};

/**
 * Get featured products
 */
export const getFeaturedProducts = () => {
  return featuredProducts.filter((p) => p.tags.includes("featured"));
};

/**
 * Get products by category
 */
export const getProductsByCategory = (categorySlug) => {
  return featuredProducts.filter((p) => p.category === categorySlug);
};

export default {
  siteConfig,
  navigationConfig,
  homeSlides,
  categories,
  featuredProducts,
  promoBanners,
  membershipConfig,
  currencyConfig,
  shippingConfig,
  contactConfig,
  getPhoneHref,
  getMailtoHref,
  getMapHref,
  getWhatsAppHref,
  formatPrice,
  calculateDiscount,
  isInStock,
  getActiveSlides,
  getActiveCategories,
  getFeaturedProducts,
  getProductsByCategory,
};
