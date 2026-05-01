"use client";

import useSeoAlt from "@/hooks/useSeoAlt";

export default function SeoImg({ src, fallbackAlt = "", className = "", ...props }) {
  const alt = useSeoAlt(src, fallbackAlt);
  return <img src={src} alt={alt} className={className} {...props} />;
}
