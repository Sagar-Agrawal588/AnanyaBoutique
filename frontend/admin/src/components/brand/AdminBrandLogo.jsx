"use client";

import { getAdminBrandLogo } from "@/config/brandAssets";
import { withAdminBasePath } from "@/utils/basePath";
import Image from "next/image";

export default function AdminBrandLogo({
  slot = "admin",
  showText = false,
  className = "",
  imageClassName = "",
  textClassName = "",
}) {
  const logo = getAdminBrandLogo(slot);

  return (
    <span
      className={`inline-flex items-center gap-3 ${className}`}
      data-admin-brand-logo-slot={logo.slot}
    >
      <span className="relative inline-flex items-center justify-center">
        <Image
          src={withAdminBasePath(logo.src)}
          alt={logo.alt}
          width={logo.width}
          height={logo.height}
          className={`object-contain ${imageClassName}`}
          priority={slot === "admin" || slot === "login"}
        />
      </span>
      {showText ? (
        <span className={`min-w-0 ${textClassName}`}>
          <span className="block text-sm font-bold leading-tight text-gray-900">
            {logo.lockup}
          </span>
          {logo.tagline ? (
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              {logo.tagline}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
