"use client";

import { useAdmin } from "@/context/AdminContext";
import {
  fetchCrmWhatsappConfig,
  saveCrmWhatsappConfig,
} from "@/services/crmApi";
import {
  Alert,
  Button,
  CircularProgress,
  TextField,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";

const EMPTY_FORM = {
  accessToken: "",
  phoneNumberId: "",
  businessAccountId: "",
  graphApiVersion: "v25.0",
  webhookVerifyToken: "",
  appSecret: "",
};

const formatDateTime = (value) => {
  if (!value) return "Not saved yet";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not saved yet";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

const toneClassByState = (state = "unknown") => {
  if (state === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (state === "sender_warning")
    return "border-amber-200 bg-amber-50 text-amber-800";
  if (state === "health_check_timeout")
    return "border-sky-200 bg-sky-50 text-sky-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
};

const sourceBadgeClass = (value = "missing") => {
  if (value === "database") return "bg-emerald-100 text-emerald-700";
  if (value === "environment") return "bg-amber-100 text-amber-700";
  if (value === "loading") return "bg-sky-100 text-sky-700";
  if (value === "unavailable") return "bg-slate-200 text-slate-700";
  return "bg-slate-100 text-slate-600";
};

const prettifyKey = (value = "") =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function WhatsappConfigPage() {
  const { token, isAuthenticated, loading } = useAdmin();
  const router = useRouter();

  const [form, setForm] = useState(EMPTY_FORM);
  const [configMeta, setConfigMeta] = useState(null);
  const [summary, setSummary] = useState(null);
  const [health, setHealth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loadTimeout, setLoadTimeout] = useState(false);

  const sourceEntries = useMemo(() => {
    if (isLoading && !configMeta) {
      return [
        { label: "Access Token", value: "loading" },
        { label: "Phone Number ID", value: "loading" },
        { label: "Business Account ID", value: "loading" },
        { label: "Webhook Verify Token", value: "loading" },
        { label: "App Secret", value: "loading" },
      ];
    }

    if (loadError && !configMeta) {
      return [
        { label: "Access Token", value: "unavailable" },
        { label: "Phone Number ID", value: "unavailable" },
        { label: "Business Account ID", value: "unavailable" },
        { label: "Webhook Verify Token", value: "unavailable" },
        { label: "App Secret", value: "unavailable" },
      ];
    }

    const sources = configMeta?.sources || {};

    return [
      { label: "Access Token", value: sources.accessToken || "missing" },
      { label: "Phone Number ID", value: sources.phoneNumberId || "missing" },
      {
        label: "Business Account ID",
        value: sources.businessAccountId || "missing",
      },
      {
        label: "Webhook Verify Token",
        value: sources.webhookVerifyToken || "missing",
      },
      { label: "App Secret", value: sources.appSecret || "missing" },
    ];
  }, [configMeta, isLoading, loadError]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const loadConfig = async () => {
      setIsLoading(true);
      setLoadError("");
      setLoadTimeout(false);

      // Set a 10 second timeout to prevent indefinite loading
      const timeoutId = setTimeout(() => {
        setLoadTimeout(true);
        setIsLoading(false);
      }, 10000);

      try {
        const response = await fetchCrmWhatsappConfig(token);
        clearTimeout(timeoutId);

        if (!response?.success) {
          throw new Error(
            response?.message || "Failed to load WhatsApp runtime config.",
          );
        }

        const nextConfig = response.data?.config || {};
        setForm({
          accessToken: nextConfig.accessToken || "",
          phoneNumberId: nextConfig.phoneNumberId || "",
          businessAccountId: nextConfig.businessAccountId || "",
          graphApiVersion: nextConfig.graphApiVersion || "v25.0",
          webhookVerifyToken: nextConfig.webhookVerifyToken || "",
          appSecret: nextConfig.appSecret || "",
        });
        setConfigMeta(nextConfig);
        setSummary(response.data?.summary || null);
        setHealth(response.data?.health || null);
      } catch (error) {
        const nextMessage =
          error?.message || "Failed to load WhatsApp runtime config.";
        setLoadError(nextMessage);
        toast.error(nextMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [isAuthenticated, token]);

  const handleSave = async () => {
    if (!token) {
      toast.error("Admin session missing");
      return;
    }

    setIsSaving(true);
    try {
      const response = await saveCrmWhatsappConfig(form, token);
      if (!response?.success) {
        throw new Error(
          response?.message || "Failed to save WhatsApp runtime config.",
        );
      }

      const nextConfig = response.data?.config || {};
      setForm({
        accessToken: nextConfig.accessToken || "",
        phoneNumberId: nextConfig.phoneNumberId || "",
        businessAccountId: nextConfig.businessAccountId || "",
        graphApiVersion: nextConfig.graphApiVersion || "v25.0",
        webhookVerifyToken: nextConfig.webhookVerifyToken || "",
        appSecret: nextConfig.appSecret || "",
      });
      setConfigMeta(nextConfig);
      setSummary(response.data?.summary || null);
      setHealth(response.data?.health || null);
      toast.success(
        response?.message || "WhatsApp runtime configuration updated.",
      );
    } catch (error) {
      toast.error(error?.message || "Failed to save WhatsApp config.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  return (
    <section className="p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
                CRM Child Page
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">
                WhatsApp Runtime Config
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Update Cloud API credentials and webhook verification values
                from admin. Saved values override environment variables and are
                picked up live by the deployed backend within a few seconds.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Last saved: {formatDateTime(configMeta?.updatedAt)}
            </div>
          </div>
        </div>

        {health ? (
          <div
            className={`rounded-3xl border px-5 py-4 text-sm ${toneClassByState(
              health.state,
            )}`}
          >
            <p className="font-semibold">
              {prettifyKey(health.state || "needs_check")}
            </p>
            <p className="mt-1">{health.message || "Health check unavailable."}</p>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            {isLoading && !loadTimeout ? (
              <div className="flex justify-center py-16">
                <CircularProgress />
              </div>
            ) : loadTimeout ? (
              <Alert severity="warning" className="mb-4">
                The configuration is taking longer than expected to load. Please try refreshing the page.
              </Alert>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="Phone Number ID"
                  value={form.phoneNumberId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      phoneNumberId: event.target.value,
                    }))
                  }
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Business Account ID"
                  value={form.businessAccountId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      businessAccountId: event.target.value,
                    }))
                  }
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Graph API Version"
                  value={form.graphApiVersion}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      graphApiVersion: event.target.value,
                    }))
                  }
                  size="small"
                  fullWidth
                />
                <div className="hidden md:block" />
                <TextField
                  label="Access Token"
                  type="password"
                  value={form.accessToken}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      accessToken: event.target.value,
                    }))
                  }
                  size="small"
                  fullWidth
                  multiline
                  minRows={4}
                  className="md:col-span-2"
                  helperText="Permanent system-user token recommended."
                />
                <TextField
                  label="Webhook Verify Token"
                  type="password"
                  value={form.webhookVerifyToken}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      webhookVerifyToken: event.target.value,
                    }))
                  }
                  size="small"
                  fullWidth
                />
                <TextField
                  label="App Secret"
                  type="password"
                  value={form.appSecret}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      appSecret: event.target.value,
                    }))
                  }
                  size="small"
                  fullWidth
                />
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Leave a field blank only if you want the backend to fall back to
                the deployed environment value for that field.
              </p>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={isLoading || isSaving}
                sx={{
                  textTransform: "none",
                  borderRadius: "14px",
                  px: 3,
                  py: 1,
                }}
              >
                {isSaving ? "Saving..." : "Save Runtime Config"}
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Source Map
              </h2>
              <div className="mt-4 space-y-3">
                {sourceEntries.map((entry) => (
                  <div
                    key={entry.label}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <span className="text-sm text-slate-700">{entry.label}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sourceBadgeClass(
                        entry.value,
                      )}`}
                    >
                      {prettifyKey(entry.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Readiness
              </h2>
              {isLoading ? (
                <div className="mt-4">
                  <Alert severity="info">
                    Loading saved runtime config and live WhatsApp health…
                  </Alert>
                </div>
              ) : loadError && !summary ? (
                <div className="mt-4">
                  <Alert severity="error">{loadError}</Alert>
                </div>
              ) : (
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <Alert severity={summary?.messagingReady ? "success" : "warning"}>
                    Messaging send: {summary?.messagingReady ? "ready" : "needs config"}
                  </Alert>
                  <Alert
                    severity={summary?.templateSyncReady ? "success" : "warning"}
                  >
                    Template sync:{" "}
                    {summary?.templateSyncReady ? "ready" : "needs config"}
                  </Alert>
                  <Alert severity={summary?.webhookReady ? "success" : "warning"}>
                    Webhook verification:{" "}
                    {summary?.webhookReady ? "ready" : "needs config"}
                  </Alert>
                  <p>
                    Missing keys:{" "}
                    {(summary?.missing || []).length > 0
                      ? summary.missing.join(", ")
                      : "None"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
