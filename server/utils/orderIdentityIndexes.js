import mongoose from "mongoose";
import OrderModel from "../models/order.model.js";

const IDENTITY_INDEX_FIELDS = ["temp_id", "final_id"];

const isSingleFieldAscendingIndex = (index = {}, field = "") => {
  const key = index?.key && typeof index.key === "object" ? index.key : {};
  return key[field] === 1 && Object.keys(key).length === 1;
};

const isDesiredIdentityIndex = (index = {}, field = "") => {
  if (!isSingleFieldAscendingIndex(index, field)) return false;
  return index.unique === true && index.sparse === true;
};

const dropIndexIfPresent = async (collection, indexName) => {
  try {
    await collection.dropIndex(indexName);
    return true;
  } catch (error) {
    const message = String(error?.message || "");
    const isMissingIndex =
      error?.codeName === "IndexNotFound" || /index not found/i.test(message);
    if (isMissingIndex) return false;
    throw error;
  }
};

const cleanupNullLikeIdentityValues = async (collection, field) => {
  const unsetUpdate = { $unset: { [field]: "" } };

  const [nullResult, emptyResult] = await Promise.all([
    collection.updateMany({ [field]: null }, unsetUpdate),
    collection.updateMany({ [field]: "" }, unsetUpdate),
  ]);

  return (
    Number(nullResult?.modifiedCount || 0) +
    Number(emptyResult?.modifiedCount || 0)
  );
};

const ensureSparseUniqueIdentityIndex = async (collection, field, log) => {
  const result = {
    field,
    cleaned: 0,
    dropped: [],
    created: false,
  };

  result.cleaned = await cleanupNullLikeIdentityValues(collection, field);

  let indexes = await collection.indexes();
  const conflictingIndexes = indexes.filter(
    (index) =>
      isSingleFieldAscendingIndex(index, field) &&
      !isDesiredIdentityIndex(index, field),
  );

  for (const index of conflictingIndexes) {
    const dropped = await dropIndexIfPresent(collection, index.name);
    if (dropped) {
      result.dropped.push(index.name);
      log?.warn?.(
        `[index-repair] Dropped conflicting index ${index.name} for ${field}.`,
      );
    }
  }

  indexes = await collection.indexes();
  const hasDesiredIndex = indexes.some((index) =>
    isDesiredIdentityIndex(index, field),
  );

  if (!hasDesiredIndex) {
    await collection.createIndex(
      { [field]: 1 },
      {
        name: `${field}_1`,
        unique: true,
        sparse: true,
        background: true,
      },
    );
    result.created = true;
    log?.info?.(`[index-repair] Created sparse unique index ${field}_1.`);
  }

  return result;
};

export const ensureOrderIdentityIndexes = async ({ log = console } = {}) => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB connection is not ready");
  }

  const collection = OrderModel.collection;
  if (!collection) {
    throw new Error("Order collection is not initialized");
  }

  const results = [];
  for (const field of IDENTITY_INDEX_FIELDS) {
    const result = await ensureSparseUniqueIdentityIndex(
      collection,
      field,
      log,
    );
    results.push(result);
  }

  return results;
};

export default ensureOrderIdentityIndexes;
