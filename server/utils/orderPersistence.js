const isDuplicateKeyError = (error) => Number(error?.code || 0) === 11000;

export const isDuplicateKeyForField = (error, fieldName) => {
  if (!isDuplicateKeyError(error)) {
    return false;
  }

  const normalizedField = String(fieldName || "").trim();
  if (!normalizedField) {
    return false;
  }

  const keyPattern = error?.keyPattern;
  if (
    keyPattern &&
    Object.prototype.hasOwnProperty.call(keyPattern, normalizedField)
  ) {
    return true;
  }

  const keyValue = error?.keyValue;
  if (
    keyValue &&
    Object.prototype.hasOwnProperty.call(keyValue, normalizedField)
  ) {
    return true;
  }

  const message = String(error?.message || "");
  return (
    message.includes(`index: ${normalizedField}_1`) ||
    message.includes(`{ ${normalizedField}:`) ||
    message.includes(`.${normalizedField}_1 dup key`)
  );
};

export const saveDocumentWithTempIdRetry = async (
  document,
  { maxAttempts = 4, onDuplicateKey } = {},
) => {
  if (!document || typeof document.save !== "function") {
    throw new TypeError("A Mongoose document with save() is required");
  }

  const totalAttempts =
    Number.isInteger(maxAttempts) && maxAttempts > 0 ? maxAttempts : 4;

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    try {
      return await document.save();
    } catch (error) {
      const isDuplicateKey = isDuplicateKeyError(error);
      const duplicateFields = [
        "temp_id",
        "final_id",
        "orderNumber",
        "displayOrderId",
      ].filter((fieldName) => isDuplicateKeyForField(error, fieldName));
      // Some Mongo versions omit keyPattern/keyValue for dup-key errors.
      // Treat any duplicate-key as retriable and regenerate derived IDs.
      const hasRetriableIdentityConflict =
        duplicateFields.length > 0 || isDuplicateKey;
      const shouldRetry =
        hasRetriableIdentityConflict && attempt < totalAttempts;

      if (!shouldRetry) {
        throw error;
      }

      if (typeof onDuplicateKey === "function") {
        await onDuplicateKey({
          attempt,
          maxAttempts: totalAttempts,
          error,
          document,
          duplicateFields,
        });
      }

      // Regenerate all derived identifiers from a fresh temp_id candidate.
      document.temp_id = undefined;
      document.orderNumber = undefined;
      document.displayOrderId = undefined;
      document.final_id = undefined;
    }
  }

  return document;
};
