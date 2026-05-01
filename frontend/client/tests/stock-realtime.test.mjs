import assert from "node:assert/strict";
import test from "node:test";
import {
  applyStockUpdateToProduct,
  applyStockUpdateToProductCollection,
} from "../src/utils/stockRealtime.js";

test("variant cards ignore sibling variant events", () => {
  const variantCard = {
    _id: "product-1-variant-a",
    parentProductId: "product-1",
    variantId: "variant-a",
    available_quantity: 3,
    available_stock: 3,
    stock_sync_version: 10,
    product_stock_sync_version: 10,
  };

  const result = applyStockUpdateToProduct(variantCard, {
    product_id: "product-1",
    variant_id: "variant-b",
    variant_available_stock: 0,
    available_stock: 1,
    event_version: 11,
  });

  assert.equal(result, variantCard);
});

test("stale product payloads do not overwrite a newer aggregate state, but the targeted variant still updates", () => {
  const product = {
    _id: "product-1",
    available_quantity: 2,
    available_stock: 2,
    stock_sync_version: 200,
    product_stock_sync_version: 200,
    variants: [
      {
        _id: "variant-a",
        available_quantity: 1,
        available_stock: 1,
        stock_sync_version: 50,
        product_stock_sync_version: 200,
      },
      {
        _id: "variant-b",
        available_quantity: 1,
        available_stock: 1,
        stock_sync_version: 200,
        product_stock_sync_version: 200,
      },
    ],
  };

  const result = applyStockUpdateToProduct(product, {
    product_id: "product-1",
    variant_id: "variant-a",
    variant_available_stock: 0,
    available_stock: 3,
    event_version: 100,
  });

  assert.notEqual(result, product);
  assert.equal(result.available_stock, 2);
  assert.equal(result.available_quantity, 2);
  assert.equal(result.product_stock_sync_version, 200);
  assert.equal(result.variants[0].available_stock, 0);
  assert.equal(result.variants[0].stock_sync_version, 100);
  assert.equal(result.variants[1], product.variants[1]);
});

test("collections replace only the affected product entry", () => {
  const products = [
    {
      _id: "product-1",
      available_stock: 2,
      available_quantity: 2,
      stock_sync_version: 5,
      product_stock_sync_version: 5,
    },
    {
      _id: "product-2",
      available_stock: 1,
      available_quantity: 1,
      stock_sync_version: 5,
      product_stock_sync_version: 5,
    },
  ];

  const result = applyStockUpdateToProductCollection(products, {
    product_id: "product-2",
    available_stock: 0,
    event_version: 6,
  });

  assert.notEqual(result, products);
  assert.equal(result[0], products[0]);
  assert.notEqual(result[1], products[1]);
  assert.equal(result[1].available_stock, 0);
});
