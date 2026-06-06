import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import ComboModel from "../models/combo.model.js";
import ProductModel from "../models/product.model.js";

let mongoServer;

const loadRecommendationServiceFresh = async () =>
  import(
    `../services/combos/comboRecommendation.service.js?bust=${Date.now()}_${Math.random()}`
  );

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    dbName: "AnanyaBoutique-test",
  });
});

test.after(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

test.afterEach(async () => {
  await ComboModel.deleteMany({});
  await ProductModel.deleteMany({});
});

test("cart upsell keeps 500g and 1kg variant-name combos distinct", async () => {
  const categoryId = new mongoose.Types.ObjectId();
  const productA = await ProductModel.create({
    name: "Dark Chocolate Smooth Boutique Style",
    slug: `dark-chocolate-smooth-${Date.now()}`,
    category: categoryId,
    price: 449,
    originalPrice: 549,
    hasVariants: true,
    variants: [
      {
        _id: new mongoose.Types.ObjectId(),
        name: "500g",
        sku: "DCS-500G",
        price: 449,
        originalPrice: 549,
        stock_quantity: 20,
        reserved_quantity: 0,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: "1 kg",
        sku: "DCS-1KG",
        price: 799,
        originalPrice: 899,
        stock_quantity: 20,
        reserved_quantity: 0,
      },
    ],
    stock_quantity: 40,
    stock: 40,
    reserved_quantity: 0,
  });

  const productB = await ProductModel.create({
    name: "Classic Signature Boutique Style",
    slug: `classic-crunchy-${Date.now()}`,
    category: categoryId,
    price: 349,
    originalPrice: 399,
    stock_quantity: 20,
    stock: 20,
    reserved_quantity: 0,
  });

  await ComboModel.create({
    name: "1kg Style Combo",
    slug: `combo-1kg-${Date.now()}`,
    isActive: true,
    isVisible: true,
    status: "active",
    stockMode: "auto",
    items: [
      {
        productId: productA._id,
        productTitle: productA.name,
        variantName: "1 kg",
        quantity: 1,
        quantityRequired: 1,
        price: 799,
        originalPrice: 899,
        image: "",
        categoryId,
      },
      {
        productId: productB._id,
        productTitle: productB.name,
        quantity: 1,
        quantityRequired: 1,
        price: 349,
        originalPrice: 399,
        image: "",
        categoryId,
      },
    ],
    pricing: { type: "fixed_price", value: 999 },
    comboPrice: 999,
    originalTotal: 1298,
    totalSavings: 299,
  });

  const { getCartUpsellCombos } = await loadRecommendationServiceFresh();
  const suggestions = await getCartUpsellCombos(
    [
      {
        productId: productA._id.toString(),
        variantName: "500g",
      },
      {
        productId: productB._id.toString(),
      },
    ],
    { limit: 3 },
  );

  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0]?.missingCount, 1);
  assert.deepEqual(suggestions[0]?.missingProductIds, [productA._id.toString()]);
});

test("cart upsell normalizes variant names like 1kg and 1 kg as the same match", async () => {
  const categoryId = new mongoose.Types.ObjectId();
  const [productA, productB] = await ProductModel.create([
    {
      name: "Dark Chocolate Smooth Boutique Style",
      slug: `dark-chocolate-smooth-match-${Date.now()}`,
      category: categoryId,
      price: 449,
      originalPrice: 549,
      stock_quantity: 20,
      stock: 20,
      reserved_quantity: 0,
    },
    {
      name: "Classic Signature Boutique Style",
      slug: `classic-crunchy-match-${Date.now()}`,
      category: categoryId,
      price: 349,
      originalPrice: 399,
      stock_quantity: 20,
      stock: 20,
      reserved_quantity: 0,
    },
  ]);

  await ComboModel.create({
    name: "1kg Match Combo",
    slug: `combo-1kg-match-${Date.now()}`,
    isActive: true,
    isVisible: true,
    status: "active",
    stockMode: "auto",
    items: [
      {
        productId: productA._id,
        productTitle: productA.name,
        variantName: "1 kg",
        quantity: 1,
        quantityRequired: 1,
        price: 799,
        originalPrice: 899,
        image: "",
        categoryId,
      },
      {
        productId: productB._id,
        productTitle: productB.name,
        quantity: 1,
        quantityRequired: 1,
        price: 349,
        originalPrice: 399,
        image: "",
        categoryId,
      },
    ],
    pricing: { type: "fixed_price", value: 999 },
    comboPrice: 999,
    originalTotal: 1298,
    totalSavings: 299,
  });

  const { getCartUpsellCombos } = await loadRecommendationServiceFresh();
  const suggestions = await getCartUpsellCombos(
    [
      {
        productId: productA._id.toString(),
        variantName: "1kg",
      },
      {
        productId: productB._id.toString(),
      },
    ],
    { limit: 3 },
  );

  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0]?.missingCount, 0);
  assert.deepEqual(suggestions[0]?.missingProductIds, []);
});
