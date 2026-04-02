"use client";

import { API_BASE_URL } from "@/utils/api";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const API_URL = API_BASE_URL;

const round2 = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const toRoundedRupee = (value) => Math.max(Math.round(Number(value || 0)), 0);

const buildDisplayTotals = (order) => {
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

  const totalRounded = toRoundedRupee(totalRaw);
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

  const canPay = Boolean(order?.payable);
  const displayTotals = useMemo(() => buildDisplayTotals(order), [order]);

  useEffect(() => {
    const load = async () => {
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
        setError("");
      } catch (err) {
        setError(err?.message || "Unable to load order.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [orderId, token]);

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
              <span>Shipping</span>
              <span>₹{displayTotals.shipping.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between font-semibold text-slate-900">
              <span>Total</span>
              <span>₹{displayTotals.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Payment</h2>
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
                disabled={submitting}
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
