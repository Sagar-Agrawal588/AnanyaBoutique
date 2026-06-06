"use client";

import { useEffect } from "react";

const CACHE_GUARD_VERSION = "ananyaboutique-client-2026-05-28-v5";
const CACHE_GUARD_KEY = "hog_client_cache_guard_version";
const FORCE_CACHE_RESET_PARAMS = [
  "__hog_sw_reset",
  "__hog_cache_reset",
  "force",
];
const HOSTS_TO_GUARD = new Set([
  "ananyaboutique.com",
  "www.ananyaboutique.com",
  "ananyaboutique.com",
  "ananyaboutique.com",
]);

const LEGACY_LOCAL_STORAGE_KEYS = [
  "hog_header_background_color",
  "hog_header_text_color",
  "hog_header_logo_url",
  "hog_header_logo",
  "hog_home_slides",
  "hog_banners",
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
    window.sessionStorage.removeItem("hog_header_background_color");
    window.sessionStorage.removeItem("hog_header_text_color");
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
        url.searchParams.set("__hog_fresh", CACHE_GUARD_VERSION);
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
