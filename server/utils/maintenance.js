import SettingsModel from "../models/settings.model.js";

const DEFAULT_MAINTENANCE_MESSAGE =
  "We are currently undergoing scheduled maintenance. Please check back soon.";

const toValidDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return fallback;
};

export const getDefaultMaintenanceSettings = () => ({
  maintenanceEnabled: false,
  maintenanceStartTime: null,
  maintenanceEndTime: null,
  maintenanceMessage: DEFAULT_MAINTENANCE_MESSAGE,
  showCountdown: true,
});

export const normalizeMaintenanceSettings = (
  rawSettings,
  legacyMaintenanceMode = false,
) => {
  const defaults = getDefaultMaintenanceSettings();
  const source =
    rawSettings && typeof rawSettings === "object" ? rawSettings : {};

  const startDate = toValidDate(source.maintenanceStartTime);
  const endDate = toValidDate(source.maintenanceEndTime);

  return {
    maintenanceEnabled: toBoolean(
      source.maintenanceEnabled,
      Boolean(legacyMaintenanceMode),
    ),
    maintenanceStartTime: startDate ? startDate.toISOString() : null,
    maintenanceEndTime: endDate ? endDate.toISOString() : null,
    maintenanceMessage: String(
      source.maintenanceMessage || defaults.maintenanceMessage,
    ).trim(),
    showCountdown: toBoolean(source.showCountdown, true),
  };
};

const syncMaintenanceSettingsIfExpired = async (settingsDoc, now) => {
  if (!settingsDoc) return;

  await SettingsModel.findOneAndUpdate(
    { key: "maintenanceSettings" },
    {
      $set: {
        value: {
          ...settingsDoc,
          maintenanceEnabled: false,
        },
      },
    },
    { new: false },
  );

  await SettingsModel.findOneAndUpdate(
    { key: "maintenanceMode" },
    {
      $set: {
        value: false,
        description: "Put site in maintenance mode",
        category: "general",
        isActive: true,
      },
      $setOnInsert: {
        key: "maintenanceMode",
      },
    },
    {
      upsert: true,
    },
  );
};

export const resolveMaintenanceStatus = async ({ autoDisable = true } = {}) => {
  const [maintenanceSettingsDoc, maintenanceModeDoc] = await Promise.all([
    SettingsModel.findOne({ key: "maintenanceSettings" })
      .select("value")
      .lean(),
    SettingsModel.findOne({ key: "maintenanceMode" }).select("value").lean(),
  ]);

  const normalized = normalizeMaintenanceSettings(
    maintenanceSettingsDoc?.value,
    Boolean(maintenanceModeDoc?.value),
  );

  const now = new Date();
  const startDate = toValidDate(normalized.maintenanceStartTime);
  const endDate = toValidDate(normalized.maintenanceEndTime);

  let isScheduled = false;
  let isActive = false;
  let hasExpired = false;

  if (normalized.maintenanceEnabled) {
    if (startDate && now < startDate) {
      isScheduled = true;
    } else if (endDate && now >= endDate) {
      hasExpired = true;
    } else {
      isActive = true;
    }
  }

  if (autoDisable && hasExpired && normalized.maintenanceEnabled) {
    await syncMaintenanceSettingsIfExpired(normalized, now);
    normalized.maintenanceEnabled = false;
  }

  const remainingTimeMs =
    isActive && endDate ? Math.max(0, endDate.getTime() - now.getTime()) : null;

  return {
    maintenanceEnabled: normalized.maintenanceEnabled,
    isActive,
    isScheduled,
    maintenanceStartTime: normalized.maintenanceStartTime,
    maintenanceEndTime: normalized.maintenanceEndTime,
    maintenanceMessage: normalized.maintenanceMessage,
    showCountdown: normalized.showCountdown,
    remainingTimeMs,
    now: now.toISOString(),
  };
};
