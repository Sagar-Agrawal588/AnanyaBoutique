import { getImageUrl, getResponsiveImageSet } from "@/utils/imageUtils";
import { useEffect, useState } from "react";

const resolveSrcSet = (candidate) => candidate?.srcSet || candidate?.src || "";

export default function ResponsiveMediaImage({
  desktopSrc = "",
  mobileSrc = "",
  alt = "",
  className = "",
  imgClassName = "",
  desktopProfile = "heroDesktop",
  mobileProfile = "heroMobile",
  desktopSizes = "",
  mobileSizes = "",
  desktopPosition = "50% 50%",
  mobilePosition = "50% 50%",
  desktopScale = 1,
  mobileScale = 1,
  objectFit = "cover",
  showAmbientFill = false,
  backgroundColor = "",
  loading = "lazy",
  fetchPriority = "auto",
  style = undefined,
}) {
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const resolvedDesktopSrc = desktopSrc || mobileSrc;
  const resolvedMobileSrc = mobileSrc || desktopSrc;
  const desktopImage = getResponsiveImageSet(resolvedDesktopSrc, {
    profile: desktopProfile,
    sizes: desktopSizes,
  });
  const mobileImage = getResponsiveImageSet(resolvedMobileSrc, {
    profile: mobileProfile,
    sizes: mobileSizes,
  });
  const fallbackSrc =
    desktopImage?.src ||
    mobileImage?.src ||
    getImageUrl(resolvedDesktopSrc || resolvedMobileSrc);
  const wrapperStyle = {
    ...style,
    ...(backgroundColor ? { backgroundColor } : {}),
    "--responsive-media-mobile-position": mobilePosition,
    "--responsive-media-desktop-position": desktopPosition || mobilePosition,
    "--responsive-media-mobile-scale": String(mobileScale || 1),
    "--responsive-media-desktop-scale": String(desktopScale || mobileScale || 1),
  };
  const fitClass =
    objectFit === "contain"
      ? "responsive-media__img--contain"
      : "responsive-media__img--cover";
  const resolvedObjectPosition = isDesktopViewport
    ? desktopPosition || mobilePosition
    : mobilePosition;
  const resolvedScale = isDesktopViewport
    ? desktopScale || mobileScale || 1
    : mobileScale || 1;

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const syncViewport = () => setIsDesktopViewport(mediaQuery.matches);
    syncViewport();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewport);
      return () => mediaQuery.removeEventListener("change", syncViewport);
    }

    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`} style={wrapperStyle}>
      {showAmbientFill ? (
        <div
          aria-hidden="true"
          className="responsive-media__ambient"
          style={{ backgroundImage: `url("${fallbackSrc || "/product_1.webp"}")` }}
        />
      ) : null}
      <picture className="responsive-media__picture">
        {resolvedDesktopSrc ? (
          <source
            media="(min-width: 768px)"
            srcSet={resolveSrcSet(desktopImage)}
            sizes={desktopImage?.sizes}
          />
        ) : null}
        {resolvedMobileSrc ? (
          <source
            media="(max-width: 767px)"
            srcSet={resolveSrcSet(mobileImage)}
            sizes={mobileImage?.sizes}
          />
        ) : null}
        <img
          src={fallbackSrc || "/product_1.webp"}
          alt={alt}
          loading={loading}
          fetchPriority={fetchPriority}
          decoding="async"
          className={`responsive-media__img ${fitClass} ${imgClassName}`}
          style={{
            objectFit,
            objectPosition: resolvedObjectPosition,
            transform: `scale(${resolvedScale})`,
          }}
          draggable={false}
        />
      </picture>

      <style jsx global>{`
        .responsive-media__picture {
          display: block;
          height: 100%;
          width: 100%;
          position: relative;
          z-index: 1;
        }

        .responsive-media__ambient {
          height: 112%;
          width: 112%;
          inset: -6%;
          background-position: center;
          background-size: cover;
          opacity: 0.45;
          filter: blur(22px) saturate(1.08);
          position: absolute;
          transform: scale(1.03);
        }

        .responsive-media__img {
          display: block;
          height: 100%;
          width: 100%;
          object-position: var(--responsive-media-mobile-position);
          transform: scale(var(--responsive-media-mobile-scale));
          transform-origin: center;
        }

        .responsive-media__img--cover {
          object-fit: cover;
        }

        .responsive-media__img--contain {
          object-fit: contain;
        }

        @media (min-width: 768px) {
          .responsive-media__img {
            object-position: var(--responsive-media-desktop-position);
            transform: scale(var(--responsive-media-desktop-scale));
          }
        }
      `}</style>
    </div>
  );
}
