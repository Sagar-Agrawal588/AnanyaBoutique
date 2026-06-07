import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import connectDb from "../config/connectDb.js";
import BlogModel from "../models/blog.model.js";
import CouponModel from "../models/coupon.model.js";
import MembershipPlanModel from "../models/membershipPlan.model.js";
import ProductModel from "../models/product.model.js";
import SettingsModel from "../models/settings.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const BRAND_NAME = "Ananya Boutique";
const BRAND_TAGLINE = "Fashion, Beauty & Accessories Curated With Love Since 2012";
const BRAND_DESCRIPTION =
  "Fashion, beauty, and accessories curated with love since 2012.";
const LOCAL_PRODUCT_FALLBACK_IMAGE = "/logo-og-v2.png";
const LEGACY_PRODUCT_FALLBACK_IMAGE =
  "ananyaboutique/system/product-default.webp";

const legacyBrandReplacements = [
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

const sanitizeBrandText = (value) => {
  let next = String(value || "");
  for (const [pattern, replacement] of legacyBrandReplacements) {
    next = next.replace(pattern, replacement);
  }
  return next;
};

const sanitizeDeep = (value) => {
  if (typeof value === "string") {
    return sanitizeBrandText(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeDeep(entry));
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, sanitizeDeep(entry)]),
    );
  }

  return value;
};

const upsertSetting = async ({ key, value, description, category }) => {
  await SettingsModel.findOneAndUpdate(
    { key },
    {
      $set: {
        value,
        description,
        category,
        isActive: true,
      },
    },
    { upsert: true, new: true },
  );
};

const stabilizeSettings = async () => {
  await SettingsModel.initializeDefaults();

  const settings = await SettingsModel.find({});
  let sanitizedSettings = 0;

  for (const setting of settings) {
    const sanitizedValue = sanitizeDeep(setting.value);
    const before = JSON.stringify(setting.value);
    const after = JSON.stringify(sanitizedValue);

    if (before !== after) {
      setting.value = sanitizedValue;
      await setting.save();
      sanitizedSettings += 1;
    }
  }

  const orderSettings = await SettingsModel.findOne({ key: "orderSettings" });
  const currentOrderValue =
    orderSettings?.value && typeof orderSettings.value === "object"
      ? orderSettings.value
      : {};

  await upsertSetting({
    key: "orderSettings",
    value: {
      ...currentOrderValue,
      orderSeriesPrefix: "ANB",
      orderSeriesPadding: Number(currentOrderValue.orderSeriesPadding || 4),
    },
    description: "Order limits and COD settings",
    category: "checkout",
  });

  const storeInfo = await SettingsModel.findOne({ key: "storeInfo" });
  const currentStoreValue =
    storeInfo?.value && typeof storeInfo.value === "object"
      ? storeInfo.value
      : {};

  await upsertSetting({
    key: "storeInfo",
    value: {
      ...currentStoreValue,
      name: BRAND_NAME,
      tagline: BRAND_TAGLINE,
      description: BRAND_DESCRIPTION,
    },
    description: "Store contact and business information",
    category: "general",
  });

  await upsertSetting({
    key: "offerCouponCode",
    value: "WELCOME10",
    description: "Coupon code to display in offer popup",
    category: "notification",
  });

  return { sanitizedSettings, orderPrefix: "ANB", offerCouponCode: "WELCOME10" };
};

const seedMembership = async () => {
  const planPayload = {
    name: "Boutique Circle",
    description:
      "A demo-ready annual membership for boutique previews, styling savings, and loyalty benefits.",
    price: 499,
    originalPrice: 999,
    durationDays: 365,
    duration: 365,
    durationUnit: "days",
    discountPercentage: 10,
    discountPercent: 10,
    active: true,
    isActive: true,
    sortOrder: 1,
    pointsMultiplier: 2,
    freeShippingThreshold: 999,
    benefits: [
      "Early access to boutique drops",
      "Member savings on selected products",
      "Priority WhatsApp styling support",
      "Birthday and festive previews",
    ],
  };

  let plan = await MembershipPlanModel.findOne({ name: planPayload.name });
  if (plan) {
    Object.assign(plan, planPayload);
    await plan.save();
  } else {
    plan = await MembershipPlanModel.create(planPayload);
  }

  return { activePlan: plan.name, price: plan.price };
};

const blogPosts = [
  {
    title: "Saree Styling Guide",
    category: "Saree Styling",
    excerpt:
      "Simple ways to style sarees for weddings, festive evenings, and elegant everyday occasions.",
    tags: ["sarees", "styling", "occasion wear"],
    content:
      "A saree becomes memorable when the drape, blouse, jewellery, and footwear work together. For daytime events, choose lighter fabrics and softer jewellery. For weddings, pair richer textures with one statement accessory so the look feels graceful without becoming heavy. Finish with comfortable footwear and a clutch that lets the saree remain the focus.",
  },
  {
    title: "Festive Fashion Trends",
    category: "Festive Fashion",
    excerpt:
      "Boutique notes on color, fabric, and finishing details for the festive season.",
    tags: ["festive", "fashion", "boutique"],
    content:
      "Festive dressing is moving toward pieces that feel celebratory and wearable beyond one occasion. Jewel tones, soft metallic accents, embroidered details, and coordinated sets are easy to reuse across family gatherings and evening functions. Choose pieces that photograph beautifully but still feel comfortable through long celebrations.",
  },
  {
    title: "Jewellery Styling Tips",
    category: "Jewellery Styling",
    excerpt:
      "How to pair artificial jewellery with boutique outfits without overpowering the look.",
    tags: ["jewellery", "accessories", "styling"],
    content:
      "Jewellery should support the outfit's mood. Pair delicate earrings with printed kurtis, stacked bangles with festive suits, and a single statement necklace with a plain neckline. When the outfit is detailed, keep jewellery lighter. When the outfit is minimal, let one accessory carry the sparkle.",
  },
  {
    title: "Boutique Fashion Essentials",
    category: "Boutique Stories",
    excerpt:
      "A practical wardrobe foundation for women who want elegance, comfort, and repeat styling.",
    tags: ["wardrobe", "essentials", "boutique"],
    content:
      "A useful boutique wardrobe starts with pieces that can be styled many ways: a graceful kurti, a festive suit, comfortable leggings, a statement saree, and accessories that shift the look from casual to occasion-ready. Choose colors and fabrics that suit your routine first, then add special pieces for celebration.",
  },
  {
    title: "Wedding Collection Inspiration",
    category: "Wedding Collection",
    excerpt:
      "Ideas for building wedding looks with sarees, suits, jewellery, and thoughtful accessories.",
    tags: ["wedding", "sarees", "suits", "jewellery"],
    content:
      "Wedding styling works best when each outfit has a clear role. Keep one richer look for the main function, one comfortable festive outfit for pre-wedding events, and one lighter ensemble for travel or family gatherings. Add jewellery that complements the fabric tone, and choose a backup dupatta or accessory for quick styling changes.",
  },
];

const seedBlogs = async () => {
  const upserted = [];

  for (const post of blogPosts) {
    let blog = await BlogModel.findOne({ title: post.title });
    if (!blog) {
      blog = new BlogModel({ title: post.title });
    }

    blog.set({
      ...post,
      image: LOCAL_PRODUCT_FALLBACK_IMAGE,
      author: BRAND_NAME,
      isPublished: true,
      contentFormat: "plain",
      mediaType: "image",
    });

    await blog.save();
    upserted.push(blog.slug);
  }

  return { publishedBlogs: upserted.length, slugs: upserted };
};

const seedCoupons = async () => {
  const now = new Date();
  const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const endDate = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
  const coupons = [
    {
      code: "WELCOME10",
      description: "Welcome offer for first boutique order",
      discountType: "percentage",
      discountValue: 10,
      minOrderAmount: 499,
      maxDiscountAmount: 250,
      usageLimit: null,
      perUserLimit: 1,
      isActive: true,
      startDate,
      endDate,
    },
    {
      code: "FESTIVE15",
      description: "Festive boutique collection offer",
      discountType: "percentage",
      discountValue: 15,
      minOrderAmount: 1499,
      maxDiscountAmount: 500,
      usageLimit: null,
      perUserLimit: 2,
      isActive: true,
      startDate,
      endDate,
    },
  ];

  for (const coupon of coupons) {
    await CouponModel.findOneAndUpdate(
      { code: coupon.code },
      { $set: coupon },
      { upsert: true, new: true },
    );
  }

  return { activeCoupons: coupons.map((coupon) => coupon.code) };
};

const normalizeProductFallbackImages = async () => {
  const legacyProxyPattern = /product-default\.webp/i;

  const products = await ProductModel.find({
    $or: [
      { image: LEGACY_PRODUCT_FALLBACK_IMAGE },
      { thumbnail: LEGACY_PRODUCT_FALLBACK_IMAGE },
      { images: LEGACY_PRODUCT_FALLBACK_IMAGE },
      { image: legacyProxyPattern },
      { thumbnail: legacyProxyPattern },
      { images: legacyProxyPattern },
    ],
  });

  let updated = 0;
  for (const product of products) {
    const normalizeImage = (value) => {
      const text = String(value || "");
      return text === LEGACY_PRODUCT_FALLBACK_IMAGE || legacyProxyPattern.test(text)
        ? LOCAL_PRODUCT_FALLBACK_IMAGE
        : value;
    };

    product.image = normalizeImage(product.image);
    product.thumbnail = normalizeImage(product.thumbnail);
    product.images = Array.isArray(product.images)
      ? product.images.map(normalizeImage)
      : [LOCAL_PRODUCT_FALLBACK_IMAGE];

    if (!product.image) product.image = product.images[0] || LOCAL_PRODUCT_FALLBACK_IMAGE;
    if (!product.thumbnail) {
      product.thumbnail = product.images[0] || LOCAL_PRODUCT_FALLBACK_IMAGE;
    }

    await product.save();
    updated += 1;
  }

  return { normalizedProductImages: updated };
};

const main = async () => {
  await connectDb();

  const result = {
    settings: await stabilizeSettings(),
    membership: await seedMembership(),
    blogs: await seedBlogs(),
    coupons: await seedCoupons(),
    products: await normalizeProductFallbackImages(),
  };

  console.log(JSON.stringify({ success: true, ...result }, null, 2));
};

try {
  await main();
} catch (error) {
  console.error(
    JSON.stringify(
      {
        success: false,
        message: error?.message || "Launch stabilization failed",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  await mongoose.connection.close().catch(() => {});
}
