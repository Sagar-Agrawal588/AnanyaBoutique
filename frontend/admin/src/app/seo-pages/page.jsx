"use client";

import { useAdmin } from "@/context/AdminContext";
import { getData, putData, uploadFile } from "@/utils/api";
import { getImageUrl } from "@/utils/imageUtils";
import {
  Alert,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  Snackbar,
  Switch,
  TextField,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import {
  MdAdd,
  MdDeleteOutline,
  MdFolderOpen,
  MdRefresh,
  MdSave,
  MdUpload,
} from "react-icons/md";

const DEFAULT_SECTION = {
  heading: "Section heading",
  content: "",
};

const DEFAULT_FAQ = {
  question: "FAQ question",
  answer: "",
};

const DEFAULT_SEO_PAGE_ENTRIES = [
  {
    label: "Blank SEO Page",
    path: "",
    metaTitle: "",
    metaDescription: "",
    keywords: "",
    indexable: false,
    notes: "Use this row as a blank SEO template for a new page.",
    heroTitle: "",
    heroSubtitle: "",
    heroImageUrl: "",
    heroImageAlt: "",
    ctaLabel: "Explore Products",
    ctaHref: "/products",
    bodySections: [],
    faqItems: [],
  },
  {
    label: "Home",
    path: "/",
    metaTitle: "Buy OneGram - Premium Health Products",
    metaDescription:
      "Shop premium quality peanut butter and healthy food products at Buy OneGram.",
    keywords: "peanut butter, healthy food, organic, natural, protein",
    indexable: true,
    notes: "Main homepage SEO entry.",
    heroTitle: "Premium health products for everyday wellness",
    heroSubtitle:
      "Discover healthy pantry staples, better ingredients, and products designed for simple daily routines.",
    heroImageUrl: "",
    heroImageAlt: "Healthy One Gram hero banner",
    ctaLabel: "Browse Products",
    ctaHref: "/products",
    bodySections: [
      {
        heading: "Why customers choose Healthy One Gram",
        content:
          "We focus on better ingredients, clean flavor profiles, and products that fit into practical daily nutrition habits.",
      },
    ],
    faqItems: [],
  },
];

const DEFAULT_SEO_IMAGE_ENTRIES = [
  {
    label: "Logo",
    target: "/logo.png",
    altText: "Buy OneGram logo",
    titleText: "Buy OneGram",
    notes: "Keep the brand logo alt text short.",
  },
];

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
  path: String(entry.path || "/").trim(),
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
    ? entry.bodySections.map(cloneBodySection)
    : [],
  faqItems: Array.isArray(entry.faqItems)
    ? entry.faqItems.map(cloneFaqItem)
    : [],
});

const cloneSeoImageEntry = (entry = {}) => ({
  label: String(entry.label || "Image").trim() || "Image",
  target: String(entry.target || "").trim(),
  altText: String(entry.altText || "").trim(),
  titleText: String(entry.titleText || "").trim(),
  notes: String(entry.notes || "").trim(),
});

const DEFAULT_SEO_SETTINGS = {
  pages: DEFAULT_SEO_PAGE_ENTRIES.map(cloneSeoPageEntry),
  imageAltTexts: DEFAULT_SEO_IMAGE_ENTRIES.map(cloneSeoImageEntry),
};

const createBlankSeoPageEntry = () =>
  cloneSeoPageEntry({
    label: "Blank SEO Page",
    path: "",
    metaTitle: "",
    metaDescription: "",
    keywords: "",
    indexable: false,
    notes: "Use this row as a blank SEO template for a new page.",
    heroTitle: "",
    heroSubtitle: "",
    heroImageUrl: "",
    heroImageAlt: "",
    ctaLabel: "Explore Products",
    ctaHref: "/products",
    bodySections: [DEFAULT_SECTION],
    faqItems: [DEFAULT_FAQ],
  });

const normalizeSeoSettings = (value) => {
  const raw = value && typeof value === "object" ? value : {};
  const pages = Array.isArray(raw.pages) ? raw.pages : [];
  const imageAltTexts = Array.isArray(raw.imageAltTexts)
    ? raw.imageAltTexts
    : [];

  return {
    pages:
      pages.length > 0
        ? pages.map(cloneSeoPageEntry)
        : DEFAULT_SEO_SETTINGS.pages.map(cloneSeoPageEntry),
    imageAltTexts:
      imageAltTexts.length > 0
        ? imageAltTexts.map(cloneSeoImageEntry)
        : DEFAULT_SEO_SETTINGS.imageAltTexts.map(cloneSeoImageEntry),
  };
};

const SeoPagesPage = () => {
  const { token } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPageIndex, setUploadingPageIndex] = useState(null);
  const [seoSettings, setSeoSettings] = useState(DEFAULT_SEO_SETTINGS);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const setToast = useCallback((message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const fetchSeoSettings = useCallback(async () => {
    setLoading(true);
    try {
      const adminToken = token || localStorage.getItem("adminToken");
      if (!adminToken) {
        setLoading(false);
        return;
      }

      const data = await getData("/api/settings/admin/all", adminToken);
      if (data?.success && Array.isArray(data?.data)) {
        const seoRecord = data.data.find((setting) => setting?.key === "seoSettings");
        setSeoSettings(normalizeSeoSettings(seoRecord?.value));
      } else {
        setSeoSettings(DEFAULT_SEO_SETTINGS);
      }
    } catch (error) {
      console.warn("SEO settings fetch failed:", error);
      setToast("Failed to load SEO settings", "error");
    } finally {
      setLoading(false);
    }
  }, [setToast, token]);

  useEffect(() => {
    fetchSeoSettings();
  }, [fetchSeoSettings]);

  const saveSeoSettings = async () => {
    setSaving(true);
    try {
      const adminToken = token || localStorage.getItem("adminToken");
      const response = await putData(
        "/api/settings/admin/seoSettings",
        { value: seoSettings },
        adminToken,
      );

      if (response?.success) {
        setToast("SEO settings saved successfully.");
      } else {
        setToast(response?.message || "Failed to save SEO settings", "error");
      }
    } catch (error) {
      console.error("Failed to save SEO settings:", error);
      setToast("Failed to save SEO settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const addSeoPage = (blank = false) => {
    setSeoSettings((prev) => ({
      ...prev,
      pages: [
        ...prev.pages,
        blank
          ? createBlankSeoPageEntry()
          : cloneSeoPageEntry({ label: "New page", path: "/" }),
      ],
    }));
  };

  const updateSeoPageField = (pageIndex, field, value) => {
    setSeoSettings((prev) => ({
      ...prev,
      pages: prev.pages.map((item, index) =>
        index === pageIndex ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const updateBodySection = (pageIndex, sectionIndex, field, value) => {
    setSeoSettings((prev) => ({
      ...prev,
      pages: prev.pages.map((item, index) =>
        index === pageIndex
          ? {
              ...item,
              bodySections: item.bodySections.map((section, currentSectionIndex) =>
                currentSectionIndex === sectionIndex
                  ? { ...section, [field]: value }
                  : section,
              ),
            }
          : item,
      ),
    }));
  };

  const updateFaqItem = (pageIndex, faqIndex, field, value) => {
    setSeoSettings((prev) => ({
      ...prev,
      pages: prev.pages.map((item, index) =>
        index === pageIndex
          ? {
              ...item,
              faqItems: item.faqItems.map((faq, currentFaqIndex) =>
                currentFaqIndex === faqIndex ? { ...faq, [field]: value } : faq,
              ),
            }
          : item,
      ),
    }));
  };

  const handleHeroImageUpload = async (pageIndex, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const adminToken = token || localStorage.getItem("adminToken");
    if (!adminToken) {
      setToast("Admin session expired. Please login again.", "error");
      event.target.value = "";
      return;
    }

    try {
      setUploadingPageIndex(pageIndex);
      const uploadResponse = await uploadFile(file, adminToken);
      const uploadedUrl =
        uploadResponse?.data?.url ||
        uploadResponse?.url ||
        uploadResponse?.data?.image ||
        "";

      if (!uploadResponse?.success || !uploadedUrl) {
        throw new Error(uploadResponse?.message || "Image upload failed");
      }

      setSeoSettings((prev) => ({
        ...prev,
        pages: prev.pages.map((item, index) =>
          index === pageIndex
            ? {
                ...item,
                heroImageUrl: String(uploadedUrl).trim(),
                heroImageAlt:
                  String(item.heroImageAlt || "").trim() || String(item.label || "").trim(),
              }
            : item,
        ),
      }));
      setToast("SEO hero image uploaded.");
    } catch (error) {
      console.error("SEO hero image upload failed:", error);
      setToast(error?.message || "Image upload failed", "error");
    } finally {
      setUploadingPageIndex(null);
      event.target.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <MdFolderOpen className="text-2xl text-slate-500" />
            <div>
              <h1 className="text-xl font-semibold text-gray-800">
                SEO Pages Folder
              </h1>
              <p className="text-sm text-gray-500">
                Manage metadata, landing-page content, FAQs, CTA buttons, and hero banners.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outlined"
              startIcon={<MdRefresh />}
              onClick={fetchSeoSettings}
              disabled={saving}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<MdSave />}
              onClick={saveSeoSettings}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save SEO Settings"}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-teal-200 bg-teal-50/60 p-4 mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-teal-900">
                Blank SEO Landing Page Workspace
              </h3>
              <p className="mt-1 text-sm text-teal-800">
                Create hidden landing pages that go live on their own route after deployment, without adding them to site navigation.
              </p>
            </div>
            <Button
              variant="contained"
              size="small"
              startIcon={<MdAdd />}
              onClick={() => addSeoPage(true)}
              sx={{ bgcolor: "#0f766e", "&:hover": { bgcolor: "#115e59" } }}
            >
              Create Blank SEO Page
            </Button>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Page SEO Entries</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outlined"
                size="small"
                startIcon={<MdAdd />}
                onClick={() => addSeoPage(false)}
              >
                Add Page
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<MdAdd />}
                onClick={() => addSeoPage(true)}
                sx={{ bgcolor: "#0f766e", "&:hover": { bgcolor: "#115e59" } }}
              >
                Add Blank Page
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {seoSettings.pages.map((page, index) => (
              <div
                key={`${page.path || "page"}-${index}`}
                className="rounded-lg border border-gray-100 p-5"
              >
                <div className="flex items-center justify-between gap-3 mb-4">
                  <p className="text-sm font-semibold text-gray-800">
                    {page.label || `Page ${index + 1}`}
                  </p>
                  <Button
                    variant="text"
                    color="error"
                    size="small"
                    startIcon={<MdDeleteOutline />}
                    onClick={() =>
                      setSeoSettings((prev) => ({
                        ...prev,
                        pages: prev.pages.filter((_, pageIndex) => pageIndex !== index),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField
                    label="Page Label"
                    value={page.label}
                    onChange={(e) => updateSeoPageField(index, "label", e.target.value)}
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Route Path"
                    value={page.path}
                    onChange={(e) => updateSeoPageField(index, "path", e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="/protein-breakfast-guide"
                  />
                  <TextField
                    label="Meta Title"
                    value={page.metaTitle}
                    onChange={(e) => updateSeoPageField(index, "metaTitle", e.target.value)}
                    size="small"
                    fullWidth
                    className="md:col-span-2"
                  />
                  <TextField
                    label="Meta Description"
                    value={page.metaDescription}
                    onChange={(e) =>
                      updateSeoPageField(index, "metaDescription", e.target.value)
                    }
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    className="md:col-span-2"
                  />
                  <TextField
                    label="Keywords"
                    value={page.keywords}
                    onChange={(e) => updateSeoPageField(index, "keywords", e.target.value)}
                    size="small"
                    fullWidth
                    className="md:col-span-2"
                    placeholder="comma, separated, keywords"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={page.indexable}
                        onChange={(e) =>
                          updateSeoPageField(index, "indexable", e.target.checked)
                        }
                        color="warning"
                      />
                    }
                    label="Allow search indexing"
                  />
                  <TextField
                    label="Internal Notes"
                    value={page.notes}
                    onChange={(e) => updateSeoPageField(index, "notes", e.target.value)}
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    className="md:col-span-2"
                  />
                </div>

                <Divider className="!my-6" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField
                    label="Hero Heading"
                    value={page.heroTitle}
                    onChange={(e) => updateSeoPageField(index, "heroTitle", e.target.value)}
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Hero CTA Label"
                    value={page.ctaLabel}
                    onChange={(e) => updateSeoPageField(index, "ctaLabel", e.target.value)}
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Hero Subheading"
                    value={page.heroSubtitle}
                    onChange={(e) => updateSeoPageField(index, "heroSubtitle", e.target.value)}
                    size="small"
                    fullWidth
                    multiline
                    minRows={3}
                    className="md:col-span-2"
                  />
                  <TextField
                    label="CTA Link"
                    value={page.ctaHref}
                    onChange={(e) => updateSeoPageField(index, "ctaHref", e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="/products"
                  />
                  <TextField
                    label="Hero Image Alt"
                    value={page.heroImageAlt}
                    onChange={(e) =>
                      updateSeoPageField(index, "heroImageAlt", e.target.value)
                    }
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Hero Image URL"
                    value={page.heroImageUrl}
                    onChange={(e) =>
                      updateSeoPageField(index, "heroImageUrl", e.target.value)
                    }
                    size="small"
                    fullWidth
                    className="md:col-span-2"
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    component="label"
                    variant="outlined"
                    size="small"
                    startIcon={<MdUpload />}
                    disabled={uploadingPageIndex === index}
                  >
                    {uploadingPageIndex === index
                      ? "Uploading..."
                      : "Upload Hero Image"}
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(event) => void handleHeroImageUpload(index, event)}
                    />
                  </Button>
                  {page.heroImageUrl ? (
                    <div className="h-20 w-32 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                      <img
                        src={getImageUrl(page.heroImageUrl)}
                        alt={page.heroImageAlt || page.label || "SEO hero"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                </div>

                <Divider className="!my-6" />

                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h4 className="text-sm font-semibold text-gray-700">Body Sections</h4>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<MdAdd />}
                      onClick={() =>
                        updateSeoPageField(index, "bodySections", [
                          ...page.bodySections,
                          cloneBodySection(DEFAULT_SECTION),
                        ])
                      }
                    >
                      Add Section
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {page.bodySections.map((section, sectionIndex) => (
                      <div
                        key={`section-${sectionIndex}`}
                        className="rounded-lg border border-gray-100 p-4"
                      >
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <p className="text-sm font-medium text-gray-800">
                            Section {sectionIndex + 1}
                          </p>
                          <Button
                            variant="text"
                            color="error"
                            size="small"
                            startIcon={<MdDeleteOutline />}
                            onClick={() =>
                              updateSeoPageField(
                                index,
                                "bodySections",
                                page.bodySections.filter(
                                  (_, currentSectionIndex) =>
                                    currentSectionIndex !== sectionIndex,
                                ),
                              )
                            }
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          <TextField
                            label="Section Heading"
                            value={section.heading}
                            onChange={(e) =>
                              updateBodySection(
                                index,
                                sectionIndex,
                                "heading",
                                e.target.value,
                              )
                            }
                            size="small"
                            fullWidth
                          />
                          <TextField
                            label="Section Content"
                            value={section.content}
                            onChange={(e) =>
                              updateBodySection(
                                index,
                                sectionIndex,
                                "content",
                                e.target.value,
                              )
                            }
                            size="small"
                            fullWidth
                            multiline
                            minRows={4}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Divider className="!my-6" />

                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h4 className="text-sm font-semibold text-gray-700">FAQ Content</h4>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<MdAdd />}
                      onClick={() =>
                        updateSeoPageField(index, "faqItems", [
                          ...page.faqItems,
                          cloneFaqItem(DEFAULT_FAQ),
                        ])
                      }
                    >
                      Add FAQ
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {page.faqItems.map((faq, faqIndex) => (
                      <div
                        key={`faq-${faqIndex}`}
                        className="rounded-lg border border-gray-100 p-4"
                      >
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <p className="text-sm font-medium text-gray-800">
                            FAQ {faqIndex + 1}
                          </p>
                          <Button
                            variant="text"
                            color="error"
                            size="small"
                            startIcon={<MdDeleteOutline />}
                            onClick={() =>
                              updateSeoPageField(
                                index,
                                "faqItems",
                                page.faqItems.filter(
                                  (_, currentFaqIndex) => currentFaqIndex !== faqIndex,
                                ),
                              )
                            }
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          <TextField
                            label="Question"
                            value={faq.question}
                            onChange={(e) =>
                              updateFaqItem(index, faqIndex, "question", e.target.value)
                            }
                            size="small"
                            fullWidth
                          />
                          <TextField
                            label="Answer"
                            value={faq.answer}
                            onChange={(e) =>
                              updateFaqItem(index, faqIndex, "answer", e.target.value)
                            }
                            size="small"
                            fullWidth
                            multiline
                            minRows={3}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Divider className="!my-8" />

        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Image Alt Text Rules</h3>
            <Button
              variant="outlined"
              size="small"
              startIcon={<MdAdd />}
              onClick={() =>
                setSeoSettings((prev) => ({
                  ...prev,
                  imageAltTexts: [
                    ...prev.imageAltTexts,
                    cloneSeoImageEntry({ label: "New image" }),
                  ],
                }))
              }
            >
              Add Image Rule
            </Button>
          </div>

          <div className="space-y-4">
            {seoSettings.imageAltTexts.map((imageItem, index) => (
              <div
                key={`${imageItem.label || "image"}-${index}`}
                className="rounded-lg border border-gray-100 p-4"
              >
                <div className="flex items-center justify-between gap-3 mb-4">
                  <p className="text-sm font-semibold text-gray-800">
                    Image Rule {index + 1}
                  </p>
                  <Button
                    variant="text"
                    color="error"
                    size="small"
                    startIcon={<MdDeleteOutline />}
                    onClick={() =>
                      setSeoSettings((prev) => ({
                        ...prev,
                        imageAltTexts: prev.imageAltTexts.filter(
                          (_, imageIndex) => imageIndex !== index,
                        ),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField
                    label="Label"
                    value={imageItem.label}
                    onChange={(e) =>
                      setSeoSettings((prev) => ({
                        ...prev,
                        imageAltTexts: prev.imageAltTexts.map((item, imageIndex) =>
                          imageIndex === index ? { ...item, label: e.target.value } : item,
                        ),
                      }))
                    }
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Target / Asset"
                    value={imageItem.target}
                    onChange={(e) =>
                      setSeoSettings((prev) => ({
                        ...prev,
                        imageAltTexts: prev.imageAltTexts.map((item, imageIndex) =>
                          imageIndex === index ? { ...item, target: e.target.value } : item,
                        ),
                      }))
                    }
                    size="small"
                    fullWidth
                    placeholder="/product/[id]"
                  />
                  <TextField
                    label="Alt Text"
                    value={imageItem.altText}
                    onChange={(e) =>
                      setSeoSettings((prev) => ({
                        ...prev,
                        imageAltTexts: prev.imageAltTexts.map((item, imageIndex) =>
                          imageIndex === index ? { ...item, altText: e.target.value } : item,
                        ),
                      }))
                    }
                    size="small"
                    fullWidth
                    className="md:col-span-2"
                  />
                  <TextField
                    label="Title Text"
                    value={imageItem.titleText}
                    onChange={(e) =>
                      setSeoSettings((prev) => ({
                        ...prev,
                        imageAltTexts: prev.imageAltTexts.map((item, imageIndex) =>
                          imageIndex === index ? { ...item, titleText: e.target.value } : item,
                        ),
                      }))
                    }
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Notes"
                    value={imageItem.notes}
                    onChange={(e) =>
                      setSeoSettings((prev) => ({
                        ...prev,
                        imageAltTexts: prev.imageAltTexts.map((item, imageIndex) =>
                          imageIndex === index ? { ...item, notes: e.target.value } : item,
                        ),
                      }))
                    }
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    className="md:col-span-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default SeoPagesPage;
