import dotenv from "dotenv";
import mongoose from "mongoose";
import ComboModel from "../models/combo.model.js";
import CartModel from "../models/cart.model.js";
import {
  buildComboOrderSnapshot,
  normalizeComboPricingFields,
  resolveComboUnitOriginalTotal,
  resolveEffectiveComboUnitPrice,
} from "../services/combos/combo.service.js";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "";
if (!mongoUri) {
  throw new Error("MONGODB_URI or MONGO_URI is required");
}

const args = new Set(process.argv.slice(2));
const shouldWrite = args.has("--write");
const shouldRepairCarts = !args.has("--skip-carts");

const round2 = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const buildComboUpdate = (combo) => {
  const normalized = normalizeComboPricingFields(combo);
  const update = {};

  [
    "comboPrice",
    "price",
    "originalPrice",
    "originalTotal",
    "totalSavings",
    "discountPercentage",
  ].forEach((field) => {
    const nextValue = round2(normalized?.[field] ?? 0);
    const currentValue = round2(combo?.[field] ?? 0);
    if (currentValue !== nextValue) {
      update[field] = nextValue;
    }
  });

  const pricingType = String(combo?.pricing?.type || "")
    .trim()
    .toLowerCase();
  const pricingValue = round2(combo?.pricing?.value ?? 0);
  if (
    pricingType === "fixed_price" &&
    pricingValue !== round2(normalized?.comboPrice ?? 0)
  ) {
    update["pricing.value"] = round2(normalized?.comboPrice ?? 0);
  }

  return update;
};

let conn;

try {
  conn = await mongoose.connect(mongoUri);

  const combos = await ComboModel.find({});
  let scannedCombos = 0;
  let updatedCombos = 0;

  for (const combo of combos) {
    scannedCombos += 1;
    const update = buildComboUpdate(combo.toObject());
    if (Object.keys(update).length === 0) continue;

    updatedCombos += 1;
    if (shouldWrite) {
      await ComboModel.updateOne({ _id: combo._id }, { $set: update });
    }
  }

  let scannedCarts = 0;
  let updatedCarts = 0;
  let updatedCartLines = 0;

  if (shouldRepairCarts) {
    const combosById = new Map(
      (
        await ComboModel.find({}).lean()
      ).map((combo) => [String(combo._id), combo]),
    );
    const carts = await CartModel.find({ "items.itemType": "combo" });

    for (const cart of carts) {
      scannedCarts += 1;
      let changed = false;

      for (const item of cart.items || []) {
        if (String(item?.itemType || "") !== "combo") continue;

        const comboId = String(item?.combo || "");
        const combo = combosById.get(comboId);
        if (!combo) continue;

        const quantity = Math.max(Number(item?.quantity || 1), 1);
        const expectedPrice = resolveEffectiveComboUnitPrice(combo);
        const expectedOriginalPrice = resolveComboUnitOriginalTotal(combo);
        const expectedSnapshot = buildComboOrderSnapshot(combo, quantity);
        let lineChanged = false;

        if (round2(item?.price) !== round2(expectedPrice)) {
          item.price = round2(expectedPrice);
          changed = true;
          lineChanged = true;
        }

        if (round2(item?.originalPrice) !== round2(expectedOriginalPrice)) {
          item.originalPrice = round2(expectedOriginalPrice);
          changed = true;
          lineChanged = true;
        }

        const currentSnapshot = JSON.stringify(item?.comboSnapshot || {});
        const nextSnapshot = JSON.stringify(expectedSnapshot || {});
        if (currentSnapshot !== nextSnapshot) {
          item.comboSnapshot = expectedSnapshot;
          changed = true;
          lineChanged = true;
        }

        if (lineChanged) {
          updatedCartLines += 1;
        }
      }

      if (!changed) continue;
      updatedCarts += 1;
      if (shouldWrite) {
        await cart.save();
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: shouldWrite ? "write" : "dry-run",
        repairCarts: shouldRepairCarts,
        combos: {
          scanned: scannedCombos,
          updated: updatedCombos,
        },
        carts: {
          scanned: scannedCarts,
          updated: updatedCarts,
          updatedLines: updatedCartLines,
        },
      },
      null,
      2,
    ),
  );
} finally {
  if (conn) {
    await mongoose.disconnect();
  }
}
