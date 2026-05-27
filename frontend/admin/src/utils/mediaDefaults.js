export const ADMIN_PLACEHOLDER_IMAGE =
  "https://firebasestorage.googleapis.com/v0/b/studio-8452116634-cdb59.firebasestorage.app/o/buyonegram%2Fsystem%2Fadmin-placeholder.png?alt=media&token=7490860e-365a-49dc-8dd9-27928ccf73da";

export const DEFAULT_PRODUCT_IMAGE =
  "https://firebasestorage.googleapis.com/v0/b/studio-8452116634-cdb59.firebasestorage.app/o/buyonegram%2Fsystem%2Fproduct-default.webp?alt=media&token=2239320a-df4e-40bf-8c08-597f825fa257";

export const LEGACY_LOCAL_MEDIA_MAP = {
  "/placeholder.png": ADMIN_PLACEHOLDER_IMAGE,
  "/product_1.png": DEFAULT_PRODUCT_IMAGE,
  "/product_1.webp": DEFAULT_PRODUCT_IMAGE,
  "placeholder.png": ADMIN_PLACEHOLDER_IMAGE,
  "product_1.png": DEFAULT_PRODUCT_IMAGE,
  "product_1.webp": DEFAULT_PRODUCT_IMAGE,
};

export const resolveLegacyLocalMedia = (value = "") =>
  LEGACY_LOCAL_MEDIA_MAP[String(value || "").trim()] || "";
