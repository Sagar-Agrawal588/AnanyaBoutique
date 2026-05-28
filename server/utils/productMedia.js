import { normalizeStoredMediaUrl } from "../config/cloudinary.js";

const MEDIA_FIELD_NAMES = new Set([
  "avatar",
  "comboImage",
  "comboImages",
  "comboThumbnail",
  "desktopImage",
  "image",
  "images",
  "imageUrl",
  "mobileImage",
  "poster",
  "secure_url",
  "src",
  "thumbnail",
  "url",
  "video",
  "videos",
]);

const isPlainObject = (value) => {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const shouldNormalizeField = (key = "") => {
  const normalizedKey = String(key || "").trim();
  return (
    MEDIA_FIELD_NAMES.has(normalizedKey) ||
    /(?:Image|Images|Thumbnail|Poster|Video|Videos|Url|URL)$/.test(
      normalizedKey,
    )
  );
};

const normalizeMediaValue = (value, depth = 0) => {
  if (typeof value === "string") {
    return normalizeStoredMediaUrl(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeMediaValue(entry, depth + 1));
  }

  if (!isPlainObject(value) || depth > 8) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      shouldNormalizeField(key)
        ? normalizeMediaValue(entry, depth + 1)
        : normalizeProductMediaUrls(entry, depth + 1),
    ]),
  );
};

export const normalizeProductMediaUrls = (value, depth = 0) => {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeProductMediaUrls(entry, depth + 1));
  }

  if (
    value &&
    typeof value === "object" &&
    typeof value.toObject === "function"
  ) {
    return normalizeProductMediaUrls(value.toObject({ virtuals: true }), depth);
  }

  if (!isPlainObject(value) || depth > 8) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      shouldNormalizeField(key)
        ? normalizeMediaValue(entry, depth + 1)
        : normalizeProductMediaUrls(entry, depth + 1),
    ]),
  );
};

export default normalizeProductMediaUrls;
