const STATUS_KEYS = [
  "shipment_status",
  "current_status",
  "tracking_status",
  "event_status",
  "status_code",
  "latest_status",
  "latest_event",
  "status_description",
  "statusDescription",
  "status",
  "event",
  "description",
  "remark",
  "remarks",
  "code",
  "name",
];

const STATUS_HISTORY_KEYS = [
  "history",
  "tracking_history",
  "trackingHistory",
  "scan",
  "scans",
  "events",
  "activity",
  "activities",
  "shipments",
  "tracking_data",
  "trackingData",
  "data",
];

const TRACKING_URL_KEYS = ["tracking_url", "trackingUrl"];
const MANIFEST_ID_KEYS = ["manifest_id", "manifestId", "manifest"];
const SHIPMENT_ID_KEYS = ["shipment_id", "shipmentId", "id"];

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const toCleanString = (value) => {
  if (value === undefined || value === null || typeof value === "boolean") {
    return "";
  }
  if (typeof value === "object") return "";
  const normalized = String(value).trim();
  if (!normalized || normalized.toLowerCase() === "[object object]") return "";
  return normalized;
};

const pickKey = (source, keys) => {
  if (!isPlainObject(source)) return "";
  for (const key of keys) {
    const value = toCleanString(source[key]);
    if (value) return value;
  }
  return "";
};

const extractStatusFromValue = (value, depth = 0) => {
  if (depth > 6) return "";

  const primitive = toCleanString(value);
  if (primitive) return primitive;

  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index -= 1) {
      const status = extractStatusFromValue(value[index], depth + 1);
      if (status) return status;
    }
    return "";
  }

  if (!isPlainObject(value)) return "";

  for (const key of STATUS_KEYS) {
    const status = extractStatusFromValue(value[key], depth + 1);
    if (status) return status;
  }

  for (const key of STATUS_HISTORY_KEYS) {
    const status = extractStatusFromValue(value[key], depth + 1);
    if (status) return status;
  }

  return "";
};

export const extractTrackingStatus = (payload = {}) => {
  const roots = [
    payload?.data,
    payload?.data?.shipment,
    payload?.data?.tracking,
    payload?.shipment,
    payload?.tracking,
    payload,
  ].filter(Boolean);

  for (const root of roots) {
    const status = extractStatusFromValue(root);
    if (status) return status;
  }

  return null;
};

export const extractTrackingUrl = (payload = {}) => {
  const roots = [
    payload?.data,
    payload?.data?.shipment,
    payload?.shipment,
    payload,
  ].filter(Boolean);

  for (const root of roots) {
    const value = pickKey(root, TRACKING_URL_KEYS);
    if (value) return value;
  }

  return null;
};

export const extractManifestId = (payload = {}) => {
  const roots = [
    payload?.data,
    payload?.data?.shipment,
    payload?.shipment,
    payload,
  ].filter(Boolean);

  for (const root of roots) {
    const value = pickKey(root, MANIFEST_ID_KEYS);
    if (value) return value;
  }

  return null;
};

export const extractShipmentId = (payload = {}) => {
  const roots = [
    payload?.data,
    payload?.data?.shipment,
    payload?.shipment,
    payload,
  ].filter(Boolean);

  for (const root of roots) {
    const value = pickKey(root, SHIPMENT_ID_KEYS);
    if (value) return value;
  }

  return null;
};
