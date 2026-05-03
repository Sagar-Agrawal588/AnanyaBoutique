import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/connectDb.js";
import ProductModel from "../models/product.model.js";
import { normalizeProductPageConfig } from "../utils/productPageConfig.js";

const main = async () => {
  await connectDB();

  const products = await ProductModel.find({
    productPage: { $exists: true, $ne: {} },
  }).select("_id productPage");

  let updated = 0;

  for (const product of products) {
    const normalizedProductPage = normalizeProductPageConfig(
      product.productPage || {},
    );
    const before = JSON.stringify(product.productPage || {});
    const after = JSON.stringify(normalizedProductPage);

    if (before !== after) {
      product.productPage = normalizedProductPage;
      await product.save();
      updated += 1;
    }
  }

  console.log(
    `Product page cleanup complete. Updated ${updated} of ${products.length} products.`,
  );
};

main()
  .catch((error) => {
    console.error("Product page cleanup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
