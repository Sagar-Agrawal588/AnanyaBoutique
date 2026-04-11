"use client";

import { getData, patchData } from "@/utils/api";

const toQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (String(value).trim() === "") return;
    query.set(key, String(value).trim());
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
};

export const fetchCrmOverview = async (token) =>
  getData("/api/admin/crm/overview", token);

export const fetchCrmContacts = async ({ page, limit, filters = {} }, token) => {
  const query = toQueryString({
    page,
    limit,
    q: filters.q,
    channel: filters.channel,
    lifecycleStage: filters.lifecycleStage,
    status: filters.status,
  });

  return getData(`/api/admin/crm/contacts${query}`, token);
};

export const fetchCrmContactTimeline = async (
  contactId,
  { page = 1, limit = 25 } = {},
  token,
) =>
  getData(
    `/api/admin/crm/contacts/${contactId}/timeline${toQueryString({ page, limit })}`,
    token,
  );

export const updateCrmContact = async (contactId, payload, token) =>
  patchData(`/api/admin/crm/contacts/${contactId}`, payload, token);
