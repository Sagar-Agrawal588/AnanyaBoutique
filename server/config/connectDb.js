import dotenv from "dotenv";
import mongoose from "mongoose";
import { ensureOrderIdentityIndexes } from "../utils/orderIdentityIndexes.js";
import { ensureReviewVariantIndexes } from "../utils/reviewVariantIndexes.js";

const isCloudRunRuntime = Boolean(
  process.env.K_SERVICE || process.env.K_REVISION || process.env.K_CONFIGURATION,
);
const shouldLoadLocalDotEnv =
  process.env.NODE_ENV !== "production" && !isCloudRunRuntime;

if (shouldLoadLocalDotEnv) {
  dotenv.config();
}

const normalizeEnvValue = (value) => {
  let normalized = String(value || "").trim();

  const hasWrappedDoubleQuotes =
    normalized.startsWith('"') && normalized.endsWith('"');
  const hasWrappedSingleQuotes =
    normalized.startsWith("'") && normalized.endsWith("'");

  if (hasWrappedDoubleQuotes || hasWrappedSingleQuotes) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized;
};

const isValidMongoUri = (value) => /^mongodb(\+srv)?:\/\//.test(value);

const resolveMongoUri = () => {
  const primaryMongoUri = normalizeEnvValue(process.env.MONGO_URI);
  const fallbackMongoUri = normalizeEnvValue(process.env.MONGODB_URI);

  if (primaryMongoUri && isValidMongoUri(primaryMongoUri)) {
    return primaryMongoUri;
  }

  if (fallbackMongoUri && isValidMongoUri(fallbackMongoUri)) {
    return fallbackMongoUri;
  }

  if (!primaryMongoUri && !fallbackMongoUri) {
    console.error(
      "[startup] Database URI is missing. Required setting: MONGO_URI. MONGODB_URI is accepted as a fallback.",
    );
    throw new Error(
      "Database URI is missing. Set MONGO_URI or MONGODB_URI in environment variables.",
    );
  }

  console.error(
    "[startup] Database URI is invalid. It must start with mongodb:// or mongodb+srv://.",
  );
  throw new Error(
    "Invalid MongoDB URI format. Set MONGO_URI or MONGODB_URI to a value that starts with mongodb:// or mongodb+srv://",
  );
};

async function connectDb() {
  const mongoUri = resolveMongoUri();

  // Keep a normalized key available for the rest of the app.
  process.env.MONGO_URI = mongoUri;

  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Best-effort startup guard against legacy/non-sparse identity indexes
    // that can break checkout with duplicate-key conflicts.
    try {
      const indexResults = await ensureOrderIdentityIndexes({ log: console });
      const summary = indexResults
        .map((entry) => {
          const changed =
            Number(entry.cleaned || 0) +
            Number(entry.dropped?.length || 0) +
            (entry.created ? 1 : 0);
          return `${entry.field}:${changed > 0 ? "updated" : "ok"}`;
        })
        .join(", ");
      console.log(
        `[startup] Order identity index check complete (${summary}).`,
      );
    } catch (indexError) {
      console.warn(
        "[startup] Order identity index check failed:",
        indexError?.message || indexError,
      );
    }

    try {
      await ensureReviewVariantIndexes({ log: console });
      console.log("[startup] Review variant index check complete.");
    } catch (indexError) {
      console.warn(
        "[startup] Review variant index check failed:",
        indexError?.message || indexError,
      );
    }
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

export default connectDb;
