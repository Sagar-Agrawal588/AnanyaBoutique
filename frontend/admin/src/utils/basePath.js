const ADMIN_BASE_PATH = "/admin";

export const withAdminBasePath = (assetPath = "") => {
  const normalized = String(assetPath || "").trim();
  if (!normalized) {
    return ADMIN_BASE_PATH;
  }

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:")
  ) {
    return normalized;
  }

  if (normalized.startsWith(ADMIN_BASE_PATH)) {
    return normalized;
  }

  const pathWithLeadingSlash = normalized.startsWith("/")
    ? normalized
    : `/${normalized}`;

  return `${ADMIN_BASE_PATH}${pathWithLeadingSlash}`;
};

export default withAdminBasePath;
