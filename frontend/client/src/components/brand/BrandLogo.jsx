import Image from "next/image";
import { getBrandLogo } from "@/config/brandAssets";

export default function BrandLogo({
  variant = "main",
  slot,
  showText = false,
  className = "",
  imageClassName = "",
  textClassName = "",
  shield = false,
}) {
  const logo = getBrandLogo(slot || variant);
  const logoSlot = logo.slot || slot || variant;
  const image = logo.src ? (
    <Image
      src={logo.src}
      alt={logo.alt}
      width={logo.width}
      height={logo.height}
      className={`relative object-contain ${imageClassName}`}
      priority={logoSlot === "main" || logoSlot === "mobile"}
    />
  ) : (
    <span
      className={`relative grid shrink-0 place-items-center rounded-full border border-[#ead3df] bg-[linear-gradient(135deg,#2f1325_0%,#7c2d62_58%,#d8b46b_140%)] font-serif font-semibold text-white shadow-[0_10px_28px_rgba(47,19,37,0.18)] ${imageClassName}`}
      style={{
        width: logo.width,
        height: logo.height,
        fontSize: logoSlot === "mobile" ? 18 : logoSlot === "header" ? 24 : 20,
      }}
    >
      {logo.lockup || "AB"}
    </span>
  );

  return (
    <span
      className={`inline-flex items-center gap-3 ${className}`}
      data-brand-logo-slot={logoSlot}
    >
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
