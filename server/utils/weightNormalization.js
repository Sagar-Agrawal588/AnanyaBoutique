export const MIN_VARIANT_WEIGHT_GRAMS = 50;

const trimUnit = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const roundWeight = (value) => {
  const rounded = Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  return Number.isInteger(rounded) ? rounded : rounded;
};

const formatNumber = (value) => {
  const normalized = roundWeight(value);
  return Number.isInteger(normalized)
    ? String(normalized)
    : String(normalized).replace(/\.?0+$/, "");
};

export function normalizeWeight(input, unit = "") {
  const normalizedUnit = trimUnit(unit);
  const raw = String(input ?? "").trim().toLowerCase();
  const value = Number.parseFloat(raw);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Invalid weight format");
  }

  if (raw.includes("kg") || normalizedUnit === "kg") {
    return roundWeight(value);
  }

  if (raw.includes("g") || normalizedUnit === "g" || !normalizedUnit) {
    return roundWeight(value);
  }

  throw new Error("Invalid weight format");
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
  const normalizedWeight = normalizeWeight(weight, unit);
  const normalizedUnit = trimUnit(unit) === "kg" ? "kg" : "g";
  return `${formatNumber(normalizedWeight)}${normalizedUnit}`;
}

export function normalizeVariantWeight(variant = {}) {
  const unit = trimUnit(variant.unit || "g") === "kg" ? "kg" : "g";
  const weight = normalizeWeight(variant.weight, unit);
  if (unit === "g") {
    validateWeightInGrams(weight);
  }
  return {
    weightInGrams: weight,
    label: formatWeight(weight, unit),
    weight,
    unit,
  };
}

export function buildVariantWeightRangeLabel(variants = []) {
  const first = Array.isArray(variants) ? variants[0] : null;
  if (!first) return "";
  try {
    return normalizeVariantWeight(first).label;
  } catch {
    return "";
  }
}
