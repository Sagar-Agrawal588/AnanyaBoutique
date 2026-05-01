const normalizeId = (value) => String(value || "").trim();

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getStockSyncVersion = (entry, fallback = 0) => {
  const parsed = Number(
    entry?.stock_sync_version ?? entry?.stockSyncVersion ?? fallback,
  );
  return Number.isFinite(parsed) ? parsed : Number(fallback || 0);
};

const getProductStockSyncVersion = (entry) => {
  const parsed = Number(
    entry?.product_stock_sync_version ??
      entry?.productStockSyncVersion ??
      entry?.stock_sync_version ??
      entry?.stockSyncVersion,
  );
  return Number.isFinite(parsed) ? parsed : 0;
};

const isNewerStockVersion = (nextVersion, currentVersion) => {
  if (!Number.isFinite(Number(nextVersion))) {
    return true;
  }

  return Number(nextVersion) > Number(currentVersion || 0);
};

const setAvailabilityFields = (
  entry,
  availableStock,
  { stockSyncVersion, productStockSyncVersion } = {},
) => {
  if (!entry || !Number.isFinite(Number(availableStock))) {
    return entry;
  }

  const normalizedAvailable = Math.max(Number(availableStock), 0);
  const currentlyAvailable = [
    entry?.available_quantity,
    entry?.available_stock,
    entry?.availableStock,
  ]
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value));

  if (currentlyAvailable === normalizedAvailable) {
    const currentInStock = Boolean(entry?.inStock);
    const nextInStock = normalizedAvailable > 0;
    const currentStockVersion = getStockSyncVersion(entry);
    const nextStockVersion = Number.isFinite(Number(stockSyncVersion))
      ? Number(stockSyncVersion)
      : currentStockVersion;
    const currentProductVersion = getProductStockSyncVersion(entry);
    const nextProductVersion = Number.isFinite(Number(productStockSyncVersion))
      ? Number(productStockSyncVersion)
      : currentProductVersion;
    if (
      currentInStock === nextInStock &&
      currentStockVersion === nextStockVersion &&
      currentProductVersion === nextProductVersion
    ) {
      return entry;
    }
  }

  return {
    ...entry,
    available_quantity: normalizedAvailable,
    available_stock: normalizedAvailable,
    availableStock: normalizedAvailable,
    inStock: normalizedAvailable > 0,
    stock_sync_version: Number.isFinite(Number(stockSyncVersion))
      ? Number(stockSyncVersion)
      : getStockSyncVersion(entry),
    product_stock_sync_version: Number.isFinite(Number(productStockSyncVersion))
      ? Number(productStockSyncVersion)
      : getProductStockSyncVersion(entry),
  };
};

export const applyStockUpdateToProduct = (product, rawPayload) => {
  if (!product || !rawPayload) return product;

  const productId = normalizeId(rawPayload?.product_id);
  const productAvailableStock = Number(rawPayload?.available_stock);
  if (!productId || !Number.isFinite(productAvailableStock)) {
    return product;
  }

  const productKey = normalizeId(
    product?.parentProductId || product?._id || product?.id,
  );
  if (productKey !== productId) {
    return product;
  }

  const variantId = normalizeId(rawPayload?.variant_id);
  const variantAvailableStock = Number(rawPayload?.variant_available_stock);
  const isVariantScoped = Boolean(variantId);
  const cardVariantId = normalizeId(product?.variantId);
  const eventVersion = Number(rawPayload?.event_version);
  const hasEventVersion = Number.isFinite(eventVersion);
  const currentProductVersion = getProductStockSyncVersion(product);

  if (cardVariantId) {
    if (!isVariantScoped || cardVariantId !== variantId) {
      return product;
    }

    const currentVariantVersion = getStockSyncVersion(product);
    if (
      hasEventVersion &&
      !isNewerStockVersion(eventVersion, currentVariantVersion)
    ) {
      return product;
    }

    return setAvailabilityFields(product, variantAvailableStock, {
      stockSyncVersion: eventVersion,
      productStockSyncVersion: Math.max(currentProductVersion, eventVersion || 0),
    });
  }

  let nextProduct = product;

  if (
    !hasEventVersion ||
    isNewerStockVersion(eventVersion, currentProductVersion)
  ) {
    nextProduct = setAvailabilityFields(product, productAvailableStock, {
      stockSyncVersion: eventVersion,
      productStockSyncVersion: eventVersion,
    });
  }

  if (!Array.isArray(nextProduct?.variants) || !isVariantScoped) {
    return nextProduct;
  }

  let variantChanged = false;
  const nextVariants = nextProduct.variants.map((variant) => {
    const currentVariantId = normalizeId(variant?._id || variant?.id);
    if (currentVariantId !== variantId) {
      return variant;
    }

    const currentVariantVersion = getStockSyncVersion(variant);
    if (
      hasEventVersion &&
      !isNewerStockVersion(eventVersion, currentVariantVersion)
    ) {
      return variant;
    }

    const updatedVariant = setAvailabilityFields(variant, variantAvailableStock, {
      stockSyncVersion: eventVersion,
      productStockSyncVersion: Math.max(
        getProductStockSyncVersion(variant),
        currentProductVersion,
        eventVersion || 0,
      ),
    });
    if (updatedVariant !== variant) {
      variantChanged = true;
    }
    return updatedVariant;
  });

  if (!variantChanged) {
    return nextProduct;
  }

  return {
    ...nextProduct,
    variants: nextVariants,
  };
};

export const applyStockUpdateToProductCollection = (products, rawPayload) => {
  if (!Array.isArray(products) || products.length === 0) {
    return products;
  }

  let nextProducts = products;

  for (let index = 0; index < products.length; index += 1) {
    const product = products[index];
    const updatedProduct = applyStockUpdateToProduct(product, rawPayload);
    if (updatedProduct === product) {
      continue;
    }

    if (nextProducts === products) {
      nextProducts = [...products];
    }
    nextProducts[index] = updatedProduct;
  }

  return nextProducts;
};

export const getResolvedAvailableStock = (entry) => {
  const explicit = [
    entry?.available_quantity,
    entry?.available_stock,
    entry?.availableStock,
  ]
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value));

  if (Number.isFinite(explicit)) {
    return Math.max(explicit, 0);
  }

  return Math.max(
    toNumber(entry?.stock_quantity ?? entry?.stock, 0) -
      toNumber(entry?.reserved_quantity, 0),
    0,
  );
};
