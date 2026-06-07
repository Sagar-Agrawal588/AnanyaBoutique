import mongoose from "mongoose";
import { DEFAULT_REVIEW_SETTINGS } from "../constants/reviewSettings.js";

const DEFAULT_FLAVOUR_BUTTON_SETTINGS = [
  {
    key: "flavour_button_1_text",
    value: "Sarees",
    description: "Homepage style button 1 text",
    category: "display",
  },
  {
    key: "flavour_button_1_bg_color",
    value: "#FCE7F3",
    description: "Homepage style button 1 background color",
    category: "display",
  },
  {
    key: "flavour_button_1_text_color",
    value: "#831843",
    description: "Homepage style button 1 text color",
    category: "display",
  },
  {
    key: "flavour_button_2_text",
    value: "Suits",
    description: "Homepage style button 2 text",
    category: "display",
  },
  {
    key: "flavour_button_2_bg_color",
    value: "#EDE9FE",
    description: "Homepage style button 2 background color",
    category: "display",
  },
  {
    key: "flavour_button_2_text_color",
    value: "#4C1D95",
    description: "Homepage style button 2 text color",
    category: "display",
  },
  {
    key: "flavour_button_3_text",
    value: "Kurtis",
    description: "Homepage style button 3 text",
    category: "display",
  },
  {
    key: "flavour_button_3_bg_color",
    value: "#FDF2F8",
    description: "Homepage style button 3 background color",
    category: "display",
  },
  {
    key: "flavour_button_3_text_color",
    value: "#9D174D",
    description: "Homepage style button 3 text color",
    category: "display",
  },
  {
    key: "flavour_button_4_text",
    value: "Accessories",
    description: "Homepage style button 4 text",
    category: "display",
  },
  {
    key: "flavour_button_4_bg_color",
    value: "#F3E8FF",
    description: "Homepage style button 4 background color",
    category: "display",
  },
  {
    key: "flavour_button_4_text_color",
    value: "#6B21A8",
    description: "Homepage style button 4 text color",
    category: "display",
  },
];

const DEFAULT_HOMEPAGE_TRUST_SETTINGS = [
  {
    key: "homepage_trust_1_text",
    value: "Boutique Picks",
    description: "Homepage trust pill 1 text",
    category: "display",
  },
  {
    key: "homepage_trust_2_text",
    value: "Fresh Arrivals",
    description: "Homepage trust pill 2 text",
    category: "display",
  },
  {
    key: "homepage_trust_3_text",
    value: "Curated Styles",
    description: "Homepage trust pill 3 text",
    category: "display",
  },
  {
    key: "homepage_trust_4_text",
    value: "Fast Moving Picks",
    description: "Homepage trust pill 4 text",
    category: "display",
  },
];

const createSeoPageDefaults = ({
  label,
  path,
  metaTitle,
  metaDescription,
  keywords,
  indexable,
  notes,
  heroTitle = "",
  heroSubtitle = "",
  heroImageUrl = "",
  heroImageAlt = "",
  ctaLabel = "Explore Products",
  ctaHref = "/products",
  bodySections = [],
  faqItems = [],
}) => ({
  label,
  path,
  metaTitle,
  metaDescription,
  keywords,
  indexable,
  notes,
  heroTitle,
  heroSubtitle,
  heroImageUrl,
  heroImageAlt,
  ctaLabel,
  ctaHref,
  bodySections,
  faqItems,
});

/**
 * Settings Schema
 * Stores site-wide configuration settings manageable by admin
 * Uses a key-value structure for flexibility
 */
const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      enum: ["general", "checkout", "payment", "notification", "display"],
      default: "general",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Default settings that should exist
settingsSchema.statics.defaultSettings = [
  {
    key: "highTrafficNotice",
    value: {
      enabled: true,
      message:
        "High traffic — availability may vary. Your order will be processed once confirmed.",
    },
    description: "Show high traffic notice on checkout page",
    category: "checkout",
  },
  {
    key: "paymentGatewayEnabled",
    value: true,
    description: "Enable or disable online payment gateway availability",
    category: "payment",
  },
  {
    key: "defaultPaymentProvider",
    value: "PHONEPE",
    description: "Default online payment provider shown at checkout",
    category: "payment",
  },
  {
    key: "maintenanceMode",
    value: false,
    description: "Put site in maintenance mode",
    category: "general",
  },
  {
    key: "maintenanceSettings",
    value: {
      maintenanceEnabled: false,
      maintenanceStartTime: null,
      maintenanceEndTime: null,
      maintenanceMessage:
        "We are currently undergoing scheduled maintenance. Please check back soon.",
      showCountdown: true,
    },
    description: "Maintenance mode scheduling and display settings",
    category: "general",
  },
  {
    key: "headerSettings",
    value: {
      headerBackgroundColor: "#fffbf5",
    },
    description: "Header appearance settings",
    category: "display",
  },
  ...DEFAULT_FLAVOUR_BUTTON_SETTINGS,
  ...DEFAULT_HOMEPAGE_TRUST_SETTINGS,
  {
    key: "showOfferPopup",
    value: true,
    description: "Show offer popup to guests/users",
    category: "notification",
  },
  {
    key: "offerCouponCode",
    value: "",
    description: "Coupon code to display in offer popup",
    category: "notification",
  },
  {
    key: "offerTitle",
    value: "Special Offer!",
    description: "Title for offer popup",
    category: "notification",
  },
  {
    key: "offerDescription",
    value: "Use this code to get a discount on your order!",
    description: "Description for offer popup",
    category: "notification",
  },
  {
    key: "offerDiscountText",
    value: "Get Discount",
    description: "Discount text for offer popup header",
    category: "notification",
  },
  {
    key: "offerCountdownSettings",
    value: {
      enabled: false,
      title: "Limited time offer",
      subtitle: "Fresh deals are live now.",
      couponCode: "",
      discountText: "",
      endsAt: null,
      ctaLabel: "Shop offers",
      ctaHref: "/products",
    },
    description: "Homepage offer countdown strip configuration",
    category: "notification",
  },
  {
    key: "homeSlidePanelSettings",
    value: {
      enabled: true,
      minimizeEnabled: true,
      minimizedLabel: "Show details",
      restoreAfterSeconds: 60,
    },
    description: "Homepage hero slide detail panel behavior",
    category: "display",
  },
  {
    key: "popupSettings",
    value: {
      title: "Limited Time Offer",
      description: "Discover our latest products and exclusive offers.",
      imageUrl: "",
      redirectType: "custom",
      redirectValue: "",
      startDate: new Date(),
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: false,
      showOncePerSession: false,
      backgroundColor: "#f7f1ef",
      buttonText: "Shop Now",
      couponCode: "",
    },
    description: "Homepage popup configuration",
    category: "display",
  },
  // ========== SHIPPING SETTINGS ==========
  {
    key: "shippingSettings",
    value: {
      freeShippingThreshold: 500,
      standardShippingCost: 50,
      expressShippingCost: 100,
      freeShippingEnabled: true,
      estimatedDelivery: {
        standard: "5-7 business days",
        express: "2-3 business days",
      },
    },
    description: "Shipping charges and free shipping threshold",
    category: "checkout",
  },
  // ========== TAX SETTINGS ==========
  {
    key: "taxSettings",
    value: {
      enabled: true,
      taxRate: 5, // Centralized GST rate
      taxName: "GST",
      taxIncludedInPrice: true, // Prices are GST-inclusive across the storefront
    },
    description: "Tax/GST configuration",
    category: "checkout",
  },
  // ========== ORDER SETTINGS ==========
  {
    key: "orderSettings",
    value: {
      minimumOrderValue: 0,
      maximumOrderValue: 50000,
      maxItemsPerOrder: 20,
      codEnabled: false, // Cash on Delivery
      codMinOrder: 200,
      codMaxOrder: 5000,
      orderSeriesPrefix: "ANB",
      orderSeriesPadding: 4,
    },
    description: "Order limits and COD settings",
    category: "checkout",
  },
  // ========== DISCOUNT SETTINGS ==========
  {
    key: "discountSettings",
    value: {
      maxDiscountPercentage: 50, // Maximum discount allowed
      stackableCoupons: true, // Allow multiple coupons
      firstOrderDiscount: {
        enabled: true,
        percentage: 10,
        maxDiscount: 100,
      },
    },
    description: "Discount and coupon configuration",
    category: "checkout",
  },
  // ========== STORE INFO ==========
  {
    key: "storeInfo",
    value: {
      name: "Ananya Boutique",
      email: "ananyaboutique.com",
      phone: "+91 9876541234",
      address: "Sitapura Industrial Area, Jaipur, Rajasthan 302019",
      gstNumber: "",
      currency: "INR",
      currencySymbol: "₹",
    },
    description: "Store contact and business information",
    category: "general",
  },
  {
    key: "seoSettings",
    value: {
      pages: [
        createSeoPageDefaults({
          label: "Home",
          path: "/",
          metaTitle: "Ananya Boutique - Curated Boutique Styles",
          metaDescription:
            "Shop boutique apparel, accessories, and curated occasion edits at Ananya Boutique.",
          keywords:
            "boutique fashion, ethnic wear, accessories, occasion wear, ananya boutique",
          indexable: true,
          notes: "Main homepage SEO entry.",
          heroTitle: "Curated boutique styles for everyday elegance",
          heroSubtitle:
            "Discover fresh boutique arrivals, refined accessories, and styling picks from Ananya Boutique.",
          ctaLabel: "Browse Products",
          ctaHref: "/products",
          bodySections: [
            {
              heading: "Why customers choose Ananya Boutique",
              content:
                "We focus on thoughtful styling, versatile silhouettes, and pieces that fit real occasions. Our catalog is built for repeat use, not one-time trends.",
            },
          ],
        }),
        createSeoPageDefaults({
          label: "Products",
          path: "/products",
          metaTitle: "Boutique Collections | Ananya Boutique",
          metaDescription:
            "Browse boutique apparel, accessories, and occasion-ready collections from Ananya Boutique.",
          keywords:
            "boutique collections, ethnic wear, accessories, occasion wear, style",
          indexable: true,
          notes: "Catalog landing page.",
          heroTitle: "Boutique collections ready for repeat styling",
          heroSubtitle:
            "Shop a collection designed for everyday styling, celebrations, and thoughtful gifting.",
          ctaLabel: "Shop the Catalog",
          ctaHref: "/products",
        }),
        createSeoPageDefaults({
          label: "Blogs",
          path: "/blogs",
          metaTitle: "Style Journal | Ananya Boutique",
          metaDescription:
            "Read styling notes, collection updates, and boutique guides from Ananya Boutique.",
          keywords: "style journal, boutique guide, fashion tips, occasion styling",
          indexable: true,
          notes: "Content hub for search traffic.",
          heroTitle: "Practical style notes and boutique guidance",
          heroSubtitle:
            "Explore styling articles, collection explainers, and outfit ideas for everyday occasions.",
          ctaLabel: "Read Articles",
          ctaHref: "/blogs",
        }),
        createSeoPageDefaults({
          label: "About",
          path: "/about",
          metaTitle: "About Ananya Boutique",
          metaDescription:
            "Learn more about Ananya Boutique, our story, and the collections we curate for everyday style.",
          keywords: "about ananya boutique, boutique brand, fashion store",
          indexable: true,
          notes: "Brand story page.",
          ctaLabel: "Explore Products",
          ctaHref: "/products",
        }),
        createSeoPageDefaults({
          label: "Membership",
          path: "/membership",
          metaTitle: "Membership Benefits | Ananya Boutique",
          metaDescription:
            "Unlock premium membership benefits, savings, and rewards with Ananya Boutique.",
          keywords:
            "membership benefits, rewards, savings, boutique collections",
          indexable: true,
          notes: "Membership landing page.",
          ctaLabel: "View Membership",
          ctaHref: "/membership",
        }),
        createSeoPageDefaults({
          label: "Boutique Style Guide",
          path: "/style-guide",
          metaTitle: "Boutique Style Guide | Ananya Boutique",
          metaDescription:
            "Explore how to choose boutique looks, accessories, and occasion edits from Ananya Boutique.",
          keywords:
            "boutique style guide, outfit ideas, accessories, occasion guide",
          indexable: true,
          notes: "SEO guide page.",
          heroTitle: "How to choose boutique looks with confidence",
          heroSubtitle:
            "Use this guide to compare silhouettes, styling details, and practical outfit ideas for everyday use.",
          ctaLabel: "Explore Styles",
          ctaHref: "/products",
          faqItems: [
            {
              question: "What should I look for in a boutique outfit?",
              answer:
                "Start with the occasion, fit, fabric feel, and styling details. Choose pieces that are comfortable, versatile, and easy to pair.",
            },
          ],
        }),
        createSeoPageDefaults({
          label: "Login",
          path: "/login",
          metaTitle: "Login | Ananya Boutique",
          metaDescription: "Sign in to your Ananya Boutique account.",
          keywords: "login, account sign in",
          indexable: false,
          notes: "Usually noindex.",
          ctaLabel: "Go to Login",
          ctaHref: "/login",
        }),
        createSeoPageDefaults({
          label: "Register",
          path: "/register",
          metaTitle: "Register | Ananya Boutique",
          metaDescription: "Create your Ananya Boutique account.",
          keywords: "register, create account",
          indexable: false,
          notes: "Usually noindex.",
          ctaLabel: "Create Account",
          ctaHref: "/register",
        }),
      ],
      imageAltTexts: [
        {
          label: "Logo",
          target: "/logo.png",
          altText: "Ananya Boutique logo",
          titleText: "Ananya Boutique",
          notes: "Keep the brand logo alt text short.",
        },
        {
          label: "Homepage banners",
          target: "Homepage hero and promotional sliders",
          altText: "Ananya Boutique curated boutique styles banner",
          titleText: "Homepage banner",
          notes: "Use for hero banners and promotional creatives.",
        },
        {
          label: "Product images",
          target: "/product/[id]",
          altText: "Product image",
          titleText: "Product image",
          notes:
            "Prefer descriptive product names in the storefront component.",
        },
        {
          label: "Blog covers",
          target: "/blogs/[slug]",
          altText: "Blog cover image",
          titleText: "Blog image",
          notes: "Pair the blog title with the topic when used dynamically.",
        },
      ],
    },
    description: "SEO page metadata and image alt-text rules",
    category: "general",
  },
  {
    key: "storefrontContent",
    value: {},
    description:
      "Business-owner managed storefront content for homepage, navigation, footer, contact, membership, about, and media slots",
    category: "display",
  },
  {
    key: "reviewSettings",
    value: {
      ...DEFAULT_REVIEW_SETTINGS,
    },
    description:
      "Storefront review submission and review-action visibility controls",
    category: "display",
  },
];

// Initialize default settings if they don't exist
settingsSchema.statics.initializeDefaults = async function () {
  for (const setting of this.defaultSettings) {
    await this.findOneAndUpdate(
      { key: setting.key },
      { $setOnInsert: setting },
      { upsert: true, new: true },
    );
  }
};

const SettingsModel = mongoose.model("Settings", settingsSchema);

export default SettingsModel;
