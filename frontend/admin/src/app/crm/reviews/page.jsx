"use client";

import { useAdmin } from "@/context/AdminContext";
import { hasAdminPermission } from "@/utils/adminPermissions";
import { deleteData, getData, patchData, putData } from "@/utils/api";
import {
  Alert,
  Button,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Pagination,
  Switch,
  TextField,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";

const DEFAULT_REVIEW_SETTINGS = {
  allowPublicSubmissions: true,
  autoPublishPublicReviews: true,
  showPublicReviewForm: true,
  showOrderReviewActions: true,
};

const REVIEW_VISIBILITY_OPTIONS = [
  { value: "", label: "All Visibility" },
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden" },
];

const REVIEW_SOURCE_OPTIONS = [
  { value: "", label: "All Sources" },
  { value: "order", label: "Verified Orders" },
  { value: "public", label: "Public Form" },
];
const REQUEST_TIMEOUT_MS = 12000;

const normalizeReviewSettings = (value = {}) => ({
  allowPublicSubmissions: value?.allowPublicSubmissions !== false,
  autoPublishPublicReviews: value?.autoPublishPublicReviews !== false,
  showPublicReviewForm: value?.showPublicReviewForm !== false,
  showOrderReviewActions: value?.showOrderReviewActions !== false,
});

const withRequestTimeout = async (
  promise,
  timeoutMs = REQUEST_TIMEOUT_MS,
  timeoutMessage = "Request timed out.",
) => {
  let timeoutId = null;

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(timeoutMessage));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

const prettify = (value = "") =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const visibilityBadgeClass = (value = "visible") => {
  if (value === "visible") return "bg-emerald-100 text-emerald-700";
  if (value === "hidden") return "bg-slate-200 text-slate-700";
  return "bg-sky-100 text-sky-700";
};

const sourceBadgeClass = (value = "public") => {
  if (value === "order") return "bg-sky-100 text-sky-700";
  return "bg-fuchsia-100 text-fuchsia-700";
};

export default function CrmReviewsPage() {
  const { token, admin, isAuthenticated, loading } = useAdmin();
  const router = useRouter();
  const canManageSettings = useMemo(
    () => hasAdminPermission(admin, "manage_settings"),
    [admin],
  );

  const [reviewSettings, setReviewSettings] = useState(DEFAULT_REVIEW_SETTINGS);
  const [reviews, setReviews] = useState([]);
  const [filters, setFilters] = useState({
    q: "",
    visibility: "",
    source: "",
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeReviewId, setActiveReviewId] = useState("");
  const [reviewsLoadError, setReviewsLoadError] = useState("");
  const [settingsLoadError, setSettingsLoadError] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  const loadReviewSettings = useCallback(async () => {
    if (!canManageSettings || !token) return;

    setLoadingSettings(true);
    setSettingsLoadError("");

    try {
      const response = await withRequestTimeout(
        getData("/api/settings/public/reviewSettings", token),
        REQUEST_TIMEOUT_MS,
        "Loading review settings is taking longer than expected.",
      );

      if (!response?.success) {
        const message = String(response?.message || "");
        if (/setting not found/i.test(message)) {
          setReviewSettings(DEFAULT_REVIEW_SETTINGS);
          return;
        }
        throw new Error(message || "Failed to load review settings.");
      }

      setReviewSettings(normalizeReviewSettings(response.data?.value));
    } catch (error) {
      setSettingsLoadError(
        error?.message || "Failed to load review settings.",
      );
      setReviewSettings(DEFAULT_REVIEW_SETTINGS);
      throw error;
    } finally {
      setLoadingSettings(false);
    }
  }, [canManageSettings, token]);

  const loadReviews = useCallback(async () => {
    if (!token) return;

    setLoadingReviews(true);
    setReviewsLoadError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "18");
      if (filters.q.trim()) params.set("q", filters.q.trim());
      if (filters.visibility) params.set("visibility", filters.visibility);
      if (filters.source) params.set("source", filters.source);

      const response = await withRequestTimeout(
        getData(`/api/admin/reviews?${params}`, token),
        REQUEST_TIMEOUT_MS,
        "Loading reviews is taking longer than expected.",
      );
      if (!response?.success) {
        throw new Error(response?.message || "Failed to load reviews.");
      }

      setReviews(Array.isArray(response.data) ? response.data : []);
      setTotalPages(
        Math.max(Number(response.pagination?.totalPages || 1), 1),
      );
    } catch (error) {
      setReviews([]);
      setTotalPages(1);
      const nextMessage = error?.message || "Failed to load reviews.";
      setReviewsLoadError(nextMessage);
      toast.error(nextMessage);
    } finally {
      setLoadingReviews(false);
    }
  }, [filters, page, token]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    loadReviews();
  }, [isAuthenticated, token, loadReviews]);

  useEffect(() => {
    if (!isAuthenticated || !token || !canManageSettings) return;

    loadReviewSettings().catch((error) => {
      toast.error(error?.message || "Failed to load review settings.");
    });
  }, [isAuthenticated, token, canManageSettings, loadReviewSettings]);

  const saveSettings = async () => {
    if (!token || !canManageSettings) return;

    setSavingSettings(true);
    try {
      const response = await putData(
        "/api/settings/admin/reviewSettings",
        {
          value: reviewSettings,
          category: "display",
          description:
            "Storefront review submission and review-action visibility controls",
        },
        token,
      );

      if (!response?.success) {
        throw new Error(response?.message || "Failed to save review settings.");
      }

      setReviewSettings(normalizeReviewSettings(response.data?.value));
      toast.success("Review storefront controls updated.");
    } catch (error) {
      toast.error(error?.message || "Failed to save review settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleVisibilityChange = async (reviewId, nextVisibility) => {
    if (!reviewId || !token) return;

    setActiveReviewId(reviewId);
    try {
      const response = await patchData(
        `/api/admin/reviews/${reviewId}`,
        { visibility: nextVisibility },
        token,
      );

      if (!response?.success) {
        throw new Error(response?.message || "Failed to update review.");
      }

      setReviews((current) =>
        current.map((review) =>
          review._id === reviewId
            ? { ...review, ...(response.data || {}), visibility: response.data?.visibility || nextVisibility }
            : review,
        ),
      );
      toast.success(`Review marked ${prettify(nextVisibility)}.`);
    } catch (error) {
      toast.error(error?.message || "Failed to update review.");
    } finally {
      setActiveReviewId("");
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!reviewId || !token) return;
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm("Delete this review permanently?");
    if (!confirmed) return;

    setActiveReviewId(reviewId);
    try {
      const response = await deleteData(`/api/admin/reviews/${reviewId}`, token);
      if (!response?.success) {
        throw new Error(response?.message || "Failed to delete review.");
      }

      toast.success("Review deleted.");
      if (reviews.length === 1 && page > 1) {
        setPage((current) => Math.max(current - 1, 1));
      } else {
        await loadReviews();
      }
    } catch (error) {
      toast.error(error?.message || "Failed to delete review.");
    } finally {
      setActiveReviewId("");
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
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Reviews</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Manage public and order-linked reviews from one place. New reviews
            publish immediately, and hidden reviews are removed from the
            storefront immediately.
          </p>
        </div>

        {canManageSettings ? (
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Storefront Review Controls
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  These switches control whether customers can submit reviews and
                  whether order-page review buttons stay visible.
                </p>
              </div>
              <Button
                variant="contained"
                onClick={saveSettings}
                disabled={savingSettings}
                sx={{ textTransform: "none", borderRadius: "14px" }}
              >
                {savingSettings ? "Saving..." : "Save Controls"}
              </Button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <FormControlLabel
                control={
                  <Switch
                    checked={reviewSettings.allowPublicSubmissions}
                    onChange={(event) =>
                      setReviewSettings((prev) => ({
                        ...prev,
                        allowPublicSubmissions: event.target.checked,
                      }))
                    }
                  />
                }
                label="Allow Public Review Submissions"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={reviewSettings.showPublicReviewForm}
                    onChange={(event) =>
                      setReviewSettings((prev) => ({
                        ...prev,
                        showPublicReviewForm: event.target.checked,
                      }))
                    }
                  />
                }
                label="Show Product Review Form"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={reviewSettings.showOrderReviewActions}
                    onChange={(event) =>
                      setReviewSettings((prev) => ({
                        ...prev,
                        showOrderReviewActions: event.target.checked,
                      }))
                    }
                  />
                }
                label="Show My Orders Review Buttons"
              />
            </div>
            {loadingSettings ? (
              <div className="mt-4">
                <Alert severity="info">Loading review control settings…</Alert>
              </div>
            ) : null}
            {settingsLoadError ? (
              <div className="mt-4">
                <Alert severity="warning">{settingsLoadError}</Alert>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
            <TextField
              size="small"
              label="Search Reviewer / Comment"
              value={filters.q}
              onChange={(event) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, q: event.target.value }));
              }}
              fullWidth
            />
            <TextField
              select
              size="small"
              label="Visibility"
              value={filters.visibility}
              onChange={(event) => {
                setPage(1);
                setFilters((prev) => ({
                  ...prev,
                  visibility: event.target.value,
                }));
              }}
              fullWidth
            >
              {REVIEW_VISIBILITY_OPTIONS.map((option) => (
                <MenuItem key={option.value || "all"} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Source"
              value={filters.source}
              onChange={(event) => {
                setPage(1);
                setFilters((prev) => ({
                  ...prev,
                  source: event.target.value,
                }));
              }}
              fullWidth
            >
              {REVIEW_SOURCE_OPTIONS.map((option) => (
                <MenuItem key={option.value || "all"} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="outlined"
              onClick={() => loadReviews()}
              disabled={loadingReviews}
              sx={{ textTransform: "none", borderRadius: "14px" }}
            >
              {loadingReviews ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          {loadingReviews ? (
            <div className="flex justify-center py-16">
              <CircularProgress />
            </div>
          ) : reviewsLoadError ? (
            <div className="mt-6">
              <Alert severity="error">{reviewsLoadError}</Alert>
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-slate-500 mt-6">
              No reviews matched the current filters.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {reviews.map((review) => {
                const isBusy = activeReviewId === review._id;
                const nextVisibility =
                  review.visibility === "visible" ? "hidden" : "visible";

                return (
                  <article
                    key={review._id}
                    className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg font-semibold text-slate-900">
                            {review.userName || "Customer"}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${visibilityBadgeClass(
                              review.visibility,
                            )}`}
                          >
                            {prettify(review.visibility)}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sourceBadgeClass(
                              review.source,
                            )}`}
                          >
                            {prettify(review.source)}
                          </span>
                          {review.isVerifiedPurchase ? (
                            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                              Verified Purchase
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-slate-500">
                          {review.userEmail || review.city || "No extra identity"}{" "}
                          {review.userEmail && review.city ? `• ${review.city}` : ""}
                        </p>
                        <p className="text-sm text-slate-500">
                          {formatDateTime(review.createdAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={isBusy}
                          onClick={() =>
                            handleVisibilityChange(review._id, nextVisibility)
                          }
                          sx={{ textTransform: "none", borderRadius: "12px" }}
                        >
                          {review.visibility === "visible" ? "Hide" : "Show"}
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          disabled={isBusy}
                          onClick={() => handleDeleteReview(review._id)}
                          sx={{ textTransform: "none", borderRadius: "12px" }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-white bg-white px-4 py-3 text-sm">
                        <p className="text-slate-500">Item</p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {review.combo?.name ||
                            review.product?.name ||
                            review.comboId ||
                            review.productId ||
                            "Unknown"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white bg-white px-4 py-3 text-sm">
                        <p className="text-slate-500">Rating</p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {Number(review.rating || 0).toFixed(1)} / 5
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white bg-white px-4 py-3 text-sm">
                        <p className="text-slate-500">Order Ref</p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {review.order?._id || review.orderId || "Public / None"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Review Comment
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        {review.comment || "No written comment."}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_event, nextPage) => setPage(nextPage)}
              showFirstButton
              showLastButton
            />
          </div>
        </div>
      </div>
    </section>
  );
}
