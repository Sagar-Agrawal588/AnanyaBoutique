const REVIEW_VISIBILITY_VALUES = ["visible", "hidden", "pending"];
const REVIEW_SOURCE_VALUES = ["order", "public", "admin"];

export const DEFAULT_REVIEW_SETTINGS = Object.freeze({
  allowPublicSubmissions: true,
  autoPublishPublicReviews: false,
  showPublicReviewForm: true,
  showOrderReviewActions: true,
});

const parseBooleanFlag = (value, fallback) => {
  if (typeof value === "boolean") return value;

  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return fallback;
};

export const normalizeReviewSettings = (value = {}) => {
  const source = value && typeof value === "object" ? value : {};

  return {
    allowPublicSubmissions: parseBooleanFlag(
      source.allowPublicSubmissions,
      DEFAULT_REVIEW_SETTINGS.allowPublicSubmissions,
    ),
    autoPublishPublicReviews: parseBooleanFlag(
      source.autoPublishPublicReviews,
      DEFAULT_REVIEW_SETTINGS.autoPublishPublicReviews,
    ),
    showPublicReviewForm: parseBooleanFlag(
      source.showPublicReviewForm,
      DEFAULT_REVIEW_SETTINGS.showPublicReviewForm,
    ),
    showOrderReviewActions: parseBooleanFlag(
      source.showOrderReviewActions,
      DEFAULT_REVIEW_SETTINGS.showOrderReviewActions,
    ),
  };
};

export const isValidReviewVisibility = (value) =>
  REVIEW_VISIBILITY_VALUES.includes(String(value || "").trim().toLowerCase());

export const normalizeReviewVisibility = (value, fallback = "visible") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return REVIEW_VISIBILITY_VALUES.includes(normalized) ? normalized : fallback;
};

export const isValidReviewSource = (value) =>
  REVIEW_SOURCE_VALUES.includes(String(value || "").trim().toLowerCase());

export const normalizeReviewSource = (value, fallback = "order") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return REVIEW_SOURCE_VALUES.includes(normalized) ? normalized : fallback;
};

export { REVIEW_SOURCE_VALUES, REVIEW_VISIBILITY_VALUES };
