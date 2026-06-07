"use client";

import { useEffect } from "react";

const CACHE_GUARD_VERSION = "ananyaboutique-client-2026-05-28-v5";
const CACHE_GUARD_KEY = "ananya_client_cache_guard_version";
const LEGACY_CACHE_PREFIX = ["h", "o", "g"].join("");
const FORCE_CACHE_RESET_PARAMS = [
  "__ananya_sw_reset",
  "__ananya_cache_reset",
  `__${LEGACY_CACHE_PREFIX}_sw_reset`,
  `__${LEGACY_CACHE_PREFIX}_cache_reset`,
  "force",
];
const HOSTS_TO_GUARD = new Set([
  "ananyaboutique.com",
  "www.ananyaboutique.com",
  "ananyaboutique.com",
  "ananyaboutique.com",
]);

const LEGACY_LOCAL_STORAGE_KEYS = [
  `${LEGACY_CACHE_PREFIX}_header_background_color`,
  `${LEGACY_CACHE_PREFIX}_header_text_color`,
  `${LEGACY_CACHE_PREFIX}_header_logo_url`,
  `${LEGACY_CACHE_PREFIX}_header_logo`,
  `${LEGACY_CACHE_PREFIX}_home_slides`,
  `${LEGACY_CACHE_PREFIX}_banners`,
  "homeSlides",
  "banners",
  "products",
];

const shouldGuardHost = () => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return HOSTS_TO_GUARD.has(host) || host.endsWith(".hosted.app");
};

const unregisterOldServiceWorkers = async () => {
  if (!("serviceWorker" in navigator)) return false;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
  return registrations.length > 0;
};

const clearBrowserCaches = async () => {
  if (!("caches" in window)) return false;

  const cacheNames = await window.caches.keys();
  await Promise.all(cacheNames.map((name) => window.caches.delete(name)));
  return cacheNames.length > 0;
};

const clearLegacyLocalState = () => {
  try {
    LEGACY_LOCAL_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    window.sessionStorage.removeItem(
      `${LEGACY_CACHE_PREFIX}_header_background_color`,
    );
    window.sessionStorage.removeItem(`${LEGACY_CACHE_PREFIX}_header_text_color`);
  } catch {
    // Storage can be blocked in strict browsers; cache cleanup should continue.
  }
};

const getForceResetRequested = () => {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  return FORCE_CACHE_RESET_PARAMS.some((param) => params.has(param));
};

export default function ClientCacheGuard() {
  useEffect(() => {
    if (!shouldGuardHost()) return;

    let cancelled = false;

    const runGuard = async () => {
      const forceResetRequested = getForceResetRequested();
      const currentVersion = window.localStorage.getItem(CACHE_GUARD_KEY);
      if (!forceResetRequested && currentVersion === CACHE_GUARD_VERSION) return;

      clearLegacyLocalState();

      const [clearedCaches, unregisteredWorkers] = await Promise.all([
        clearBrowserCaches().catch(() => false),
        unregisterOldServiceWorkers().catch(() => false),
      ]);

      if (cancelled) return;

      window.localStorage.setItem(CACHE_GUARD_KEY, CACHE_GUARD_VERSION);

      if (clearedCaches || unregisteredWorkers || forceResetRequested) {
        const url = new URL(window.location.href);
        FORCE_CACHE_RESET_PARAMS.forEach((param) => url.searchParams.delete(param));
        url.searchParams.set("__ananya_fresh", CACHE_GUARD_VERSION);
        window.location.replace(url.toString());
      }
    };

    void runGuard();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
