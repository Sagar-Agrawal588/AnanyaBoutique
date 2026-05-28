"use client";
import AccountSidebar from "@/components/AccountSiderbar";
import { useShippingDisplayCharge } from "@/hooks/useShippingDisplayCharge";
import { API_BASE_URL } from "@/utils/api";
import {
  buildSavedOrderCalculationInput,
  calculateOrderTotals,
} from "@/utils/calculateOrderTotals.mjs";
import {
  buildOrderComplaintHref,
  buildOrderProductDescriptor,
  resolveOrderPaymentMethodLabel,
  resolveOrderTransactionReference,
} from "@/utils/orderComplaint";
import { getDisplayShippingCharge } from "@/utils/shippingDisplay";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Rating,
  TextField,
} from "@mui/material";
import { AlertCircle, Loader } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const API_URL = API_BASE_URL.endsWith("/api")
  ? API_BASE_URL
  : `${API_BASE_URL}/api`;

const sanitizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\/+$/, "");

const normalizeApiPath = (path) => {
  const normalized = String(path || "").startsWith("/")
    ? String(path)
    : `/${String(path || "")}`;

  return normalized.startsWith("/api/") ? normalized : `/api${normalized}`;
};

const composeApiUrl = (base, path) => {
  const normalizedBase = sanitizeBaseUrl(base);
  const normalizedPath = normalizeApiPath(path);

  if (/\/api$/i.test(normalizedBase) && /^\/api(\/|$)/i.test(normalizedPath)) {
    return `${normalizedBase}${normalizedPath.replace(/^\/api/i, "")}`;
  }

  return `${normalizedBase}${normalizedPath}`;
};

const getApiBaseCandidates = () => {
  const candidates = [sanitizeBaseUrl(API_BASE_URL)];

  return [
    ...new Set(
      candidates.filter(
        (candidate) => candidate !== undefined && candidate !== null,
      ),
    ),
  ];
};

const fetchWithApiFallback = async (path, options = {}) => {
  const bases = getApiBaseCandidates();
  let lastNetworkError = null;
  let lastResponse = null;

  for (let i = 0; i < bases.length; i += 1) {
    const isLast = i === bases.length - 1;
    const url = composeApiUrl(bases[i], path);

    try {
      const response = await fetch(url, options);
      const contentType = String(
        response.headers.get("content-type") || "",
      ).toLowerCase();
      const looksLikeJson = contentType.includes("application/json");
      const looksLikeHtml =
        contentType.includes("text/html") || contentType.includes("text/plain");

      if (response.ok && looksLikeJson) return response;

      lastResponse = response;
      const shouldTryNext =
        !isLast &&
        (looksLikeHtml ||
          response.status === 404 ||
          response.status === 401 ||
          response.status >= 500);
      if (!shouldTryNext) {
        return response;
      }
    } catch (error) {
      lastNetworkError = error;
    }
  }

  if (lastResponse) return lastResponse;
  return new Response(
    JSON.stringify({
      success: false,
      message: lastNetworkError?.message || "Failed to reach orders API",
    }),
    {
      status: 503,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
};

const parseErrorMessage = async (response) => {
  try {
    const payload = await response.clone().json();
    return (
      String(payload?.message || "").trim() ||
      String(payload?.code || "").trim() ||
      ""
    );
  } catch {
    return "";
  }
};

const getCookieToken = () => {
  if (typeof document === "undefined") return null;
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("accessToken="))
    ?.split("=")[1];
};

const getAuthToken = () =>
  getCookieToken() ||
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken");

const toMoney = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeMoney = (value, fallback = 0) =>
  Math.max(toMoney(value, fallback), 0);

const round2 = (value) =>
  Math.round((toMoney(value, 0) + Number.EPSILON) * 100) / 100;

const toRoundedRupee = (value) => Math.max(Math.round(toMoney(value, 0)), 0);

const resolveOrderGstRatePercent = ({ order, subtotal, tax }) => {
  const pricing =
    order?.pricing && typeof order.pricing === "object" ? order.pricing : null;
  const fromOrder = toMoney(
    order?.gst?.rate ?? pricing?.gstRate ?? pricing?.gstRatePercent,
    NaN,
  );
  if (Number.isFinite(fromOrder) && fromOrder > 0) return fromOrder;

  const safeSubtotal = toMoney(subtotal, 0);
  const safeTax = toMoney(tax, 0);
  if (safeSubtotal > 0 && safeTax >= 0) {
    const derivedRate = (safeTax * 100) / safeSubtotal;
    if (Number.isFinite(derivedRate) && derivedRate > 0 && derivedRate < 100) {
      return derivedRate;
    }
  }

  return 5;
};

const buildOrderDisplayTotals = (order = {}, orderTotals = {}) => {
  const pricing =
    order?.pricing && typeof order.pricing === "object" ? order.pricing : null;
  if (pricing) {
    const subtotal = sanitizeMoney(
      pricing.originalPrice ?? order?.originalPrice,
      sanitizeMoney(orderTotals?.subtotal, 0),
    );
    const discount = sanitizeMoney(
      pricing.discount ?? order?.discount,
      sanitizeMoney(orderTotals?.totalDiscount, 0),
    );
    const discountedSubtotal = sanitizeMoney(
      pricing.discountedPrice ?? orderTotals?.discountedSubtotal,
      sanitizeMoney(orderTotals?.discountedSubtotal, 0),
    );
    const tax = sanitizeMoney(
      pricing.gst ?? orderTotals?.tax,
      sanitizeMoney(orderTotals?.tax, 0),
    );
    const total = sanitizeMoney(
      pricing.roundedTotal ??
        order?.roundedAmount ??
        order?.finalAmount ??
        orderTotals?.total,
      0,
    );

    return {
      summarySubtotal: subtotal,
      discountedSubtotal,
      tax,
      couponDiscount: sanitizeMoney(order?.discountAmount, 0),
      visibleDiscountTotal: discount,
      hasVisibleDiscount: discount > 0.009,
      coinRedemptionAmount: sanitizeMoney(order?.coinRedemption?.amount, 0),
      totalRaw: total,
      totalRounded: total,
    };
  }
  const couponCode = String(
    order?.couponCode || pricing?.couponCode || "",
  ).trim();

  const comboDiscount = sanitizeMoney(
    pricing?.comboDiscount ?? order?.comboDiscount,
    0,
  );
  const couponDiscountRaw = sanitizeMoney(
    pricing?.couponDiscount ?? order?.discountAmount,
    0,
  );
  const couponDiscount = couponCode ? couponDiscountRaw : 0;

  const visibleDiscountTotal = round2(couponDiscount);
  const discountedSubtotalRaw = sanitizeMoney(
    pricing?.taxableAmount ?? orderTotals?.discountedSubtotal,
    sanitizeMoney(Number(orderTotals?.subtotal || 0) - comboDiscount, 0),
  );
  const taxRaw = sanitizeMoney(pricing?.tax ?? orderTotals?.tax, 0);
  const coinRedemptionAmount = sanitizeMoney(
    pricing?.coinRedemptionAmount ?? orderTotals?.coinRedemptionAmount,
    0,
  );
  const totalRaw = sanitizeMoney(
    pricing?.total ?? pricing?.finalAmount ?? orderTotals?.total,
    0,
  );
  const totalRounded = toRoundedRupee(totalRaw);
  const gstRatePercent = resolveOrderGstRatePercent({
    order,
    subtotal: discountedSubtotalRaw,
    tax: taxRaw,
  });
  const discountedSubtotal =
    totalRounded > 0
      ? round2(totalRounded / (1 + gstRatePercent / 100))
      : round2(discountedSubtotalRaw);
  const tax =
    totalRounded > 0
      ? round2(totalRounded - discountedSubtotal)
      : round2(taxRaw);
  const summarySubtotal = round2(discountedSubtotal + visibleDiscountTotal);
  const hasVisibleDiscount = visibleDiscountTotal > 0.009;

  return {
    summarySubtotal,
    discountedSubtotal,
    tax,
    couponDiscount,
    visibleDiscountTotal,
    hasVisibleDiscount,
    coinRedemptionAmount,
    totalRaw,
    totalRounded,
  };
};

const ORDER_FILTER_OPTIONS = [
  { id: "all", label: "Total Orders" },
  { id: "delivered", label: "Delivered" },
  { id: "rto", label: "RTO Orders" },
  { id: "failed", label: "Failed Orders" },
];

const DEFAULT_REVIEW_SETTINGS = {
  allowPublicSubmissions: true,
  autoPublishPublicReviews: false,
  showPublicReviewForm: true,
  showOrderReviewActions: true,
};

const normalizePublicReviewSettings = (value = {}) => ({
  allowPublicSubmissions: value?.allowPublicSubmissions !== false,
  autoPublishPublicReviews: value?.autoPublishPublicReviews === true,
  showPublicReviewForm: value?.showPublicReviewForm !== false,
  showOrderReviewActions: value?.showOrderReviewActions !== false,
});

const Orders = () => {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [reviewedItemMap, setReviewedItemMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewDialog, setReviewDialog] = useState({
    open: false,
    productId: "",
    orderId: "",
    productTitle: "",
  });
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: "",
  });
  const [reviewSettings, setReviewSettings] = useState(DEFAULT_REVIEW_SETTINGS);
  const [submittingReview, setSubmittingReview] = useState(false);
  const { metrics: shippingMetrics } = useShippingDisplayCharge();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if user is logged in
        let token = getAuthToken();

        if (!token) {
          setError("Please log in to view your orders");
          setTimeout(() => router.push("/login?redirect=/my-orders"), 2000);
          return;
        }

        try {
          const reviewSettingsResponse = await fetchWithApiFallback(
            "/settings/public/reviewSettings",
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
            },
          );
          const reviewSettingsPayload = await reviewSettingsResponse
            .json()
            .catch(() => null);

          if (reviewSettingsResponse.ok && reviewSettingsPayload?.success) {
            const reviewSettingsValue =
              reviewSettingsPayload?.data?.value ||
              reviewSettingsPayload?.data ||
              {};
            setReviewSettings(normalizePublicReviewSettings(reviewSettingsValue));
          } else {
            setReviewSettings(DEFAULT_REVIEW_SETTINGS);
          }
        } catch (reviewSettingsError) {
          console.error("Error fetching review settings:", reviewSettingsError);
          setReviewSettings(DEFAULT_REVIEW_SETTINGS);
        }

        // Fetch orders from API
        let response = await fetchWithApiFallback("/orders/my-orders", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (!response.ok && (response.status >= 500 || response.status === 404)) {
          const fallbackResponse = await fetchWithApiFallback(
            "/orders/user/my-orders",
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              credentials: "include",
            },
          );
          if (fallbackResponse.ok || fallbackResponse.status === 401) {
            response = fallbackResponse;
          }
        }

        if (response.status === 401) {
          // Attempt refresh token flow (cookie-based) before failing
          try {
            const refresh = await fetchWithApiFallback("/user/refresh-token", {
              method: "POST",
              credentials: "include",
            });
            if (refresh.ok) {
              const refreshData = await refresh.json();
              const newToken = refreshData?.data?.accessToken || null;
              if (newToken) {
                localStorage.setItem("accessToken", newToken);
                token = newToken;
                response = await fetchWithApiFallback("/orders/my-orders", {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  credentials: "include",
                });
              }
            }
          } catch (refreshError) {
            console.error("Refresh token failed:", refreshError);
          }
        }

        if (!response.ok) {
          if (response.status === 401) {
            setError("Session expired. Please log in again.");
            setTimeout(() => router.push("/login?redirect=/my-orders"), 2000);
            return;
          }
          const serverMessage = await parseErrorMessage(response);
          throw new Error(
            serverMessage ||
              `Failed to fetch orders (HTTP ${response.status || 500})`,
          );
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          const fetchedOrders = data.data;
          setOrders(fetchedOrders);

          try {
            const reviewResponse = await fetchWithApiFallback("/reviews/my", {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              credentials: "include",
            });

            const reviewData = await reviewResponse.json();
            if (reviewResponse.ok && reviewData?.success) {
              const reviewMap = {};
              (reviewData.data || []).forEach((review) => {
                const key = getReviewKey(review.orderId, review.productId);
                reviewMap[key] = review;
              });
              setReviewedItemMap(reviewMap);
            } else {
              setReviewedItemMap({});
            }
          } catch (reviewError) {
            console.error("Error fetching user reviews:", reviewError);
            setReviewedItemMap({});
          }
        } else {
          setOrders([]);
          setReviewedItemMap({});
        }
      } catch (err) {
        console.warn("Error fetching orders:", err);
        setError(err.message || "Failed to load orders. Please try again.");
        setReviewedItemMap({});
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [router]);

  const normalizeStatus = (status) => {
    if (!status) return "pending";
    const value = String(status).trim().toLowerCase().replace(/\s+/g, "_");
    return value === "confirmed" ? "accepted" : value;
  };

  const getReviewKey = (orderId, productId) => `${orderId}::${productId}`;

  const canReviewOrder = (status) => {
    const normalized = normalizeStatus(status);
    return normalized === "delivered" || normalized === "completed";
  };

  const hasReviewed = (orderId, productId) =>
    Boolean(reviewedItemMap[getReviewKey(orderId, productId)]);

  const resolveOrderRouteId = (order) =>
    order?._id || order?.id || order?.orderId || null;

  const resolveDisplayOrderId = (order) => {
    const explicitId =
      order?.displayOrderId || order?.orderNumber || order?.order_id || "";
    if (String(explicitId || "").trim()) {
      return String(explicitId).trim().toUpperCase();
    }

    const orderId = String(resolveOrderRouteId(order) || "").trim();
    if (!orderId) return "N/A";
    return `BOG-${orderId.slice(-8).toUpperCase()}`;
  };

  const buildXpressbeesTrackingUrl = (awb, candidateUrl = "") => {
    const normalizedAwb = String(awb || "").trim();
    if (!normalizedAwb) return "";

    const fallbackUrl = `https://www.xpressbees.com/shipment/tracking?awbNo=${encodeURIComponent(normalizedAwb)}`;
    const explicitUrl = String(candidateUrl || "").trim();
    if (!explicitUrl) return fallbackUrl;

    try {
      const parsed = new URL(explicitUrl);
      const host = String(parsed.hostname || "").toLowerCase();
      if (!host.includes("xpressbees.com")) return explicitUrl;

      parsed.pathname = "/shipment/tracking";
      parsed.search = "";
      parsed.searchParams.set("awbNo", normalizedAwb);
      return parsed.toString();
    } catch {
      return explicitUrl.toLowerCase().includes("xpressbees.com")
        ? fallbackUrl
        : explicitUrl;
    }
  };

  const resolveTrackingUrl = (order = {}) => {
    const explicitUrl = String(
      order?.trackingUrl ||
        order?.tracking_url ||
        order?.shipmentTrackingUrl ||
        "",
    ).trim();
    const awb = String(
      order?.awbNo ||
        order?.awb_no ||
        order?.awbNumber ||
        order?.awb_number ||
        order?.shipment?.awbNo ||
        order?.shipment?.awb_no ||
        order?.shipment?.awb_number ||
        order?.shipment?.awb ||
        order?.shipping?.awbNo ||
        order?.shipping?.awb_no ||
        order?.shipping?.awb_number ||
        order?.shipping?.awb ||
        "",
    ).trim();

    if (!explicitUrl) {
      return buildXpressbeesTrackingUrl(awb);
    }

    if (!awb) return explicitUrl;

    try {
      const parsed = new URL(explicitUrl);
      const host = String(parsed.hostname || "").toLowerCase();
      if (!host.includes("xpressbees.com")) return explicitUrl;
      return buildXpressbeesTrackingUrl(awb, explicitUrl);
    } catch {
      return explicitUrl.toLowerCase().includes("xpressbees.com")
        ? buildXpressbeesTrackingUrl(awb, explicitUrl)
        : explicitUrl;
    }
  };

  // Helper function to get status badge color
  const getStatusColor = (status) => {
    const normalized = normalizeStatus(status);
    switch (normalized) {
      case "delivered":
      case "completed":
        return "bg-[var(--flavor-glass)] text-primary";
      case "out_for_delivery":
        return "bg-teal-100 text-teal-800";
      case "shipped":
        return "bg-blue-100 text-blue-800";
      case "in_warehouse":
        return "bg-indigo-100 text-indigo-800";
      case "accepted":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      case "pending_payment":
        return "bg-orange-100 text-orange-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "rto":
        return "bg-rose-100 text-rose-800";
      case "rto_completed":
        return "bg-stone-200 text-stone-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (normalizeStatus(status)) {
      case "paid":
        return "bg-[var(--flavor-glass)] text-primary";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "unavailable":
        return "bg-orange-100 text-orange-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format status for display
  const formatStatus = (status) => {
    if (!status) return "Unknown";
    return normalizeStatus(status)
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const canRaiseComplaint = (order) => {
    const normalizedOrderStatus = normalizeStatus(order?.order_status);
    return [
      "shipped",
      "out_for_delivery",
      "delivered",
      "completed",
      "rto",
      "rto_completed",
    ].includes(normalizedOrderStatus);
  };

  const matchesOrderFilter = (order, filterId) => {
    const normalizedOrderStatus = normalizeStatus(order?.order_status);
    const normalizedPaymentStatus = normalizeStatus(order?.payment_status);

    if (filterId === "delivered") {
      return ["delivered", "completed"].includes(normalizedOrderStatus);
    }

    if (filterId === "rto") {
      return ["rto", "rto_completed"].includes(normalizedOrderStatus);
    }

    if (filterId === "failed") {
      return normalizedPaymentStatus === "failed";
    }

    return true;
  };

  const filterCounts = orders.reduce(
    (counts, order) => {
      if (matchesOrderFilter(order, "delivered")) {
        counts.delivered += 1;
      }
      if (matchesOrderFilter(order, "rto")) {
        counts.rto += 1;
      }
      if (matchesOrderFilter(order, "failed")) {
        counts.failed += 1;
      }
      return counts;
    },
    {
      delivered: 0,
      rto: 0,
      failed: 0,
    },
  );

  const filteredOrders = orders.filter((order) =>
    matchesOrderFilter(order, activeFilter),
  );
  const showOrderReviewActions = reviewSettings.showOrderReviewActions !== false;
  const activeFilterLabel =
    ORDER_FILTER_OPTIONS.find((filter) => filter.id === activeFilter)?.label ||
    "orders";

  const openReviewDialog = (order, item) => {
    const productId = item?.productId;
    if (!productId || !canReviewOrder(order?.order_status)) return;

    if (hasReviewed(order._id, productId)) {
      toast.error("You already reviewed this product");
      return;
    }

    setReviewDialog({
      open: true,
      orderId: order._id,
      productId,
      productTitle: item?.productTitle || "Product",
    });
    setReviewForm({ rating: 5, comment: "" });
  };

  const closeReviewDialog = () => {
    if (submittingReview) return;
    setReviewDialog((prev) => ({ ...prev, open: false }));
  };

  const postReviewRequest = async (token, payload) => {
    const urls = Array.from(
      new Set([
        `${API_URL}/reviews`,
        `${API_BASE_URL}/reviews`,
      ]),
    );

    let lastAttempt = {
      response: null,
      data: null,
    };

    for (const url of urls) {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = { message: "Unexpected review API response" };
      }

      lastAttempt = { response, data };
      if (response.ok || response.status !== 404) {
        return lastAttempt;
      }
    }

    return lastAttempt;
  };

  const handleSubmitReview = async () => {
    const comment = reviewForm.comment.trim();
    if (!comment) {
      toast.error("Please enter your review comment");
      return;
    }

    const rating = Number(reviewForm.rating);
    if (!rating || rating < 1 || rating > 5) {
      toast.error("Please select a rating between 1 and 5");
      return;
    }

    const token = getAuthToken();
    if (!token) {
      toast.error("Please login to submit review");
      return;
    }

    setSubmittingReview(true);
    try {
      const { response, data } = await postReviewRequest(token, {
        productId: reviewDialog.productId,
        orderId: reviewDialog.orderId,
        rating,
        comment,
      });
      if (!response.ok || !data?.success) {
        if (
          response.status === 404 &&
          /reviews/i.test(String(data?.message || ""))
        ) {
          toast.error(
            "Reviews API not available. Please restart backend server.",
          );
          return;
        }
        toast.error(data?.message || "Failed to submit review");
        return;
      }

      const review = data?.data;
      const reviewKey = getReviewKey(
        review?.orderId || reviewDialog.orderId,
        review?.productId || reviewDialog.productId,
      );
      setReviewedItemMap((prev) => ({
        ...prev,
        [reviewKey]: review || true,
      }));
      toast.success("Review submitted successfully");
      setReviewDialog({
        open: false,
        orderId: "",
        productId: "",
        productTitle: "",
      });
    } catch (submitError) {
      console.error("Review submit error:", submitError);
      toast.error("Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <>
      <section className="bg-gray-100 py-8">
        <div className="container flex flex-col lg:flex-row gap-5">
          <div className="w-full lg:w-[20%] shrink-0">
            <AccountSidebar />
          </div>

          <div className="wrapper w-full lg:w-[75%]">
            <div className="flex flex-col gap-5 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
                <p className="mt-2 text-gray-600">
                  Track, manage, and quickly sort your purchases.
                </p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm text-gray-600">Showing</p>
                <p className="text-3xl font-bold text-orange-600">
                  {filteredOrders.length}
                </p>
                <p className="text-xs text-gray-500">
                  of {orders.length} total orders
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Filter Orders
                  </p>
                  <p className="text-xs text-gray-500">
                    Narrow your order list by delivery and payment outcome.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ORDER_FILTER_OPTIONS.map((filter) => {
                    const count =
                      filter.id === "all"
                        ? orders.length
                        : filterCounts[filter.id] || 0;
                    const isActive = activeFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setActiveFilter(filter.id)}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                          isActive
                            ? "border-orange-600 bg-orange-600 text-white shadow-sm"
                            : "border-gray-200 bg-gray-50 text-gray-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                        }`}
                      >
                        <span>{filter.label}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-white text-gray-600"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <Loader className="w-8 h-8 text-orange-600 animate-spin" />
                </div>
                <p className="text-gray-500">Loading your orders...</p>
              </div>
            ) : error && orders.length === 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <div className="flex justify-center mb-4">
                  <AlertCircle className="w-12 h-12 text-red-500" />
                </div>
                <p className="text-red-800 font-medium mb-2">{error}</p>
                <p className="text-red-600 text-sm mb-4">
                  {error.includes("Please log in") && "Redirecting to login..."}
                </p>
                <Link
                  href="/login"
                  className="inline-block bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
                >
                  Login
                </Link>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500 mb-4">No orders found</p>
                <Link
                  href="/products"
                  className="inline-block bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
                >
                  Start Shopping
                </Link>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-white p-12 text-center shadow-sm">
                <p className="text-lg font-semibold text-gray-900">
                  No {activeFilterLabel.toLowerCase()} found
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Try another filter to browse the rest of your orders.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                {filteredOrders.map((order) => {
                  const orderTotals = calculateOrderTotals(
                    buildSavedOrderCalculationInput(order, {
                      payableShipping: 0,
                    }),
                  );
                  const displayTotals = buildOrderDisplayTotals(
                    order,
                    orderTotals,
                  );
                  const routeOrderId = resolveOrderRouteId(order);
                  const displayOrderId = resolveDisplayOrderId(order);
                  const trackingUrl = resolveTrackingUrl(order);
                  const paymentMethodLabel = resolveOrderPaymentMethodLabel(
                    order?.paymentMethod,
                  );
                  const paymentStatusLabel =
                    formatStatus(order?.payment_status) || "Pending";
                  const transactionReference =
                    resolveOrderTransactionReference(order);
                  const complaintProductNames = [
                    ...(Array.isArray(order?.combos) ? order.combos : []).map(
                      (combo) => buildOrderProductDescriptor(combo),
                    ),
                    ...(Array.isArray(order?.products) ? order.products : []).map(
                      (item) => buildOrderProductDescriptor(item),
                    ),
                  ].filter(Boolean);
                  const complaintHref = buildOrderComplaintHref({
                    routeOrderId,
                    displayOrderId,
                    productNames: complaintProductNames,
                    paymentMethodLabel,
                    paymentStatusLabel,
                    transactionReference,
                  });
                  const showComplaintAction = canRaiseComplaint(order);

                  return (
                    <div
                      key={order._id}
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      {/* Order Header */}
                      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Order ID</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {displayOrderId}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Date</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {new Date(order.createdAt).toLocaleDateString(
                                "en-IN",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                },
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              Order Status
                            </p>
                            <span
                              className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.order_status)}`}
                            >
                              {formatStatus(order.order_status) || "Pending"}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              Payment Status
                            </p>
                            <span
                              className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(order.payment_status)}`}
                            >
                              {formatStatus(order.payment_status) || "Pending"}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total</p>
                            <p className="text-lg font-semibold text-orange-600">
                              ₹
                              {Number(
                                displayTotals.totalRounded || 0,
                              ).toLocaleString("en-IN")}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="px-6 py-4">
                        <p className="text-sm font-semibold text-gray-900 mb-3">
                          Items ({order.products?.length || 0})
                        </p>
                        <div className="space-y-2">
                          {order.products?.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center text-sm py-2 border-b border-gray-100 last:border-0"
                            >
                              <div>
                                <p className="text-gray-900 font-medium">
                                  {item.productTitle || "Product"}
                                </p>
                                <p className="text-gray-600 text-xs">
                                  Qty: {item.quantity} × ₹
                                  {Number(item.price || 0).toLocaleString(
                                    "en-IN",
                                  )}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <p className="text-gray-900 font-medium">
                                  ₹
                                  {Number(
                                    item.price * item.quantity || 0,
                                  ).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                  })}
                                </p>
                                {showOrderReviewActions &&
                                  canReviewOrder(order.order_status) &&
                                  (hasReviewed(order._id, item.productId) ? (
                                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                                      Reviewed
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openReviewDialog(order, item)
                                      }
                                      className="text-[11px] font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-full px-3 py-1 transition-colors"
                                    >
                                      Write Review
                                    </button>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Delivery Address */}
                      {order.delivery_address && (
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                          <p className="text-sm font-semibold text-gray-900 mb-2">
                            Delivery Address
                          </p>
                          <div className="text-sm text-gray-700">
                            <p className="font-medium">
                              {order.delivery_address?.name || "N/A"}
                            </p>
                            <p>
                              {order.delivery_address?.address_line1 ||
                                order.delivery_address?.address_line ||
                                order.delivery_address?.address ||
                                ""}
                            </p>
                            <p>
                              {order.delivery_address?.city || ""},{" "}
                              {order.delivery_address?.state || ""} -{" "}
                              {order.delivery_address?.pincode || ""}
                            </p>
                            <p className="text-xs">
                              Phone:{" "}
                              {order.delivery_address?.mobile ||
                                order.delivery_address?.phone ||
                                "N/A"}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Order Summary */}
                      <div className="px-6 py-4 bg-white border-t border-gray-200">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="text-gray-900">
                              ₹
                              {Number(
                                displayTotals.summarySubtotal || 0,
                              ).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          {displayTotals.hasVisibleDiscount && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Discount
                                {order.couponCode &&
                                displayTotals.couponDiscount > 0
                                  ? ` (${order.couponCode})`
                                  : ""}
                                :
                              </span>
                              <span className="text-primary">
                                -₹
                                {Number(
                                  displayTotals.visibleDiscountTotal || 0,
                                ).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          )}
                          {displayTotals.hasVisibleDiscount && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Discounted Subtotal:
                              </span>
                              <span className="text-gray-900">
                                ₹
                                {Number(
                                  displayTotals.discountedSubtotal || 0,
                                ).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          )}
                          {Number(displayTotals.coinRedemptionAmount || 0) >
                            0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Coin Redemption:
                              </span>
                              <span className="text-primary">
                                -₹
                                {Number(
                                  displayTotals.coinRedemptionAmount || 0,
                                ).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">GST:</span>
                            <span className="text-gray-900">
                              ₹
                              {Number(displayTotals.tax || 0).toLocaleString(
                                "en-IN",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Shipping:</span>
                            {(() => {
                              const deliveryState = String(
                                order?.delivery_address?.state ||
                                  order?.billingDetails?.state ||
                                  order?.guestDetails?.state ||
                                  "",
                              ).trim();
                              const hasOrderStateInput = Boolean(deliveryState);
                              const orderDisplayShippingCharge =
                                getDisplayShippingCharge({
                                  isRajasthan:
                                    deliveryState.toLowerCase() === "rajasthan",
                                  metrics: shippingMetrics,
                                });

                              if (!hasOrderStateInput) {
                                return (
                                  <span className="text-gray-500">--</span>
                                );
                              }

                              return (
                                <span className="text-primary font-medium flex items-center gap-2">
                                  {orderDisplayShippingCharge > 0 && (
                                    <span className="line-through text-gray-500 font-normal">
                                      ₹{orderDisplayShippingCharge.toFixed(2)}
                                    </span>
                                  )}
                                  <span>₹0.00</span>
                                </span>
                              );
                            })()}
                          </div>
                          <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold">
                            <span>Total:</span>
                            <span className="text-orange-600">
                              ₹
                              {Number(
                                displayTotals.totalRounded || 0,
                              ).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Payment Details */}
                      {(order.paymentId || order.paymentMethod) && (
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                          <p className="text-sm font-semibold text-gray-900 mb-2">
                            Payment Details
                          </p>
                          <div className="text-xs text-gray-600 space-y-1">
                            <p>
                              Method:{" "}
                              <span className="font-semibold text-gray-800">
                                {paymentMethodLabel}
                              </span>
                            </p>
                            <p>
                              Transaction ID:{" "}
                              <span className="font-mono">
                                {transactionReference || "N/A"}
                              </span>
                            </p>
                          </div>
                        </div>
                      )}

                      {/* View Order Details Link */}
                      <div className="px-6 py-4 bg-white border-t border-gray-200 flex flex-wrap justify-end gap-3">
                        {trackingUrl ? (
                          <a
                            href={trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 border border-orange-200 bg-orange-50 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-100 transition-colors"
                          >
                            Track Shipment
                          </a>
                        ) : null}
                        {showComplaintAction ? (
                          <Link
                            href={complaintHref}
                            className="inline-flex items-center px-4 py-2 border border-red-200 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
                          >
                            Raise a Complaint
                          </Link>
                        ) : null}
                        <Link
                          href={
                            routeOrderId
                              ? `/orders/${routeOrderId}`
                              : "/my-orders"
                          }
                          className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          View Order Details
                          <svg
                            className="ml-2 w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <Dialog
        open={reviewDialog.open}
        onClose={closeReviewDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle className="!text-xl !font-bold !text-gray-800">
          Write Review
        </DialogTitle>
        <DialogContent className="!pt-2 !space-y-4">
          <p className="text-sm text-gray-600">
            Product:{" "}
            <span className="font-semibold text-gray-900">
              {reviewDialog.productTitle}
            </span>
          </p>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Your Rating
            </p>
            <Rating
              value={reviewForm.rating}
              onChange={(_, value) =>
                setReviewForm((prev) => ({ ...prev, rating: value || 1 }))
              }
            />
          </div>
          <TextField
            label="Review Comment"
            multiline
            minRows={4}
            value={reviewForm.comment}
            onChange={(event) =>
              setReviewForm((prev) => ({
                ...prev,
                comment: event.target.value,
              }))
            }
            fullWidth
            required
            placeholder="Share your experience with this product"
          />
        </DialogContent>
        <DialogActions className="!px-6 !pb-5">
          <Button onClick={closeReviewDialog} disabled={submittingReview}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitReview}
            variant="contained"
            disabled={submittingReview}
            sx={{
              backgroundColor: "#ea580c",
              textTransform: "none",
              fontWeight: 600,
              "&:hover": { backgroundColor: "#c2410c" },
            }}
          >
            {submittingReview ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
export default Orders;
