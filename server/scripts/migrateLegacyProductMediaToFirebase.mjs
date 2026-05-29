import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import {
  DEFAULT_BANNER_IMAGE_PATHS,
  DEFAULT_PRODUCT_IMAGE_PATH,
} from "../config/mediaDefaults.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const FIREBASE_MEDIA_MAP = new Map([
  [
    "/product_placeholder.png",
    DEFAULT_PRODUCT_IMAGE_PATH,
  ],
  [
    "/product_1.png",
    DEFAULT_PRODUCT_IMAGE_PATH,
  ],
  [
    "/product_1.webp",
    DEFAULT_PRODUCT_IMAGE_PATH,
  ],
  [
    "/prodImage1.webp",
    DEFAULT_BANNER_IMAGE_PATHS[0],
  ],
  [
    "/prodImage2.webp",
    DEFAULT_BANNER_IMAGE_PATHS[1],
  ],
  [
    "/prodImage3.webp",
    DEFAULT_BANNER_IMAGE_PATHS[2],
  ],
]);

for (const [key, value] of Array.from(FIREBASE_MEDIA_MAP.entries())) {
  FIREBASE_MEDIA_MAP.set(key.replace(/^\//, ""), value);
}

const applyChanges = process.argv.includes("--apply");

const extractFirebaseMediaObjectPath = (value = "") => {
  const normalized = String(value || "").trim();
  if (!/^https?:\/\//i.test(normalized)) return "";

  try {
    const parsed = new URL(normalized);
    const pathname = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));

    if (parsed.hostname === "firebasestorage.googleapis.com") {
      const match = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/i);
      if (!match) return "";
      const objectPath = decodeURIComponent(match[2]);
      return /^buyonegram\//i.test(objectPath) ? objectPath : "";
    }

    if (parsed.hostname === "storage.googleapis.com") {
      const [, ...objectParts] = pathname.split("/");
      const objectPath = objectParts.join("/");
      return /^buyonegram\//i.test(objectPath) ? objectPath : "";
    }
  } catch {
    return "";
  }

  return "";
};

const resolveMediaValue = (value) => {
  const normalized = String(value || "").trim();
  return (
    FIREBASE_MEDIA_MAP.get(normalized) ||
    extractFirebaseMediaObjectPath(normalized) ||
    normalized
  );
};

const migrateString = (value) => {
  const nextValue = resolveMediaValue(value);
  return {
    changed: String(value || "").trim() !== nextValue,
    value: nextValue,
  };
};

const migrateArray = (value) => {
  if (!Array.isArray(value)) return { changed: false, value };
  let changed = false;
  const nextValue = value.map((entry) => {
    const migrated = migrateString(entry);
    if (migrated.changed) changed = true;
    return migrated.value;
  });
  return { changed, value: nextValue };
};

const migrateItems = (items) => {
  if (!Array.isArray(items)) return { changed: false, value: items };
  let changed = false;
  const nextItems = items.map((item) => {
    const migrated = migrateString(item?.image);
    if (!migrated.changed) return item;
    changed = true;
    return { ...item, image: migrated.value };
  });
  return { changed, value: nextItems };
};

const migrateVariants = (variants) => {
  if (!Array.isArray(variants)) return { changed: false, value: variants };
  let changed = false;
  const nextVariants = variants.map((variant) => {
    const migrated = migrateString(variant?.image);
    if (!migrated.changed) return variant;
    changed = true;
    return { ...variant, image: migrated.value };
  });
  return { changed, value: nextVariants };
};

const migrateDocument = (document, fields) => {
  const $set = {};

  for (const field of fields.arrayFields || []) {
    const migrated = migrateArray(document[field]);
    if (migrated.changed) $set[field] = migrated.value;
  }

  for (const field of fields.stringFields || []) {
    const migrated = migrateString(document[field]);
    if (migrated.changed) $set[field] = migrated.value;
  }

  if (fields.itemsField) {
    const migrated = migrateItems(document[fields.itemsField]);
    if (migrated.changed) $set[fields.itemsField] = migrated.value;
  }

  if (fields.variantsField) {
    const migrated = migrateVariants(document[fields.variantsField]);
    if (migrated.changed) $set[fields.variantsField] = migrated.value;
  }

  return $set;
};

const run = async () => {
  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL;

  if (!mongoUri) {
    throw new Error("Missing MongoDB URI in server/.env");
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });

  const collections = [
    {
      name: "products",
      fields: {
        arrayFields: ["images"],
        stringFields: ["thumbnail"],
        variantsField: "variants",
      },
    },
    {
      name: "combos",
      fields: {
        arrayFields: ["images", "comboImages"],
        stringFields: ["image", "thumbnail", "comboThumbnail"],
        itemsField: "items",
      },
    },
  ];

  const summary = [];

  for (const config of collections) {
    const collection = mongoose.connection.db.collection(config.name);
    const documents = await collection.find({}).toArray();
    let changedCount = 0;
    let fieldChangeCount = 0;

    for (const document of documents) {
      const $set = migrateDocument(document, config.fields);
      const changedFields = Object.keys($set);
      if (!changedFields.length) continue;

      changedCount += 1;
      fieldChangeCount += changedFields.length;

      if (applyChanges) {
        await collection.updateOne(
          { _id: document._id },
          {
            $set: {
              ...$set,
              legacyMediaMigratedAt: new Date(),
            },
          },
        );
      }
    }

    summary.push({
      collection: config.name,
      changedDocuments: changedCount,
      changedFields: fieldChangeCount,
    });
  }

  console.log(
    JSON.stringify(
      {
        mode: applyChanges ? "apply" : "dry-run",
        summary,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error?.message || error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
