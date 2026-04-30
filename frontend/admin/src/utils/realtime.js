import { io } from "socket.io-client";
import { API_BASE_URL } from "@/utils/api";

const SOCKET_TRANSPORTS = ["polling", "websocket"];

const sanitizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\/+$/, "");

const resolveSocketBaseUrl = () => {
  const baseUrl = sanitizeBaseUrl(API_BASE_URL);
  const normalizedBaseUrl = baseUrl.endsWith("/api")
    ? baseUrl.slice(0, -4)
    : baseUrl;

  try {
    const parsed = new URL(normalizedBaseUrl);
    const hostname = String(parsed.hostname || "").toLowerCase();
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

    // Local backend defaults to port 8000. Prefer that for sockets so a stale
    // 8001 override in frontend env does not keep live updates offline.
    if (isLocalhost && parsed.port && parsed.port !== "8000") {
      parsed.port = "8000";
      return parsed.toString().replace(/\/+$/, "");
    }

    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return normalizedBaseUrl;
  }
};

const SOCKET_URL = resolveSocketBaseUrl();

let socketInstance = null;
let activeToken = null;

const createSocket = () =>
  io(SOCKET_URL, {
    autoConnect: false,
    transports: SOCKET_TRANSPORTS,
    withCredentials: true,
  });

export const getAdminSocket = (token) => {
  if (typeof window === "undefined") return null;

  if (!socketInstance) {
    socketInstance = createSocket();
  }

  const resolvedToken = typeof token === "string" ? token : null;
  if (resolvedToken && resolvedToken !== activeToken) {
    activeToken = resolvedToken;
    socketInstance.auth = { token: resolvedToken };
    if (socketInstance.connected) {
      socketInstance.disconnect();
    }
  }

  if (resolvedToken && !socketInstance.connected) {
    socketInstance.connect();
  }

  return socketInstance;
};

export const disconnectAdminSocket = () => {
  if (!socketInstance) return;
  socketInstance.disconnect();
};
