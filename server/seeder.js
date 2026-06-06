import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();

import bcrypt from "bcryptjs";
import BannerModel from "./models/banner.model.js";
import CategoryModel from "./models/category.model.js";
import ComboModel from "./models/combo.model.js";
import ComboItemModel from "./models/comboItem.model.js";
import HomeSlideModel from "./models/homeSlide.model.js";
import ProductModel from "./models/product.model.js";
import UserModel from "./models/user.model.js";
import {
  DEFAULT_BANNER_IMAGE_PATHS,
  DEFAULT_HOME_SLIDE_IMAGE_PATHS,
  DEFAULT_PRODUCT_IMAGE_PATH,
} from "./config/mediaDefaults.js";
import {
  buildComboItemsSnapshot,
  buildComboPricing,
  buildComboSkuFromItems,
  upsertComboItems,
} from "./services/combos/combo.service.js";
import { normalizeManagerPermissions } from "./utils/adminPermissions.js";
const cliArgs = new Set(process.argv.slice(2));
const SHOULD_DESTROY_DATA =
  cliArgs.has("-d") || cliArgs.has("--destroy");
const FORCE_HOMEPAGE_MEDIA_RESET =
  cliArgs.has("--force-homepage-media-reset") ||
  cliArgs.has("--replace-homepage-media");

const FIREBASE_DEFAULT_PRODUCT_IMAGE =
  DEFAULT_PRODUCT_IMAGE_PATH;
const FIREBASE_DEFAULT_HOME_SLIDES = DEFAULT_HOME_SLIDE_IMAGE_PATHS;
const FIREBASE_DEFAULT_BANNERS = DEFAULT_BANNER_IMAGE_PATHS;

/**
 * Database Seeder
 *
 * Seeds initial placeholder data for the boutique storefront.
 * Also creates an admin user if none exists.
 *
 * Usage: node seeder.js
 * Usage (destroy): node seeder.js -d
 */

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

const SEED_PUBLIC_IMAGES = [
  FIREBASE_DEFAULT_BANNERS[0],
  FIREBASE_DEFAULT_BANNERS[1],
  FIREBASE_DEFAULT_BANNERS[2],
  FIREBASE_DEFAULT_PRODUCT_IMAGE,
];

const resolveSeedPublicImage = (index = 0) =>
  SEED_PUBLIC_IMAGES[index % SEED_PUBLIC_IMAGES.length];

const RAW_SEED_MANAGER_DEFAULT_PERMISSIONS = String(
  process.env.MANAGER_DEFAULT_PERMISSIONS || "",
).trim();
const HAS_SEED_MANAGER_DEFAULT_PERMISSIONS =
  RAW_SEED_MANAGER_DEFAULT_PERMISSIONS.length > 0;
const SEED_MANAGER_DEFAULT_PERMISSIONS = normalizeManagerPermissions(
  RAW_SEED_MANAGER_DEFAULT_PERMISSIONS.split(",")
    .map((permission) => permission.trim())
    .filter(Boolean),
);
const ADMIN_SEED_EMAIL = String(
  process.env.ADMIN_PRIMARY_EMAIL || "admin@ananyaboutique.com",
)
  .trim()
  .toLowerCase();
const MANAGER_SEED_EMAIL = String(
  process.env.MANAGER_PRIMARY_EMAIL || "manager@ananyaboutique.com",
)
  .trim()
  .toLowerCase();
const ADMIN_SEED_PASSWORD = String(
  process.env.ADMIN_PRIMARY_PASSWORD || "",
).trim();
const MANAGER_SEED_PASSWORD = String(
  process.env.MANAGER_PRIMARY_PASSWORD || "",
).trim();

// Boutique Categories
const categories = [
  {
    name: "New Arrivals",
    slug: "new-arrivals",
    description: "Temporary collection for freshly added boutique pieces.",
    icon: "new",
    image: FIREBASE_DEFAULT_PRODUCT_IMAGE,
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "Ethnic Wear",
    slug: "ethnic-wear",
    description: "Sarees, kurta sets, and occasion-ready silhouettes.",
    icon: "ethnic",
    image: FIREBASE_DEFAULT_PRODUCT_IMAGE,
    isFeatured: true,
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Accessories",
    slug: "accessories",
    description: "Jewellery, clutches, and finishing touches for every look.",
    icon: "accessories",
    image: FIREBASE_DEFAULT_PRODUCT_IMAGE,
    isFeatured: true,
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "Occasion Edit",
    slug: "occasion-edit",
    description: "Curated looks for events, gifting, and celebrations.",
    icon: "occasion",
    image: FIREBASE_DEFAULT_PRODUCT_IMAGE,
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
  },
];

// Boutique Products
const products = [
  {
    name: "Ananya Signature Kurta Set",
    slug: "ananya-signature-kurta-set",
    description:
      "A temporary boutique placeholder for a polished kurta set with refined detailing and an easy festive fit.",
    shortDescription: "Signature kurta set for everyday occasions.",
    brand: "Ananya Boutique",
    price: 2499,
    originalPrice: 3299,
    stock: 40,
    rating: 4.8,
    numReviews: 42,
    isFeatured: true,
    isNewArrival: true,
    isBestSeller: true,
    tags: ["kurta-set", "ethnic", "featured"],
    categorySlug: "ethnic-wear",
    weight: 1,
    unit: "pcs",
    specifications: {
      Material: "Boutique fabric placeholder",
      Fit: "Regular fit",
      Care: "Dry clean recommended",
    },
  },
  {
    name: "Festive Saree Draped Set",
    slug: "festive-saree-draped-set",
    description:
      "A temporary placeholder for a graceful festive drape styled for celebrations, receptions, and special evenings.",
    shortDescription: "Celebration-ready saree edit.",
    brand: "Ananya Boutique",
    price: 3999,
    originalPrice: 5299,
    stock: 25,
    rating: 4.7,
    numReviews: 31,
    isFeatured: true,
    isNewArrival: false,
    tags: ["saree", "festive", "occasion"],
    categorySlug: "ethnic-wear",
    weight: 1,
    unit: "pcs",
    specifications: {
      Material: "Saree fabric placeholder",
      Includes: "Drape and blouse piece placeholder",
      Care: "Dry clean recommended",
    },
  },
  {
    name: "Everyday Co-ord Set",
    slug: "everyday-coord-set",
    description:
      "A temporary placeholder for a versatile co-ord set designed for relaxed styling and boutique-ready daily wear.",
    shortDescription: "Easy co-ord set for daily styling.",
    brand: "Ananya Boutique",
    price: 1899,
    originalPrice: 2499,
    stock: 55,
    rating: 4.6,
    numReviews: 28,
    isFeatured: true,
    isNewArrival: true,
    tags: ["coord", "new-arrival", "daily-style"],
    categorySlug: "new-arrivals",
    weight: 1,
    unit: "pcs",
    specifications: {
      Material: "Soft fabric placeholder",
      Fit: "Relaxed fit",
      Care: "Gentle wash",
    },
  },
  {
    name: "Pearl Accent Earrings",
    slug: "pearl-accent-earrings",
    description:
      "A temporary placeholder for elegant earrings that complete ethnic, festive, and evening looks.",
    shortDescription: "Pearl accent jewellery placeholder.",
    brand: "Ananya Boutique",
    price: 799,
    originalPrice: 1199,
    stock: 80,
    rating: 4.5,
    numReviews: 19,
    isFeatured: false,
    isNewArrival: true,
    tags: ["jewellery", "earrings", "accessories"],
    categorySlug: "accessories",
    weight: 1,
    unit: "pcs",
    specifications: {
      Material: "Jewellery placeholder",
      Finish: "Pearl accent",
      Care: "Store separately",
    },
  },
  {
    name: "Embroidered Clutch",
    slug: "embroidered-clutch",
    description:
      "A temporary placeholder for a compact embroidered clutch made to pair with festive and occasion outfits.",
    shortDescription: "Occasion clutch placeholder.",
    brand: "Ananya Boutique",
    price: 1299,
    originalPrice: 1799,
    stock: 35,
    rating: 4.7,
    numReviews: 22,
    isFeatured: false,
    isNewArrival: false,
    tags: ["clutch", "accessories", "occasion"],
    categorySlug: "accessories",
    weight: 1,
    unit: "pcs",
    specifications: {
      Material: "Embroidered fabric placeholder",
      Closure: "Snap closure",
      Care: "Wipe gently",
    },
  },
  {
    name: "Celebration Gift Edit",
    slug: "celebration-gift-edit",
    description:
      "A temporary placeholder bundle for gifting-ready boutique picks curated for festive moments and special occasions.",
    shortDescription: "Curated boutique gift edit.",
    brand: "Ananya Boutique",
    price: 2999,
    originalPrice: 3799,
    stock: 20,
    rating: 4.9,
    numReviews: 16,
    isFeatured: true,
    isNewArrival: false,
    isBestSeller: true,
    tags: ["gift", "occasion", "curated"],
    categorySlug: "occasion-edit",
    weight: 1,
    unit: "pcs",
    specifications: {
      Includes: "Curated boutique placeholders",
      Packaging: "Gift-ready placeholder",
      Care: "Handle with care",
    },
  },
];

// Home Slides for Boutique Store
const homeSlides = [
  {
    title: "Ananya Boutique Edit",
    subtitle: "New Arrivals",
    description:
      "Temporary hero content for curated boutique pieces, festive styling, and everyday elegance.",
    image: FIREBASE_DEFAULT_HOME_SLIDES[0],
    buttonText: "Shop New Arrivals",
    buttonLink: "/products?category=new-arrivals",
    textPosition: "left",
    isActive: true,
    sortOrder: 1,
  },
  {
    title: "Occasion Ready Styles",
    subtitle: "Festive Edit",
    description:
      "Placeholder banner copy for celebration looks, elegant drapes, and refined accessories.",
    image: FIREBASE_DEFAULT_HOME_SLIDES[1],
    buttonText: "Explore Occasion Edit",
    buttonLink: "/products?category=occasion-edit",
    textPosition: "center",
    isActive: true,
    sortOrder: 2,
  },
  {
    title: "Accessories That Finish The Look",
    subtitle: "Boutique Details",
    description:
      "Temporary content for jewellery, clutches, and styling accents from Ananya Boutique.",
    image: FIREBASE_DEFAULT_HOME_SLIDES[2],
    buttonText: "Shop Accessories",
    buttonLink: "/products?category=accessories",
    textPosition: "right",
    isActive: true,
    sortOrder: 3,
  },
];

// Banners
const banners = [
  {
    title: "Boutique Launch Edit",
    subtitle: "Temporary Ananya Boutique storefront placeholder",
    image: FIREBASE_DEFAULT_BANNERS[0],
    link: "/products",
    position: "home-top",
    isActive: true,
    sortOrder: 1,
  },
  {
    title: "Curated Occasion Looks",
    subtitle: "Fresh placeholders for festive and everyday collections",
    image: FIREBASE_DEFAULT_BANNERS[1],
    link: "/products?category=occasion-edit",
    position: "home-middle",
    isActive: true,
    sortOrder: 2,
  },
];
// Seed functions
const seedCategories = async () => {
  await CategoryModel.deleteMany({});
  const createdCategories = await CategoryModel.insertMany(categories);
  console.log(`✅ ${createdCategories.length} categories seeded`);
  return createdCategories;
};

const seedProducts = async (createdCategories) => {
  await ProductModel.deleteMany({});

  // Map category slugs to category IDs
  const categoryMap = {};
  for (const cat of createdCategories) {
    categoryMap[cat.slug] = cat._id;
  }

  // Add category IDs to products
  const productsWithCategories = products.map((product, index) => {
    const seededImage = resolveSeedPublicImage(index);
    return {
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.shortDescription,
      brand: product.brand,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100,
      ),
      // Seed with Firebase-hosted defaults so live never depends on repo-local media.
      images: [seededImage],
      thumbnail: seededImage,
      category: categoryMap[product.categorySlug],
      stock: product.stock,
      rating: product.rating,
      numReviews: product.numReviews,
      isFeatured: product.isFeatured || false,
      isNewArrival: product.isNewArrival || false,
      isBestSeller: product.isBestSeller || false,
      isOnSale: product.originalPrice > product.price,
      tags: product.tags,
      specifications: {
        Quantity: `${product.weight} ${product.unit}`,
        ...(product.specifications || {}),
      },
      ingredients: "",
      nutritionalInfo: {},
    };
  });

  const createdProducts = await ProductModel.insertMany(productsWithCategories);
  console.log(`✅ ${createdProducts.length} boutique products seeded`);

  // Update category product counts
  for (const category of createdCategories) {
    const count = await ProductModel.countDocuments({ category: category._id });
    await CategoryModel.findByIdAndUpdate(category._id, {
      productCount: count,
    });
  }

  return createdProducts;
};

const seedCombos = async (createdProducts = []) => {
  await ComboModel.deleteMany({});
  await ComboItemModel.deleteMany({});

  const productBySlug = new Map(
    (Array.isArray(createdProducts) ? createdProducts : []).map((product) => [
      String(product?.slug || "").trim(),
      product,
    ]),
  );

  const getProductId = (slug) => productBySlug.get(String(slug || ""))?._id;

  const comboSeeds = [
    {
      name: "Festive Ready Combo",
      slug: "festive-ready-combo",
      shortDescription: "Kurta set plus clutch placeholder bundle",
      description:
        "A temporary boutique combo pairing an occasion outfit with a finishing accessory.",
      tags: ["best_seller", "featured"],
      priority: 60,
      isFeatured: true,
      isBestSeller: true,
      pricing: { type: "percent_discount", value: 12 },
      items: [
        {
          productId: getProductId("ananya-signature-kurta-set"),
          quantity: 1,
        },
        {
          productId: getProductId("embroidered-clutch"),
          quantity: 1,
        },
      ],
    },
    {
      name: "Accessory Finish Combo",
      slug: "accessory-finish-combo",
      shortDescription: "Earrings plus clutch placeholder bundle",
      description:
        "A temporary accessories combo for completing festive and evening looks.",
      tags: ["trending", "recommended"],
      priority: 50,
      isFeatured: true,
      pricing: { type: "percent_discount", value: 10 },
      items: [
        { productId: getProductId("pearl-accent-earrings"), quantity: 1 },
        { productId: getProductId("embroidered-clutch"), quantity: 1 },
      ],
    },
  ];
  const createdCombos = [];

  for (const comboSeed of comboSeeds) {
    const filteredItems = (
      Array.isArray(comboSeed?.items) ? comboSeed.items : []
    ).filter((item) => item?.productId);
    if (filteredItems.length === 0) continue;

    const { snapshots } = await buildComboItemsSnapshot({
      items: filteredItems,
    });
    const pricing = comboSeed?.pricing || { type: "fixed_price", value: 0 };
    const pricingResult = buildComboPricing({ items: snapshots, pricing });
    const comboImage =
      snapshots.map((entry) => entry?.image).find(Boolean) || "";

    const combo = await ComboModel.create({
      name: comboSeed.name,
      slug: comboSeed.slug,
      shortDescription: comboSeed.shortDescription || "",
      description: comboSeed.description || "",
      brand: "Ananya Boutique",
      sku: buildComboSkuFromItems(snapshots),
      comboType: "fixed_bundle",
      items: snapshots,
      pricing,
      comboImages: snapshots
        .map((entry) => entry?.image)
        .filter(Boolean)
        .slice(0, 6),
      comboThumbnail: comboImage,
      image: comboImage,
      thumbnail: comboImage,
      originalTotal: pricingResult.originalTotal,
      comboPrice: pricingResult.comboPrice,
      totalSavings: pricingResult.totalSavings,
      discountPercentage: pricingResult.discountPercentage,
      priority: Number(comboSeed.priority || 0),
      tags: Array.isArray(comboSeed.tags) ? comboSeed.tags : [],
      isFeatured: Boolean(comboSeed.isFeatured),
      isBestSeller: Boolean(comboSeed.isBestSeller),
      isActive: true,
      isVisible: true,
      status: "active",
    });

    await upsertComboItems(combo._id, snapshots);
    createdCombos.push(combo);
  }

  console.log(`âœ… ${createdCombos.length} combos seeded`);
};

// Seed home slides
const seedSlides = async () => {
  const existingCount = await HomeSlideModel.countDocuments();
  if (existingCount > 0 && !FORCE_HOMEPAGE_MEDIA_RESET) {
    console.log(
      `Skipping home slide seed because ${existingCount} slide(s) already exist. Use --force-homepage-media-reset to replace them with default seeded slides.`,
    );
    return;
  }

  await HomeSlideModel.deleteMany({});
  const createdSlides = await HomeSlideModel.insertMany(homeSlides);
  console.log(`✅ ${createdSlides.length} home slides seeded`);
};

const seedBanners = async () => {
  const existingCount = await BannerModel.countDocuments();
  if (existingCount > 0 && !FORCE_HOMEPAGE_MEDIA_RESET) {
    console.log(
      `Skipping banner seed because ${existingCount} banner(s) already exist. Use --force-homepage-media-reset to replace them with default seeded banners.`,
    );
    return;
  }

  await BannerModel.deleteMany({});
  const createdBanners = await BannerModel.insertMany(banners);
  console.log(`✅ ${createdBanners.length} banners seeded`);
};

const seedPrivilegedUser = async ({
  name,
  email,
  password,
  role,
  managerPermissions = null,
}) => {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail) return;

  const existingUser = await UserModel.findOne({ email: normalizedEmail });
  const hashedPassword = await bcrypt.hash(password, 10);

  if (!existingUser) {
    const createdUser = await UserModel.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      verifyEmail: true,
      status: "active",
      managerPermissions:
        role === "Manager"
          ? normalizeManagerPermissions(
              Array.isArray(managerPermissions) ? managerPermissions : [],
            )
          : [],
    });

    console.log(`✅ ${role} user created: ${createdUser.email}`);
    console.log(
      "   Password: [set in seeder script] (change this immediately!)",
    );
    return;
  }

  let didUpdate = false;
  if (existingUser.role !== role) {
    existingUser.role = role;
    didUpdate = true;
  }
  if (existingUser.verifyEmail !== true) {
    existingUser.verifyEmail = true;
    didUpdate = true;
  }
  if (existingUser.status !== "active") {
    existingUser.status = "active";
    didUpdate = true;
  }
  if (role === "Manager" && Array.isArray(managerPermissions)) {
    const normalized = normalizeManagerPermissions(managerPermissions);
    if (
      JSON.stringify(existingUser.managerPermissions || []) !==
      JSON.stringify(normalized)
    ) {
      existingUser.managerPermissions = normalized;
      didUpdate = true;
    }
  } else if (
    Array.isArray(existingUser.managerPermissions) &&
    existingUser.managerPermissions.length > 0
  ) {
    existingUser.managerPermissions = [];
    didUpdate = true;
  }
  if (!existingUser.password) {
    existingUser.password = hashedPassword;
    didUpdate = true;
  }

  if (didUpdate) {
    await existingUser.save();
    console.log(`✅ ${role} user updated: ${existingUser.email}`);
  } else {
    console.log(`ℹ️  ${role} user already exists: ${existingUser.email}`);
  }
};

const seedAdminUser = async () => {
  if (!ADMIN_SEED_PASSWORD) {
    console.log(
      "⚠️  Skipping Admin user seed: ADMIN_PRIMARY_PASSWORD is not set.",
    );
    return;
  }

  await seedPrivilegedUser({
    name: "Admin",
    email: ADMIN_SEED_EMAIL,
    password: ADMIN_SEED_PASSWORD,
    role: "Admin",
    managerPermissions: null,
  });
};

const seedManagerUser = async () => {
  if (!MANAGER_SEED_PASSWORD) {
    console.log(
      "⚠️  Skipping Manager user seed: MANAGER_PRIMARY_PASSWORD is not set.",
    );
    return;
  }

  await seedPrivilegedUser({
    name: "Manager",
    email: MANAGER_SEED_EMAIL,
    password: MANAGER_SEED_PASSWORD,
    role: "Manager",
    managerPermissions: HAS_SEED_MANAGER_DEFAULT_PERMISSIONS
      ? SEED_MANAGER_DEFAULT_PERMISSIONS
      : null,
  });
};

// Main seed function
const seedDatabase = async () => {
  try {
    await connectDB();

    console.log("\n🌱 Seeding database...\n");

    const createdCategories = await seedCategories();
    const createdProducts = await seedProducts(createdCategories);
    await seedCombos(createdProducts);
    await seedSlides();
    await seedBanners();
    await seedAdminUser();
    await seedManagerUser();

    console.log("\n✨ Database seeded successfully!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  }
};

// Destroy function
const destroyData = async () => {
  try {
    await connectDB();

    console.log("\n🗑️  Destroying data...\n");

    await CategoryModel.deleteMany({});
    await ProductModel.deleteMany({});
    await ComboModel.deleteMany({});
    await ComboItemModel.deleteMany({});
    await HomeSlideModel.deleteMany({});
    await BannerModel.deleteMany({});

    console.log("✅ All data destroyed (except users)\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Destroy error:", error);
    process.exit(1);
  }
};

// Check command line arguments
if (SHOULD_DESTROY_DATA) {
  destroyData();
} else {
  seedDatabase();
}
