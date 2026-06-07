"use client";

import { useEffect, useState } from "react";
import { fetchDataFromApi } from "@/utils/api";
import {
  DEFAULT_STOREFRONT_CONTENT,
  normalizeStorefrontContent,
} from "@/config/storefrontContent";

const CACHE_KEY = "ananya_storefront_content";

const readCachedContent = () => {
  if (typeof window === "undefined") return DEFAULT_STOREFRONT_CONTENT;
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return DEFAULT_STOREFRONT_CONTENT;
    return normalizeStorefrontContent(JSON.parse(raw));
  } catch {
    return DEFAULT_STOREFRONT_CONTENT;
  }
};

export default function useStorefrontContent(initialContent = null) {
  const [content, setContent] = useState(() =>
    normalizeStorefrontContent(initialContent || readCachedContent()),
  );
  const [loading, setLoading] = useState(!initialContent);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetchDataFromApi(
          "/api/settings/public/storefrontContent",
          {
            skipCache: true,
            cacheTtlMs: 0,
          },
        );
        if (!active || !response?.success) return;
        const next = normalizeStorefrontContent(response.data);
        setContent(next);
        try {
          window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {
          // Storage is only a convenience cache.
        }
      } catch {
        // Defaults keep the storefront usable if CMS settings are unavailable.
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  return { content, loading };
}
