import { resolveMaintenanceStatus } from "../utils/maintenance.js";

const EXEMPT_PREFIXES = [
  "/api/admin",
  "/api/settings/admin",
  "/api/settings/public",
  "/api/settings/maintenance-status",
  "/api/webhooks",
];

const isExemptPath = (req) => {
  const path = String(req?.originalUrl || req?.url || "").toLowerCase();
  if (!path.startsWith("/api")) return true;
  if (req?.method === "OPTIONS") return true;
  if (path.includes("/webhook/")) return true;
  return EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix));
};

const maintenanceModeMiddleware = async (req, res, next) => {
  if (isExemptPath(req)) {
    return next();
  }

  try {
    const status = await resolveMaintenanceStatus({ autoDisable: true });

    if (!status.isActive) {
      return next();
    }

    return res.status(503).json({
      error: true,
      success: false,
      message: status.maintenanceMessage,
      maintenance: {
        isMaintenanceMode: true,
        maintenanceEnabled: status.maintenanceEnabled,
        maintenanceStartTime: status.maintenanceStartTime,
        maintenanceEndTime: status.maintenanceEndTime,
        remainingTime: status.remainingTimeMs,
        showCountdown: status.showCountdown,
        now: status.now,
      },
    });
  } catch (error) {
    console.error("Maintenance middleware check failed:", error);
    return next();
  }
};

export default maintenanceModeMiddleware;
