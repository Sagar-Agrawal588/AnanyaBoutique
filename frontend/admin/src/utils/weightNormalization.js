export const MIN_VARIANT_WEIGHT_GRAMS = 50;

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

export function normalizeWeight(input, unit = "") {
  const value = Number.parseFloat(String(input ?? "").trim());
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Invalid weight format");
  }
  return roundWeight(value);
}

export function validateWeightInGrams(weightInGrams) {
  const normalized = Number(weightInGrams);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error("Invalid weight");
  }
  if (normalized < MIN_VARIANT_WEIGHT_GRAMS) {
    throw new Error("Weight too small (possible typo like 5g instead of 500g)");
  }
  return roundWeight(normalized);
}

export function formatWeight(weight, unit = "g") {
  const normalizedUnit = normalizeUnit(unit);
  return `${formatNumber(normalizeWeight(weight, normalizedUnit))}${normalizedUnit}`;
}

export function normalizeVariantWeight(variant = {}) {
  const unit = normalizeUnit(variant.unit);
  const weight = normalizeWeight(variant.weight, unit);
  if (unit === "g") validateWeightInGrams(weight);
  return {
    weightInGrams: weight,
    label: formatWeight(weight, unit),
    weight,
    unit,
  };
}
