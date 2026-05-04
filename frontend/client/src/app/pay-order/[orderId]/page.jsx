"use client";

import { API_BASE_URL, invalidatePublicGetCache } from "@/utils/api";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = API_BASE_URL;

const round2 = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const toRoundedRupee = (value) => Math.max(Math.round(Number(value || 0)), 0);

const formatReservationCountdown = (value) => {
  const seconds = Math.max(Math.floor(Number(value || 0)), 0);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
};

const buildDisplayTotals = (order) => {
  const pricing = order?.pricing || {};
  if (pricing && Object.keys(pricing).length > 0) {
    const subtotal = round2(Number(pricing.originalPrice ?? order?.originalPrice ?? 0));
    const discount = round2(Number(pricing.discount ?? order?.discount ?? 0));
    const discountedSubtotal = round2(
      Number(pricing.discountedPrice ?? order?.subtotal ?? 0),
    );
    const gst = round2(Number(pricing.gst ?? order?.tax ?? 0));
    const total = round2(
      Number(pricing.roundedTotal ?? order?.roundedAmount ?? order?.finalAmount ?? order?.totalAmt ?? 0),
    );
    const roundOff = round2(Number(pricing.roundOff ?? order?.roundOff ?? 0));

    return {
      couponCode: String(order?.couponCode || "").trim(),
      hasCouponDiscount: discount > 0.009,
      subtotalDisplay: subtotal,
      couponDiscount: discount,
      discountedSubtotal,
      gst,
      roundOff,
      shipping: round2(Number(order?.shipping || 0)),
      total,
    };
  }
  const totals = order?.totals || {};
  const couponCode = String(order?.couponCode || "").trim();
  const subtotalRaw = Math.max(Number(totals.subtotal || 0), 0);
  const legacyDiscountRaw = Math.max(Number(totals.discount || 0), 0);
  const couponDiscountRaw = Math.max(
    Number(order?.couponDiscount ?? totals.couponDiscount ?? 0),
    0,
  );
  const couponDiscount = couponCode ? couponDiscountRaw : 0;
  const taxRaw = Math.max(Number(totals.tax || 0), 0);
  const shippingRaw = Math.max(Number(totals.shipping || 0), 0);
  const totalRaw = Math.max(Number(totals.finalAmount || 0), 0);
  const roundOffRaw = Number(order?.roundOff ?? totals.roundOff ?? 0);
  const roundedAmountRaw = Number(
    order?.roundedAmount ?? totals.roundedAmount ?? Math.round(totalRaw),
  );

  const totalRounded = Math.max(Math.round(roundedAmountRaw || totalRaw), 0);
  const discountedSubtotalRaw = Math.max(subtotalRaw - legacyDiscountRaw, 0);
  const gstRatePercent =
    discountedSubtotalRaw > 0 && taxRaw >= 0
      ? (taxRaw * 100) / discountedSubtotalRaw
      : 5;

  const discountedSubtotal =
    totalRounded > 0
      ? round2(totalRounded / (1 + gstRatePercent / 100))
      : round2(discountedSubtotalRaw);

  const gst =
    totalRounded > 0
      ? round2(totalRounded - discountedSubtotal)
      : round2(taxRaw);
  const subtotalDisplay = round2(discountedSubtotal + couponDiscount);

  return {
    couponCode,
    hasCouponDiscount: couponDiscount > 0.009,
    subtotalDisplay,
    couponDiscount: round2(couponDiscount),
    discountedSubtotal,
    gst,
    roundOff: round2(roundOffRaw || totalRounded - (discountedSubtotal + gst)),
    shipping: round2(shippingRaw),
    total: round2(totalRounded),
  };
};

const PayOrderPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = String(params?.orderId || "").trim();
  const token = String(searchParams?.get("key") || "").trim();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reservationSecondsRemaining, setReservationSecondsRemaining] =
    useState(0);

  const canPay = Boolean(order?.payable);
  const displayTotals = useMemo(() => buildDisplayTotals(order), [order]);
  const loadOrder = useCallback(async () => {
    if (!orderId || !token) {
      setError("Missing or invalid payment link.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/orders/pay-order/${encodeURIComponent(
          orderId,
        )}?key=${encodeURIComponent(token)}`,
      );
      const data = await res.json();
      if (!data?.success) {
        throw new Error(data?.message || "Invalid or expired payment link.");
      }
      setOrder(data.data);
      setReservationSecondsRemaining(
        Math.max(Number(data?.data?.reservationSecondsRemaining || 0), 0),
      );
      invalidatePublicGetCache();
      setError("");
    } catch (err) {
      setError(err?.message || "Unable to load order.");
    } finally {
      setLoading(false);
    }
  }, [orderId, token]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    setReservationSecondsRemaining(
      Math.max(Number(order?.reservationSecondsRemaining || 0), 0),
    );
  }, [order?.reservationSecondsRemaining]);

  useEffect(() => {
    const loadPaymentStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/orders/payment-status`);
        const data = await res.json();
        if (data?.success) {
          setPaymentStatus(data.data);
          const fallbackProvider =
            data.data?.defaultProvider ||
            data.data?.provider ||
            data.data?.enabledProviders?.[0] ||
            "";
          setSelectedProvider(
            String(fallbackProvider || "")
              .trim()
              .toUpperCase(),
          );
        }
      } catch {
        // Ignore, handled by UI state.
      }
    };

    loadPaymentStatus();
  }, []);

  useEffect(() => {
    if (!canPay || reservationSecondsRemaining <= 0) return undefined;

    const timer = window.setInterval(() => {
      setReservationSecondsRemaining((current) => {
        const nextValue = Math.max(current - 1, 0);
        return nextValue;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [canPay, reservationSecondsRemaining]);

  useEffect(() => {
    if (!order?.reservationStatus) return;
    if (order.reservationStatus !== "reserved") return;
    if (reservationSecondsRemaining > 0) return;
    void loadOrder();
  }, [loadOrder, order?.reservationStatus, reservationSecondsRemaining]);

  const availableProviders = useMemo(() => {
    const list = paymentStatus?.enabledProviders || [];
    return Array.isArray(list) ? list : [];
  }, [paymentStatus]);

  const handlePay = async () => {
    if (!orderId || !token || !canPay || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_URL}/api/orders/pay-order/${encodeURIComponent(
          orderId,
        )}/initiate?key=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentProvider: selectedProvider || undefined,
          }),
        },
      );
      const data = await res.json();
      if (!data?.success) {
        throw new Error(data?.message || "Failed to initiate payment.");
      }
      const paymentUrl = data?.data?.paymentUrl;
      if (!paymentUrl) {
        throw new Error("Payment URL missing. Please retry.");
      }
      window.location.assign(paymentUrl);
    } catch (err) {
      setError(err?.message || "Failed to initiate payment.");
      await loadOrder();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Pay Now</h1>
          <p className="text-slate-600">{error}</p>
          <Link href="/" className="inline-block mt-4 text-blue-600 underline">
            Back to store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">
            Pay for Order
          </h1>
          <p className="text-slate-600 mt-1">
            Order {order?.displayOrderId || order?.orderId}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Summary</h2>
          <div className="space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>₹{displayTotals.subtotalDisplay.toFixed(2)}</span>
            </div>
            {displayTotals.hasCouponDiscount && (
              <div className="flex items-center justify-between">
                <span>
                  Discount
                  {displayTotals.couponCode
                    ? ` (${displayTotals.couponCode})`
                    : ""}
                </span>
                <span>-₹{displayTotals.couponDiscount.toFixed(2)}</span>
              </div>
            )}
            {displayTotals.hasCouponDiscount && (
              <div className="flex items-center justify-between">
                <span>Discounted Subtotal</span>
                <span>₹{displayTotals.discountedSubtotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>GST</span>
              <span>₹{displayTotals.gst.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Round Off</span>
              <span>
                {displayTotals.roundOff >= 0 ? "+" : "-"}₹
                {Math.abs(displayTotals.roundOff).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping</span>
              <span>₹{displayTotals.shipping.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between font-semibold text-slate-900">
              <span>Final Payable</span>
              <span>₹{displayTotals.total.toFixed(0)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Payment</h2>
          {order?.reservationStatus === "reserved" && canPay ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Items are reserved for you for{" "}
              <strong>
                {formatReservationCountdown(reservationSecondsRemaining)}
              </strong>
              .
            </div>
          ) : null}
          {order?.reservationStatus === "unavailable" ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              This order can no longer be paid because the reserved item is no
              longer available.
            </div>
          ) : null}
          {!canPay ? (
            <p className="text-slate-600">
              This order is not payable. Current status:{" "}
              <strong>{order?.paymentStatus}</strong>.
            </p>
          ) : (
            <>
              {availableProviders.length > 1 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select payment method
                  </label>
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  >
                    {availableProviders.map((provider) => (
                      <option key={provider} value={provider}>
                        {provider}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                type="button"
                onClick={handlePay}
                disabled={submitting || reservationSecondsRemaining === 0}
                className="w-full rounded-lg bg-blue-600 text-white py-3 font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? "Redirecting..." : "Pay Now"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayOrderPage;
