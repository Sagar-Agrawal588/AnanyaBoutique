import dotenv from "dotenv";
import mongoose from "mongoose";
import ComboModel from "../models/combo.model.js";
import CartModel from "../models/cart.model.js";
import {
  normalizeComboPricingFields,
  resolveEffectiveComboUnitPrice,
  resolveComboUnitOriginalTotal,
} from "../services/combos/combo.service.js";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "";

if (!mongoUri) {
  throw new Error("MONGODB_URI or MONGO_URI is required");
}

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const formatCombo = (combo) => {
  const normalized = normalizeComboPricingFields(combo);
  return {
    id: String(combo?._id || ""),
    name: combo?.name || "",
    slug: combo?.slug || "",
    storedPrice: round2(combo?.price),
    storedComboPrice: round2(combo?.comboPrice),
    pricingType: String(combo?.pricing?.type || ""),
    pricingValue: round2(combo?.pricing?.value),
    resolvedPrice: round2(resolveEffectiveComboUnitPrice(combo)),
    originalPrice: round2(combo?.originalPrice),
    originalTotal: round2(combo?.originalTotal),
    resolvedOriginalTotal: round2(resolveComboUnitOriginalTotal(combo)),
    normalizedPrice: round2(normalized?.price),
    normalizedComboPrice: round2(normalized?.comboPrice),
    itemCount: Array.isArray(combo?.items) ? combo.items.length : 0,
  };
};

const comboQuery = process.argv.slice(2).join(" ").trim();

let conn;

try {
  conn = await mongoose.connect(mongoUri);

  const comboFilter = comboQuery
    ? {
        $or: [
          { name: { $regex: comboQuery, $options: "i" } },
          { slug: { $regex: comboQuery, $options: "i" } },
        ],
      }
    : {
        $or: [
          { price: { $ne: 0 }, comboPrice: { $ne: 0 }, $expr: { $ne: ["$price", "$comboPrice"] } },
          { "pricing.value": { $exists: true }, price: { $exists: true } },
        ],
      };

  const combos = await ComboModel.find(comboFilter).limit(comboQuery ? 20 : 100).lean();

  const comboIds = combos.map((combo) => combo._id);
  const carts = comboIds.length
    ? await CartModel.find({
        "items.combo": { $in: comboIds },
      }).lean()
    : [];

  const cartFindings = [];
  for (const cart of carts) {
    for (const item of cart.items || []) {
      const comboId = String(item?.combo || "");
      if (!comboId) continue;
      const combo = combos.find((entry) => String(entry?._id) === comboId);
      if (!combo) continue;

      const snapshotPrice = round2(item?.comboSnapshot?.comboPrice);
      const linePrice = round2(item?.price);
      const liveResolvedPrice = round2(resolveEffectiveComboUnitPrice(combo));

      if (
        snapshotPrice !== liveResolvedPrice ||
        linePrice !== liveResolvedPrice ||
        snapshotPrice !== linePrice
      ) {
        cartFindings.push({
          cartId: String(cart?._id || ""),
          user: String(cart?.user || ""),
          sessionId: String(cart?.sessionId || ""),
          comboId,
          comboName: combo?.name || "",
          cartLinePrice: linePrice,
          snapshotPrice,
          liveResolvedPrice,
          quantity: Number(item?.quantity || 0),
        });
      }
    }
  }

  console.log(JSON.stringify({
    comboQuery: comboQuery || null,
    combos: combos.map(formatCombo),
    cartFindings,
  }, null, 2));
} finally {
  if (conn) await mongoose.disconnect();
}
