"use client";

import { useEffect, useState } from "react";

export default function BlogMediaAsset({
  src = "",
  alt = "",
  className = "",
  fallback = null,
  ...props
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return fallback;
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
      className={className}
      {...props}
    />
  );
}
