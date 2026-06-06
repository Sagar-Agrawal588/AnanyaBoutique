import Image from "next/image";
import { getLogoVariant } from "@/config/visualIdentity";

export default function BrandLogo({
  variant = "main",
  showText = false,
  className = "",
  imageClassName = "",
  textClassName = "",
  shield = false,
}) {
  const logo = getLogoVariant(variant);
  const image = logo.asset ? (
    <Image
      src={logo.asset}
      alt={logo.label}
      width={logo.width}
      height={logo.height}
      className={`relative object-contain ${imageClassName}`}
      priority={variant === "main" || variant === "mobile"}
    />
  ) : (
    <span className="relative grid h-12 w-12 place-items-center rounded-full bg-[#2f1325] font-serif text-lg font-semibold text-white">
      {logo.lockup || "AB"}
    </span>
  );

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span className="relative inline-flex items-center justify-center">
        {shield ? (
          <span className="absolute inset-0 rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,0.18)]" />
        ) : null}
        {image}
      </span>
      {showText ? (
        <span className={`min-w-0 ${textClassName}`}>
          <span className="block font-serif text-lg font-semibold leading-tight">
            {logo.lockup}
          </span>
          {logo.tagline ? (
            <span className="block text-xs font-semibold uppercase tracking-[0.18em] opacity-75">
              {logo.tagline}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
