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
        <span className="absolute -left-8 top-4 z-20 -rotate-45 bg-emerald-600 px-8 py-1 text-[9px] font-extrabold tracking-[0.2em] text-white shadow-md">
          NEW ARRIVAL
        </span>
      ) : isBestSeller ? (
        <span className="absolute -left-8 top-4 z-20 -rotate-45 bg-red-600 px-8 py-1 text-[9px] font-extrabold tracking-[0.2em] text-white shadow-md">
          BEST SELLER
        </span>
      ) : null}

      {showDiscountBadge && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          {discountLabel}
        </span>
      )}

      {isExclusive && (
        <span className={`absolute left-2 z-10 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm ${showDiscountBadge ? "top-8" : "top-2"}`}>
          Members Only
        </span>
      )}

      {isHighDemand && !isNewArrival && !isBestSeller && (
        <span className={`absolute left-2 z-10 rounded-full bg-orange-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm ${showDiscountBadge || isExclusive ? "top-8" : "top-2"}`}>
          High Demand
        </span>
      )}
    </>
  );
};

export default ProductCardBadges;
