export const PENDING_COUPON_STORAGE_KEY = "ananya_pending_coupon_code";

const LEGACY_BRAND_KEY_PREFIX = ["b", "o", "g"].join("");
const LEGACY_PENDING_COUPON_STORAGE_KEY = `${LEGACY_BRAND_KEY_PREFIX}_pending_coupon_code`;

const normalizeCouponCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

export const stashPendingCouponCode = (couponCode, meta = {}) => {
  if (typeof window === "undefined") return false;

  const code = normalizeCouponCode(couponCode);
  if (!code) return false;

  const payload = {
    code,
    savedAt: Date.now(),
    source: String(meta.source || "notification"),
    notificationId: String(meta.notificationId || ""),
  };

  try {
    window.localStorage.setItem(
      PENDING_COUPON_STORAGE_KEY,
      JSON.stringify(payload),
    );
    window.localStorage.removeItem(LEGACY_PENDING_COUPON_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
};

export const readPendingCouponCode = () => {
  if (typeof window === "undefined") return "";

  try {
    const raw =
      window.localStorage.getItem(PENDING_COUPON_STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_PENDING_COUPON_STORAGE_KEY);
    if (!raw) return "";

    // Backward compatible parsing in case raw text code was stored.
    if (!raw.startsWith("{")) {
      const code = normalizeCouponCode(raw);
      if (code) {
        try {
          window.localStorage.setItem(
            PENDING_COUPON_STORAGE_KEY,
            JSON.stringify({ code, savedAt: Date.now(), source: "legacy" }),
          );
        } catch {
          // Migration is best-effort; returning the coupon is what matters.
        }
      }
      return code;
    }

    const parsed = JSON.parse(raw);
    const code = normalizeCouponCode(parsed?.code || "");
    if (code) {
      try {
        window.localStorage.setItem(
          PENDING_COUPON_STORAGE_KEY,
          JSON.stringify({ ...parsed, code }),
        );
      } catch {
        // Migration is best-effort; returning the coupon is what matters.
      }
    }
    return code;
  } catch {
    return "";
  }
};

export const clearPendingCouponCode = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PENDING_COUPON_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_PENDING_COUPON_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
};

