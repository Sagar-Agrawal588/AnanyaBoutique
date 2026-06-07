"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "ananya_admin_live_refresh_ms";
const LEGACY_STORAGE_KEY =
  `${["h", "o", "g"].join("")}_admin_live_refresh_ms`;
const DEFAULT_REFRESH_MS = 30000;
const ALLOWED_REFRESH_MS = [10000, 30000, 60000];

const normalizeInterval = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_REFRESH_MS;
  if (!ALLOWED_REFRESH_MS.includes(parsed)) return DEFAULT_REFRESH_MS;
  return parsed;
};

export const LIVE_REFRESH_OPTIONS = [
  { label: "10s", value: 10000 },
  { label: "30s", value: 30000 },
  { label: "60s", value: 60000 },
];

export const getStoredLiveRefreshInterval = () => {
  if (typeof window === "undefined") return DEFAULT_REFRESH_MS;
  return normalizeInterval(
    localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_KEY),
  );
};

export const useLiveRefreshSetting = () => {
  const [intervalMs, setIntervalMs] = useState(DEFAULT_REFRESH_MS);

  useEffect(() => {
    setIntervalMs(getStoredLiveRefreshInterval());
  }, []);

  const updateInterval = useCallback((nextValue) => {
    if (typeof window === "undefined") return;
    const normalized = normalizeInterval(nextValue);
    localStorage.setItem(STORAGE_KEY, String(normalized));
    setIntervalMs(normalized);
    window.dispatchEvent(
      new CustomEvent("adminLiveRefreshChanged", { detail: normalized }),
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleChange = (event) => {
      const nextValue =
        event?.detail !== undefined
          ? event.detail
          : localStorage.getItem(STORAGE_KEY);
      setIntervalMs(normalizeInterval(nextValue));
    };

    window.addEventListener("adminLiveRefreshChanged", handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener("adminLiveRefreshChanged", handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const options = useMemo(() => LIVE_REFRESH_OPTIONS, []);

  return { intervalMs, setIntervalMs: updateInterval, options };
};

export default useLiveRefreshSetting;
