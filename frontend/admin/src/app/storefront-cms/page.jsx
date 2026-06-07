"use client";

import { useAdmin } from "@/context/AdminContext";
import { getData, postData, putData, uploadFile } from "@/utils/api";
import {
  Button,
  CircularProgress,
  TextField,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { FiImage, FiSave, FiUploadCloud } from "react-icons/fi";

const DEFAULT_CONTENT = {
  contact: {
    phone: "+91 6396789311",
    whatsapp: "+91 6396789311",
    email: "sagaragrawal.588@gmail.com",
    address: "Ananya Boutique",
    mapUrl: "https://share.google/9gTvwlEIKp6hVZDbk",
    businessHours: "Monday - Saturday, 10:00 AM - 8:00 PM",
    instagramUrl: "https://www.instagram.com/ananya___boutique",
    instagramHandle: "@ananya___boutique",
    instagramTitle: "Follow Our Journey",
    instagramContent: "Discover new arrivals, styling inspiration, boutique updates, customer stories, and behind-the-scenes moments from Ananya Boutique.",
    trustSignals: ["Trust Since 2012", "Family-Owned Boutique", "Affordable Fashion"],
    whatsappActions: [
      { label: "Chat on WhatsApp", message: "Hi Ananya Boutique, I would like to chat on WhatsApp." },
      { label: "Product Assistance", message: "Hi Ananya Boutique, I need product assistance." },
    ],
  },
  header: {
    navItems: [
      { name: "Home", href: "/", icon: "home", enabled: true },
      { name: "Discover Style", href: "/products", icon: "shop", enabled: true },
      { name: "Membership", href: "/membership", icon: "vip", enabled: true },
      { name: "Blogs", href: "/blogs", icon: "blog", enabled: true },
      { name: "About Us", href: "/about-us", icon: "info", enabled: true },
    ],
  },
  footer: {
    contactTitle: "Contact Us",
    description: "Fashion, beauty, and accessories curated with love since 2012.",
    founderMessage: "Every order supports a family-owned boutique dream built with care.",
    newsletterTitle: "Join the boutique family",
    newsletterDescription: "Get thoughtful styling notes, new arrivals, and boutique offers selected with care.",
    copyrightText: "2026 Ananya Boutique. All rights reserved.",
    linkColumns: [
      {
        title: "Discover",
        links: [
          { name: "Special Offers", href: "/products?priceDrop=true", enabled: true },
          { name: "New Arrivals", href: "/products?newArrivals=true", enabled: true },
          { name: "Discover Your Style", href: "/products", enabled: true },
        ],
      },
      {
        title: "Our Company",
        links: [
          { name: "Shipping Policy", href: "/shipping-policy", enabled: true },
          { name: "Privacy Policy", href: "/privacy-policy", enabled: true },
          { name: "Return Policy", href: "/return-policy", enabled: true },
          { name: "Cancellation Policy", href: "/cancellation", enabled: true },
          { name: "About Us", href: "/about-us", enabled: true },
          { name: "Contact us", href: "/contact", enabled: true },
        ],
      },
    ],
    socialLinks: [
      { label: "Instagram", href: "https://www.instagram.com/ananya___boutique", type: "instagram", enabled: true },
    ],
  },
  homepage: {
    hero: {
      eyebrow: "Founder-Led Fashion Boutique",
      title: "Discover Your Style",
      subtitle: "Fashion selected with love, trust, and years of dedication.",
      primaryButtonText: "Shop Collection",
      primaryButtonHref: "/products",
      secondaryButtonText: "Meet Our Story",
      secondaryButtonHref: "/about-us",
      trustPills: ["Founded 2012", "Family-Owned", "Trusted Boutique", "Curated With Love"],
      mediaSlot: "homepageHero",
    },
    founder: {
      eyebrow: "Real founder. Real family. Real story.",
      title: "Meet The Woman Behind Ananya Boutique",
      paragraphs: [
        "In 2012, a homemaker with a passion for fashion decided to take a chance on a dream.",
        "While raising three children and managing her family, she began building a boutique one customer at a time.",
      ],
      badges: ["Founded 2012", "Family-Owned", "Mother Entrepreneur", "Trusted Boutique"],
      primaryButtonText: "Read Our Story",
      primaryButtonHref: "/about-us",
      secondaryButtonText: "Chat On WhatsApp",
      mediaSlot: "founderStory",
    },
    instagram: {
      eyebrow: "Instagram showcase",
      title: "Follow Our Journey",
      copy: "Follow new arrivals, styling moments, customer stories, and the everyday work behind Ananya Boutique.",
      buttonText: "Follow @ananya___boutique",
      placeholders: ["New arrivals", "Saree moments", "Jewellery details", "Beauty picks"],
      mediaSlot: "instagramShowcase",
    },
    testimonials: {
      eyebrow: "Customer love",
      title: "Customer Love",
      copy: "Kind words from our boutique family.",
      items: [
        { name: "Priya S.", text: "The saree looked elegant, the price felt fair, and the support felt personal." },
      ],
    },
    finalCta: {
      eyebrow: "Ananya Boutique family",
      title: "Join The Ananya Boutique Family",
      lines: ["Fashion chosen with love.", "A boutique built with trust."],
      primaryButtonText: "Shop Collection",
      primaryButtonHref: "/products",
      secondaryButtonText: "WhatsApp Us",
    },
  },
  about: {
    hero: {
      eyebrow: "Ananya Boutique",
      title: "OUR STORY",
      subtitle: "Behind every product is a dream, a family, and years of determination.",
      description: "This is a story for every woman who has carried a dream quietly and kept going.",
      primaryButtonText: "Shop Collection",
      primaryButtonHref: "/products",
      secondaryButtonText: "Connect With Us",
      secondaryButtonHref: "/contact",
      visualTitle: "A Dream That Grew With Love",
      visualSubtext: "A founder's journey held in soft colour, quiet strength, and family belief.",
      mediaSlot: "aboutHero",
    },
    timeline: [
      { year: "2012", title: "Ananya Boutique Founded", text: "A homemaker's dream began inside a home." },
      { year: "2024", title: "Cosmetics & Artificial Jewellery Added", text: "The boutique expanded into beauty and accessories." },
    ],
    stats: [
      { value: "13+", label: "Years of Trust" },
      { value: "Growing", label: "Happy Customers" },
    ],
    quotes: ["A dream built inside a home can still become a story that inspires many women."],
    storySections: [
      {
        title: "Every Dream Begins With Courage",
        visualTitle: "The First Dream",
        visualSubtext: "A quiet beginning, a brave heart, and a home full of hope.",
        artworkKey: "story.founder",
        orientation: "portrait",
        paragraphs: ["Some businesses begin with investors.", "Ours began with a mother, a dream, and determination."],
      },
    ],
    cta: {
      eyebrow: "The story continues with you",
      title: "Every purchase becomes part of this journey.",
      description: "Ananya Boutique is built on family, trust, courage, and the belief that women deserve confidence.",
      primaryButtonText: "Shop Products",
      primaryButtonHref: "/products",
      secondaryButtonText: "Join The Family",
      secondaryButtonHref: "/membership",
    },
  },
  membership: {
    hero: {
      eyebrow: "Luxury Loyalty Program",
      title: "Fashion Insider Club",
      description: "Unlock exclusive fashion experiences, rewards, and member-only benefits.",
      primaryButtonText: "Join The Club",
      secondaryButtonText: "Explore Benefits",
      visualTitle: "The Insider Wardrobe",
      visualCopy: "A private style world with early access, rewards, and boutique care.",
      mediaSlot: "membershipHero",
    },
    stats: [
      { label: "Luxury Benefits", value: 6, suffix: "" },
      { label: "Style Tiers", value: 3, suffix: "" },
    ],
    benefits: {
      eyebrow: "Membership Benefits",
      title: "A private circle of fashion, rewards, and care",
      copy: "Every benefit is designed to make shopping feel more personal.",
      items: [
        { icon: "sparkles", title: "Early Access", description: "Get first access to new collections before public launch." },
        { icon: "percent", title: "Exclusive Discounts", description: "Members receive special pricing and private promotions." },
      ],
    },
    howItWorks: [
      { step: "Step 1", title: "Join Fashion Insider Club", text: "Activate your membership through checkout." },
      { step: "Step 2", title: "Shop Your Favorites", text: "Browse sarees, suits, kurtis, cosmetics, jewellery, and accessories." },
    ],
    tiers: [
      { name: "STYLE STARTER", label: "Welcome Edit", description: "A beautiful first step into the club.", benefits: ["Welcome rewards", "Birthday benefits"] },
    ],
    vip: {
      eyebrow: "VIP Experience",
      title: "A member world made for women who love style",
      copy: "Private launches, thoughtful rewards, and boutique attention.",
      items: ["Private collection previews", "Birthday styling gifts"],
    },
    dashboard: [
      { label: "Points earned", value: 2450, suffix: "" },
      { label: "Rewards available", value: 6, suffix: "" },
    ],
    testimonials: [
      { name: "Priya S.", title: "Early access shopper", text: "The club makes every new launch feel personal." },
    ],
    finalCta: {
      eyebrow: "Your private fashion circle awaits",
      title: "Step into the Fashion Insider Club.",
      description: "Join for early access, discounts, birthday rewards, and priority support.",
      buttonText: "Join The Club",
    },
  },
  mediaSlots: {
    homepageHero: "",
    founderStory: "",
    aboutHero: "",
    membershipHero: "",
    contactHero: "",
    blogHero: "",
    instagramShowcase: "",
    categoryBanners: {},
    openGraphImages: {},
  },
};

const SECTION_TABS = [
  "Homepage",
  "About",
  "Contact",
  "Membership",
  "Header",
  "Footer",
  "Media",
  "Policies",
];

const clone = (value) => JSON.parse(JSON.stringify(value));
const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);

const mergeContent = (base, extra) => {
  if (Array.isArray(base)) return Array.isArray(extra) ? clone(extra) : clone(base);
  if (!isObject(base)) return extra == null ? base : extra;
  const output = clone(base);
  if (!isObject(extra)) return output;
  Object.keys(extra).forEach((key) => {
    output[key] = mergeContent(base[key], extra[key]);
  });
  return output;
};

const toLines = (items = []) => (Array.isArray(items) ? items : []).join("\n");
const fromLines = (value) =>
  String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const objectsToRows = (items = [], fields = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => fields.map((field) => item?.[field] ?? "").join(" | "))
    .join("\n");

const rowsToObjects = (value, fields = []) =>
  fromLines(value).map((row) => {
    const parts = row.split("|").map((part) => part.trim());
    return fields.reduce((acc, field, index) => {
      if (field === "enabled") {
        acc[field] = parts[index] !== "false";
      } else if (field === "value") {
        acc[field] = Number(parts[index] || 0);
      } else if (field === "benefits") {
        acc[field] = String(parts[index] || "")
          .split(";")
          .map((item) => item.trim())
          .filter(Boolean);
      } else {
        acc[field] = parts[index] || "";
      }
      return acc;
    }, {});
  });

const paragraphsToRows = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) =>
      [
        item.title,
        item.visualTitle,
        item.visualSubtext,
        item.artworkKey,
        item.orientation,
        item.reverse ? "true" : "false",
        (item.paragraphs || []).join(" / "),
      ].join(" | "),
    )
    .join("\n");

const rowsToStorySections = (value) =>
  fromLines(value).map((row) => {
    const [title, visualTitle, visualSubtext, artworkKey, orientation, reverse, paragraphs] =
      row.split("|").map((part) => part.trim());
    return {
      title,
      visualTitle,
      visualSubtext,
      artworkKey,
      orientation: orientation || "wide",
      reverse: reverse === "true",
      paragraphs: String(paragraphs || "")
        .split("/")
        .map((item) => item.trim())
        .filter(Boolean),
    };
  });

const getPath = (object, path) =>
  path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), object);

export default function StorefrontCmsPage() {
  const { token, isAuthenticated, loading } = useAdmin();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Homepage");
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [policies, setPolicies] = useState({
    privacy: "",
    shipping: "",
    returnPolicy: "",
    cancellation: "",
  });
  const [policyIds, setPolicyIds] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingContent, setLoadingContent] = useState(true);

  const update = useCallback((path, value) => {
    setContent((current) => {
      const next = clone(current);
      const keys = path.split(".");
      let target = next;
      keys.forEach((key, index) => {
        const isLast = index === keys.length - 1;
        if (isLast) {
          target[key] = value;
          return;
        }
        const nextKey = keys[index + 1];
        if (target[key] == null) {
          target[key] = /^\d+$/.test(nextKey) ? [] : {};
        }
        target = target[key];
      });
      return next;
    });
  }, []);

  const updatePolicy = (key, value) => {
    setPolicies((current) => ({ ...current, [key]: value }));
  };

  const loadContent = useCallback(async () => {
    setLoadingContent(true);
    try {
      const [settingsResponse, policiesResponse, cancellationResponse] =
        await Promise.all([
          getData("/api/settings/admin/all", token),
          getData("/api/policies/admin/all", token),
          getData("/api/cancellation/admin", token),
        ]);

      if (settingsResponse?.success) {
        const record = settingsResponse.data.find(
          (item) => item.key === "storefrontContent",
        );
        setContent(mergeContent(DEFAULT_CONTENT, record?.value || {}));
      }

      if (policiesResponse?.success) {
        const bySlug = policiesResponse.data.reduce((acc, item) => {
          acc[item.slug] = item;
          return acc;
        }, {});
        setPolicyIds({
          privacy: bySlug["privacy-policy"]?._id || "",
          shipping: bySlug["shipping-policy"]?._id || "",
          returnPolicy: bySlug["return-policy"]?._id || "",
        });
        setPolicies((current) => ({
          ...current,
          privacy: bySlug["privacy-policy"]?.content || "",
          shipping: bySlug["shipping-policy"]?.content || "",
          returnPolicy: bySlug["return-policy"]?.content || "",
        }));
      }

      if (cancellationResponse?.success) {
        setPolicies((current) => ({
          ...current,
          cancellation: cancellationResponse.data?.content || "",
        }));
      }
    } catch (error) {
      toast.error("Failed to load storefront CMS content");
    } finally {
      setLoadingContent(false);
    }
  }, [token]);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated && token) loadContent();
  }, [isAuthenticated, loadContent, token]);

  const savePolicy = async ({ key, title, slug, contentValue }) => {
    if (!String(contentValue || "").trim()) return;
    const existingId = policyIds[key];
    const payload = {
      title,
      slug,
      content: contentValue,
      isActive: true,
      theme: { style: "mint", layout: "glass" },
    };
    const response = existingId
      ? await putData(`/api/policies/admin/${existingId}`, payload, token)
      : await postData("/api/policies/admin", payload, token);

    if (response?.success && !existingId) {
      setPolicyIds((current) => ({ ...current, [key]: response.data?._id }));
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const response = await putData(
        "/api/settings/admin/storefrontContent",
        {
          value: content,
          description:
            "Business-owner managed storefront content for Ananya Boutique",
          category: "display",
          isActive: true,
        },
        token,
      );
      if (!response?.success) {
        throw new Error(response?.message || "Failed to save storefront CMS");
      }

      await Promise.all([
        savePolicy({
          key: "privacy",
          title: "Privacy Policy",
          slug: "privacy-policy",
          contentValue: policies.privacy,
        }),
        savePolicy({
          key: "shipping",
          title: "Shipping Policy",
          slug: "shipping-policy",
          contentValue: policies.shipping,
        }),
        savePolicy({
          key: "returnPolicy",
          title: "Return Policy",
          slug: "return-policy",
          contentValue: policies.returnPolicy,
        }),
        String(policies.cancellation || "").trim()
          ? putData(
              "/api/cancellation/admin",
              {
                content: policies.cancellation,
                theme: { style: "mint", layout: "glass" },
              },
              token,
            )
          : Promise.resolve(),
      ]);

      toast.success("Storefront CMS saved. Storefront updates without redeploy.");
    } catch (error) {
      toast.error(error?.message || "Failed to save storefront CMS");
    } finally {
      setSaving(false);
    }
  };

  const uploadMediaSlot = async (slot, file) => {
    if (!file) return;
    try {
      const response = await uploadFile(file, token, { folder: "storefront-cms" });
      const url = response?.data?.url || response?.url || "";
      if (!url) throw new Error("Upload did not return a URL");
      update(`mediaSlots.${slot}`, url);
      toast.success("Media uploaded");
    } catch (error) {
      toast.error(error?.message || "Upload failed");
    }
  };

  const uploadCategoryBanner = async (slug, file) => {
    if (!slug || !file) return;
    try {
      const response = await uploadFile(file, token, { folder: "category-banners" });
      const url = response?.data?.url || response?.url || "";
      if (!url) throw new Error("Upload did not return a URL");
      update("mediaSlots.categoryBanners", {
        ...(content.mediaSlots?.categoryBanners || {}),
        [slug]: url,
      });
      toast.success("Category banner uploaded");
    } catch (error) {
      toast.error(error?.message || "Upload failed");
    }
  };

  const field = (label, path, props = {}) => (
    <TextField
      label={label}
      value={getPath(content, path) || ""}
      onChange={(event) => update(path, event.target.value)}
      fullWidth
      size="small"
      {...props}
    />
  );

  const lineField = (label, path, props = {}) => (
    <TextField
      label={label}
      value={toLines(getPath(content, path))}
      onChange={(event) => update(path, fromLines(event.target.value))}
      fullWidth
      multiline
      minRows={3}
      size="small"
      helperText="One item per line"
      {...props}
    />
  );

  const rowField = (label, path, fields, helperText) => (
    <TextField
      label={label}
      value={objectsToRows(getPath(content, path), fields)}
      onChange={(event) => update(path, rowsToObjects(event.target.value, fields))}
      fullWidth
      multiline
      minRows={4}
      size="small"
      helperText={helperText}
    />
  );

  const cardClass = "rounded-xl border border-gray-100 bg-white p-5 shadow-sm";

  const categoryBannerRows = useMemo(
    () =>
      Object.entries(content.mediaSlots?.categoryBanners || {})
        .map(([slug, url]) => `${slug} | ${url}`)
        .join("\n"),
    [content.mediaSlots?.categoryBanners],
  );

  if (loading || !isAuthenticated || loadingContent) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  return (
    <section className="w-full px-5 py-4">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Storefront CMS</h1>
          <p className="text-sm text-gray-500">
            Edit customer-facing content without code, Git, or redeployment.
          </p>
        </div>
        <Button
          onClick={saveAll}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : <FiSave />}
          className="!bg-blue-600 !text-white disabled:!bg-gray-300"
        >
          {saving ? "Saving..." : "Save Storefront CMS"}
        </Button>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
        {SECTION_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "border border-gray-200 bg-white text-gray-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Homepage" ? (
        <div className="grid gap-5">
          <div className={cardClass}>
            <h2 className="mb-4 font-semibold text-gray-800">Homepage Hero</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {field("Eyebrow", "homepage.hero.eyebrow")}
              {field("Title", "homepage.hero.title")}
              {field("Subtitle", "homepage.hero.subtitle", { multiline: true, minRows: 3 })}
              {lineField("Trust Pills", "homepage.hero.trustPills")}
              {field("Primary Button Text", "homepage.hero.primaryButtonText")}
              {field("Primary Button Link", "homepage.hero.primaryButtonHref")}
              {field("Secondary Button Text", "homepage.hero.secondaryButtonText")}
              {field("Secondary Button Link", "homepage.hero.secondaryButtonHref")}
            </div>
          </div>
          <div className={cardClass}>
            <h2 className="mb-4 font-semibold text-gray-800">Founder, Testimonials, Instagram, CTA</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {field("Founder Eyebrow", "homepage.founder.eyebrow")}
              {field("Founder Title", "homepage.founder.title")}
              {lineField("Founder Paragraphs", "homepage.founder.paragraphs", { minRows: 4 })}
              {lineField("Founder Badges", "homepage.founder.badges")}
              {rowField("Testimonials", "homepage.testimonials.items", ["name", "text"], "Format: Name | Testimonial")}
              {lineField("Instagram Placeholders", "homepage.instagram.placeholders")}
              {field("Instagram Title", "homepage.instagram.title")}
              {field("Instagram Copy", "homepage.instagram.copy", { multiline: true, minRows: 3 })}
              {field("Final CTA Title", "homepage.finalCta.title")}
              {lineField("Final CTA Lines", "homepage.finalCta.lines")}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "About" ? (
        <div className="grid gap-5">
          <div className={cardClass}>
            <h2 className="mb-4 font-semibold text-gray-800">About Page</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {field("Hero Eyebrow", "about.hero.eyebrow")}
              {field("Hero Title", "about.hero.title")}
              {field("Hero Subtitle", "about.hero.subtitle", { multiline: true, minRows: 2 })}
              {field("Hero Description", "about.hero.description", { multiline: true, minRows: 4 })}
              {rowField("Timeline", "about.timeline", ["year", "title", "text"], "Format: Year | Title | Text")}
              {rowField("Statistics", "about.stats", ["value", "label"], "Format: Value | Label")}
              {lineField("Quotes", "about.quotes")}
              <TextField
                label="Story Sections"
                value={paragraphsToRows(content.about.storySections)}
                onChange={(event) =>
                  update("about.storySections", rowsToStorySections(event.target.value))
                }
                fullWidth
                multiline
                minRows={6}
                size="small"
                helperText="Format: Title | Visual Title | Visual Subtext | Artwork Key | wide/portrait | true/false reverse | Paragraph / Paragraph"
              />
              {field("CTA Title", "about.cta.title")}
              {field("CTA Description", "about.cta.description", { multiline: true, minRows: 3 })}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "Contact" ? (
        <div className={cardClass}>
          <h2 className="mb-4 font-semibold text-gray-800">Contact Details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {field("Phone", "contact.phone")}
            {field("WhatsApp", "contact.whatsapp")}
            {field("Email", "contact.email")}
            {field("Address", "contact.address", { multiline: true, minRows: 3 })}
            {field("Google Maps URL", "contact.mapUrl")}
            {field("Business Hours", "contact.businessHours")}
            {field("Instagram URL", "contact.instagramUrl")}
            {field("Instagram Handle", "contact.instagramHandle")}
            {field("Instagram Title", "contact.instagramTitle")}
            {field("Instagram Content", "contact.instagramContent", { multiline: true, minRows: 3 })}
            {lineField("Trust Signals", "contact.trustSignals")}
            {rowField("WhatsApp Actions", "contact.whatsappActions", ["label", "message"], "Format: Label | WhatsApp message")}
          </div>
        </div>
      ) : null}

      {activeTab === "Membership" ? (
        <div className={cardClass}>
          <h2 className="mb-4 font-semibold text-gray-800">Membership Editorial Content</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {field("Hero Eyebrow", "membership.hero.eyebrow")}
            {field("Hero Title", "membership.hero.title")}
            {field("Hero Description", "membership.hero.description", { multiline: true, minRows: 3 })}
            {rowField("Benefits", "membership.benefits.items", ["icon", "title", "description"], "Format: icon | Title | Description")}
            {rowField("How It Works", "membership.howItWorks", ["step", "title", "text"], "Format: Step | Title | Text")}
            {rowField("Tiers", "membership.tiers", ["name", "label", "description", "benefits"], "Format: Name | Label | Description | benefit; benefit")}
            {lineField("VIP Items", "membership.vip.items")}
            {field("VIP Title", "membership.vip.title")}
            {field("VIP Copy", "membership.vip.copy", { multiline: true, minRows: 3 })}
            {rowField("Testimonials", "membership.testimonials", ["name", "title", "text"], "Format: Name | Title | Text")}
            {field("Final CTA Title", "membership.finalCta.title")}
            {field("Final CTA Description", "membership.finalCta.description", { multiline: true, minRows: 3 })}
          </div>
        </div>
      ) : null}

      {activeTab === "Header" ? (
        <div className={cardClass}>
          <h2 className="mb-4 font-semibold text-gray-800">Header Navigation</h2>
          {rowField("Navigation Items", "header.navItems", ["name", "href", "icon", "enabled"], "Format: Name | Link | Icon label | true/false")}
        </div>
      ) : null}

      {activeTab === "Footer" ? (
        <div className={cardClass}>
          <h2 className="mb-4 font-semibold text-gray-800">Footer Content</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {field("Contact Title", "footer.contactTitle")}
            {field("Description", "footer.description", { multiline: true, minRows: 3 })}
            {field("Founder Message", "footer.founderMessage", { multiline: true, minRows: 3 })}
            {field("Newsletter Title", "footer.newsletterTitle")}
            {field("Newsletter Description", "footer.newsletterDescription", { multiline: true, minRows: 3 })}
            {field("Copyright Text", "footer.copyrightText")}
            {field("Column 1 Title", "footer.linkColumns.0.title")}
            {rowField("Column 1 Links", "footer.linkColumns.0.links", ["name", "href", "enabled"], "Format: Name | Link | true/false")}
            {field("Column 2 Title", "footer.linkColumns.1.title")}
            {rowField("Column 2 Links", "footer.linkColumns.1.links", ["name", "href", "enabled"], "Format: Name | Link | true/false")}
            {rowField("Social Links", "footer.socialLinks", ["label", "href", "type", "enabled"], "Format: Label | URL | type | true/false")}
          </div>
        </div>
      ) : null}

      {activeTab === "Media" ? (
        <div className="grid gap-5">
          <div className={cardClass}>
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-800">
              <FiImage /> Media Slots
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["homepageHero", "Homepage Hero"],
                ["founderStory", "Founder Story"],
                ["aboutHero", "About Hero"],
                ["membershipHero", "Membership Hero"],
                ["contactHero", "Contact Hero"],
                ["blogHero", "Blog Hero"],
                ["instagramShowcase", "Instagram Showcase"],
              ].map(([slot, label]) => (
                <div key={slot} className="rounded-lg border border-gray-100 p-4">
                  <TextField
                    label={label}
                    value={content.mediaSlots?.[slot] || ""}
                    onChange={(event) => update(`mediaSlots.${slot}`, event.target.value)}
                    fullWidth
                    size="small"
                  />
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600">
                    <FiUploadCloud /> Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) =>
                        uploadMediaSlot(slot, event.target.files?.[0])
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className={cardClass}>
            <h2 className="mb-4 font-semibold text-gray-800">
              Social Sharing Images
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["default", "Open Graph Image"],
                ["twitter", "Twitter Card Image"],
                ["socialShare", "Social Share Image"],
              ].map(([slot, label]) => (
                <div key={slot} className="rounded-lg border border-gray-100 p-4">
                  <TextField
                    label={label}
                    value={content.mediaSlots?.openGraphImages?.[slot] || ""}
                    onChange={(event) =>
                      update(`mediaSlots.openGraphImages.${slot}`, event.target.value)
                    }
                    fullWidth
                    size="small"
                  />
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600">
                    <FiUploadCloud /> Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) =>
                        uploadMediaSlot(
                          `openGraphImages.${slot}`,
                          event.target.files?.[0],
                        )
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className={cardClass}>
            <h2 className="mb-4 font-semibold text-gray-800">Category Banners</h2>
            <TextField
              label="Category Banner URLs"
              value={categoryBannerRows}
              onChange={(event) =>
                update(
                  "mediaSlots.categoryBanners",
                  rowsToObjects(event.target.value, ["slug", "url"]).reduce(
                    (acc, item) => {
                      if (item.slug && item.url) acc[item.slug] = item.url;
                      return acc;
                    },
                    {},
                  ),
                )
              }
              fullWidth
              multiline
              minRows={5}
              size="small"
              helperText="Format: category-slug | image URL"
            />
            <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
              <TextField id="category-banner-slug" label="Category slug" size="small" />
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600">
                <FiUploadCloud /> Upload Category Banner
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const input = document.getElementById("category-banner-slug");
                    uploadCategoryBanner(input?.value, event.target.files?.[0]);
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "Policies" ? (
        <div className="grid gap-5">
          {[
            ["privacy", "Privacy Policy"],
            ["shipping", "Shipping Policy"],
            ["returnPolicy", "Return Policy"],
            ["cancellation", "Cancellation Policy"],
          ].map(([key, label]) => (
            <div key={key} className={cardClass}>
              <TextField
                label={label}
                value={policies[key] || ""}
                onChange={(event) => updatePolicy(key, event.target.value)}
                fullWidth
                multiline
                minRows={8}
                helperText="Plain text and simple HTML are supported."
              />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
