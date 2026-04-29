"use client";

import { useEffect, useState } from "react";
import { fetchSeoSettings, resolveAltText } from "../lib/seo";

export default function useSeoAlt(target, fallback) {
  const [alt, setAlt] = useState(fallback || "");

  useEffect(() => {
    let mounted = true;
    const tryResolve = async () => {
      try {
        const seo = await fetchSeoSettings();
        if (!mounted) return;
        const candidate = resolveAltText(String(target || ""), seo);
        setAlt(candidate || fallback || "");
      } catch (e) {
        if (!mounted) return;
        setAlt(fallback || "");
      }
    };

    tryResolve();
    return () => {
      mounted = false;
    };
  }, [target, fallback]);

  return alt;
}
