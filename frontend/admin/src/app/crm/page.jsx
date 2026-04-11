"use client";

import { useAdmin } from "@/context/AdminContext";
import {
  fetchCrmContactTimeline,
  fetchCrmContacts,
  fetchCrmOverview,
  updateCrmContact,
} from "@/services/crmApi";
import { Button, MenuItem, Pagination, TextField } from "@mui/material";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const CHANNEL_OPTIONS = [
  { value: "", label: "All Channels" },
  { value: "website", label: "Website" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "email", label: "Email" },
  { value: "push", label: "Push" },
  { value: "support", label: "Support" },
  { value: "phone", label: "Phone" },
  { value: "admin", label: "Admin" },
  { value: "other", label: "Other" },
];

const LIFECYCLE_OPTIONS = [
  { value: "", label: "All Stages" },
  { value: "lead", label: "Lead" },
  { value: "prospect", label: "Prospect" },
  { value: "customer", label: "Customer" },
  { value: "repeat_customer", label: "Repeat Customer" },
  { value: "inactive", label: "Inactive" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const stageBadgeClass = (value) => {
  if (value === "customer" || value === "repeat_customer") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (value === "prospect") return "bg-amber-100 text-amber-700";
  if (value === "inactive") return "bg-slate-200 text-slate-700";
  return "bg-blue-100 text-blue-700";
};

const statusBadgeClass = (value) => {
  if (value === "converted") return "bg-emerald-100 text-emerald-700";
  if (value === "qualified") return "bg-cyan-100 text-cyan-700";
  if (value === "contacted") return "bg-amber-100 text-amber-700";
  if (value === "lost") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
};

const prettifyValue = (value = "") =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const resolveTimelineSummary = (item = {}) => {
  if (item.message) return item.message;
  if (item?.metadata?.status) {
    return `Status: ${prettifyValue(item.metadata.status)}`;
  }
  if (item.pageUrl) return item.pageUrl;
  if (item.referrer) return item.referrer;
  return "No extra details.";
};

const CrmPage = () => {
  const { token, isAuthenticated, loading } = useAdmin();
  const router = useRouter();

  const [overview, setOverview] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [timeline, setTimeline] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    q: "",
    channel: "",
    lifecycleStage: "",
    status: "",
  });
  const [draft, setDraft] = useState({
    lifecycleStage: "lead",
    status: "open",
    sourceChannel: "website",
    tags: "",
  });

  const applySelectedContact = useCallback((contact) => {
    setSelectedContact(contact || null);
    setSelectedContactId(String(contact?.id || ""));
    setRecentOrders([]);
    setDraft({
      lifecycleStage: contact?.lifecycleStage || "lead",
      status: contact?.status || "open",
      sourceChannel: contact?.sourceChannel || "website",
      tags: Array.isArray(contact?.tags) ? contact.tags.join(", ") : "",
    });
  }, []);

  const loadOverview = useCallback(async () => {
    const response = await fetchCrmOverview(token);
    if (response?.success) {
      setOverview(response.data || null);
      return;
    }
    throw new Error(response?.message || "Failed to load CRM overview.");
  }, [token]);

  const loadContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchCrmContacts(
        {
          page,
          limit: 20,
          filters,
        },
        token,
      );

      if (!response?.success) {
        throw new Error(response?.message || "Failed to load CRM contacts.");
      }

      const nextContacts = Array.isArray(response.data?.contacts)
        ? response.data.contacts
        : [];
      setContacts(nextContacts);
      setTotalPages(Math.max(Number(response.data?.pagination?.totalPages || 1), 1));

      if (nextContacts.length === 0) {
        applySelectedContact(null);
        return;
      }

      const matchingSelected = nextContacts.find(
        (entry) => String(entry.id) === String(selectedContactId || ""),
      );
      applySelectedContact(matchingSelected || nextContacts[0]);
    } catch (error) {
      setContacts([]);
      setTotalPages(1);
      applySelectedContact(null);
      toast.error(error?.message || "Failed to load CRM contacts.");
    } finally {
      setIsLoading(false);
    }
  }, [applySelectedContact, filters, page, selectedContactId, token]);

  const loadTimeline = useCallback(async () => {
    if (!selectedContactId || !token) {
      setTimeline([]);
      setRecentOrders([]);
      return;
    }

    setTimelineLoading(true);
    try {
      const response = await fetchCrmContactTimeline(
        selectedContactId,
        { page: 1, limit: 25 },
        token,
      );

      if (!response?.success) {
        throw new Error(response?.message || "Failed to load CRM timeline.");
      }

      const contact = response.data?.contact || null;
      const interactions = Array.isArray(response.data?.interactions)
        ? response.data.interactions
        : [];
      const nextRecentOrders = Array.isArray(response.data?.recentOrders)
        ? response.data.recentOrders
        : [];
      if (contact) {
        applySelectedContact(contact);
      }
      setTimeline(interactions);
      setRecentOrders(nextRecentOrders);
    } catch (error) {
      setTimeline([]);
      setRecentOrders([]);
      toast.error(error?.message || "Failed to load CRM timeline.");
    } finally {
      setTimelineLoading(false);
    }
  }, [applySelectedContact, selectedContactId, token]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    Promise.all([loadOverview(), loadContacts()]).catch((error) => {
      toast.error(error?.message || "Failed to load CRM dashboard.");
    });
  }, [isAuthenticated, token, loadContacts, loadOverview]);

  useEffect(() => {
    if (isAuthenticated && token && selectedContactId) {
      loadTimeline();
    }
  }, [isAuthenticated, token, selectedContactId, loadTimeline]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({
      q: "",
      channel: "",
      lifecycleStage: "",
      status: "",
    });
  };

  const handleSaveContact = async () => {
    if (!selectedContactId || !token) return;

    setIsSaving(true);
    try {
      const response = await updateCrmContact(
        selectedContactId,
        {
          lifecycleStage: draft.lifecycleStage,
          status: draft.status,
          sourceChannel: draft.sourceChannel,
          tags: draft.tags,
        },
        token,
      );

      if (!response?.success) {
        throw new Error(response?.message || "Failed to update CRM contact.");
      }

      toast.success("CRM contact updated.");
      await Promise.all([loadOverview(), loadContacts(), loadTimeline()]);
    } catch (error) {
      toast.error(error?.message || "Failed to update CRM contact.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const summaryCards = [
    {
      label: "Total Contacts",
      value: Number(overview?.summary?.totalContacts || 0),
      tone: "from-slate-900 via-slate-800 to-slate-700",
    },
    {
      label: "Customers",
      value: Number(overview?.summary?.totalCustomers || 0),
      tone: "from-emerald-700 via-emerald-600 to-emerald-500",
    },
    {
      label: "Open Leads",
      value: Number(overview?.summary?.openLeads || 0),
      tone: "from-amber-700 via-amber-600 to-orange-500",
    },
    {
      label: "Active 30 Days",
      value: Number(overview?.summary?.activeLast30Days || 0),
      tone: "from-cyan-700 via-sky-600 to-blue-500",
    },
  ];

  return (
    <section className="w-full p-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl bg-gradient-to-br ${card.tone} text-white p-5 shadow-lg`}
          >
            <p className="text-sm text-white/80">{card.label}</p>
            <h2 className="text-3xl font-semibold mt-2">{card.value}</h2>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr] gap-5">
        <div className="bg-white rounded-2xl shadow-md p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-[24px] font-[600] text-gray-900">CRM</h1>
              <p className="text-sm text-gray-500">
                Track customer touchpoints from website, WhatsApp, support, newsletter, and order flows.
              </p>
            </div>
            <Button
              variant="outlined"
              size="small"
              sx={{ textTransform: "none" }}
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
            <TextField
              size="small"
              label="Search"
              name="q"
              value={filters.q}
              onChange={handleFilterChange}
              placeholder="Name, email, phone"
            />

            <TextField
              select
              size="small"
              label="Channel"
              name="channel"
              value={filters.channel}
              onChange={handleFilterChange}
            >
              {CHANNEL_OPTIONS.map((option) => (
                <MenuItem key={option.value || "all"} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Lifecycle"
              name="lifecycleStage"
              value={filters.lifecycleStage}
              onChange={handleFilterChange}
            >
              {LIFECYCLE_OPTIONS.map((option) => (
                <MenuItem key={option.value || "all"} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value || "all"} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-slate-500">
              No CRM contacts matched these filters yet.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px]">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">
                        Contact
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">
                        Source
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">
                        Stage
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">
                        Orders
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">
                        Spend
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">
                        Last Activity
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => (
                      <tr
                        key={contact.id}
                        className={`border-b border-slate-100 cursor-pointer transition-colors ${
                          String(contact.id) === String(selectedContactId)
                            ? "bg-orange-50"
                            : "hover:bg-slate-50"
                        }`}
                        onClick={() => applySelectedContact(contact)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {contact.name || "Unnamed contact"}
                          </div>
                          <div className="text-sm text-slate-500">
                            {contact.email || contact.phone || contact.sessionId || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {prettifyValue(contact.sourceChannel)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${stageBadgeClass(contact.lifecycleStage)}`}
                          >
                            {prettifyValue(contact.lifecycleStage)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(contact.status)}`}
                          >
                            {prettifyValue(contact.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {Number(contact.totalOrders || 0)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {formatCurrency(contact.totalSpent)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {formatDateTime(contact.lastInteractionAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-center pt-6">
                <Pagination
                  page={page}
                  count={totalPages}
                  onChange={(_event, value) => setPage(value)}
                  showFirstButton
                  showLastButton
                />
              </div>
            </>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-2xl shadow-md p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {selectedContact?.name || "Select a contact"}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedContact?.email ||
                    selectedContact?.phone ||
                    selectedContact?.sessionId ||
                    "Pick a CRM contact to inspect timeline and update stage."}
                </p>
              </div>
            </div>

            {selectedContact ? (
              <div className="space-y-4 mt-5">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-slate-500">Interactions</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {Number(selectedContact.interactionCount || 0)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-slate-500">Revenue</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {formatCurrency(selectedContact.totalSpent)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <TextField
                    select
                    size="small"
                    label="Lifecycle Stage"
                    value={draft.lifecycleStage}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        lifecycleStage: event.target.value,
                      }))
                    }
                  >
                    {LIFECYCLE_OPTIONS.filter((option) => option.value).map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    size="small"
                    label="Status"
                    value={draft.status}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        status: event.target.value,
                      }))
                    }
                  >
                    {STATUS_OPTIONS.filter((option) => option.value).map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    size="small"
                    label="Source Channel"
                    value={draft.sourceChannel}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        sourceChannel: event.target.value,
                      }))
                    }
                  >
                    {CHANNEL_OPTIONS.filter((option) => option.value).map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    size="small"
                    label="Tags"
                    value={draft.tags}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        tags: event.target.value,
                      }))
                    }
                    placeholder="vip, repeat, priority"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="contained"
                    sx={{ textTransform: "none" }}
                    onClick={handleSaveContact}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Contact"}
                  </Button>
                  <span className="text-xs text-slate-500">
                    First seen {formatDateTime(selectedContact.firstSeenAt)}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="bg-white rounded-2xl shadow-md p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Recent Orders
                </h3>
                <p className="text-sm text-slate-500">
                  Direct shipment access for the selected CRM contact.
                </p>
              </div>
              {selectedContact ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {Number(selectedContact.totalOrders || recentOrders.length || 0)} orders
                </span>
              ) : null}
            </div>

            {timelineLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-slate-500">
                {selectedContact
                  ? "No orders matched this CRM contact yet."
                  : "Select a contact to view linked orders."}
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {order.displayOrderId || "Order"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDateTime(order.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(order.totalAmount)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {prettifyValue(order.paymentStatus)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-white p-3 border border-slate-100">
                        <p className="text-slate-500">Order Status</p>
                        <p className="mt-1 font-medium text-slate-900">
                          {prettifyValue(order.orderStatus)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-3 border border-slate-100">
                        <p className="text-slate-500">Shipment Status</p>
                        <p className="mt-1 font-medium text-slate-900">
                          {prettifyValue(order.shipmentStatus)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm text-slate-600">
                        <span className="font-semibold text-slate-900">AWB:</span>{" "}
                        {order.awbNumber || "N/A"}
                        <span className="ml-3 font-semibold text-slate-900">
                          Courier:
                        </span>{" "}
                        {order.courierName || "Xpressbees"}
                      </div>

                      {order.trackingUrl ? (
                        <a
                          href={order.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700"
                        >
                          Track Shipment
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Tracking not available yet
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-md p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Timeline</h3>
                <p className="text-sm text-slate-500">
                  Latest CRM touchpoints for the selected contact.
                </p>
              </div>
            </div>

            {timelineLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
              </div>
            ) : timeline.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-slate-500">
                {selectedContact
                  ? "No interactions recorded for this contact yet."
                  : "Select a contact to view timeline."}
              </div>
            ) : (
              <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
                {timeline.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                        {prettifyValue(item.channel)}
                      </span>
                      <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                        {prettifyValue(item.eventType)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDateTime(item.happenedAt)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900">
                      {item.eventName || prettifyValue(item.eventType)}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {resolveTimelineSummary(item)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-md p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {(overview?.recentInteractions || []).slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {item.contact?.name || item.contact?.email || "Unknown contact"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {prettifyValue(item.channel)} • {prettifyValue(item.eventType)}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {formatDateTime(item.happenedAt)}
                  </span>
                </div>
              ))}
              {!(overview?.recentInteractions || []).length ? (
                <p className="text-sm text-slate-500">No recent CRM interactions yet.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CrmPage;
