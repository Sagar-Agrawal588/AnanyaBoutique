import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import connectDb from "../config/connectDb.js";
import { seedBoutiqueDemoCatalog } from "../controllers/product.controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const countArg = Number(process.argv[2] || 100);
const count = Math.min(Math.max(Number.isFinite(countArg) ? countArg : 100, 1), 100);

try {
  await connectDb();
  const result = await seedBoutiqueDemoCatalog({ count });
  console.log(
    JSON.stringify(
      {
        success: true,
        message: "Boutique demo catalog seeded",
        requested: count,
        ...result,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        success: false,
        message: error?.message || "Failed to seed boutique demo catalog",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  await mongoose.connection.close().catch(() => {});
}
