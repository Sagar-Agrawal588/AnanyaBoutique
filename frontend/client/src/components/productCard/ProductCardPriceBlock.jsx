"use client";

import { formatPrice } from "@/config/siteConfig";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const ProductCardPriceBlock = ({
  originalPrice = 0,
  finalPrice = 0,
  savings = 0,
}) => {
  const safeOriginalPrice = toNumber(originalPrice, 0);
  const safeFinalPrice = toNumber(finalPrice, 0);
  const safeSavings = toNumber(savings, 0);

  return (
    <div className="leading-none">
      {safeOriginalPrice > safeFinalPrice && (
        <span className="mb-1 block text-[10px] font-semibold text-[#9b7b8d] line-through">
          {formatPrice(safeOriginalPrice)}
        </span>
      )}
      <span className="block text-[17px] font-black text-[#2f1325] sm:text-lg">
        {formatPrice(safeFinalPrice)}
      </span>
      {safeSavings > 0 && (
        <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.08em] text-[#8a4f1d]">
          Save {formatPrice(safeSavings)}
        </span>
      )}
    </div>
  );
};

export default ProductCardPriceBlock;
