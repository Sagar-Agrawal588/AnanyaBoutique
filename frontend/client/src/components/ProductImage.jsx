"use client";

import { getImageUrl, getResponsiveImageSet } from "@/utils/imageUtils";
import { DEFAULT_PRODUCT_IMAGE } from "@/utils/mediaDefaults";
import { useEffect, useMemo, useRef, useState } from "react";

const ProductImage = ({
  src,
  alt = "",
  className = "",
  imgClassName = "",
  aspect = "aspect-square",
  rounded = "rounded-2xl",
  padding = "p-0",
  fit = "contain",
  cardImage = false,
  natural = false,
  responsiveProfile = "",
  sizes = "",
  eager = false,
  children,
  ...props
}) => {
  const imageRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const resolvedProfile =
    responsiveProfile || (natural ? "zoom" : cardImage ? "card" : "content");
  const responsiveImage = useMemo(
    () => getResponsiveImageSet(src, { profile: resolvedProfile, sizes }),
    [resolvedProfile, sizes, src],
  );
  const resolvedSrc = responsiveImage?.src || getImageUrl(src);
  const requestedSrc = resolvedSrc || DEFAULT_PRODUCT_IMAGE;
  const [renderedSrc, setRenderedSrc] = useState(requestedSrc);
  const usingFallback = renderedSrc === DEFAULT_PRODUCT_IMAGE;
  const activeSrcSet = usingFallback ? undefined : responsiveImage?.srcSet;
  const activeSizes = usingFallback ? undefined : responsiveImage?.sizes;
  const objectFit = fit === "cover" ? "object-cover" : "object-contain";
  const aspectClass = aspect ? aspect : "";
  const imageSizeClass = natural ? "max-h-full max-w-full" : "h-full w-full";

  useEffect(() => {
    setRenderedSrc(requestedSrc);
    setIsLoaded(false);
    setHasError(false);
  }, [requestedSrc, responsiveImage?.srcSet]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image?.complete) return;

    if (image.naturalWidth > 0) {
      setIsLoaded(true);
      setHasError(false);
      return;
    }

    if (!usingFallback) {
      setRenderedSrc(DEFAULT_PRODUCT_IMAGE);
      return;
    }

    setIsLoaded(true);
    setHasError(true);
  }, [renderedSrc, usingFallback]);

  const handleImageLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleImageError = () => {
    if (!usingFallback) {
      setRenderedSrc(DEFAULT_PRODUCT_IMAGE);
      setIsLoaded(false);
      setHasError(false);
      return;
    }

    setIsLoaded(true);
    setHasError(true);
  };

  return (
    <div
      className={`product-image-container relative overflow-hidden bg-[#f5f5f5] ${aspectClass} ${rounded} ${padding} ${className}`}
      {...props}
    >
      <img
        ref={imageRef}
        src={renderedSrc}
        srcSet={activeSrcSet}
        sizes={activeSizes}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding="async"
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={`product-image block ${imageSizeClass} ${objectFit} shadow-none transition-[opacity,transform,filter] duration-500 ease-out will-change-transform ${
          isLoaded || hasError
            ? "opacity-100 scale-100"
            : "opacity-100 scale-[1.005]"
        } ${imgClassName}`}
        draggable={false}
      />
      {children}
    </div>
  );
};

export default ProductImage;
