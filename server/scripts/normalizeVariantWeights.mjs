import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ProductModel from "../models/product.model.js";
import {
  formatWeight,
  normalizeWeight,
  validateWeightInGrams,
} from "../utils/weightNormalization.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("MONGO_URI is required");
}

const resolveWeightFromVariant = (variant = {}) => {
  const rangeTokens = Array.from(
    String(variant.label || variant.name || "")
      .toLowerCase()
      .matchAll(/\d+(?:\.\d+)?\s*(?:kg|g)\b/g),
  ).map((match) => match[0]);
  if (rangeTokens.length > 1) {
    const weights = rangeTokens
      .map((token) => {
        try {
          return validateWeightInGrams(normalizeWeight(token));
        } catch {
          return 0;
        }
      })
      .filter((weight) => weight > 0);
    if (weights.length > 0) return Math.max(...weights);
  }

  const candidates = [
    { value: variant.weightInGrams, unit: "g" },
    { value: variant.label, unit: "" },
    { value: variant.name, unit: "" },
    { value: variant.weight, unit: variant.unit || "g" },
  ];

  let lastError = null;
  for (const candidate of candidates) {
    if (
      candidate.value === undefined ||
      candidate.value === null ||
      candidate.value === ""
    ) {
      continue;
    }
    try {
      return validateWeightInGrams(
        normalizeWeight(candidate.value, candidate.unit),
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Invalid weight format");
};

const stripRange = (value) =>
  String(value || "")
    .replace(
      /\b\d+(?:\.\d+)?\s*(?:kg|g)\s*[-–]\s*\d+(?:\.\d+)?\s*(?:kg|g)\b/gi,
      "",
    )
    .replace(/\s*-\s*$/g, "")
    .trim();

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const products = await ProductModel.find({
    variants: { $exists: true, $ne: [] },
  });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    let changed = false;

    for (const variant of product.variants) {
      try {
        const weightInGrams = resolveWeightFromVariant(variant);
        const label = formatWeight(weightInGrams);
        const cleanedName = stripRange(variant.name) || label;

        if (Number(variant.weightInGrams || 0) !== weightInGrams) {
          variant.weightInGrams = weightInGrams;
          changed = true;
        }
        if (String(variant.label || "") !== label) {
          variant.label = label;
          changed = true;
        }
        if (Number(variant.weight || 0) !== weightInGrams) {
          variant.weight = weightInGrams;
          changed = true;
        }
        if (String(variant.unit || "") !== "g") {
          variant.unit = "g";
          changed = true;
        }
        if (String(variant.name || "") !== cleanedName) {
          variant.name = cleanedName;
          changed = true;
        }
      } catch (error) {
        failed += 1;
        console.error(
          `FAILED ${product._id} "${product.name}" variant "${variant.name}": ${error.message}`,
        );
      }
    }

    if (changed) {
      const defaultVariant =
        product.variants.find((variant) => variant.isDefault) ||
        product.variants[0];
      if (defaultVariant?.weightInGrams) {
        product.weight = defaultVariant.weightInGrams;
        product.unit = "g";
      }
      await product.save();
      updated += 1;
    } else {
      skipped += 1;
    }
  }

  console.log("Variant weight normalization complete");
  console.log({ updated, skipped, failed, total: products.length });

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Variant weight normalization failed:", error);
  await mongoose.disconnect().catch(() => null);
  process.exit(1);
});
