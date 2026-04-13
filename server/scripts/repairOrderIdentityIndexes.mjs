import mongoose from "mongoose";
import connectDb from "../config/connectDb.js";
import { ensureOrderIdentityIndexes } from "../utils/orderIdentityIndexes.js";

const printResult = (entry = {}) => {
  const field = String(entry.field || "unknown");
  const cleaned = Number(entry.cleaned || 0);
  const droppedCount = Array.isArray(entry.dropped) ? entry.dropped.length : 0;
  const created = entry.created === true;

  console.log(
    `[repair] ${field}: cleaned=${cleaned}, dropped=${droppedCount}, created=${created}`,
  );
  if (droppedCount > 0) {
    console.log(
      `[repair] ${field} dropped indexes: ${entry.dropped.join(", ")}`,
    );
  }
};

const main = async () => {
  await connectDb();
  const results = await ensureOrderIdentityIndexes({ log: console });
  console.log("[repair] Order identity index repair completed.");
  results.forEach(printResult);
};

main()
  .catch((error) => {
    console.error("[repair] Failed to repair order identity indexes:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect errors in shutdown path.
    }
  });
