"use client";

import Image from "next/image";
import useSeoAlt from "@/hooks/useSeoAlt";

export default function SeoImage({ src, fallbackAlt = "", ...props }) {
  const alt = useSeoAlt(src, fallbackAlt);
  return <Image src={src} alt={alt} {...props} />;
}
