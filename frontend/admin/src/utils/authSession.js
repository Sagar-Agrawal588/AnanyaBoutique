const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_COOKIE_DAYS = 365;

const normalizeCookieDomain = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .trim();
};

const resolveSharedCookieDomain = () => {
  if (typeof window === "undefined") return "";
  const envDomain = normalizeCookieDomain(
    process.env.NEXT_PUBLIC_SHARED_COOKIE_DOMAIN ||
      process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
  ).replace(/^\./, "");
  if (envDomain) return envDomain;

  const hostname = String(window.location.hostname || "").toLowerCase();
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    return "";
  }

  let root = hostname;
  if (root.startsWith("admin-dot-")) {
    root = root.slice("admin-dot-".length);
  } else if (root.startsWith("client-dot-")) {
    root = root.slice("client-dot-".length);
  }
  if (root.startsWith("admin.")) {
    root = root.slice("admin.".length);
  } else if (root.startsWith("client.")) {
    root = root.slice("client.".length);
  }
  if (root.startsWith("www.")) {
    root = root.slice("www.".length);
  }

  return root === hostname ? "" : root;
};

const shouldUseSecureFlag = () =>
  typeof window !== "undefined" && window.location.protocol === "https:";

const buildCookieAttributes = ({ domain = "", expires = "" } = {}) => {
  const parts = ["Path=/", "SameSite=Lax"];
  if (domain) {
    parts.push(`Domain=${domain}`);
  }
  if (expires) {
    parts.push(`Expires=${expires}`);
  }
  if (shouldUseSecureFlag()) {
    parts.push("Secure");
  }
  return parts.join("; ");
};

const writeCookie = (name, value, { rememberMe = true, days, domain } = {}) => {
  if (typeof document === "undefined") return;
  const resolvedDomain = domain ?? resolveSharedCookieDomain();
  const resolvedDays = Number.isFinite(days) ? days : DEFAULT_COOKIE_DAYS;
  const expires = rememberMe
    ? new Date(Date.now() + resolvedDays * ONE_DAY_MS).toUTCString()
    : "";
  const attributes = buildCookieAttributes({ domain: resolvedDomain, expires });
  document.cookie = `${name}=${encodeURIComponent(String(value ?? ""))}; ${attributes}`;
};

const readCookieValue = (name) => {
  if (typeof document === "undefined") return "";
  const target = `${name}=`;
  const cookies = String(document.cookie || "").split(";");
  for (const entry of cookies) {
    const trimmed = entry.trim();
    if (!trimmed.startsWith(target)) continue;
    return decodeURIComponent(trimmed.slice(target.length));
  }
  return "";
};

const clearCookie = (name, domain) => {
  if (typeof document === "undefined") return;
  const resolvedDomain = domain ?? resolveSharedCookieDomain();
  const attributes = buildCookieAttributes({
    domain: resolvedDomain,
    expires: "Thu, 01 Jan 1970 00:00:00 GMT",
  });
  document.cookie = `${name}=; ${attributes}`;
};

export const persistSharedAuthCookies = ({
  accessToken,
  refreshToken,
  userName,
  userEmail,
  userPhoto,
  rememberMe = true,
  days = DEFAULT_COOKIE_DAYS,
} = {}) => {
  if (!accessToken) return;
  const domain = resolveSharedCookieDomain();
  writeCookie("accessToken", accessToken, { rememberMe, days, domain });
  if (refreshToken) {
    writeCookie("refreshToken", refreshToken, { rememberMe, days, domain });
  }
  if (userName) {
    writeCookie("userName", userName, { rememberMe, days, domain });
  }
  if (userEmail) {
    writeCookie("userEmail", userEmail, { rememberMe, days, domain });
  }
  if (userPhoto) {
    writeCookie("userPhoto", userPhoto, { rememberMe, days, domain });
  }
};

export const clearSharedAuthCookies = () => {
  const domain = resolveSharedCookieDomain();
  ["accessToken", "refreshToken", "userName", "userEmail", "userPhoto"].forEach(
    (name) => clearCookie(name, domain),
  );
};

export const readSharedAccessToken = () => readCookieValue("accessToken");

export const persistAdminSession = ({
  accessToken,
  admin,
  rememberMe = true,
} = {}) => {
  if (typeof window === "undefined" || !accessToken) return;
  const storage = rememberMe ? localStorage : sessionStorage;
  const otherStorage = rememberMe ? sessionStorage : localStorage;
  otherStorage.removeItem("adminToken");
  otherStorage.removeItem("adminUser");
  storage.setItem("adminToken", accessToken);
  if (admin) {
    storage.setItem("adminUser", JSON.stringify(admin));
  }
};

export const clearAdminSession = () => {
  if (typeof window === "undefined") return;
  [localStorage, sessionStorage].forEach((storage) => {
    storage.removeItem("adminToken");
    storage.removeItem("adminUser");
  });
};

export const readStoredAdminSession = () => {
  if (typeof window === "undefined") {
    return { token: null, admin: null };
  }
  const localToken = localStorage.getItem("adminToken");
  const localAdmin = localStorage.getItem("adminUser");
  if (localToken || localAdmin) {
    return { token: localToken, admin: localAdmin };
  }
  const sessionToken = sessionStorage.getItem("adminToken");
  const sessionAdmin = sessionStorage.getItem("adminUser");
  if (sessionToken || sessionAdmin) {
    return { token: sessionToken, admin: sessionAdmin };
  }
  return { token: null, admin: null };
};

export const DEFAULT_AUTH_COOKIE_DAYS = DEFAULT_COOKIE_DAYS;
