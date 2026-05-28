import axios from "axios";

const DEFAULT_PRODUCTION_API_URL =
  "https://healthyonegram-api-v2-xb7znoco6a-uc.a.run.app/api";
const LOCAL_API_FALLBACK = "http://127.0.0.1:8000";
const REQUEST_TIMEOUT_MS = 12000;
const LOCAL_API_FALLBACKS = [
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

const isFrontendUrl = (value) => {
  try {
    const parsed = new URL(sanitizeBaseUrl(value));
    const hostname = String(parsed.hostname || "").toLowerCase();
    return (
      hostname === "healthyonegram.com" ||
      hostname === "www.healthyonegram.com" ||
      hostname.endsWith(".hosted.app")
    );
  } catch {
    return false;
  }
};

const normalizeApiBaseUrl = (value) => {
  const normalized = sanitizeBaseUrl(value);
  if (!isHttpUrl(normalized)) return "";
  return /\/api$/i.test(normalized) ? normalized : `${normalized}/api`;
};

const pickFirstApiUrl = (...values) => {
  for (const value of values) {
    const normalized = normalizeApiBaseUrl(value);
    if (!isHttpUrl(normalized)) continue;
    if (isFrontendUrl(normalized)) continue;
    return normalized;
  }
  return "";
};

const resolveConfiguredEnvBaseUrl = () => {
  const localDevBaseUrl = sanitizeBaseUrl(
    process.env.NEXT_PUBLIC_LOCAL_API_URL,
  );
  return pickFirstApiUrl(
    localDevBaseUrl,
    process.env.NEXT_PUBLIC_BACKEND_URL,
    process.env.NEXT_PUBLIC_APP_API_URL,
    process.env.NEXT_PUBLIC_API_URL,
  );
};

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

const isRouteNotFoundError = (error) => {
  const status = Number(error?.response?.status || 0);
  if (status !== 404) return false;

  const message = String(
    error?.response?.data?.message || error?.message || "",
  ).toLowerCase();

  return message.includes("route ") && message.includes(" not found");
};

const shouldRetryOnAlternateBase = (error) =>
  isNetworkLevelError(error) || isRouteNotFoundError(error);

const hasApiSuffix = (baseUrl) => /\/api$/i.test(String(baseUrl || ""));

const getAlternateApiBaseUrls = () => {
  const candidates = [];
  const pushCandidate = (value) => {
    const normalized = sanitizeBaseUrl(value);
    if (!isHttpUrl(normalized)) return;
    if (candidates.includes(normalized)) return;
    if (normalized === sanitizeBaseUrl(API_BASE_URL)) return;
    candidates.push(normalized);
  };

  const envBaseUrl = resolveConfiguredEnvBaseUrl();

  if (typeof window !== "undefined") {
    const hostname = String(window.location.hostname || "").toLowerCase();
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

    if (isLocalhost) {
      pushCandidate(envBaseUrl);
      LOCAL_API_FALLBACKS.forEach(pushCandidate);
      return candidates;
    }

    pushCandidate(envBaseUrl);
    pushCandidate(DEFAULT_PRODUCTION_API_URL);
    return candidates;
  }

  pushCandidate(envBaseUrl);
  pushCandidate(DEFAULT_PRODUCTION_API_URL);
  return candidates;
};

const resolveApiBaseUrl = () => {
  const envBaseUrl = resolveConfiguredEnvBaseUrl();

  if (typeof window !== "undefined") {
    const hostname = String(window.location.hostname || "").toLowerCase();
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

    if (isLocalhost) {
      // In local admin development there are no `/api` rewrites, so an
      // explicitly configured backend URL must win over the localhost fallback.
      if (envBaseUrl) {
        return envBaseUrl;
      }
      return LOCAL_API_FALLBACK;
    }

    // In deployed admin, the dedicated backend must win. Falling back to the
    // frontend origin can hit the Next.js app itself and produce `/api/...`
    // 404s instead of reaching the Express backend.
    if (isHttpUrl(envBaseUrl)) {
      return envBaseUrl;
    }

    return DEFAULT_PRODUCTION_API_URL;
  }

  if (isHttpUrl(envBaseUrl)) {
    return envBaseUrl;
  }

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PRODUCTION_API_URL;
  }

  return LOCAL_API_FALLBACK;
};

export const API_BASE_URL = resolveApiBaseUrl();

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

const normalizePath = (url, baseUrl = API_BASE_URL) => {
  const normalized = url?.startsWith("/") ? url : `/${url}`;
  if (!hasApiSuffix(baseUrl)) return normalized;
  if (/^\/api(\/|$)/i.test(normalized)) {
    return normalized.replace(/^\/api/i, "");
  }
  return normalized;
};

let refreshPromise = null;

const getStoredAdminToken = () => {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("adminToken") ||
    sessionStorage.getItem("adminToken") ||
    null
  );
};

const setStoredAdminToken = (token) => {
  if (typeof window === "undefined") return;

  if (typeof token === "string" && token.trim()) {
    const targetStorage = sessionStorage.getItem("adminToken")
      ? sessionStorage
      : localStorage;
    targetStorage.setItem("adminToken", token);
    window.dispatchEvent(
      new CustomEvent("adminTokenRefreshed", { detail: token }),
    );
    return;
  }

  localStorage.removeItem("adminToken");
  sessionStorage.removeItem("adminToken");
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

const executeRequestAcrossBaseUrls = async ({
  method,
  url,
  data,
  token = null,
  headers = {},
  responseType,
  includeStoredToken = true,
}) => {
  const candidateBaseUrls = [
    sanitizeBaseUrl(API_BASE_URL),
    ...getAlternateApiBaseUrls(),
  ].filter(Boolean);

  let lastError = null;

  for (const baseURL of candidateBaseUrls) {
    try {
      return await axiosClient.request({
        method,
        url: normalizePath(url, baseURL),
        data,
        timeout: REQUEST_TIMEOUT_MS,
        headers: includeStoredToken ? buildHeaders(token, headers) : headers,
        ...(responseType ? { responseType } : {}),
        ...(baseURL !== sanitizeBaseUrl(API_BASE_URL) ? { baseURL } : {}),
      });
    } catch (error) {
      lastError = error;
      if (!shouldRetryOnAlternateBase(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Request failed");
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
  const requestWithoutAuthHeader = async () => {
    const cookieOnlyHeaders = { ...headers };
    delete cookieOnlyHeaders.Authorization;
    const response = await executeRequestAcrossBaseUrls({
      method,
      url,
      data,
      headers: cookieOnlyHeaders,
      includeStoredToken: false,
    });
    return response.data;
  };

  try {
    const response = await executeRequestAcrossBaseUrls({
      method,
      url,
      data,
      token,
      headers,
    });
    return response.data;
  } catch (error) {
    if (error?.response?.status === 401) {
      const newToken = await refreshAdminToken();
      if (newToken) {
        try {
          const retryResponse = await executeRequestAcrossBaseUrls({
            method,
            url,
            data,
            token: newToken,
            headers,
          });
          return retryResponse.data;
        } catch (retryError) {
          if (retryError?.response?.status !== 401) {
            return toErrorPayload(retryError, fallbackMessage);
          }
        }
      }

      // Fallback to cookie-only auth when local token is stale or refresh fails.
      try {
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
  try {
    const response = await executeRequestAcrossBaseUrls({
      method: "get",
      url,
      token,
      responseType: "blob",
    });
    return {
      success: true,
      error: false,
      blob: response.data,
      headers: response.headers || {},
    };
  } catch (error) {
    if (error?.response?.status === 401) {
      const newToken = await refreshAdminToken();
      if (newToken) {
        try {
          const retryResponse = await executeRequestAcrossBaseUrls({
            method: "get",
            url,
            token: newToken,
            responseType: "blob",
          });
          return {
            success: true,
            error: false,
            blob: retryResponse.data,
            headers: retryResponse.headers || {},
          };
        } catch (retryError) {
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

export const uploadFile = async (file, token, options = {}) => {
  const formData = new FormData();
  formData.append("image", file);
  if (options.folder) formData.append("folder", options.folder);
  if (options.preserveQuality) formData.append("preserveQuality", "true");
  return requestWithRetry({
    method: "post",
    url: "/api/upload/single",
    data: formData,
    token,
    headers: { "Content-Type": "multipart/form-data" },
    fallbackMessage: "Failed to upload file",
  });
};

export const uploadVideoFile = async (file, token, options = {}) => {
  const formData = new FormData();
  formData.append("video", file);
  if (options.folder) formData.append("folder", options.folder);
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
