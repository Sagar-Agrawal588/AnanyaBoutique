import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getFirestore, initializeFirebaseAdmin } from "../config/firebaseAdmin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const redactUrl = (value = "") => String(value || "").replace(/token=[^&]+/g, "token=REDACTED");

const run = async () => {
  const app = initializeFirebaseAdmin();
  if (!app) {
    throw new Error("Firebase Admin SDK is not configured");
  }

  const db = getFirestore();
  const collections = await db.listCollections();
  const result = {
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    collectionCount: collections.length,
    collections: [],
  };

  for (const collection of collections) {
    const snapshot = await collection.limit(3).get();
    result.collections.push({
      id: collection.id,
      sampleCount: snapshot.size,
      samples: snapshot.docs.map((doc) => {
        const data = doc.data() || {};
        return {
          id: doc.id,
          keys: Object.keys(data).slice(0, 30),
          name: data.name || data.title || data.productName || "",
          image:
            redactUrl(
              data.image ||
                data.thumbnail ||
                data.comboThumbnail ||
                (Array.isArray(data.images) ? data.images[0] : "") ||
                (Array.isArray(data.comboImages) ? data.comboImages[0] : ""),
            ) || "",
        };
      }),
    });
  }

  console.log(JSON.stringify(result, null, 2));
};

run().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
