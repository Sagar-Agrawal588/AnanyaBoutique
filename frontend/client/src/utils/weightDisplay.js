const roundWeight = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const formatNumber = (value) => {
  const normalized = roundWeight(value);
  return Number.isInteger(normalized)
    ? String(normalized)
    : String(normalized).replace(/\.?0+$/, "");
};

const normalizeUnit = (unit) =>
  String(unit || "g").trim().toLowerCase() === "kg" ? "kg" : "g";

export const getWeightInGrams = (value = {}) => {
  const weight = Number(value?.weight);
  return Number.isFinite(weight) && weight > 0 ? weight : 0;
};

export const formatWeight = (weight, unit = "g") => {
  const normalizedWeight = Number(weight);
  if (!Number.isFinite(normalizedWeight) || normalizedWeight <= 0) return "";
  return `${formatNumber(normalizedWeight)}${normalizeUnit(unit)}`;
};

const weightRangePattern =
  /\b\d+(?:\.\d+)?\s*(?:kg|g)\s*[-\u2013]\s*\d+(?:\.\d+)?\s*(?:kg|g)\b/gi;

export const replaceWeightRange = (value, replacement = "") =>
  String(value || "")
    .replace(weightRangePattern, replacement)
    .replace(/\s*-\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

export const stripWeightRange = (value) => replaceWeightRange(value, "");

export const getVariantWeightLabel = (variant = {}) => {
  const weight = Number(variant?.weight);
  const unit = normalizeUnit(variant?.unit);
  if (Number.isFinite(weight) && weight > 0) return formatWeight(weight, unit);
  return String(variant?.label || "").trim();
};
