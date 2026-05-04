import ReviewModel from "../models/review.model.js";

const LEGACY_UNIQUE_KEYS = [
  JSON.stringify({ orderId: 1, productId: 1, userId: 1 }),
];

const TARGET_INDEX_NAME = "orderId_1_productId_1_variantId_1_userId_1";

export const ensureReviewVariantIndexes = async ({ log = console } = {}) => {
  const collection = ReviewModel.collection;
  const indexes = await collection.indexes();
  const dropped = [];

  for (const index of indexes) {
    const key = JSON.stringify(index.key || {});
    if (index.unique && LEGACY_UNIQUE_KEYS.includes(key)) {
      await collection.dropIndex(index.name);
      dropped.push(index.name);
    }
  }

  const targetExists = indexes.some(
    (index) =>
      index.name === TARGET_INDEX_NAME ||
      JSON.stringify(index.key || {}) ===
        JSON.stringify({ orderId: 1, productId: 1, variantId: 1, userId: 1 }),
  );

  let created = false;
  if (!targetExists || dropped.includes(TARGET_INDEX_NAME)) {
    await collection.createIndex(
      { orderId: 1, productId: 1, variantId: 1, userId: 1 },
      { unique: true, name: TARGET_INDEX_NAME },
    );
    created = true;
  }

  if (dropped.length || created) {
    log.info?.(
      `[startup] Review variant index check updated indexes (dropped: ${dropped.join(", ") || "none"}, created: ${created}).`,
    );
  }

  return { dropped, created };
};

