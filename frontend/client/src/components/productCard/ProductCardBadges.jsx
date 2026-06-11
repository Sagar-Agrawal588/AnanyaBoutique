"use client";

const ProductCardBadges = ({
  isNewArrival = false,
  isBestSeller = false,
  showDiscountBadge = false,
  discountLabel = "",
  isExclusive = false,
  isHighDemand = false,
}) => {
  return (
    <>
      {isNewArrival ? (
        <span className="absolute left-2 top-2 z-20 rounded-full border border-white/80 bg-[#2f1325] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white shadow-[0_10px_24px_rgba(47,19,37,0.18)] backdrop-blur-sm">
          New
        </span>
      ) : isBestSeller ? (
        <span className="absolute left-2 top-2 z-20 rounded-full border border-white/80 bg-[#7c2d62] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white shadow-[0_10px_24px_rgba(47,19,37,0.18)] backdrop-blur-sm">
          Best
        </span>
      ) : null}

      {showDiscountBadge && (
        <span className={`absolute left-2 z-10 rounded-full border border-white/80 bg-[#b7791f] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_24px_rgba(47,19,37,0.14)] backdrop-blur-sm ${isNewArrival || isBestSeller ? "top-10" : "top-2"}`}>
          {discountLabel}
        </span>
      )}

      {isExclusive && (
        <span className={`absolute left-2 z-10 rounded-full border border-white/80 bg-[#3f3148] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_24px_rgba(47,19,37,0.14)] backdrop-blur-sm ${showDiscountBadge || isNewArrival || isBestSeller ? "top-[72px]" : "top-2"}`}>
          Members Only
        </span>
      )}

      {isHighDemand && !isNewArrival && !isBestSeller && (
        <span className={`absolute left-2 z-10 rounded-full border border-white/80 bg-[#8a4f1d] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_24px_rgba(47,19,37,0.14)] backdrop-blur-sm ${showDiscountBadge || isExclusive ? "top-10" : "top-2"}`}>
          High Demand
        </span>
      )}
    </>
  );
};

export default ProductCardBadges;
