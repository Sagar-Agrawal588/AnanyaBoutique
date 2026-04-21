import { chromium } from "../frontend/client/node_modules/playwright/index.mjs";
import fs from "fs";
import path from "path";

const outputDir = path.resolve("output", "mid-review-live-screenshots");
fs.mkdirSync(outputDir, { recursive: true });

const baseUrl = "https://healthyonegram.com";

async function dismissCommonOverlays(page) {
  const selectors = [
    'button:has-text("Accept")',
    'button:has-text("Allow")',
    'button:has-text("Close")',
    'button[aria-label="Close"]',
    '[data-testid="close"]',
    ".MuiDialog-root button",
  ];

  for (const selector of selectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 500 })) {
        await el.click({ timeout: 1000 });
      }
    } catch {}
  }
}

async function capture(page, name, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);
  await dismissCommonOverlays(page);
  await page.screenshot({
    path: path.join(outputDir, `${name}.png`),
    fullPage: false,
  });
}

async function findProductPage(page) {
  await page.goto(`${baseUrl}/products`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);
  const href = await page
    .locator('a[href*="/product/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  if (!href) return null;
  return href.startsWith("http") ? href : `${baseUrl}${href}`;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await capture(page, "home", baseUrl);
  await capture(page, "products", `${baseUrl}/products`);
  await capture(page, "membership", `${baseUrl}/membership`);

  const productUrl = await findProductPage(page);
  if (productUrl) {
    await capture(page, "product-detail", productUrl);
  }

  await browser.close();
  console.log(outputDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
