"use client";

import { useAdmin } from "@/context/AdminContext";
import {
  deleteData,
  getData,
  postMultipartData,
  putData,
  uploadFile,
} from "@/utils/api";
import { Button, CircularProgress, MenuItem, Select, TextField } from "@mui/material";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { MdMailOutline } from "react-icons/md";
import Pagination from "@mui/material/Pagination";

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const resolveSiteUrl = (ctaUrl) => {
  try {
    const parsed = new URL(String(ctaUrl || "https://healthyonegram.com"));
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "https://healthyonegram.com";
  }
};

const resolveImageUrl = (value, fallback) => {
  const raw = String(value || "").trim();
  if (!raw) return fallback;

  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return raw;
    }
    return fallback;
  } catch {
    return fallback;
  }
};

const normalizeOptionalImageUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return raw;
    }
    return "";
  } catch {
    return "";
  }
};

const DEFAULT_LOGO_URL = "https://healthyonegram.com/logo-og-v2.png";
const DEFAULT_HERO_URL = "https://healthyonegram.com/logo-header.png";

const buildSimpleNewsletterHtml = ({
  title,
  greeting,
  intro,
  body,
  ctaLabel,
  ctaUrl,
  footer,
  logoUrl,
  showLogoImage,
  heroImageUrl,
  showHeroImage,
}) => {
  const normalizedBody = String(body || "")
    .split("\n")
    .map((line) => String(line || "").trim())
    .filter(Boolean);

  const bodyHtml = normalizedBody.length
    ? normalizedBody
        .map((line) => `<p style="margin:0 0 12px;">${escapeHtml(line)}</p>`)
        .join("")
    : "<p style=\"margin:0 0 12px;\">Thank you for being part of our community.</p>";

  const showCta = String(ctaLabel || "").trim() && String(ctaUrl || "").trim();
  const siteUrl = resolveSiteUrl(ctaUrl);
  const resolvedLogoUrl = resolveImageUrl(logoUrl, `${siteUrl}/logo-og-v2.png`);
  const resolvedHeroImageUrl = resolveImageUrl(
    heroImageUrl,
    `${siteUrl}/logo-header.png`,
  );

  return `
<div style="margin:0;padding:20px 0;background:#f4f6fb;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:700px;margin:0 auto;font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;background:#ffffff;border-radius:16px;overflow:hidden;">
    <tr>
      <td style="padding:18px 24px;background:#0f172a;text-align:center;">
        ${
          showLogoImage
            ? `<div style="display:inline-block;background:#ffffff;border-radius:10px;padding:8px 14px;">
          <img src="${escapeHtml(resolvedLogoUrl)}" alt="HealthyOneGram" style="max-width:180px;max-height:56px;height:auto;display:block;margin:0 auto;" />
        </div>`
            : ""
        }
        <p style="margin:0;color:#d1d5db;font-size:13px;letter-spacing:0.4px;">Healthy living, trusted choices</p>
      </td>
    </tr>

    <tr>
      <td style="padding:0;">
        <div style="background:linear-gradient(135deg,#111827 0%,#1f2937 45%,#c1591c 100%);padding:28px 24px;text-align:left;">
          <h1 style="margin:0 0 10px;color:#ffffff;font-size:34px;line-height:1.25;">${escapeHtml(title)}</h1>
          <p style="margin:0;color:#f8fafc;font-size:16px;">${escapeHtml(greeting)} {{email}}, ${escapeHtml(intro)}</p>
          ${
            showHeroImage
              ? `<div style="margin-top:18px;background:#ffffff14;border:1px solid #ffffff30;border-radius:12px;padding:8px;">
            <img src="${escapeHtml(resolvedHeroImageUrl)}" alt="HealthyOneGram" style="width:100%;max-width:652px;height:260px;border-radius:10px;display:block;object-fit:contain;background:#ffffff;" />
          </div>`
              : ""
          }
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:28px 24px 8px;background:#ffffff;">
        ${bodyHtml}
      </td>
    </tr>

    <tr>
      <td style="padding:0 24px 8px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;">
          <tr>
            <td style="padding:16px;">
              <h3 style="margin:0 0 10px;font-size:18px;color:#111827;">Why people love HealthyOneGram</h3>
              <p style="margin:0 0 8px;color:#374151;">• Premium quality products curated for health-focused families.</p>
              <p style="margin:0 0 8px;color:#374151;">• Faster delivery and transparent order support.</p>
              <p style="margin:0;color:#374151;">• Exclusive subscriber-only offers and updates.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:0 24px 8px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="width:33.33%;padding:8px;vertical-align:top;">
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px;min-height:88px;">
                <p style="margin:0 0 6px;font-size:12px;color:#9a3412;text-transform:uppercase;letter-spacing:.4px;">Fresh Picks</p>
                <p style="margin:0;color:#7c2d12;font-size:14px;">Curated products updated for this week.</p>
              </div>
            </td>
            <td style="width:33.33%;padding:8px;vertical-align:top;">
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px;min-height:88px;">
                <p style="margin:0 0 6px;font-size:12px;color:#1d4ed8;text-transform:uppercase;letter-spacing:.4px;">Member Perks</p>
                <p style="margin:0;color:#1e3a8a;font-size:14px;">Unlock newsletter-only discounts & rewards.</p>
              </div>
            </td>
            <td style="width:33.33%;padding:8px;vertical-align:top;">
              <div style="background:#ecfeff;border:1px solid #a5f3fc;border-radius:10px;padding:12px;min-height:88px;">
                <p style="margin:0 0 6px;font-size:12px;color:#0e7490;text-transform:uppercase;letter-spacing:.4px;">Wellness Tips</p>
                <p style="margin:0;color:#155e75;font-size:14px;">Practical ideas to stay healthy every day.</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${
      showCta
        ? `<tr>
      <td style="padding:20px 24px 24px;text-align:center;">
        <a href="${escapeHtml(
          ctaUrl,
        )}" style="display:inline-block;background:#c1591c;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:15px;">${escapeHtml(ctaLabel)}</a>
        <p style="margin:10px 0 0;color:#6b7280;font-size:13px;">Tap the button to explore latest products and offers.</p>
      </td>
    </tr>`
        : ""
    }

    <tr>
      <td style="padding:0 24px 26px;">
        <div style="border-top:1px solid #e5e7eb;padding-top:16px;">
          <p style="margin:0 0 8px;color:#111827;font-size:14px;">${escapeHtml(footer)}</p>
          <p style="margin:0;color:#6b7280;font-size:12px;">You are receiving this email because you subscribed at HealthyOneGram.</p>
        </div>
      </td>
    </tr>
  </table>
</div>
`.trim();
};

const SIMPLE_NEWSLETTER_PRESETS = {
  offer: {
    label: "Offer",
    subject: "Special Offer Just For You 🎉",
    template: {
      title: "Exclusive Offer From HealthyOneGram",
      greeting: "Hello",
      intro: "We have a limited-time offer for our subscribers.",
      body: "Use this special offer before it ends.\nShop your favorites and save more today.",
      ctaLabel: "Claim Offer",
      ctaUrl: "https://healthyonegram.com/products",
      footer: "Offer valid for a limited time. HealthyOneGram Team",
      logoUrl: "https://healthyonegram.com/logo-og-v2.png",
      showLogoImage: true,
      heroImageUrl: "https://healthyonegram.com/logo-header.png",
      showHeroImage: true,
    },
  },
  product: {
    label: "New Product",
    subject: "New Product Launch at HealthyOneGram",
    template: {
      title: "New Arrivals Are Here",
      greeting: "Hello",
      intro: "We just launched something new for you.",
      body: "Discover our latest products made for healthy living.\nBe the first to try them and share your feedback.",
      ctaLabel: "View New Products",
      ctaUrl: "https://healthyonegram.com/products",
      footer: "Thanks for supporting HealthyOneGram.",
      logoUrl: "https://healthyonegram.com/logo-og-v2.png",
      showLogoImage: true,
      heroImageUrl: "https://healthyonegram.com/logo-header.png",
      showHeroImage: true,
    },
  },
  festival: {
    label: "Festival",
    subject: "Festival Wishes from HealthyOneGram ✨",
    template: {
      title: "Season's Greetings from HealthyOneGram",
      greeting: "Dear",
      intro: "Wishing you and your family joy, health, and happiness.",
      body: "Celebrate this festive season with healthy choices.\nEnjoy special festive picks curated for you.",
      ctaLabel: "Shop Festive Picks",
      ctaUrl: "https://healthyonegram.com/products",
      footer: "Warm wishes, HealthyOneGram Team",
      logoUrl: "https://healthyonegram.com/logo-og-v2.png",
      showLogoImage: true,
      heroImageUrl: "https://healthyonegram.com/logo-header.png",
      showHeroImage: true,
    },
  },
};

const NewsletterPage = () => {
  const { token, isAuthenticated, loading } = useAdmin();
  const router = useRouter();

  const [subscribers, setSubscribers] = useState([]);
  const [stats, setStats] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [templateSubject, setTemplateSubject] = useState(
    "Latest updates from HealthyOneGram",
  );
  const [templateHtml, setTemplateHtml] = useState("");
  const [templateLoading, setTemplateLoading] = useState(true);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [sendingSegmentCampaign, setSendingSegmentCampaign] = useState(false);
  const [uploadingLogoImage, setUploadingLogoImage] = useState(false);
  const [uploadingHeroImage, setUploadingHeroImage] = useState(false);
  const [showLogoCustomize, setShowLogoCustomize] = useState(false);
  const [showHeroCustomize, setShowHeroCustomize] = useState(false);
  const [broadcastAttachments, setBroadcastAttachments] = useState([]);
  const [automationSaving, setAutomationSaving] = useState(false);
  const [automationSettings, setAutomationSettings] = useState({
    enabled: true,
    feedbackEnabled: true,
    retentionEnabled: true,
    feedbackDelayDays: 7,
    retentionDelayDays: 30,
    pollIntervalMinutes: 30,
    maxEmailsPerRun: 100,
    retryGapHours: 12,
    sendHourIST: 10,
    retentionCouponCode: "WELCOME10",
    retentionDiscountText: "Get 10% OFF on your next order",
  });
  const [campaignSegment, setCampaignSegment] = useState("all");
  const [campaignInactiveDays, setCampaignInactiveDays] = useState("30");
  const [campaignManualEmails, setCampaignManualEmails] = useState("");
  const [segmentPreview, setSegmentPreview] = useState({ count: 0, sample: [] });
  const [emailLogs, setEmailLogs] = useState([]);
  const [emailLogSummary, setEmailLogSummary] = useState(null);
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);
  const [editorMode, setEditorMode] = useState("simple");
  const logoImageFileInputRef = useRef(null);
  const heroImageFileInputRef = useRef(null);
  const [simpleTemplate, setSimpleTemplate] = useState({
    title: "HealthyOneGram Newsletter",
    greeting: "Hello",
    intro: "Thanks for being part of our community.",
    body: "This is your newsletter content preview.\nUpdate this template from the admin panel before sending.",
    ctaLabel: "Explore Products",
    ctaUrl: "https://healthyonegram.com/products",
    footer: "Regards, HealthyOneGram Team",
    logoUrl: DEFAULT_LOGO_URL,
    showLogoImage: true,
    heroImageUrl: DEFAULT_HERO_URL,
    showHeroImage: true,
  });

  const restoreBothImages = () => {
    setSimpleTemplate((prev) => ({
      ...prev,
      logoUrl: DEFAULT_LOGO_URL,
      showLogoImage: true,
      heroImageUrl: DEFAULT_HERO_URL,
      showHeroImage: true,
    }));
    toast.success("Logo and hero images restored");
  };

  const applySimplePreset = (presetKey) => {
    const preset = SIMPLE_NEWSLETTER_PRESETS[presetKey];
    if (!preset) return;

    setTemplateSubject(preset.subject);
    setSimpleTemplate((prev) => ({
      ...prev,
      ...preset.template,
      showLogoImage: preset.template?.showLogoImage !== false,
      showHeroImage: preset.template?.showHeroImage !== false,
    }));
    toast.success(`${preset.label} template applied`);
  };

  const fetchSubscribers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getData(
        `/api/newsletter/subscribers?page=${page}&limit=20&status=${statusFilter}`,
        token,
      );

      if (response.success) {
        setSubscribers(response.subscribers || []);
        setStats(response.stats || null);
        setTotalPages(response.pagination?.pages || 1);
      } else {
        setSubscribers([]);
        setStats(null);
      }
    } catch (error) {
      console.error("Failed to fetch subscribers:", error);
      setSubscribers([]);
      setStats(null);
    }
    setIsLoading(false);
  }, [page, statusFilter, token]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchSubscribers();
    }
  }, [isAuthenticated, token, fetchSubscribers]);

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!isAuthenticated || !token) return;
      setTemplateLoading(true);
      const response = await getData("/api/newsletter/admin/template", token);
      if (response?.success && response?.data) {
        setTemplateSubject(
          response.data.subject || "Latest updates from HealthyOneGram",
        );
        setTemplateHtml(response.data.html || "");
      }
      setTemplateLoading(false);
    };

    fetchTemplate();
  }, [isAuthenticated, token]);

  const fetchAutomationSettings = useCallback(async () => {
    if (!token) return;
    const response = await getData("/api/email/admin/automation/settings", token);
    if (response?.success && response?.data?.value) {
      setAutomationSettings((prev) => ({
        ...prev,
        ...response.data.value,
      }));
    }
  }, [token]);

  const fetchEmailLogs = useCallback(async () => {
    if (!token) return;
    setEmailLogsLoading(true);
    const response = await getData("/api/email/admin/logs?days=30&page=1&limit=20", token);
    if (response?.success) {
      setEmailLogs(Array.isArray(response.data) ? response.data : []);
      setEmailLogSummary(response.summary || null);
    }
    setEmailLogsLoading(false);
  }, [token]);

  const fetchSegmentPreview = useCallback(async () => {
    if (!token) return;
    const response = await getData(
      `/api/email/admin/targeting/preview?segment=${encodeURIComponent(
        campaignSegment,
      )}&inactiveDays=${encodeURIComponent(campaignInactiveDays || "30")}`,
      token,
    );
    if (response?.success && response?.data) {
      setSegmentPreview(response.data);
    }
  }, [campaignInactiveDays, campaignSegment, token]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchAutomationSettings();
      fetchEmailLogs();
    }
  }, [isAuthenticated, token, fetchAutomationSettings, fetchEmailLogs]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchSegmentPreview();
    }
  }, [isAuthenticated, token, fetchSegmentPreview]);

  useEffect(() => {
    if (editorMode !== "simple") return;
    setTemplateHtml(buildSimpleNewsletterHtml(simpleTemplate));
  }, [editorMode, simpleTemplate]);

  const previewSiteUrl = resolveSiteUrl(simpleTemplate.ctaUrl);
  const previewLogoUrl = resolveImageUrl(
    simpleTemplate.logoUrl,
    `${previewSiteUrl}/logo-og-v2.png`,
  );
  const previewHeroUrl = resolveImageUrl(
    simpleTemplate.heroImageUrl,
    `${previewSiteUrl}/logo-header.png`,
  );

  const handleHeroImageUpload = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;

    try {
      setUploadingHeroImage(true);
      const response = await uploadFile(file, token);
      const uploadedUrl = String(response?.data?.url || "").trim();

      if (!response?.success || !uploadedUrl) {
        toast.error(response?.message || "Hero image upload failed");
        return;
      }

      setSimpleTemplate((prev) => ({
        ...prev,
        heroImageUrl: uploadedUrl,
        showHeroImage: true,
      }));
      toast.success("Hero image uploaded");
    } catch {
      toast.error("Hero image upload failed");
    } finally {
      setUploadingHeroImage(false);
      if (event?.target) {
        event.target.value = "";
      }
    }
  };

  const handleLogoImageUpload = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;

    try {
      setUploadingLogoImage(true);
      const response = await uploadFile(file, token);
      const uploadedUrl = String(response?.data?.url || "").trim();

      if (!response?.success || !uploadedUrl) {
        toast.error(response?.message || "Logo image upload failed");
        return;
      }

      setSimpleTemplate((prev) => ({
        ...prev,
        logoUrl: uploadedUrl,
        showLogoImage: true,
      }));
      toast.success("Logo image uploaded");
    } catch {
      toast.error("Logo image upload failed");
    } finally {
      setUploadingLogoImage(false);
      if (event?.target) {
        event.target.value = "";
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this subscriber?")) return;
    try {
      const response = await deleteData(`/api/newsletter/subscribers/${id}`, token);
      if (response.success) {
        toast.success("Subscriber deleted");
        fetchSubscribers();
      } else {
        toast.error(response.message || "Failed to delete subscriber");
      }
    } catch (error) {
      toast.error("Failed to delete subscriber");
    }
  };

  const handleSaveTemplate = async () => {
    if (!String(templateSubject || "").trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!String(templateHtml || "").trim()) {
      toast.error("Template HTML is required");
      return;
    }

    setTemplateSaving(true);
    const response = await putData(
      "/api/newsletter/admin/template",
      {
        subject: templateSubject,
        html: templateHtml,
      },
      token,
    );

    if (response?.success) {
      toast.success("Newsletter template saved");
    } else {
      toast.error(response?.message || "Failed to save template");
    }
    setTemplateSaving(false);
  };

  const handleSendBroadcast = async () => {
    if (!String(templateSubject || "").trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!String(templateHtml || "").trim()) {
      toast.error("Template HTML is required");
      return;
    }

    if (!confirm("Send newsletter broadcast to subscribers now?")) return;

    setSendingBroadcast(true);
    const payload = new FormData();
    payload.append("subject", templateSubject);
    payload.append("html", templateHtml);
    payload.append("status", "active");
    broadcastAttachments.forEach((file) => {
      payload.append("attachments", file);
    });

    const response = await postMultipartData(
      "/api/newsletter/admin/send-broadcast",
      payload,
      token,
    );

    if (response?.success) {
      const result = response?.data || {};
      toast.success(
        `Broadcast done: ${result.sent || 0} sent, ${result.failed || 0} failed`,
      );
    } else {
      toast.error(response?.message || "Broadcast failed");
    }
    setSendingBroadcast(false);
  };

  const handleSaveAutomationSettings = async () => {
    setAutomationSaving(true);
    const response = await putData(
      "/api/email/admin/automation/settings",
      automationSettings,
      token,
    );

    if (response?.success) {
      toast.success("Automation settings saved");
      await fetchAutomationSettings();
    } else {
      toast.error(response?.message || "Failed to save automation settings");
    }
    setAutomationSaving(false);
  };

  const parseManualEmails = () =>
    String(campaignManualEmails || "")
      .split(/[\n,;\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);

  const handleSendSegmentCampaign = async () => {
    if (!String(templateSubject || "").trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!String(templateHtml || "").trim()) {
      toast.error("Template HTML is required");
      return;
    }

    if (!confirm("Send targeted promotional campaign now?")) return;

    setSendingSegmentCampaign(true);
    const response = await postMultipartData(
      "/api/email/admin/campaign/send",
      {
        subject: templateSubject,
        html: templateHtml,
        segment: campaignSegment,
        inactiveDays: campaignInactiveDays,
        manualEmails: parseManualEmails(),
      },
      token,
    );

    if (response?.success) {
      const data = response?.data || {};
      toast.success(
        `Campaign done: ${data.sent || 0} sent, ${data.failed || 0} failed, ${data.skipped || 0} skipped`,
      );
      await fetchEmailLogs();
    } else {
      toast.error(response?.message || "Campaign send failed");
    }
    setSendingSegmentCampaign(false);
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Newsletter</h1>
          <p className="text-gray-500">Manage newsletter subscribers</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
          <Button variant="outlined" onClick={fetchSubscribers}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <MdMailOutline className="text-xl text-orange-500" />
            <h2 className="font-semibold text-gray-800">Subscribers</h2>
          </div>
          <p className="text-gray-600 text-sm">
            Total: {stats?.total || 0}
          </p>
          <p className="text-gray-600 text-sm">
            Active: {stats?.active || 0}
          </p>
          <p className="text-gray-600 text-sm">
            Inactive: {stats?.inactive || 0}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Newsletter HTML Editor
            </h2>
            <p className="text-sm text-gray-500">
              Save template and preview before broadcast.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outlined"
              onClick={handleSaveTemplate}
              disabled={templateSaving || templateLoading}
            >
              {templateSaving ? "Saving..." : "Save Template"}
            </Button>
            <Button
              variant="contained"
              onClick={handleSendBroadcast}
              disabled={sendingBroadcast || templateLoading}
              sx={{ bgcolor: "#c1591c", "&:hover": { bgcolor: "#a04a15" } }}
            >
              {sendingBroadcast ? "Sending..." : "Send Broadcast"}
            </Button>
          </div>
        </div>

        {templateLoading ? (
          <div className="flex justify-center py-8">
            <CircularProgress size={26} />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  size="small"
                  variant={editorMode === "simple" ? "contained" : "outlined"}
                  onClick={() => setEditorMode("simple")}
                >
                  Simple Writer
                </Button>
                <Button
                  size="small"
                  variant={editorMode === "html" ? "contained" : "outlined"}
                  onClick={() => setEditorMode("html")}
                >
                  HTML Editor
                </Button>
              </div>

              <TextField
                label="Subject"
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />

              {editorMode === "simple" ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => applySimplePreset("offer")}
                    >
                      Offer Preset
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => applySimplePreset("product")}
                    >
                      New Product Preset
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => applySimplePreset("festival")}
                    >
                      Festival Preset
                    </Button>
                  </div>
                  <TextField
                    label="Title"
                    value={simpleTemplate.title}
                    onChange={(e) =>
                      setSimpleTemplate((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Greeting"
                    value={simpleTemplate.greeting}
                    onChange={(e) =>
                      setSimpleTemplate((prev) => ({
                        ...prev,
                        greeting: e.target.value,
                      }))
                    }
                    fullWidth
                    size="small"
                    helperText="Example: Hello"
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Intro Line"
                    value={simpleTemplate.intro}
                    onChange={(e) =>
                      setSimpleTemplate((prev) => ({
                        ...prev,
                        intro: e.target.value,
                      }))
                    }
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Main Message"
                    value={simpleTemplate.body}
                    onChange={(e) =>
                      setSimpleTemplate((prev) => ({
                        ...prev,
                        body: e.target.value,
                      }))
                    }
                    multiline
                    minRows={6}
                    fullWidth
                    helperText="Write each new paragraph on a new line"
                    InputLabelProps={{ shrink: true }}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <TextField
                      label="Button Text"
                      value={simpleTemplate.ctaLabel}
                      onChange={(e) =>
                        setSimpleTemplate((prev) => ({
                          ...prev,
                          ctaLabel: e.target.value,
                        }))
                      }
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label="Button Link"
                      value={simpleTemplate.ctaUrl}
                      onChange={(e) =>
                        setSimpleTemplate((prev) => ({
                          ...prev,
                          ctaUrl: e.target.value,
                        }))
                      }
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <TextField
                      label="Logo URL"
                      value={simpleTemplate.logoUrl}
                      onChange={(e) =>
                        setSimpleTemplate((prev) => ({
                          ...prev,
                          logoUrl: e.target.value,
                        }))
                      }
                      fullWidth
                      size="small"
                      helperText="Recommended transparent logo, max height around 56px"
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label="Hero Image URL"
                      value={simpleTemplate.heroImageUrl}
                      onChange={(e) =>
                        setSimpleTemplate((prev) => ({
                          ...prev,
                          heroImageUrl: e.target.value,
                        }))
                      }
                      fullWidth
                      size="small"
                      helperText="Recommended wide image (e.g. 1200x600)"
                      InputLabelProps={{ shrink: true }}
                    />
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="small"
                        variant={showLogoCustomize ? "contained" : "outlined"}
                        onClick={() => setShowLogoCustomize((prev) => !prev)}
                      >
                        Customize Logo Image
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setSimpleTemplate((prev) => ({
                            ...prev,
                            showLogoImage: true,
                          }));
                        }}
                      >
                        Fix Show
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => {
                          setSimpleTemplate((prev) => ({
                            ...prev,
                            showLogoImage: false,
                          }));
                        }}
                      >
                        Delete Logo
                      </Button>
                    </div>

                    {showLogoCustomize ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              logoImageFileInputRef.current?.click();
                            }}
                            disabled={uploadingLogoImage}
                          >
                            {uploadingLogoImage ? "Uploading..." : "Upload Local Logo"}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setSimpleTemplate((prev) => ({
                                ...prev,
                                logoUrl: DEFAULT_LOGO_URL,
                                showLogoImage: true,
                              }));
                            }}
                          >
                            Change to Default
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setSimpleTemplate((prev) => ({
                                ...prev,
                                logoUrl: normalizeOptionalImageUrl(prev.logoUrl),
                                showLogoImage: true,
                              }));
                            }}
                          >
                            Edit/Fix URL
                          </Button>
                        </div>
                        <input
                          ref={logoImageFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoImageUpload}
                          className="hidden"
                        />
                        <p className="text-xs text-gray-600">
                          You can use URL, upload local image, change, fix, or delete the logo.
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="small"
                        variant={showHeroCustomize ? "contained" : "outlined"}
                        onClick={() => setShowHeroCustomize((prev) => !prev)}
                      >
                        Customize Hero Image
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setSimpleTemplate((prev) => ({
                            ...prev,
                            showHeroImage: true,
                          }));
                        }}
                      >
                        Fix Show
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => {
                          setSimpleTemplate((prev) => ({
                            ...prev,
                            showHeroImage: false,
                          }));
                        }}
                      >
                        Delete Hero
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={restoreBothImages}
                      >
                        Restore Both Images
                      </Button>
                    </div>

                    {showHeroCustomize ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              heroImageFileInputRef.current?.click();
                            }}
                            disabled={uploadingHeroImage}
                          >
                            {uploadingHeroImage ? "Uploading..." : "Upload Local Image"}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setSimpleTemplate((prev) => ({
                                ...prev,
                                heroImageUrl: DEFAULT_HERO_URL,
                                showHeroImage: true,
                              }));
                            }}
                          >
                            Change to Default
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setSimpleTemplate((prev) => ({
                                ...prev,
                                heroImageUrl: normalizeOptionalImageUrl(prev.heroImageUrl),
                                showHeroImage: true,
                              }));
                            }}
                          >
                            Edit/Fix URL
                          </Button>
                        </div>
                        <input
                          ref={heroImageFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleHeroImageUpload}
                          className="hidden"
                        />
                        <p className="text-xs text-gray-600">
                          You can use URL, upload local image, change, fix, or delete the hero image.
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="border border-gray-200 rounded-lg bg-gray-50 p-2">
                      <p className="text-xs font-semibold text-gray-600 mb-2">
                        Logo Preview
                      </p>
                      <div className="h-16 rounded-md bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                        {simpleTemplate.showLogoImage ? (
                          <img
                            src={previewLogoUrl}
                            alt="Logo preview"
                            className="max-h-12 max-w-full object-contain"
                            onError={(event) => {
                              event.currentTarget.src = `${previewSiteUrl}/logo-og-v2.png`;
                            }}
                          />
                        ) : (
                          <p className="text-xs text-gray-500">Logo image is hidden</p>
                        )}
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg bg-gray-50 p-2">
                      <p className="text-xs font-semibold text-gray-600 mb-2">
                        Hero Preview
                      </p>
                      <div className="h-24 rounded-md bg-white border border-gray-200 overflow-hidden flex items-center justify-center">
                        {simpleTemplate.showHeroImage ? (
                          <img
                            src={previewHeroUrl}
                            alt="Hero preview"
                            className="w-full h-full object-contain"
                            onError={(event) => {
                              event.currentTarget.src = `${previewSiteUrl}/logo-header.png`;
                            }}
                          />
                        ) : (
                          <p className="text-xs text-gray-500">Hero image is hidden</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <TextField
                    label="Footer Line"
                    value={simpleTemplate.footer}
                    onChange={(e) =>
                      setSimpleTemplate((prev) => ({
                        ...prev,
                        footer: e.target.value,
                      }))
                    }
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                  <p className="text-xs text-gray-500">
                    Simple Writer auto-generates HTML and keeps the preview updated.
                  </p>
                </div>
              ) : (
                <TextField
                  label="HTML"
                  value={templateHtml}
                  onChange={(e) => setTemplateHtml(e.target.value)}
                  multiline
                  minRows={14}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              )}

              <div>
                <p className="text-xs text-gray-600 mb-1">
                  Attach files (images or PDF, max 5 files)
                </p>
                <input
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setBroadcastAttachments(files.slice(0, 5));
                  }}
                  className="block w-full text-sm text-gray-700"
                />
                {broadcastAttachments.length > 0 ? (
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {broadcastAttachments.map((file) => file.name).join(", ")}
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Preview</p>
              <iframe
                title="Newsletter Preview"
                srcDoc={templateHtml}
                className="w-full h-96 border border-gray-200 rounded-lg bg-white"
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Automation Controls</h2>
            <p className="text-sm text-gray-500">Set delays, scheduler frequency, and send time (IST).</p>
          </div>
          <Button
            variant="outlined"
            onClick={handleSaveAutomationSettings}
            disabled={automationSaving}
          >
            {automationSaving ? "Saving..." : "Save Automation"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <TextField
            label="Feedback Delay (days)"
            value={automationSettings.feedbackDelayDays}
            onChange={(e) =>
              setAutomationSettings((prev) => ({
                ...prev,
                feedbackDelayDays: Number(e.target.value || 7),
              }))
            }
            size="small"
            fullWidth
          />
          <TextField
            label="Retention Delay (days)"
            value={automationSettings.retentionDelayDays}
            onChange={(e) =>
              setAutomationSettings((prev) => ({
                ...prev,
                retentionDelayDays: Number(e.target.value || 30),
              }))
            }
            size="small"
            fullWidth
          />
          <TextField
            label="Send Hour IST (0-23)"
            value={automationSettings.sendHourIST}
            onChange={(e) =>
              setAutomationSettings((prev) => ({
                ...prev,
                sendHourIST: Number(e.target.value || 10),
              }))
            }
            size="small"
            fullWidth
          />
          <TextField
            label="Poll Interval (minutes)"
            value={automationSettings.pollIntervalMinutes}
            onChange={(e) =>
              setAutomationSettings((prev) => ({
                ...prev,
                pollIntervalMinutes: Number(e.target.value || 30),
              }))
            }
            size="small"
            fullWidth
          />
          <TextField
            label="Max Emails Per Run"
            value={automationSettings.maxEmailsPerRun}
            onChange={(e) =>
              setAutomationSettings((prev) => ({
                ...prev,
                maxEmailsPerRun: Number(e.target.value || 100),
              }))
            }
            size="small"
            fullWidth
          />
          <TextField
            label="Retry Gap (hours)"
            value={automationSettings.retryGapHours}
            onChange={(e) =>
              setAutomationSettings((prev) => ({
                ...prev,
                retryGapHours: Number(e.target.value || 12),
              }))
            }
            size="small"
            fullWidth
          />
          <TextField
            label="Retention Coupon"
            value={automationSettings.retentionCouponCode}
            onChange={(e) =>
              setAutomationSettings((prev) => ({
                ...prev,
                retentionCouponCode: e.target.value,
              }))
            }
            size="small"
            fullWidth
          />
          <TextField
            label="Retention Offer Text"
            value={automationSettings.retentionDiscountText}
            onChange={(e) =>
              setAutomationSettings((prev) => ({
                ...prev,
                retentionDiscountText: e.target.value,
              }))
            }
            size="small"
            fullWidth
          />
          <TextField
            label="Enabled Flags (1=true, 0=false): enabled, feedback, retention"
            value={`${automationSettings.enabled ? 1 : 0}, ${automationSettings.feedbackEnabled ? 1 : 0}, ${automationSettings.retentionEnabled ? 1 : 0}`}
            onChange={(e) => {
              const [enabledRaw, feedbackRaw, retentionRaw] = String(
                e.target.value || "",
              )
                .split(",")
                .map((item) => item.trim());
              setAutomationSettings((prev) => ({
                ...prev,
                enabled: enabledRaw !== "0",
                feedbackEnabled: feedbackRaw !== "0",
                retentionEnabled: retentionRaw !== "0",
              }));
            }}
            size="small"
            fullWidth
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Targeted Campaign</h2>
          <p className="text-sm text-gray-500">Send current newsletter HTML to a specific segment or manual emails.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select
            size="small"
            value={campaignSegment}
            onChange={(e) => setCampaignSegment(e.target.value)}
          >
            <MenuItem value="all">All users</MenuItem>
            <MenuItem value="new">New customers</MenuItem>
            <MenuItem value="repeat">Repeat customers</MenuItem>
            <MenuItem value="inactive">Inactive users</MenuItem>
          </Select>
          <TextField
            label="Inactive window (days)"
            value={campaignInactiveDays}
            onChange={(e) => setCampaignInactiveDays(e.target.value)}
            size="small"
            fullWidth
          />
          <Button variant="outlined" onClick={fetchSegmentPreview}>Refresh Segment Preview</Button>
        </div>
        <TextField
          label="Manual Emails (optional, comma/newline separated)"
          value={campaignManualEmails}
          onChange={(e) => setCampaignManualEmails(e.target.value)}
          multiline
          minRows={3}
          fullWidth
        />
        <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          <p>Target count: {segmentPreview?.count || 0}</p>
          <p className="text-xs text-gray-500 mt-1">
            Sample: {(segmentPreview?.sample || []).map((item) => item.email).join(", ") || "No sample"}
          </p>
        </div>
        <div>
          <Button
            variant="contained"
            onClick={handleSendSegmentCampaign}
            disabled={sendingSegmentCampaign}
            sx={{ bgcolor: "#1f4f8f", "&:hover": { bgcolor: "#163b6b" } }}
          >
            {sendingSegmentCampaign ? "Sending..." : "Send Targeted Campaign"}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Email Logs & Analytics</h2>
            <p className="text-sm text-gray-500">Last 30 days delivery summary and latest logs.</p>
          </div>
          <Button variant="outlined" onClick={fetchEmailLogs}>Refresh Logs</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            Sent: {emailLogSummary?.totals?.sent || 0}
          </div>
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            Failed: {emailLogSummary?.totals?.failed || 0}
          </div>
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Skipped: {emailLogSummary?.totals?.skipped || 0}
          </div>
        </div>
        {emailLogsLoading ? (
          <div className="flex justify-center py-4">
            <CircularProgress size={24} />
          </div>
        ) : emailLogs.length === 0 ? (
          <p className="text-sm text-gray-500">No email logs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Email</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Subject</th>
                  <th className="text-left px-3 py-2">Sent At</th>
                </tr>
              </thead>
              <tbody>
                {emailLogs.map((logItem) => (
                  <tr key={logItem._id} className="border-b">
                    <td className="px-3 py-2">{logItem.email_type}</td>
                    <td className="px-3 py-2">{logItem.to_email}</td>
                    <td className="px-3 py-2">{logItem.status}</td>
                    <td className="px-3 py-2">{logItem.subject}</td>
                    <td className="px-3 py-2">
                      {logItem.sent_at ? new Date(logItem.sent_at).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <CircularProgress size={28} />
          </div>
        ) : subscribers.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No subscribers found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left text-sm font-semibold text-gray-600 px-4 py-2">
                      Email
                    </th>
                    <th className="text-left text-sm font-semibold text-gray-600 px-4 py-2">
                      Status
                    </th>
                    <th className="text-left text-sm font-semibold text-gray-600 px-4 py-2">
                      Source
                    </th>
                    <th className="text-left text-sm font-semibold text-gray-600 px-4 py-2">
                      Subscribed At
                    </th>
                    <th className="text-left text-sm font-semibold text-gray-600 px-4 py-2">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((subscriber) => (
                    <tr key={subscriber._id} className="border-b">
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {subscriber.email}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {subscriber.isActive ? "Active" : "Inactive"}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {subscriber.source || "unknown"}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {subscriber.subscribedAt
                          ? new Date(subscriber.subscribedAt).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleDelete(subscriber._id)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center py-6">
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                showFirstButton
                showLastButton
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NewsletterPage;
