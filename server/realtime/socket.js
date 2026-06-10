import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import UserModel from "../models/user.model.js";
import isPrivilegedAdminRole from "../utils/isPrivilegedAdminRole.js";

let ioInstance = null;

const toBoolean = (value, fallback = false) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const resolveSocketTransports = () => {
  const preferWebsocket = toBoolean(
    process.env.PERF_SOCKET_PREFER_WEBSOCKET,
    true,
  );
  const allowPolling = toBoolean(process.env.PERF_SOCKET_ALLOW_POLLING, true);

  if (!allowPolling) {
    return ["websocket"];
  }

  return preferWebsocket ? ["websocket", "polling"] : ["polling", "websocket"];
};

const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
};

const normalizeOrigin = (origin) =>
  String(origin || "")
    .trim()
    .replace(/\/+$/, "");

const isLocalOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizeOrigin(origin));

export const initSocket = (
  httpServer,
  { origins = [], isAllowedOrigin = null, isProduction = false, jwtSecret } = {},
) => {
  if (ioInstance) return ioInstance;

  const socketTransports = resolveSocketTransports();
  const transportLogEnabled = toBoolean(
    process.env.PERF_SOCKET_TRANSPORT_LOG_ENABLED,
    true,
  );

  const allowedOrigins = new Set(
    (Array.isArray(origins) ? origins : [])
      .map(normalizeOrigin)
      .filter(Boolean),
  );

  ioInstance = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        const normalizedOrigin = normalizeOrigin(origin);

        if (
          !origin ||
          allowedOrigins.has(normalizedOrigin) ||
          (typeof isAllowedOrigin === "function" &&
            isAllowedOrigin(normalizedOrigin)) ||
          (!isProduction && isLocalOrigin(normalizedOrigin))
        ) {
          callback(null, true);
          return;
        }

        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    },
    transports: socketTransports,
    allowUpgrades: true,
  });

  if (transportLogEnabled) {
    console.info("[socket] Transport policy", {
      transports: socketTransports,
      preferWebsocket: socketTransports[0] === "websocket",
    });
  }

  ioInstance.use((socket, next) => {
    const cookies = parseCookies(socket.handshake.headers?.cookie || "");
    const token =
      cookies.accessToken ||
      cookies.token ||
      socket.handshake.auth?.token ||
      null;

    if (!token || !jwtSecret) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      if (decoded?.id) {
        socket.userId = decoded.id;
      }
    } catch {
      // Treat invalid/expired auth as a guest connection.
    }
    return next();
  });

  ioInstance.on("connection", async (socket) => {
    if (transportLogEnabled) {
      console.info("[socket] Connection established", {
        socketId: socket.id,
        transport: socket.conn?.transport?.name || "unknown",
      });
    }

    socket.conn?.on("upgrade", (transport) => {
      if (!transportLogEnabled) return;
      console.info("[socket] Transport upgraded", {
        socketId: socket.id,
        transport: transport?.name || "unknown",
      });
    });

    socket.join("audience:all");

    if (socket.userId) {
      socket.join("audience:user");
      socket.join(`user:${socket.userId}`);
      try {
        const user = await UserModel.findById(socket.userId).select(
          "role status",
        );
        if (isPrivilegedAdminRole(user?.role) && user?.status === "active") {
          socket.join("admin:orders");
          socket.join("admin:analytics");
        }
      } catch {
        // Ignore role lookup failures for socket connections.
      }
      return;
    }

    socket.join("audience:guest");
  });

  return ioInstance;
};

export const getIO = () => ioInstance;
