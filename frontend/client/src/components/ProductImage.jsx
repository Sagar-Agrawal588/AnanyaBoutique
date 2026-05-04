"use client";

import { getImageUrl, getProductCardImageUrl } from "@/utils/imageUtils";

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
  children,
  ...props
}) => {
  const resolvedSrc = cardImage
    ? getProductCardImageUrl(src)
    : getImageUrl(src);
  const objectFit = fit === "cover" ? "object-cover" : "object-contain";
  const aspectClass = aspect ? aspect : "";
  const imageSizeClass = natural ? "max-h-full max-w-full" : "h-full w-full";

  return (
    <div
      className={`product-image-container relative overflow-hidden bg-[#f5f5f5] ${aspectClass} ${rounded} ${padding} ${className}`}
      {...props}
    >
      <img
        src={resolvedSrc || "/product_1.png"}
        alt={alt}
        className={`product-image block ${imageSizeClass} ${objectFit} shadow-none ${imgClassName}`}
        draggable={false}
      />
      {children}
    </div>
  );
};

export default ProductImage;
