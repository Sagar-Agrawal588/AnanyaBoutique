const { test, expect } = require("@playwright/test");

const DEFAULT_HOME_SLIDE =
  "https://firebasestorage.googleapis.com/v0/b/studio-8452116634-cdb59.firebasestorage.app/o/buyonegram%2Fsystem%2Fhome-slide-default-1.webp?alt=media&token=65e6ee68-27f4-4421-837e-7e1543cf92e5";

const buildSlidesPayload = () => ({
  error: false,
  success: true,
  data: [
    {
      image: DEFAULT_HOME_SLIDE,
      mobileImage: DEFAULT_HOME_SLIDE,
      title: "Visual Test Slide",
      subtitle: "Testing hero visual",
      buttonText: "Shop Now",
      buttonLink: "/products",
      backgroundColor: "#f5f5f5",
    },
  ],
});

const mockHomeSlides = async (page) => {
  await page.route("**/api/home-slides", async (route, request) => {
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildSlidesPayload()),
    });
  });
};

test("desktop hero fills the full viewport-height frame", async ({ page }) => {
  await mockHomeSlides(page);
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const hero = page.locator(".homeSlider");
  await expect(hero).toBeVisible();
  const heroBox = await hero.boundingBox();
  expect(heroBox).not.toBeNull();
  expect(heroBox.height).toBeGreaterThanOrEqual(900 - 1);
  expect(heroBox.height).toBeLessThanOrEqual(900 + 1);
  await expect(
    page.getByRole("heading", { name: "Visual Test Slide" }),
  ).toBeVisible();

  await expect(hero).toHaveScreenshot("home-hero-desktop-1600.png", {
    animations: "disabled",
    caret: "hide",
    maxDiffPixelRatio: 0.08,
  });
});

test("mobile hero visual", async ({ page }) => {
  await mockHomeSlides(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const hero = page.locator(".homeSlider");
  await expect(hero).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Visual Test Slide" }),
  ).toBeVisible();

  await expect(hero).toHaveScreenshot("home-hero-mobile-390.png", {
    animations: "disabled",
    caret: "hide",
    maxDiffPixelRatio: 0.08,
  });
});
