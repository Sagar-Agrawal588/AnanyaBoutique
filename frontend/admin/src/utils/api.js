import axios from "axios";

const HEALTHY_ONE_GRAM_HOSTS = new Set([
  "healthyonegram.com",
  "www.healthyonegram.com",
]);

const LOCAL_API_FALLBACK = "http://localhost:8000";
const LOCAL_API_FALLBACKS = [
  "http://localhost:8000",
  "http://localhost:8001",
  "http://localhost:8002",
  "http://127.0.0.1:8000",
  "http://127.0.0.1:8001",
  "http://127.0.0.1:8002",
];

const sanitizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\/+$/, "");

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || ""));

const isNetworkLevelError = (error) => {
  if (error?.response) return false;
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  return (
    message.includes("network error") ||
    message.includes("failed to fetch") ||
    code === "err_network" ||
    code === "econnrefused"
  );
};

const resolveAlternateLocalhostBaseUrls = (value) => {
  try {
    const parsed = new URL(String(value || ""));
    const host = String(parsed.hostname || "").toLowerCase();
    if (host !== "localhost" && host !== "127.0.0.1") return [];
    const current = parsed.toString().replace(/\/+$/, "");
    return LOCAL_API_FALLBACKS.filter((candidate) => candidate !== current);
  } catch {
    return [];
  }
};

const resolveApiBaseUrl = () => {
  const localDevBaseUrl = sanitizeBaseUrl(
    process.env.NEXT_PUBLIC_LOCAL_API_URL,
  );
  const envCandidates = [
    localDevBaseUrl,
    process.env.NEXT_PUBLIC_APP_API_URL,
    process.env.NEXT_PUBLIC_API_URL,
  ]
    .map(sanitizeBaseUrl)
    .filter(Boolean);
  const envBaseUrl = envCandidates.find(isHttpUrl) || "";

  if (typeof window !== "undefined") {
    const hostname = String(window.location.hostname || "").toLowerCase();
    const origin = sanitizeBaseUrl(window.location.origin);
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

    if (isLocalhost) {
      // In local admin development there are no `/api` rewrites, so an
      // explicitly configured backend URL must win over the localhost fallback.
      if (envBaseUrl) {
        return envBaseUrl;
      }
      return LOCAL_API_FALLBACK;
    }

    if (HEALTHY_ONE_GRAM_HOSTS.has(hostname)) {
      return origin;
    }

    if (isHttpUrl(envBaseUrl)) {
      return envBaseUrl;
    }

    return origin || LOCAL_API_FALLBACK;
  }

  if (isHttpUrl(envBaseUrl)) {
    return envBaseUrl;
  }

  if (process.env.NODE_ENV === "production") {
    return "https://healthyonegram.com";
  }

  return LOCAL_API_FALLBACK;
};

export const API_BASE_URL = resolveApiBaseUrl();

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const BASE_HAS_API_SUFFIX = /\/api$/i.test(String(API_BASE_URL || ""));

const normalizePath = (url) => {
  const normalized = url?.startsWith("/") ? url : `/${url}`;
  if (!BASE_HAS_API_SUFFIX) return normalized;
  if (/^\/api(\/|$)/i.test(normalized)) {
    return normalized.replace(/^\/api/i, "");
  }
  return normalized;
};

let refreshPromise = null;

const getStoredAdminToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken");
};

const setStoredAdminToken = (token) => {
  if (typeof window === "undefined") return;

  if (typeof token === "string" && token.trim()) {
    localStorage.setItem("adminToken", token);
    window.dispatchEvent(
      new CustomEvent("adminTokenRefreshed", { detail: token }),
    );
    return;
  }

  localStorage.removeItem("adminToken");
  window.dispatchEvent(
    new CustomEvent("adminTokenRefreshed", { detail: null }),
  );
};

const refreshAdminToken = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await axiosClient.post(
        normalizePath("/api/user/refresh-token"),
        {},
      );
      const token = response?.data?.data?.accessToken || null;
      setStoredAdminToken(token);
      return token;
    } catch (error) {
      setStoredAdminToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

const buildHeaders = (token, extraHeaders = {}) => {
  const resolvedToken = token || getStoredAdminToken();
  return {
    ...extraHeaders,
    ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
  };
};

const toErrorPayload = (error, fallbackMessage) => {
  const details = error?.response?.data?.details || null;
  const message =
    error?.response?.data?.message || error?.message || fallbackMessage;
  return {
    error: true,
    success: false,
    message,
    ...(details ? { details: String(details) } : {}),
  };
};

const requestWithRetry = async ({
  method,
  url,
  data,
  token = null,
  headers = {},
  fallbackMessage = "Request failed",
}) => {
  const requestConfig = {
    method,
    url: normalizePath(url),
    data,
    headers: buildHeaders(token, headers),
  };

  const requestWithoutAuthHeader = async () => {
    const cookieOnlyHeaders = { ...headers };
    delete cookieOnlyHeaders.Authorization;

    const cookieRetryConfig = {
      ...requestConfig,
      headers: cookieOnlyHeaders,
    };

    const response = await axiosClient.request(cookieRetryConfig);
    return response.data;
  };

  const retryOnAlternateLocalhost = async () => {
    const alternateBaseUrls = resolveAlternateLocalhostBaseUrls(API_BASE_URL);
    if (!alternateBaseUrls.length) return null;
    for (const baseURL of alternateBaseUrls) {
      try {
        const response = await axiosClient.request({
          ...requestConfig,
          baseURL,
        });
        return response.data;
      } catch {
        // Try the next local port candidate.
      }
    }
    return null;
  };

  try {
    const response = await axiosClient.request(requestConfig);
    return response.data;
  } catch (error) {
    if (isNetworkLevelError(error)) {
      const fallbackResponse = await retryOnAlternateLocalhost();
      if (fallbackResponse) return fallbackResponse;
    }

    if (error?.response?.status === 401 && !requestConfig._retry) {
      requestConfig._retry = true;
      const newToken = await refreshAdminToken();
      if (newToken) {
        requestConfig.headers = buildHeaders(newToken, headers);
        try {
          const retryResponse = await axiosClient.request(requestConfig);
          return retryResponse.data;
        } catch (retryError) {
          if (isNetworkLevelError(retryError)) {
            const fallbackResponse = await retryOnAlternateLocalhost();
            if (fallbackResponse) return fallbackResponse;
          }

          if (retryError?.response?.status !== 401) {
            return toErrorPayload(retryError, fallbackMessage);
          }
        }
      }

      // Fallback to cookie-only auth when local token is stale or refresh fails.
      try {
        setStoredAdminToken(null);
        return await requestWithoutAuthHeader();
      } catch (cookieRetryError) {
        return toErrorPayload(cookieRetryError, fallbackMessage);
      }
    }
    return toErrorPayload(error, fallbackMessage);
  }
};

export const postData = async (url, formData, token = null) =>
  requestWithRetry({
    method: "post",
    url,
    data: formData,
    token,
    fallbackMessage: "Failed to submit request",
  });

export const getData = async (url, token = null) =>
  requestWithRetry({
    method: "get",
    url,
    token,
    fallbackMessage: "Failed to fetch data",
  });

export const getBlobData = async (url, token = null) => {
  const requestConfig = {
    method: "get",
    url: normalizePath(url),
    headers: buildHeaders(token),
    responseType: "blob",
  };

  const retryOnAlternateLocalhost = async () => {
    const alternateBaseUrls = resolveAlternateLocalhostBaseUrls(API_BASE_URL);
    if (!alternateBaseUrls.length) return null;
    for (const baseURL of alternateBaseUrls) {
      try {
        const response = await axiosClient.request({
          ...requestConfig,
          baseURL,
        });
        return {
          success: true,
          error: false,
          blob: response.data,
          headers: response.headers || {},
        };
      } catch {
        // Try the next local port candidate.
      }
    }
    return null;
  };

  try {
    const response = await axiosClient.request(requestConfig);
    return {
      success: true,
      error: false,
      blob: response.data,
      headers: response.headers || {},
    };
  } catch (error) {
    if (isNetworkLevelError(error)) {
      const fallbackResponse = await retryOnAlternateLocalhost();
      if (fallbackResponse) return fallbackResponse;
    }

    if (error?.response?.status === 401 && !requestConfig._retry) {
      requestConfig._retry = true;
      const newToken = await refreshAdminToken();
      if (newToken) {
        requestConfig.headers = buildHeaders(newToken);
        try {
          const retryResponse = await axiosClient.request(requestConfig);
          return {
            success: true,
            error: false,
            blob: retryResponse.data,
            headers: retryResponse.headers || {},
          };
        } catch (retryError) {
          if (isNetworkLevelError(retryError)) {
            const fallbackResponse = await retryOnAlternateLocalhost();
            if (fallbackResponse) return fallbackResponse;
          }
          return toErrorPayload(retryError, "Failed to download file");
        }
      }
    }

    return toErrorPayload(error, "Failed to download file");
  }
};

export const putData = async (url, formData, token = null) =>
  requestWithRetry({
    method: "put",
    url,
    data: formData,
    token,
    fallbackMessage: "Failed to update data",
  });

export const deleteData = async (url, token = null) =>
  requestWithRetry({
    method: "delete",
    url,
    token,
    fallbackMessage: "Failed to delete data",
  });

export const patchData = async (url, formData, token = null) =>
  requestWithRetry({
    method: "patch",
    url,
    data: formData,
    token,
    fallbackMessage: "Failed to update data",
  });

export const postMultipartData = async (url, formData, token = null) =>
  requestWithRetry({
    method: "post",
    url,
    data: formData,
    token,
    headers: { "Content-Type": "multipart/form-data" },
    fallbackMessage: "Failed to submit request",
  });

export const uploadFile = async (file, token) => {
  const formData = new FormData();
  formData.append("image", file);
  return requestWithRetry({
    method: "post",
    url: "/api/upload/single",
    data: formData,
    token,
    headers: { "Content-Type": "multipart/form-data" },
    fallbackMessage: "Failed to upload file",
  });
};

export const uploadVideoFile = async (file, token) => {
  const formData = new FormData();
  formData.append("video", file);
  return requestWithRetry({
    method: "post",
    url: "/api/upload/video",
    data: formData,
    token,
    headers: { "Content-Type": "multipart/form-data" },
    fallbackMessage: "Failed to upload video",
  });
};

export const uploadFiles = async (files, token) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  return requestWithRetry({
    method: "post",
    url: "/api/upload/multiple",
    data: formData,
    token,
    headers: { "Content-Type": "multipart/form-data" },
    fallbackMessage: "Failed to upload files",
  });
};

export const getDashboardStats = async (token) =>
  requestWithRetry({
    method: "get",
    url: "/api/statistics/dashboard",
    token,
    fallbackMessage: "Failed to fetch dashboard stats",
  });
