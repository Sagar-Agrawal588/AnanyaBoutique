import { getIO } from "./socket.js";

const productStockVersionMap = new Map();
const variantStockVersionMap = new Map();
let stockEventSequence = 0;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeId = (value) => {
  const normalized = String(value || "").trim();
  return normalized || "";
};

const toVersionKey = (productId, variantId = null) =>
  `${normalizeId(productId)}::${normalizeId(variantId)}`;

const nextStockEventVersion = () => {
  stockEventSequence = (stockEventSequence + 1) % 1000;
  return Date.now() * 1000 + stockEventSequence;
};

const setLatestStockSyncVersion = ({
  productId,
  variantId = null,
  eventVersion,
}) => {
  const normalizedProductId = normalizeId(productId);
  const normalizedVariantId = normalizeId(variantId);
  const normalizedEventVersion = Number(eventVersion);
  if (!normalizedProductId || !Number.isFinite(normalizedEventVersion)) {
    return;
  }

  productStockVersionMap.set(
    toVersionKey(normalizedProductId),
    normalizedEventVersion,
  );

  if (normalizedVariantId) {
    variantStockVersionMap.set(
      toVersionKey(normalizedProductId, normalizedVariantId),
      normalizedEventVersion,
    );
  }
};

const isInventoryTracked = (entry) => {
  if (!entry) return true;
  if (entry?.track_inventory === false || entry?.trackInventory === false) {
    return false;
  }
  return true;
};

const getAvailableStock = (entry) =>
  Math.max(
    toNumber(entry?.stock_quantity ?? entry?.stock, 0) -
      toNumber(entry?.reserved_quantity, 0),
    0,
  );

const getVariantFromProduct = (product, variantId) => {
  if (!product || !variantId) return null;
  const normalizedVariantId = normalizeId(variantId);
  if (!normalizedVariantId) return null;

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  return (
    variants.find(
      (variant) => normalizeId(variant?._id || variant?.id) === normalizedVariantId,
    ) || null
  );
};

const buildStockPayload = ({
  productAfter,
  variantAfter = null,
  variantId = null,
  source = "SYSTEM",
  eventVersion,
}) => {
  const productId = normalizeId(productAfter?._id || productAfter?.id);
  if (!productId) return null;
  const normalizedEventVersion = Number(eventVersion);
  const safeEventVersion = Number.isFinite(normalizedEventVersion)
    ? normalizedEventVersion
    : nextStockEventVersion();

  const payload = {
    product_id: productId,
    available_stock: getAvailableStock(productAfter),
    in_stock: getAvailableStock(productAfter) > 0,
    source,
    updated_at: new Date().toISOString(),
    event_version: safeEventVersion,
    event_id: `${productId}::${safeEventVersion}`,
  };

  const normalizedVariantId = normalizeId(variantId);
  if (normalizedVariantId) {
    payload.variant_id = normalizedVariantId;
    payload.variant_available_stock = getAvailableStock(variantAfter);
    payload.variant_in_stock = payload.variant_available_stock > 0;
    payload.event_id = `${productId}::${normalizedVariantId}::${safeEventVersion}`;
  }

  return payload;
};

export const emitStockUpdate = (payload) => {
  const io = getIO();
  if (!io || !payload?.product_id) return false;
  setLatestStockSyncVersion({
    productId: payload.product_id,
    eventVersion: payload.event_version,
  });
  if (payload?.variant_id) {
    setLatestStockSyncVersion({
      productId: payload.product_id,
      variantId: payload.variant_id,
      eventVersion: payload.event_version,
    });
  }
  io.to("audience:all").emit("stock_update", payload);
  return true;
};

export const emitStockUpdateIfChanged = ({
  productBefore,
  productAfter,
  variantId = null,
  source = "SYSTEM",
}) => {
  if (!productBefore || !productAfter) return 0;
  if (!isInventoryTracked(productBefore) && !isInventoryTracked(productAfter)) {
    return 0;
  }

  const normalizedVariantId = normalizeId(variantId);
  const productBeforeAvailable = getAvailableStock(productBefore);
  const productAfterAvailable = getAvailableStock(productAfter);

  if (!normalizedVariantId) {
    if (productBeforeAvailable === productAfterAvailable) {
      return 0;
    }

    return emitStockUpdate(
      buildStockPayload({
        productAfter,
        source,
      }),
    )
      ? 1
      : 0;
  }

  const variantBefore = getVariantFromProduct(productBefore, normalizedVariantId);
  const variantAfter = getVariantFromProduct(productAfter, normalizedVariantId);
  const variantBeforeAvailable = getAvailableStock(variantBefore);
  const variantAfterAvailable = getAvailableStock(variantAfter);

  if (
    productBeforeAvailable === productAfterAvailable &&
    variantBeforeAvailable === variantAfterAvailable
  ) {
    return 0;
  }

  return emitStockUpdate(
    buildStockPayload({
      productAfter,
      variantAfter,
      variantId: normalizedVariantId,
      source,
    }),
  )
    ? 1
    : 0;
};

export const emitStockUpdatesForProductSnapshotChange = ({
  productBefore,
  productAfter,
  source = "SYSTEM",
}) => {
  if (!productBefore || !productAfter) return 0;
  if (!isInventoryTracked(productBefore) && !isInventoryTracked(productAfter)) {
    return 0;
  }

  const beforeVariants = Array.isArray(productBefore?.variants)
    ? productBefore.variants
    : [];
  const afterVariants = Array.isArray(productAfter?.variants)
    ? productAfter.variants
    : [];
  const variantIds = new Set(
    [...beforeVariants, ...afterVariants]
      .map((variant) => normalizeId(variant?._id || variant?.id))
      .filter(Boolean),
  );

  let emittedCount = 0;
  let emittedVariantChange = false;

  for (const variantId of variantIds) {
    const emitted = emitStockUpdateIfChanged({
      productBefore,
      productAfter,
      variantId,
      source,
    });
    if (emitted > 0) {
      emittedCount += emitted;
      emittedVariantChange = true;
    }
  }

  if (emittedVariantChange) {
    return emittedCount;
  }

  return emitStockUpdateIfChanged({
    productBefore,
    productAfter,
    source,
  });
};

export const getLatestStockSyncVersion = ({
  productId,
  variantId = null,
} = {}) => {
  const normalizedProductId = normalizeId(productId);
  if (!normalizedProductId) return 0;

  const normalizedVariantId = normalizeId(variantId);
  if (normalizedVariantId) {
    return Number(
      variantStockVersionMap.get(
        toVersionKey(normalizedProductId, normalizedVariantId),
      ) || 0,
    );
  }

  return Number(productStockVersionMap.get(toVersionKey(normalizedProductId)) || 0);
};
