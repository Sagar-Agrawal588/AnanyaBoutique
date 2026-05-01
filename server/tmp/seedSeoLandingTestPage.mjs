import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import SettingsModel from "../models/settings.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const normalizeEnvValue = (value) => {
  let normalized = String(value || "").trim();
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }
  return normalized;
};

const resolveMongoUri = () => {
  const primary = normalizeEnvValue(process.env.MONGO_URI);
  const fallback = normalizeEnvValue(process.env.MONGODB_URI);
  const candidate = primary || fallback;
  if (!/^mongodb(\+srv)?:\/\//.test(candidate)) {
    throw new Error("Valid MONGO_URI or MONGODB_URI is required.");
  }
  return candidate;
};

const cloneBodySection = (entry = {}) => ({
  heading: String(entry.heading || "").trim(),
  content: String(entry.content || "").trim(),
});

const cloneFaqItem = (entry = {}) => ({
  question: String(entry.question || "").trim(),
  answer: String(entry.answer || "").trim(),
});

const cloneSeoPageEntry = (entry = {}) => ({
  label: String(entry.label || "Page").trim() || "Page",
  path: String(entry.path || "/").trim() || "/",
  metaTitle: String(entry.metaTitle || "").trim(),
  metaDescription: String(entry.metaDescription || "").trim(),
  keywords: String(entry.keywords || "").trim(),
  indexable: entry.indexable === undefined ? true : Boolean(entry.indexable),
  notes: String(entry.notes || "").trim(),
  heroTitle: String(entry.heroTitle || "").trim(),
  heroSubtitle: String(entry.heroSubtitle || "").trim(),
  heroImageUrl: String(entry.heroImageUrl || "").trim(),
  heroImageAlt: String(entry.heroImageAlt || "").trim(),
  ctaLabel: String(entry.ctaLabel || "Explore Products").trim(),
  ctaHref: String(entry.ctaHref || "/products").trim(),
  bodySections: Array.isArray(entry.bodySections)
    ? entry.bodySections.map(cloneBodySection).filter((section) => section.heading || section.content)
    : [],
  faqItems: Array.isArray(entry.faqItems)
    ? entry.faqItems.map(cloneFaqItem).filter((item) => item.question || item.answer)
    : [],
});

const seedEntry = cloneSeoPageEntry({
  label: "SEO Test Protein Breakfast Guide",
  path: "/seo-test-protein-breakfast-guide",
  metaTitle: "Protein Breakfast Guide for Busy Mornings | Buy OneGram",
  metaDescription:
    "A hidden SEO landing page for protein breakfast ideas, quick pantry planning, and everyday healthy routines from Buy OneGram.",
  keywords:
    "protein breakfast guide, healthy breakfast ideas, peanut butter breakfast, quick protein meals, buy onegram seo test",
  indexable: true,
  notes:
    "Seeded test SEO landing page. This should stay in admin and on the storefront for verification.",
  heroTitle: "Protein breakfast ideas that are realistic on busy mornings",
  heroSubtitle:
    "Use this landing page to target breakfast-intent SEO traffic with a clearer hero message, structured body content, FAQs, and a direct CTA into the catalog.",
  heroImageUrl: "/logo-og-v2.png",
  heroImageAlt: "Buy OneGram protein breakfast SEO landing banner",
  ctaLabel: "Shop Breakfast-Friendly Products",
  ctaHref: "/products",
  bodySections: [
    {
      heading: "Build a better breakfast routine",
      content:
        "A stronger breakfast routine usually comes from convenience, not complexity. Focus on products that are easy to repeat, simple to portion, and satisfying enough to reduce mid-morning snacking.",
    },
    {
      heading: "How this SEO page should behave",
      content:
        "This page is intentionally hidden from normal navigation but remains fully live on its own URL. Search engines can index it when indexing is enabled, and the admin can edit every visible section from the SEO Pages screen.",
    },
  ],
  faqItems: [
    {
      question: "Will customers see this page in the main navigation?",
      answer:
        "No. The page exists on its own route and is meant for search discovery, campaigns, or direct linking rather than standard menu navigation.",
    },
    {
      question: "Can the admin change the hero image, CTA, and FAQ later?",
      answer:
        "Yes. Those values are stored in seoSettings and can be updated from the dedicated SEO Pages admin screen without touching code.",
    },
  ],
});

const main = async () => {
  const mongoUri = resolveMongoUri();
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 20000 });

  const settingsRecord = await SettingsModel.findOne({ key: "seoSettings" });

  if (!settingsRecord) {
    throw new Error("seoSettings record not found.");
  }

  const currentValue =
    settingsRecord.value && typeof settingsRecord.value === "object"
      ? settingsRecord.value
      : {};

  const currentPages = Array.isArray(currentValue.pages)
    ? currentValue.pages.map(cloneSeoPageEntry)
    : [];

  const nextPages = currentPages.filter(
    (page) => String(page.path || "").trim() !== seedEntry.path,
  );
  nextPages.push(seedEntry);

  settingsRecord.value = {
    ...currentValue,
    pages: nextPages,
  };

  await settingsRecord.save();

  const savedPage = settingsRecord.value.pages.find(
    (page) => String(page?.path || "").trim() === seedEntry.path,
  );

  console.log(
    JSON.stringify(
      {
        success: true,
        path: savedPage?.path,
        label: savedPage?.label,
        heroTitle: savedPage?.heroTitle,
        bodySectionCount: Array.isArray(savedPage?.bodySections)
          ? savedPage.bodySections.length
          : 0,
        faqCount: Array.isArray(savedPage?.faqItems) ? savedPage.faqItems.length : 0,
        heroImageUrl: savedPage?.heroImageUrl,
      },
      null,
      2,
    ),
  );
};

try {
  await main();
} finally {
  await mongoose.connection.close().catch(() => {});
}
