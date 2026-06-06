import admin from "firebase-admin";
import { getFirestore } from "../config/firebaseAdmin.js";
import { normalizeProductPageConfig } from "../utils/productPageConfig.js";

const PRODUCTS_COLLECTION = "products";
const COMBOS_COLLECTION = "combos";
const FIREBASE_CATALOG_ENABLED_VALUES = new Set(["true", "1", "on", "yes"]);
const FIREBASE_CATALOG_PRODUCTION_OVERRIDE_VALUES = new Set([
  "true",
  "1",
  "on",
  "yes",
]);

export const isFirebaseCatalogPrimaryEnabled = () => {
  const requested = FIREBASE_CATALOG_ENABLED_VALUES.has(
    String(process.env.FIREBASE_CATALOG_PRIMARY ?? "false")
      .trim()
      .toLowerCase(),
  );

  if (!requested) return false;

  if (process.env.NODE_ENV === "production") {
    return FIREBASE_CATALOG_PRODUCTION_OVERRIDE_VALUES.has(
      String(process.env.FIREBASE_CATALOG_PRIMARY_ALLOW_PRODUCTION ?? "false")
        .trim()
        .toLowerCase(),
    );
  }

  return true;
};

const getCatalogDb = () => {
  if (!isFirebaseCatalogPrimaryEnabled()) return null;
  return getFirestore();
};

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
};

const compactStringList = (values = []) =>
  (Array.isArray(values) ? values : [values])
    .map((value) => String(value || "").trim())
    .filter(Boolean);

const categoryNameFromId = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "Products";
  return normalized
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const normalizeCategory = (value) => {
  if (value && typeof value === "object") {
    const name = String(value.name || value.title || value.slug || value._id || "").trim();
    const slug = String(value.slug || slugify(name)).trim();
    return {
      _id: slug || slugify(name) || "products",
      id: slug || slugify(name) || "products",
      name: name || categoryNameFromId(slug),
      slug: slug || slugify(name) || "products",
    };
  }

  const name = categoryNameFromId(value);
  const slug = slugify(value || name) || "products";
  return {
    _id: slug,
    id: slug,
    name,
    slug,
  };
};

const pickPrimaryImage = (data = {}) =>
  String(
    data.imageUrl ||
      data.image ||
      data.thumbnail ||
      (Array.isArray(data.images) ? data.images[0] : "") ||
      "",
  ).trim();

const pickPrimaryComboImage = (data = {}) =>
  String(
    data.comboThumbnail ||
      data.thumbnail ||
      data.imageUrl ||
      data.image ||
      (Array.isArray(data.comboImages) ? data.comboImages[0] : "") ||
      (Array.isArray(data.images) ? data.images[0] : "") ||
      "",
  ).trim();

const normalizeVariants = (variants = [], product = {}) => {
  if (!Array.isArray(variants) || variants.length === 0) return [];

  return variants.map((variant, index) => {
    const stock = toNumber(variant.stock_quantity ?? variant.stock, 0);
    const reserved = toNumber(variant.reserved_quantity, 0);
    const price = toNumber(variant.price, product.price);
    const originalPrice = toNumber(
      variant.originalPrice ?? variant.mrp,
      product.originalPrice || price,
    );
    return {
      _id: String(variant._id || variant.id || `variant-${index + 1}`),
      id: String(variant._id || variant.id || `variant-${index + 1}`),
      name: String(variant.name || variant.label || `Variant ${index + 1}`),
      label: String(variant.label || variant.name || ""),
      sku: String(variant.sku || ""),
      price,
      originalPrice,
      stock,
      stock_quantity: stock,
      reserved_quantity: reserved,
      available_quantity: Math.max(stock - reserved, 0),
      available_stock: Math.max(stock - reserved, 0),
      weight: toNumber(variant.weight, 0),
      unit: String(variant.unit || "g"),
      isDefault: index === 0 ? variant.isDefault !== false : Boolean(variant.isDefault),
      image: String(variant.image || product.thumbnail || ""),
    };
  });
};

export const normalizeFirebaseProduct = (doc) => {
  const raw = doc?.data ? doc.data() : doc || {};
  const docId = String(doc?.id || raw.id || raw._id || "").trim();
  const id = String(raw.id || raw._id || docId).trim();
  const name = String(raw.name || raw.productName || "Product").trim();
  const slug = String(raw.slug || slugify(name) || id).trim();
  const primaryImage = pickPrimaryImage(raw);
  const price = toNumber(raw.price, 0);
  const originalPrice = toNumber(raw.originalPrice ?? raw.mrp ?? raw.oldPrice, price);
  const stock = toNumber(raw.stock_quantity ?? raw.stock, 0);
  const reserved = toNumber(raw.reserved_quantity, 0);
  const variants = normalizeVariants(raw.variants, {
    price,
    originalPrice,
    thumbnail: primaryImage,
  });
  const category = normalizeCategory(raw.category || raw.categoryName);
  const reviewCount = toNumber(raw.reviewCount ?? raw.numReviews ?? raw.totalReviews, 0);
  const rating = reviewCount > 0 ? toNumber(raw.rating ?? raw.avgRating, 0) : 0;
  const available = variants.length
    ? variants.reduce((sum, variant) => sum + toNumber(variant.available_quantity, 0), 0)
    : Math.max(stock - reserved, 0);
  const tags = compactStringList(raw.tags || [raw.flavor, category.name]);
  const nutrition = raw.nutrition && typeof raw.nutrition === "object" ? raw.nutrition : {};

  return {
    ...raw,
    _id: id || docId,
    id: id || docId,
    firestoreId: docId || id,
    name,
    slug,
    description: String(raw.description || raw.longDescription || ""),
    productStory: String(raw.productStory || raw.longDescription || ""),
    shortDescription: String(raw.shortDescription || raw.description || "").slice(0, 500),
    brand: String(raw.brand || "Ananya Boutique"),
    price,
    originalPrice,
    oldPrice: originalPrice,
    images: compactStringList(raw.images || [primaryImage]),
    image: primaryImage,
    imageUrl: primaryImage,
    thumbnail: String(raw.thumbnail || primaryImage),
    videos: Array.isArray(raw.videos) ? raw.videos : [],
    category,
    categoryName: category.name,
    hsnCode: String(raw.hsnCode || ""),
    stock,
    stock_quantity: stock,
    reserved_quantity: reserved,
    available_quantity: available,
    available_stock: available,
    availableStock: available,
    inStock: available > 0,
    lowStockThreshold: toNumber(raw.lowStockThreshold ?? raw.low_stock_threshold, 10),
    low_stock_threshold: toNumber(raw.low_stock_threshold ?? raw.lowStockThreshold, 10),
    trackInventory: raw.trackInventory !== false,
    track_inventory: raw.track_inventory !== false,
    hasVariants: variants.length > 0,
    variants,
    variantType: String(raw.variantType || (variants.length ? "weight" : "")),
    weight: toNumber(raw.weight, 0),
    unit: String(raw.unit || "g"),
    demandStatus: String(raw.demandStatus || "NORMAL").toUpperCase() === "HIGH" ? "HIGH" : "NORMAL",
    isActive: raw.isActive !== false && raw.status !== "inactive",
    isNewArrival: toBoolean(raw.isNewArrival ?? raw.newArrival, false),
    newArrival: toBoolean(raw.isNewArrival ?? raw.newArrival, false),
    isBestSeller: toBoolean(raw.isBestSeller ?? raw.bestSeller, false),
    bestSeller: toBoolean(raw.isBestSeller ?? raw.bestSeller, false),
    isExclusive: toBoolean(raw.isExclusive, false),
    isOnSale: originalPrice > price,
    tags,
    flavor: String(raw.flavor || ""),
    ingredients: String(raw.ingredients || ""),
    specifications: raw.specifications || {
      HSN: String(raw.hsnCode || ""),
      GST: raw.gstPercentage != null ? `${raw.gstPercentage}%` : "",
      Flavor: String(raw.flavor || ""),
    },
    nutritionalInfo: raw.nutritionalInfo || {
      Calories: String(nutrition.calories ?? ""),
      Style: String(nutrition.style ?? ""),
      Carbs: String(nutrition.carbs ?? ""),
      Fats: String(nutrition.fats ?? ""),
      Serving: String(nutrition.servingSize ?? ""),
    },
    productPage: normalizeProductPageConfig(raw.productPage || {}),
    avgRating: rating,
    rating,
    reviewCount,
    totalReviews: reviewCount,
    numReviews: reviewCount,
    createdAt: raw.createdAt || raw.created_at || null,
    updatedAt: raw.updatedAt || raw.updated_at || null,
  };
};

export const normalizeFirebaseCombo = (doc) => {
  const raw = doc?.data ? doc.data() : doc || {};
  const docId = String(doc?.id || raw.id || raw._id || "").trim();
  const id = String(raw.id || raw._id || docId).trim();
  const name = String(raw.name || raw.comboName || "Combo Deal").trim();
  const slug = String(raw.slug || slugify(name) || id).trim();
  const primaryImage = pickPrimaryComboImage(raw);
  const images = compactStringList(raw.comboImages || raw.images || [primaryImage]);
  const price = toNumber(raw.price ?? raw.comboPrice ?? raw.finalPrice, 0);
  const originalPrice = toNumber(
    raw.originalPrice ?? raw.originalTotal ?? raw.mrp,
    price,
  );
  const stockMode =
    String(raw.stockMode || raw.stock_mode || "auto")
      .trim()
      .toLowerCase() === "manual"
      ? "manual"
      : "auto";
  const stock = toNumber(raw.stockQuantity ?? raw.stock_quantity ?? raw.stock, 0);
  const reserved = toNumber(raw.reservedQuantity ?? raw.reserved_quantity, 0);
  const availableStock = Math.max(stock - reserved, 0);
  const discountPercentage =
    toNumber(raw.discountPercentage, 0) ||
    (originalPrice > price && originalPrice > 0
      ? Math.ceil(((originalPrice - price) / originalPrice) * 100)
      : 0);
  const status = String(raw.status || (raw.isActive === false ? "disabled" : "active"));
  const comboType = String(raw.comboType || raw.type || "fixed_bundle").trim();

  return {
    ...raw,
    _id: id || docId,
    id: id || docId,
    comboId: id || docId,
    firestoreId: docId || id,
    itemType: "combo",
    name,
    slug,
    description: String(raw.description || raw.longDescription || ""),
    shortDescription: String(raw.shortDescription || raw.description || "").slice(0, 500),
    brand: String(raw.brand || "Ananya Boutique"),
    category: String(raw.category || ""),
    image: primaryImage,
    imageUrl: primaryImage,
    thumbnail: String(raw.thumbnail || raw.comboThumbnail || primaryImage),
    comboThumbnail: String(raw.comboThumbnail || raw.thumbnail || primaryImage),
    images,
    comboImages: images,
    items: Array.isArray(raw.items) ? raw.items : [],
    price,
    comboPrice: price,
    finalPrice: price,
    originalPrice,
    originalTotal: originalPrice,
    totalSavings: Math.max(originalPrice - price, 0),
    discountPercentage,
    discount: discountPercentage,
    comboType,
    type: comboType,
    stockMode,
    stock_mode: stockMode,
    tags: compactStringList(raw.tags || []),
    priority: toNumber(raw.priority, 0),
    stockQuantity: stock,
    reservedQuantity: reserved,
    reserved_quantity: reserved,
    availableStock,
    stock,
    stock_quantity: stock,
    available_quantity: availableStock,
    available_stock: availableStock,
    inStock: availableStock > 0,
    minOrderQuantity: Math.max(toNumber(raw.minOrderQuantity, 1), 1),
    maxPerOrder: toNumber(raw.maxPerOrder, 0),
    isActive: raw.isActive !== false && status !== "disabled",
    isVisible: raw.isVisible !== false,
    isFeatured: toBoolean(raw.isFeatured, false),
    isBestSeller: toBoolean(raw.isBestSeller ?? raw.bestSeller, false),
    bestSeller: toBoolean(raw.isBestSeller ?? raw.bestSeller, false),
    isExclusive: toBoolean(raw.isExclusive, false),
    demandStatus:
      String(raw.demandStatus || "NORMAL").toUpperCase() === "HIGH"
        ? "HIGH"
        : "NORMAL",
    rating: toNumber(raw.rating ?? raw.adminStarRating, 0),
    adminStarRating: toNumber(raw.adminStarRating ?? raw.rating, 0),
    reviewCount: toNumber(raw.reviewCount ?? raw.numReviews ?? raw.totalReviews, 0),
    status,
    source: String(raw.source || "admin"),
    productPage: normalizeProductPageConfig(raw.productPage || {}),
    createdAt: raw.createdAt || raw.created_at || null,
    updatedAt: raw.updatedAt || raw.updated_at || null,
  };
};

const findProductDoc = async (db, idOrSlug) => {
  const normalized = String(idOrSlug || "").trim();
  if (!normalized) return null;

  const direct = await db.collection(PRODUCTS_COLLECTION).doc(normalized).get();
  if (direct.exists) return direct;

  for (const field of ["id", "_id", "slug"]) {
    const snap = await db
      .collection(PRODUCTS_COLLECTION)
      .where(field, "==", normalized)
      .limit(1)
      .get();
    if (!snap.empty) return snap.docs[0];
  }

  return null;
};

const findComboDoc = async (db, idOrSlug) => {
  const normalized = String(idOrSlug || "").trim();
  if (!normalized) return null;

  const direct = await db.collection(COMBOS_COLLECTION).doc(normalized).get();
  if (direct.exists) return direct;

  for (const field of ["id", "_id", "slug", "comboId"]) {
    const snap = await db
      .collection(COMBOS_COLLECTION)
      .where(field, "==", normalized)
      .limit(1)
      .get();
    if (!snap.empty) return snap.docs[0];
  }

  return null;
};

const getAllProducts = async () => {
  const db = getCatalogDb();
  if (!db) return null;
  const snapshot = await db.collection(PRODUCTS_COLLECTION).get();
  return snapshot.docs.map(normalizeFirebaseProduct).filter((product) => product.isActive !== false);
};

const resolveFirebaseProductAvailableUnits = (product, item = {}) => {
  if (!product) return 0;
  const trackInventory =
    product.track_inventory !== false && product.trackInventory !== false;
  if (!trackInventory) return Number.MAX_SAFE_INTEGER;

  const variantId = String(item?.variantId || item?.variant || "").trim();
  if (variantId && Array.isArray(product.variants)) {
    const variant = product.variants.find(
      (entry) => String(entry?._id || entry?.id || "") === variantId,
    );
    return variant ? toNumber(variant.available_quantity ?? variant.available_stock, 0) : 0;
  }

  return toNumber(product.available_quantity ?? product.available_stock, 0);
};

const attachFirebaseComboAvailability = (combo, productMap = new Map()) => {
  if (!combo || combo.stockMode === "manual") return combo;
  const items = Array.isArray(combo.items) ? combo.items : [];
  if (items.length === 0) {
    return {
      ...combo,
      availableStock: 0,
      available_quantity: 0,
      available_stock: 0,
      inStock: false,
    };
  }

  const availabilityByItem = items.map((item) => {
    const productId = String(item?.productId || item?.product || item?._id || "").trim();
    const product = productMap.get(productId);
    const availableUnits = resolveFirebaseProductAvailableUnits(product, item);
    const requiredQuantity = Math.max(
      toNumber(item?.quantityRequired ?? item?.quantity, 1),
      1,
    );
    return Math.floor(availableUnits / requiredQuantity);
  });
  const availableStock = Math.max(Math.min(...availabilityByItem), 0);

  return {
    ...combo,
    availableStock,
    available_quantity: availableStock,
    available_stock: availableStock,
    inStock: availableStock > 0,
  };
};

const getAllCombos = async ({ includeInactive = false } = {}) => {
  const db = getCatalogDb();
  if (!db) return null;
  const snapshot = await db.collection(COMBOS_COLLECTION).get();
  const products = (await getAllProducts()) || [];
  const productMap = new Map(products.map((product) => [String(product._id || product.id), product]));
  return snapshot.docs
    .map(normalizeFirebaseCombo)
    .map((combo) => attachFirebaseComboAvailability(combo, productMap))
    .filter((combo) => includeInactive || (combo.isActive !== false && combo.isVisible !== false));
};

const applyProductFilters = (products, query = {}) => {
  let result = [...products];
  const search = String(query.search || "").trim().toLowerCase();
  const category = String(query.category || "").trim().toLowerCase();
  const flavor = String(query.flavor || "").trim().toLowerCase();
  const minPrice = query.minPrice === undefined || query.minPrice === "" ? null : toNumber(query.minPrice, null);
  const maxPrice = query.maxPrice === undefined || query.maxPrice === "" ? null : toNumber(query.maxPrice, null);
  const bestSeller = String(query.bestSeller || "").toLowerCase() === "true";
  const productType = String(query.productType || "").trim().toLowerCase();
  const newArrivals =
    String(query.newArrival || "").toLowerCase() === "true" ||
    String(query.newArrivals || "").toLowerCase() === "true";
  const lowStock = String(query.lowStock || "").toLowerCase() === "true";
  const exclusive =
    String(query.isExclusive || "").toLowerCase() === "true" ||
    String(query.exclusive || "").toLowerCase() === "true";

  if (productType === "combo") return [];

  if (search) {
    result = result.filter((product) => {
      const haystack = [
        product.name,
        product.brand,
        product.description,
        product.shortDescription,
        product.category?.name,
        product.flavor,
        ...(product.tags || []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }

  if (category) {
    result = result.filter((product) => {
      const values = [
        product.category?._id,
        product.category?.id,
        product.category?.slug,
        product.category?.name,
        product.categoryName,
      ]
        .map((value) => String(value || "").toLowerCase())
        .filter(Boolean);
      return values.includes(category) || values.includes(slugify(category));
    });
  }

  if (flavor) {
    result = result.filter((product) =>
      String(product.flavor || product.tags?.join(" ") || "")
        .toLowerCase()
        .includes(flavor),
    );
  }

  if (minPrice !== null) result = result.filter((product) => product.price >= minPrice);
  if (maxPrice !== null) result = result.filter((product) => product.price <= maxPrice);
  if (bestSeller) result = result.filter((product) => product.isBestSeller);
  if (newArrivals) result = result.filter((product) => product.isNewArrival);
  if (lowStock) {
    result = result.filter(
      (product) => product.available_quantity <= product.low_stock_threshold,
    );
  }
  if (exclusive) result = result.filter((product) => product.isExclusive);

  return result;
};

const sortProducts = (products, query = {}) => {
  const sortBy = String(query.sortBy || "createdAt");
  const order = String(query.order || "desc").toLowerCase() === "asc" ? 1 : -1;
  const getValue = (product) => {
    if (sortBy === "price") return product.price;
    if (sortBy === "soldCount") return toNumber(product.soldCount, 0);
    if (sortBy === "bestSeller") return product.isBestSeller ? 1 : 0;
    if (sortBy === "name") return product.name.toLowerCase();
    return product.createdAt?.toMillis?.() || Date.parse(product.createdAt || "") || 0;
  };

  return [...products].sort((left, right) => {
    const leftValue = getValue(left);
    const rightValue = getValue(right);
    if (leftValue < rightValue) return -1 * order;
    if (leftValue > rightValue) return 1 * order;
    return left.name.localeCompare(right.name);
  });
};

const applyComboFilters = (combos, query = {}) => {
  let result = [...combos];
  const search = String(query.search || "").trim().toLowerCase();
  const type = String(query.type || query.comboType || "").trim().toLowerCase();
  const tag = String(query.tag || "").trim().toLowerCase();
  const productId = String(query.productId || "").trim();
  const category = String(query.category || "").trim().toLowerCase();
  const minDiscount =
    query.minDiscount === undefined || query.minDiscount === ""
      ? null
      : toNumber(query.minDiscount, null);

  if (search) {
    result = result.filter((combo) => {
      const haystack = [
        combo.name,
        combo.brand,
        combo.description,
        combo.shortDescription,
        combo.category,
        ...(combo.tags || []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }

  if (type) {
    result = result.filter(
      (combo) => String(combo.comboType || combo.type || "").toLowerCase() === type,
    );
  }

  if (tag) {
    result = result.filter((combo) =>
      (combo.tags || []).map((value) => String(value).toLowerCase()).includes(tag),
    );
  }

  if (productId) {
    result = result.filter((combo) =>
      (combo.items || []).some(
        (item) => String(item?.productId || item?.product || item?._id || "") === productId,
      ),
    );
  }

  if (category) {
    result = result.filter((combo) => {
      const values = [
        combo.category,
        ...(combo.items || []).map((item) => item?.categoryId || item?.category),
      ]
        .map((value) => String(value || "").toLowerCase())
        .filter(Boolean);
      return values.includes(category) || values.includes(slugify(category));
    });
  }

  if (minDiscount !== null) {
    result = result.filter((combo) => toNumber(combo.discountPercentage, 0) >= minDiscount);
  }

  return result;
};

const sortCombos = (combos, query = {}) => {
  const sortKey = String(query.sort || query.sortBy || "priority");
  const direction = String(query.order || "desc").toLowerCase() === "asc" ? 1 : -1;
  const getValue = (combo) => {
    if (sortKey === "savings") return toNumber(combo.totalSavings, 0);
    if (sortKey === "discount") return toNumber(combo.discountPercentage, 0);
    if (sortKey === "newest" || sortKey === "createdAt") {
      return combo.createdAt?.toMillis?.() || Date.parse(combo.createdAt || "") || 0;
    }
    return toNumber(combo.priority, 0) || toNumber(combo.totalSavings, 0);
  };

  return [...combos].sort((left, right) => {
    const leftValue = getValue(left);
    const rightValue = getValue(right);
    if (leftValue < rightValue) return -1 * direction;
    if (leftValue > rightValue) return 1 * direction;
    return left.name.localeCompare(right.name);
  });
};

export const getFirebaseProductsResponse = async (query = {}) => {
  const products = await getAllProducts();
  if (!products) return null;

  const filtered = sortProducts(applyProductFilters(products, query), query);
  const page = Math.max(toNumber(query.page, 1), 1);
  const limit = Math.max(toNumber(query.limit, 15), 1);
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);
  const totalProducts = filtered.length;

  return {
    error: false,
    success: true,
    data,
    products: data,
    totalProducts,
    totalPages: Math.max(Math.ceil(totalProducts / limit), 1),
    currentPage: page,
    hasNextPage: start + limit < totalProducts,
    hasPrevPage: page > 1,
  };
};

export const getFirebaseCombosData = async (query = {}, { admin = false } = {}) => {
  const combos = await getAllCombos({ includeInactive: admin });
  if (!combos) return null;

  const filtered = sortCombos(applyComboFilters(combos, query), query);
  const page = Math.max(toNumber(query.page, 1), 1);
  const limit = Math.max(toNumber(query.limit, admin ? 20 : 12), 1);
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);
  const total = filtered.length;

  return {
    items,
    page,
    limit,
    total,
    pages: Math.max(Math.ceil(total / limit), 1),
  };
};

export const getFirebaseComboById = async (idOrSlug) => {
  const db = getCatalogDb();
  if (!db) return null;
  const doc = await findComboDoc(db, idOrSlug);
  if (!doc?.exists) return null;
  const combo = normalizeFirebaseCombo(doc);
  const products = (await getAllProducts()) || [];
  const productMap = new Map(products.map((product) => [String(product._id || product.id), product]));
  return attachFirebaseComboAvailability(combo, productMap);
};

export const getFirebaseComboSections = async (productId) => {
  const normalizedProductId = String(productId || "").trim();
  if (!normalizedProductId) return null;
  const combos = await getAllCombos();
  if (!combos) return null;
  const recommendedCombos = combos
    .filter((combo) =>
      (combo.items || []).some(
        (item) =>
          String(item?.productId || item?.product || item?._id || "").trim() ===
          normalizedProductId,
      ),
    )
    .slice(0, 8);

  return {
    frequentlyBoughtTogether: [],
    recommendedCombos,
  };
};

export const getFirebaseCartUpsells = async () => {
  const combos = await getAllCombos();
  if (!combos) return null;
  return {
    suggestions: combos.slice(0, 6),
    productSuggestion: null,
  };
};

export const getFirebaseProductById = async (idOrSlug) => {
  const db = getCatalogDb();
  if (!db) return null;
  const doc = await findProductDoc(db, idOrSlug);
  return doc?.exists ? normalizeFirebaseProduct(doc) : null;
};

export const getFirebaseCategories = async () => {
  const products = await getAllProducts();
  if (!products) return null;

  const map = new Map();
  for (const product of products) {
    const category = normalizeCategory(product.category);
    const current = map.get(category._id) || {
      ...category,
      description: "",
      image: product.thumbnail || product.image || "",
      icon: "",
      isFeatured: true,
      isActive: true,
      productCount: 0,
      parentCategory: null,
      parent: null,
      level: 0,
      sortOrder: map.size + 1,
    };
    current.productCount += 1;
    if (!current.image && (product.thumbnail || product.image)) {
      current.image = product.thumbnail || product.image;
    }
    map.set(category._id, current);
  }

  return Array.from(map.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
};

const buildProductPayload = (body = {}, existing = {}) => {
  const name = String(body.name || existing.name || "Product").trim();
  const images = compactStringList(body.images || existing.images || []);
  const imageUrl = String(body.imageUrl || body.thumbnail || images[0] || existing.imageUrl || "").trim();
  const category = normalizeCategory(body.category || existing.category || body.categoryName);
  const price = toNumber(body.price, existing.price || 0);
  const mrp = toNumber(body.originalPrice ?? body.mrp ?? body.oldPrice, existing.mrp || price);
  const stock = toNumber(body.stock_quantity ?? body.stock, existing.stock || 0);

  return {
    ...existing,
    ...body,
    name,
    id: String(existing.id || body.id || existing.firestoreId || ""),
    slug: String(body.slug || existing.slug || slugify(name)).trim(),
    description: String(body.description || existing.description || ""),
    longDescription: String(body.productStory || body.longDescription || existing.longDescription || ""),
    shortDescription: String(body.shortDescription || existing.shortDescription || ""),
    brand: String(body.brand || existing.brand || "Ananya Boutique"),
    category: category.name,
    categorySlug: category.slug,
    price,
    mrp,
    originalPrice: mrp,
    stock,
    stock_quantity: stock,
    imageUrl,
    images: images.length ? images : compactStringList([imageUrl]),
    thumbnail: String(body.thumbnail || imageUrl || existing.thumbnail || ""),
    videos: Array.isArray(body.videos) ? body.videos : existing.videos || [],
    hsnCode: String(body.hsnCode || existing.hsnCode || ""),
    flavor: String(body.flavor || existing.flavor || ""),
    tags: compactStringList(body.tags || existing.tags || []),
    variants: Array.isArray(body.variants) ? body.variants : existing.variants || [],
    hasVariants: Boolean(body.hasVariants ?? existing.hasVariants ?? false),
    variantType: String(body.variantType || existing.variantType || ""),
    weight: toNumber(body.weight, existing.weight || 0),
    unit: String(body.unit || existing.unit || "g"),
    demandStatus: String(body.demandStatus || existing.demandStatus || "NORMAL").toUpperCase() === "HIGH" ? "HIGH" : "NORMAL",
    isActive: body.isActive ?? existing.isActive ?? true,
    isNewArrival: toBoolean(body.isNewArrival ?? body.newArrival, existing.isNewArrival || false),
    isBestSeller: toBoolean(body.isBestSeller ?? body.bestSeller, existing.isBestSeller || false),
    isExclusive: toBoolean(body.isExclusive, existing.isExclusive || false),
    productPage: normalizeProductPageConfig(body.productPage || existing.productPage || {}),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
};

const buildComboPayload = (body = {}, existing = {}) => {
  const name = String(body.name || body.comboName || existing.name || "Combo Deal").trim();
  const images = compactStringList(body.comboImages || body.images || existing.comboImages || []);
  const imageUrl = String(
    body.comboThumbnail ||
      body.thumbnail ||
      body.imageUrl ||
      body.image ||
      images[0] ||
      existing.comboThumbnail ||
      "",
  ).trim();
  const price = toNumber(body.comboPrice ?? body.price ?? body.finalPrice, existing.comboPrice || existing.price || 0);
  const originalPrice = toNumber(
    body.originalTotal ?? body.originalPrice ?? body.mrp,
    existing.originalTotal || existing.originalPrice || price,
  );
  const stock = toNumber(
    body.stockQuantity ?? body.stock_quantity ?? body.stock,
    existing.stockQuantity ?? existing.stock_quantity ?? 0,
  );
  const status = String(body.status || existing.status || "active").trim();
  const isActive = body.isActive ?? existing.isActive ?? status !== "disabled";
  const isVisible = body.isVisible ?? existing.isVisible ?? true;

  return {
    ...existing,
    ...body,
    name,
    id: String(existing.id || body.id || existing.firestoreId || ""),
    slug: String(body.slug || existing.slug || slugify(name)).trim(),
    description: String(body.description || existing.description || ""),
    shortDescription: String(body.shortDescription || existing.shortDescription || ""),
    brand: String(body.brand || existing.brand || "Ananya Boutique"),
    category: String(body.category || existing.category || ""),
    image: String(body.image || imageUrl),
    imageUrl,
    thumbnail: String(body.thumbnail || imageUrl),
    comboThumbnail: String(body.comboThumbnail || imageUrl),
    images: images.length ? images : compactStringList([imageUrl]),
    comboImages: images.length ? images : compactStringList([imageUrl]),
    items: Array.isArray(body.items) ? body.items : existing.items || [],
    price,
    comboPrice: price,
    finalPrice: price,
    originalPrice,
    originalTotal: originalPrice,
    totalSavings: Math.max(originalPrice - price, 0),
    discountPercentage:
      toNumber(body.discountPercentage, existing.discountPercentage || 0) ||
      (originalPrice > price && originalPrice > 0
        ? Math.ceil(((originalPrice - price) / originalPrice) * 100)
        : 0),
    comboType: String(body.comboType || existing.comboType || "fixed_bundle"),
    tags: compactStringList(body.tags || existing.tags || []),
    priority: toNumber(body.priority, existing.priority || 0),
    stockQuantity: stock,
    reservedQuantity: toNumber(body.reservedQuantity, existing.reservedQuantity || 0),
    minOrderQuantity: Math.max(toNumber(body.minOrderQuantity, existing.minOrderQuantity || 1), 1),
    maxPerOrder: toNumber(body.maxPerOrder, existing.maxPerOrder || 0),
    isActive,
    isVisible,
    isFeatured: toBoolean(body.isFeatured, existing.isFeatured || false),
    isBestSeller: toBoolean(body.isBestSeller ?? body.bestSeller, existing.isBestSeller || false),
    isExclusive: toBoolean(body.isExclusive, existing.isExclusive || false),
    demandStatus:
      String(body.demandStatus || existing.demandStatus || "NORMAL").toUpperCase() === "HIGH"
        ? "HIGH"
        : "NORMAL",
    rating: toNumber(body.rating ?? body.adminStarRating, existing.rating || 0),
    adminStarRating: toNumber(body.adminStarRating ?? body.rating, existing.adminStarRating || 0),
    reviewCount: toNumber(body.reviewCount, existing.reviewCount || 0),
    source: String(body.source || existing.source || "admin"),
    status,
    productPage: normalizeProductPageConfig(body.productPage || existing.productPage || {}),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
};

export const createFirebaseProduct = async (body = {}) => {
  const db = getCatalogDb();
  if (!db) return null;
  const ref = db.collection(PRODUCTS_COLLECTION).doc();
  const payload = buildProductPayload(body, {
    id: ref.id,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  payload.id = ref.id;
  await ref.set(payload);
  const doc = await ref.get();
  return normalizeFirebaseProduct(doc);
};

export const updateFirebaseProduct = async (idOrSlug, body = {}) => {
  const db = getCatalogDb();
  if (!db) return null;
  const doc = await findProductDoc(db, idOrSlug);
  if (!doc?.exists) return false;
  const existing = normalizeFirebaseProduct(doc);
  const payload = buildProductPayload(body, existing);
  payload.id = existing.id || doc.id;
  await doc.ref.set(payload, { merge: true });
  const updated = await doc.ref.get();
  return normalizeFirebaseProduct(updated);
};

export const deleteFirebaseProduct = async (idOrSlug) => {
  const db = getCatalogDb();
  if (!db) return null;
  const doc = await findProductDoc(db, idOrSlug);
  if (!doc?.exists) return false;
  await doc.ref.set(
    {
      isActive: false,
      status: "inactive",
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return true;
};

export const updateFirebaseProductDemandStatus = async (idOrSlug, demandStatus) => {
  const db = getCatalogDb();
  if (!db) return null;
  const doc = await findProductDoc(db, idOrSlug);
  if (!doc?.exists) return false;
  const normalizedStatus = String(demandStatus || "").toUpperCase() === "HIGH" ? "HIGH" : "NORMAL";
  await doc.ref.set(
    {
      demandStatus: normalizedStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  const updated = await doc.ref.get();
  return normalizeFirebaseProduct(updated);
};

export const updateFirebaseProductStock = async (
  idOrSlug,
  { stock, variantId = "" } = {},
) => {
  const db = getCatalogDb();
  if (!db) return null;
  const doc = await findProductDoc(db, idOrSlug);
  if (!doc?.exists) return false;

  const product = normalizeFirebaseProduct(doc);
  const normalizedStock = Math.max(toNumber(stock, 0), 0);
  const normalizedVariantId = String(variantId || "").trim();

  if (!normalizedVariantId) {
    await doc.ref.set(
      {
        stock: normalizedStock,
        stock_quantity: normalizedStock,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } else {
    const variants = product.variants.map((variant) =>
      String(variant._id || variant.id) === normalizedVariantId
        ? {
            ...variant,
            stock: normalizedStock,
            stock_quantity: normalizedStock,
            available_quantity: Math.max(
              normalizedStock - toNumber(variant.reserved_quantity, 0),
              0,
            ),
          }
        : variant,
    );
    const totalStock = variants.reduce(
      (sum, variant) => sum + toNumber(variant.stock_quantity ?? variant.stock, 0),
      0,
    );
    await doc.ref.set(
      {
        variants,
        stock: totalStock,
        stock_quantity: totalStock,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  const updated = await doc.ref.get();
  return normalizeFirebaseProduct(updated);
};

const buildInventoryVariantPayload = (variant = {}, existing = {}) => {
  const stock = Math.max(toNumber(variant.stock_quantity ?? variant.stock, 0), 0);
  const reserved = Math.max(toNumber(variant.reserved_quantity, 0), 0);
  const available = Math.max(stock - reserved, 0);
  const id = String(variant._id || variant.id || existing._id || existing.id || "").trim();

  return {
    ...existing,
    ...variant,
    _id: id || existing._id || existing.id || "",
    id: id || existing.id || existing._id || "",
    stock,
    stock_quantity: stock,
    reserved_quantity: reserved,
    available_quantity: available,
    available_stock: available,
    availableStock: available,
    inStock: available > 0,
  };
};

export const syncFirebaseProductInventory = async (productSnapshot = {}) => {
  const db = getCatalogDb();
  if (!db) return null;

  const productId = String(
    productSnapshot?._id || productSnapshot?.id || productSnapshot?.productId || "",
  ).trim();
  if (!productId) return false;

  const doc = await findProductDoc(db, productId);
  if (!doc?.exists) return false;

  const raw = doc.data() || {};
  const incomingVariants = Array.isArray(productSnapshot?.variants)
    ? productSnapshot.variants
    : [];
  const existingVariants = Array.isArray(raw.variants) ? raw.variants : [];

  let payload = {};
  if (incomingVariants.length > 0) {
    const incomingById = new Map(
      incomingVariants
        .map((variant) => [
          String(variant?._id || variant?.id || "").trim(),
          variant,
        ])
        .filter(([id]) => Boolean(id)),
    );
    const existingIds = new Set(
      existingVariants
        .map((variant) => String(variant?._id || variant?.id || "").trim())
        .filter(Boolean),
    );
    const variants = existingVariants.map((variant) => {
      const id = String(variant?._id || variant?.id || "").trim();
      return incomingById.has(id)
        ? buildInventoryVariantPayload(incomingById.get(id), variant)
        : variant;
    });

    for (const [id, variant] of incomingById.entries()) {
      if (!existingIds.has(id)) {
        variants.push(buildInventoryVariantPayload(variant));
      }
    }

    const totalStock = variants.reduce(
      (sum, variant) => sum + toNumber(variant.stock_quantity ?? variant.stock, 0),
      0,
    );
    const totalReserved = variants.reduce(
      (sum, variant) => sum + toNumber(variant.reserved_quantity, 0),
      0,
    );
    const available = Math.max(totalStock - totalReserved, 0);
    payload = {
      variants,
      hasVariants: true,
      stock: totalStock,
      stock_quantity: totalStock,
      reserved_quantity: totalReserved,
      available_quantity: available,
      available_stock: available,
      availableStock: available,
      inStock: available > 0,
    };
  } else {
    const stock = Math.max(
      toNumber(productSnapshot.stock_quantity ?? productSnapshot.stock, 0),
      0,
    );
    const reserved = Math.max(toNumber(productSnapshot.reserved_quantity, 0), 0);
    const available = Math.max(stock - reserved, 0);
    payload = {
      stock,
      stock_quantity: stock,
      reserved_quantity: reserved,
      available_quantity: available,
      available_stock: available,
      availableStock: available,
      inStock: available > 0,
    };
  }

  await doc.ref.set(
    {
      ...payload,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  const updated = await doc.ref.get();
  return normalizeFirebaseProduct(updated);
};

export const syncFirebaseComboInventory = async (comboSnapshot = {}) => {
  const db = getCatalogDb();
  if (!db) return null;

  const comboId = String(
    comboSnapshot?._id || comboSnapshot?.comboId || comboSnapshot?.id || "",
  ).trim();
  if (!comboId) return false;

  const doc = await findComboDoc(db, comboId);
  if (!doc?.exists) return false;

  const stockMode =
    String(comboSnapshot.stockMode || comboSnapshot.stock_mode || "manual")
      .trim()
      .toLowerCase() === "manual"
      ? "manual"
      : "auto";
  const stock = Math.max(
    toNumber(comboSnapshot.stockQuantity ?? comboSnapshot.stock_quantity ?? comboSnapshot.stock, 0),
    0,
  );
  const reserved = Math.max(
    toNumber(comboSnapshot.reservedQuantity ?? comboSnapshot.reserved_quantity, 0),
    0,
  );
  const available = Math.max(stock - reserved, 0);

  await doc.ref.set(
    {
      stockMode,
      stock_mode: stockMode,
      stockQuantity: stock,
      stock,
      stock_quantity: stock,
      reservedQuantity: reserved,
      reserved_quantity: reserved,
      availableStock: available,
      available_quantity: available,
      available_stock: available,
      inStock: available > 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  const updated = await doc.ref.get();
  return normalizeFirebaseCombo(updated);
};

export const createFirebaseCombo = async (body = {}) => {
  const db = getCatalogDb();
  if (!db) return null;
  const ref = db.collection(COMBOS_COLLECTION).doc();
  const payload = buildComboPayload(body, {
    id: ref.id,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  payload.id = ref.id;
  await ref.set(payload);
  const doc = await ref.get();
  return normalizeFirebaseCombo(doc);
};

export const updateFirebaseCombo = async (idOrSlug, body = {}) => {
  const db = getCatalogDb();
  if (!db) return null;
  const doc = await findComboDoc(db, idOrSlug);
  if (!doc?.exists) return false;
  const existing = normalizeFirebaseCombo(doc);
  const payload = buildComboPayload(body, existing);
  payload.id = existing.id || doc.id;
  await doc.ref.set(payload, { merge: true });
  const updated = await doc.ref.get();
  return normalizeFirebaseCombo(updated);
};

export const deleteFirebaseCombo = async (idOrSlug) => {
  const db = getCatalogDb();
  if (!db) return null;
  const doc = await findComboDoc(db, idOrSlug);
  if (!doc?.exists) return false;
  await doc.ref.set(
    {
      isActive: false,
      isVisible: false,
      status: "disabled",
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return true;
};

export const toggleFirebaseCombo = async (idOrSlug, body = {}) => {
  const db = getCatalogDb();
  if (!db) return null;
  const doc = await findComboDoc(db, idOrSlug);
  if (!doc?.exists) return false;
  const combo = normalizeFirebaseCombo(doc);
  const isActive =
    body?.isActive !== undefined ? Boolean(body.isActive) : !combo.isActive;
  const isVisible =
    body?.isVisible !== undefined ? Boolean(body.isVisible) : combo.isVisible;
  const status = isActive ? "active" : "disabled";
  await doc.ref.set(
    {
      isActive,
      isVisible,
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  const updated = await doc.ref.get();
  return normalizeFirebaseCombo(updated);
};
