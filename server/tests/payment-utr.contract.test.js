import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const orderControllerPath = path.resolve(
  __dirname,
  "../controllers/order.controller.js",
);

test("payment UTR extraction accepts 12 to 16 digit numeric references only", async () => {
  const source = await fs.readFile(orderControllerPath, "utf8");

  assert.match(source, /const UTR_REGEX = \/\^\\d\{12,16\}\$\/;/);
  assert.match(source, /replace\(\/\\D\/g, ""\)/);
  assert.match(source, /providerReferenceId/);
  assert.match(source, /txnId/);
});
