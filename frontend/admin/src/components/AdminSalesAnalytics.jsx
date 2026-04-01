"use client";

import LoadingSpinner from "@/app/components/LoadingSpinner";
import { API_BASE_URL, getData } from "@/utils/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import OrdersTable from "./OrdersTable";
import SalesChart from "./SalesChart";

const buildApiUrl = (path) => {
  const base = String(API_BASE_URL || "").replace(/\/+$/, "");
  const normalized = path?.startsWith("/") ? path : `/${path || ""}`;
  if (/\/api$/i.test(base) && /^\/api(\/|$)/i.test(normalized)) {
    return base.replace(/\/api$/i, "") + normalized;
  }
  return base + normalized;
};

const parseJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const buildFallbackUrls = (path) => {
  const primary = buildApiUrl(path);
  const urls = [primary];

  // Local dev frequently switches between 8000/8001; try both before failing.
  if (/^https?:\/\/localhost:8001/i.test(primary)) {
    urls.push(primary.replace(/localhost:8001/i, "localhost:8000"));
  }
  if (/^https?:\/\/localhost:8000/i.test(primary)) {
    urls.push(primary.replace(/localhost:8000/i, "localhost:8001"));
  }

  return [...new Set(urls.filter(Boolean))];
};

const fetchReportWithFallback = async (path, token) => {
  const primary = await getData(path, token);
  const isNetworkFailure =
    !primary?.success &&
    /network\s*error/i.test(String(primary?.message || ""));

  if (!isNetworkFailure) {
    return primary;
  }

  let lastErrorMessage = primary?.message || "Failed to fetch report";
  const fallbackUrls = buildFallbackUrls(path);

  for (const fallbackUrl of fallbackUrls) {
    try {
      const response = await fetch(fallbackUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await parseJsonSafe(response);
      if (!response.ok) {
        lastErrorMessage = payload?.message || "Failed to fetch report";
        continue;
      }

      return payload || { success: true, data: {} };
    } catch (error) {
      lastErrorMessage = error?.message || lastErrorMessage;
    }
  }

  return {
    success: false,
    message: lastErrorMessage,
  };
};

const formatDateInput = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const buildDefaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  };
};

const buildRangeFromDays = (days) => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - Math.max(Number(days || 0), 0));
  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  };
};

export default function AdminSalesAnalytics({ token }) {
  const defaults = useMemo(() => buildDefaultRange(), []);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
  });
  const [chartData, setChartData] = useState([]);
  const [chartInterval, setChartInterval] = useState("daily");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [includeRto, setIncludeRto] = useState(false);
  const [error, setError] = useState("");

  const dateRangePresets = useMemo(
    () => [
      { label: "Today", days: 0 },
      { label: "Last 7D", days: 7 },
      { label: "Last 30D", days: 30 },
      { label: "Last 90D", days: 90 },
    ],
    [],
  );

  const applyDateRange = (range) => {
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setPage(1);
  };

  const applyPresetRange = (preset) => {
    if (!preset) return;
    applyDateRange(buildRangeFromDays(preset.days));
  };

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (includeRto) params.set("includeRto", "true");
    if (search) params.set("search", search);
    return params.toString();
  }, [startDate, endDate, page, limit, includeRto, search]);

  const fetchReport = useCallback(async () => {
    if (!token || !startDate || !endDate) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      setError("Start date must be before end date.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const path = `/api/admin/orders/report?${queryString}`;
      const response = await fetchReportWithFallback(path, token);
      const payload = response?.data || response;

      if (!response?.success && !response?.data) {
        throw new Error(response?.message || "Failed to fetch report");
      }

      setOrders(payload?.orders || []);
      setPagination({
        total: payload?.pagination?.total || 0,
        totalPages: payload?.pagination?.totalPages || 1,
      });
      setChartData(payload?.chart?.data || []);
      setChartInterval(payload?.chart?.interval || "daily");
    } catch (err) {
      console.error("Sales analytics report error:", err);
      setError(err?.message || "Failed to load sales analytics");
      setOrders([]);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, [token, startDate, endDate, queryString]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleExport = async () => {
    if (!token || !startDate || !endDate || exporting) return;
    setExporting(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("startDate", startDate);
      params.set("endDate", endDate);
      if (search) params.set("search", search);
      if (includeRto) params.set("includeRto", "true");
      const path = `/api/admin/orders/export?${params.toString()}`;
      const fallbackUrls = buildFallbackUrls(path);
      let response = null;
      let exportErrorMessage = "Export failed";

      for (const url of fallbackUrls) {
        try {
          const candidate = await fetch(url, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!candidate.ok) {
            const payload = await parseJsonSafe(candidate);
            exportErrorMessage = payload?.message || "Export failed";
            continue;
          }

          response = candidate;
          break;
        } catch (error) {
          exportErrorMessage = error?.message || exportErrorMessage;
        }
      }

      if (!response) {
        throw new Error(exportErrorMessage);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/i);
      const filename =
        match?.[1] || `order-report-${startDate}_to_${endDate}.xlsx`;
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Export failed:", err);
      setError(err?.message || "Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading sales analytics..." />;
  }

  const chartSummary = chartData.reduce(
    (acc, point) => {
      acc.confirmed += Number(point?.confirmed || 0);
      acc.rto += Number(point?.rto || 0);
      return acc;
    },
    { confirmed: 0, rto: 0 },
  );
  let runningConfirmed = 0;
  let runningRto = 0;
  const cumulativeChartData = chartData.map((point) => {
    runningConfirmed += Number(point?.confirmed || 0);
    runningRto += Number(point?.rto || 0);

    return {
      ...point,
      confirmed: runningConfirmed,
      rto: runningRto,
    };
  });

  const reportRows = Number(pagination.total || 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Sales Analytics
            </h1>
            <p className="text-sm text-gray-600">
              Monitor confirmed vs RTO orders and export detailed reports.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-95 flex-col gap-2">
              <label className="text-xs font-medium text-gray-600">
                Date Range
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setPage(1);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                />
                <span className="text-gray-400 text-sm">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => {
                    setEndDate(event.target.value);
                    setPage(1);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {dateRangePresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPresetRange(preset)}
                    className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex min-w-60 flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">
                Search
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSearch();
                  }}
                  placeholder="Order ID or Product ID"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-55 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100"
                >
                  Apply
                </button>
              </div>
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                <input
                  type="checkbox"
                  checked={includeRto}
                  onChange={(event) => {
                    setIncludeRto(event.target.checked);
                    setPage(1);
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Include RTO orders
              </label>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  exporting
                    ? "bg-gray-200 text-gray-600"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {exporting ? "Exporting..." : "Export to Excel"}
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <p className="text-xs font-medium text-blue-700">
              Confirmed (range)
            </p>
            <p className="mt-1 text-2xl font-semibold text-blue-900">
              {chartSummary.confirmed}
            </p>
          </div>
          <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-4">
            <p className="text-xs font-medium text-orange-700">RTO (range)</p>
            <p className="mt-1 text-2xl font-semibold text-orange-900">
              {chartSummary.rto}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-600">Report rows</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {reportRows}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <SalesChart
            data={cumulativeChartData}
            interval={chartInterval}
            cumulative
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <OrdersTable
            orders={orders}
            page={page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}
