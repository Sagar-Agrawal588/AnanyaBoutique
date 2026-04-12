import dotenv from "dotenv";
import mongoose from "mongoose";
import ComboModel from "../models/combo.model.js";
import CartModel from "../models/cart.model.js";
import {
  buildComboOrderSnapshot,
  resolveComboUnitOriginalTotal,
  resolveEffectiveComboUnitPrice,
} from "../services/combos/combo.service.js";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "";

if (!mongoUri) {
  throw new Error("MONGODB_URI or MONGO_URI is required");
}

let conn;

try {
  conn = await mongoose.connect(mongoUri);

  const carts = await CartModel.find({ "items.itemType": "combo" });
  let updatedCarts = 0;
  let updatedLines = 0;

  for (const cart of carts) {
    let changed = false;

    for (const item of cart.items || []) {
      if (String(item?.itemType || "") !== "combo") continue;

      const comboId = String(item?.combo || "");
      if (!comboId) continue;

      const combo = await ComboModel.findById(comboId).lean();
      if (!combo) continue;

      const expectedPrice = resolveEffectiveComboUnitPrice(combo);
      const expectedOriginalPrice = resolveComboUnitOriginalTotal(combo);
      const expectedSnapshot = buildComboOrderSnapshot(
        combo,
        Math.max(Number(item?.quantity || 1), 1),
      );

      if (Number(item?.price || 0) !== Number(expectedPrice || 0)) {
        item.price = expectedPrice;
        changed = true;
      }

      if (
        Number(item?.originalPrice || 0) !== Number(expectedOriginalPrice || 0)
      ) {
        item.originalPrice = expectedOriginalPrice;
        changed = true;
      }

      const currentSnapshotPrice = Number(item?.comboSnapshot?.comboPrice || 0);
      const expectedSnapshotPrice = Number(expectedSnapshot?.comboPrice || 0);

      if (
        !item.comboSnapshot ||
        currentSnapshotPrice !== expectedSnapshotPrice
      ) {
        item.comboSnapshot = expectedSnapshot;
        changed = true;
      }

      if (changed) {
        updatedLines += 1;
      }
    }

    if (changed) {
      await cart.save();
      updatedCarts += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        updatedCarts,
        updatedLines,
      },
      null,
      2,
    ),
  );
} finally {
  if (conn) await mongoose.disconnect();
}
