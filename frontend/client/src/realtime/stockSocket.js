"use client";

import { API_BASE_URL, invalidatePublicGetCache } from "@/utils/api";
import { io } from "socket.io-client";

const normalizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");

const resolveSocketUrl = () => {
  const fallbackApiUrl = normalizeBaseUrl(API_BASE_URL);
  if (fallbackApiUrl.startsWith("/")) {
    return normalizeBaseUrl(
      process.env.NEXT_PUBLIC_BACKEND_URL ||
        process.env.NEXT_PUBLIC_APP_API_URL ||
        process.env.NEXT_PUBLIC_API_URL,
    );
  }
  return fallbackApiUrl.replace(/\/api$/i, "");
};

const SOCKET_URL = resolveSocketUrl();
const SOCKET_TRANSPORTS = ["websocket", "polling"];
const SOCKET_TIMEOUT_MS = 8000;
const STOCK_EVENT_FLUSH_MS = 80;
const STOCK_EVENT_RETENTION_MS = 5 * 60 * 1000;
const SOCKET_FALLBACK_GRACE_MS = 4000;
const STOCK_BROADCAST_CHANNEL_NAME = "bogecom:stock-updates";
const STOCK_LOCAL_STORAGE_KEY = "bogecom:stock-update";

const stockListeners = new Set();
const connectionListeners = new Set();

let stockSocket = null;
let hasConnectedOnce = false;
let crossTabSyncReady = false;
let fallbackActivationTimer = null;
let fallbackActive = false;
let stockFlushTimer = null;
let broadcastChannel = null;
let latestConnectionState = {
  type: "idle",
  at: Date.now(),
  connected: false,
  fallbackActive: false,
  socketId: null,
};

const processedEventIds = new Map();
const pendingStockPayloads = new Map();

const notifyConnectionListeners = (payload) => {
  latestConnectionState = {
    ...latestConnectionState,
    ...payload,
    fallbackActive,
  };

  connectionListeners.forEach((listener) => {
    try {
      listener(latestConnectionState);
    } catch (error) {
      console.error("Stock socket listener failed:", error);
    }
  });
};

const notifyStockListeners = (payload) => {
  stockListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.error("Stock update listener failed:", error);
    }
  });
};

const getEventIdentity = (payload) => {
  if (!payload?.product_id) return "";
  return (
    String(payload?.event_id || "").trim() ||
    `${String(payload?.product_id || "").trim()}::${String(payload?.variant_id || "").trim()}::${String(payload?.event_version || payload?.updated_at || "").trim()}`
  );
};

const pruneProcessedEventIds = (now = Date.now()) => {
  processedEventIds.forEach((seenAt, eventId) => {
    if (now - Number(seenAt || 0) > STOCK_EVENT_RETENTION_MS) {
      processedEventIds.delete(eventId);
    }
  });
};

const markEventAsSeen = (payload) => {
  const eventId = getEventIdentity(payload);
  if (!eventId) {
    return true;
  }

  pruneProcessedEventIds();
  if (processedEventIds.has(eventId)) {
    return false;
  }

  processedEventIds.set(eventId, Date.now());
  return true;
};

const comparePayloadFreshness = (currentPayload, nextPayload) => {
  const currentVersion = Number(currentPayload?.event_version);
  const nextVersion = Number(nextPayload?.event_version);
  if (Number.isFinite(currentVersion) && Number.isFinite(nextVersion)) {
    return nextVersion - currentVersion;
  }

  const currentUpdatedAt = Date.parse(String(currentPayload?.updated_at || ""));
  const nextUpdatedAt = Date.parse(String(nextPayload?.updated_at || ""));
  if (Number.isFinite(currentUpdatedAt) && Number.isFinite(nextUpdatedAt)) {
    return nextUpdatedAt - currentUpdatedAt;
  }

  return 1;
};

const flushPendingStockPayloads = () => {
  stockFlushTimer = null;
  if (!pendingStockPayloads.size) {
    return;
  }

  const payloads = [...pendingStockPayloads.values()];
  pendingStockPayloads.clear();
  invalidatePublicGetCache();

  payloads.forEach((payload) => {
    notifyStockListeners(payload);
  });
};

const scheduleStockFlush = () => {
  if (stockFlushTimer) return;
  stockFlushTimer = window.setTimeout(() => {
    flushPendingStockPayloads();
  }, STOCK_EVENT_FLUSH_MS);
};

const broadcastStockPayload = (payload) => {
  if (typeof window === "undefined" || !payload?.product_id) {
    return;
  }

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch {
      // Best-effort fanout only.
    }
  }

  try {
    window.localStorage.setItem(
      STOCK_LOCAL_STORAGE_KEY,
      JSON.stringify({
        at: Date.now(),
        payload,
      }),
    );
  } catch {
    // Best-effort fanout only.
  }
};

const enqueueStockPayload = (payload, { fanOut = false } = {}) => {
  if (!payload?.product_id || !markEventAsSeen(payload)) {
    return;
  }

  const key = `${String(payload?.product_id || "").trim()}::${String(payload?.variant_id || "").trim()}`;
  const currentPayload = pendingStockPayloads.get(key);
  if (!currentPayload || comparePayloadFreshness(currentPayload, payload) >= 0) {
    pendingStockPayloads.set(key, payload);
  }

  if (fanOut) {
    broadcastStockPayload(payload);
  }

  scheduleStockFlush();
};

const activateFallbackMode = (reason) => {
  fallbackActivationTimer = null;
  if (fallbackActive) {
    return;
  }

  fallbackActive = true;
  notifyConnectionListeners({
    type: "fallback_active",
    at: Date.now(),
    reason,
    connected: false,
    socketId: stockSocket?.id || null,
  });
};

const scheduleFallbackActivation = (reason) => {
  if (fallbackActive || fallbackActivationTimer || typeof window === "undefined") {
    return;
  }

  fallbackActivationTimer = window.setTimeout(() => {
    activateFallbackMode(reason);
  }, SOCKET_FALLBACK_GRACE_MS);
};

const clearFallbackActivation = () => {
  if (fallbackActivationTimer && typeof window !== "undefined") {
    window.clearTimeout(fallbackActivationTimer);
  }
  fallbackActivationTimer = null;
  fallbackActive = false;
};

const ensureCrossTabSync = () => {
  if (typeof window === "undefined" || crossTabSyncReady) {
    return;
  }

  crossTabSyncReady = true;

  if (typeof window.BroadcastChannel === "function") {
    broadcastChannel = new window.BroadcastChannel(STOCK_BROADCAST_CHANNEL_NAME);
    broadcastChannel.onmessage = (event) => {
      enqueueStockPayload(event?.data || null);
    };
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== STOCK_LOCAL_STORAGE_KEY || !event.newValue) {
      return;
    }

    try {
      const payload = JSON.parse(event.newValue)?.payload;
      enqueueStockPayload(payload);
    } catch {
      // Ignore malformed storage messages.
    }
  });
};

export const startStockSocket = () => {
  if (typeof window === "undefined") return null;
  ensureCrossTabSync();

  if (stockSocket) {
    if (!stockSocket.connected) {
      stockSocket.connect();
    }
    return stockSocket;
  }

  stockSocket = io(SOCKET_URL, {
    withCredentials: true,
    transports: SOCKET_TRANSPORTS,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: SOCKET_TIMEOUT_MS,
  });

  stockSocket.on("connect", () => {
    const eventType = hasConnectedOnce ? "reconnected" : "connected";
    hasConnectedOnce = true;
    clearFallbackActivation();
    notifyConnectionListeners({
      type: eventType,
      at: Date.now(),
      connected: true,
      socketId: stockSocket?.id || null,
    });
  });

  stockSocket.on("disconnect", (reason) => {
    notifyConnectionListeners({
      type: "disconnected",
      at: Date.now(),
      connected: false,
      reason,
      socketId: stockSocket?.id || null,
    });
    scheduleFallbackActivation(reason || "socket_disconnected");
  });

  stockSocket.on("stock_update", (payload) => {
    enqueueStockPayload(payload, { fanOut: true });
  });

  stockSocket.on("connect_error", (error) => {
    notifyConnectionListeners({
      type: "connect_error",
      at: Date.now(),
      connected: false,
      socketId: stockSocket?.id || null,
      message: error?.message || "socket_connect_error",
    });
    scheduleFallbackActivation(error?.message || "socket_connect_error");
  });

  return stockSocket;
};

export const subscribeToStockUpdates = (listener) => {
  if (typeof listener !== "function") {
    return () => {};
  }

  stockListeners.add(listener);
  startStockSocket();

  return () => {
    stockListeners.delete(listener);
  };
};

export const subscribeToStockConnection = (listener) => {
  if (typeof listener !== "function") {
    return () => {};
  }

  connectionListeners.add(listener);
  startStockSocket();

  try {
    listener(latestConnectionState);
  } catch (error) {
    console.error("Stock socket listener failed:", error);
  }

  return () => {
    connectionListeners.delete(listener);
  };
};
