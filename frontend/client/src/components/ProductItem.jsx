"use client";

import ProductCardBadges from "@/components/productCard/ProductCardBadges";
import ProductCardPriceBlock from "@/components/productCard/ProductCardPriceBlock";
import ProductImage from "@/components/ProductImage";
import ShareButton from "@/components/ShareButton";
import StockNotificationButton from "@/components/StockNotificationButton";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { fashionMicrocopy } from "@/config/visualIdentity";
import useSeoAlt from "@/hooks/useSeoAlt";
import { resolveAvailability } from "@/utils/productAvailability";
import { DEFAULT_PRODUCT_IMAGE } from "@/utils/mediaDefaults";
import { buildProductHref } from "@/utils/productRouting";
import { subscribeToStockUpdates } from "@/realtime/stockSocket";
import { applyStockUpdateToProduct } from "@/utils/stockRealtime";
import {
  formatWeight,
  getWeightInGrams,
  replaceWeightRange,
} from "@/utils/weightDisplay";
import Link from "next/link";
import { memo, startTransition, useEffect, useState } from "react";
import {
  IoIosStar,
  IoIosStarHalf,
  IoIosStarOutline,
  IoMdCart,
  IoMdHeart,
  IoMdHeartEmpty,
} from "react-icons/io";
import { Eye } from "lucide-react";
import { MdDeleteOutline } from "react-icons/md";

const ProductItem = (props) => {
  const {
    id,
    _id,
    name,
    brand,
    price,
    originalPrice,
    discount,
    rating,
    image,
    product,
    itemType,
    realtimeManagedExternally = false,
    compactListing = false,
    collectionListing = false,
  } = props;

  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [liveProduct, setLiveProduct] = useState(product || null);
  const {
    addToCart,
    removeFromCart,
    isInCart,
    addComboToCart,
    removeComboFromCart,
    isComboInCart,
  } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  useEffect(() => {
    setLiveProduct(product || null);
  }, [product]);

  useEffect(() => {
    if (!product) return undefined;
    if (realtimeManagedExternally) return undefined;

    return subscribeToStockUpdates((payload) => {
      startTransition(() => {
        setLiveProduct((previous) =>
          applyStockUpdateToProduct(previous, payload),
        );
      });
    });
  }, [product, realtimeManagedExternally]);

  const resolvedItemType = String(
    itemType || liveProduct?.itemType || product?.itemType || "product",
  ).toLowerCase();
  const isComboItem = resolvedItemType === "combo";
  const productCardId = isComboItem
    ? id || _id || liveProduct?.comboId || liveProduct?._id || liveProduct?.id
    : liveProduct?.parentProductId ||
      id ||
      _id ||
      liveProduct?._id ||
      liveProduct?.id;
  const productVariantId = liveProduct?.variantId || null;
  const alreadyInCart = isComboItem
    ? isComboInCart(productCardId)
    : isInCart(productCardId, productVariantId);

  const productData = liveProduct ||
    product || {
      _id: id || _id || product?.id || 1,
      name: name || "Signature Boutique Style",
      brand: brand || "Ananya Boutique",
      price: price || 349,
      originalPrice: originalPrice || 499,
      images: [image || DEFAULT_PRODUCT_IMAGE],
      rating: rating || 0,
      discount: discount || 30,
    };

  // Derive display values from default variant when hasVariants
  const defaultVariant =
    productData.hasVariants && productData.variants?.length > 0
      ? productData.variants[0]
      : null;
  const isVariantCard = Boolean(productVariantId || productData?.variantId);
  const availability = isComboItem
    ? resolveAvailability(productData)
    : isVariantCard
      ? resolveAvailability(defaultVariant, productData)
      : resolveAvailability(productData);
  const availableQuantity = availability.available;

  const displayPrice = defaultVariant
    ? defaultVariant.price
    : productData.price;
  const displayOriginalPrice = defaultVariant
    ? defaultVariant.originalPrice || 0
    : productData.originalPrice;
  const displayDiscount =
    displayOriginalPrice && displayOriginalPrice > displayPrice
      ? Math.round(
          ((displayOriginalPrice - displayPrice) / displayOriginalPrice) * 100,
        )
      : 0;
  const normalizedDisplayDiscount = isComboItem
    ? Math.ceil(Number(displayDiscount || 0))
    : Number(displayDiscount || 0);
  const displayWeightInGrams = defaultVariant
    ? getWeightInGrams(defaultVariant)
    : getWeightInGrams(productData);
  const displayWeightLabel = formatWeight(
    displayWeightInGrams,
    defaultVariant?.unit || productData?.unit || "g",
  );
  const displayProductName = replaceWeightRange(
    productData.name,
    displayWeightLabel,
  );
  const displayShortDescription = String(
    productData.shortDescription ||
      productData.short_description ||
      productData.subtitle ||
      productData.tagline ||
      productData.metaDescription ||
      "",
  ).trim();
  const isNewArrival = Boolean(
    productData.newArrival ?? productData.isNewArrival,
  );
  const isBestSeller = Boolean(
    productData.bestSeller ?? productData.isBestSeller,
  );
  const isHighDemand =
    Boolean(productData.highDemand) ||
    String(productData.demandStatus || "").toUpperCase() === "HIGH";
  const showDiscountBadge =
    Number(normalizedDisplayDiscount) > 0 && !isNewArrival && !isBestSeller;
  const isExclusiveProduct = Boolean(productData?.isExclusive);
  const wishlistVariantId = defaultVariant?._id || null;
  const wishlistItemType = isComboItem ? "combo" : "product";
  const isWishlisted = isInWishlist(
    productCardId,
    productVariantId || wishlistVariantId,
    wishlistItemType,
  );
  const isOutOfStock = availability.tracked && availableQuantity <= 0;
  const showNotifyAction = !isComboItem && isOutOfStock;
  const notifyVariantId = productVariantId || defaultVariant?._id || null;
  const notifyVariantName = defaultVariant?.name || "";
  const notifyRequested = Boolean(
    productData?.stockNotificationRequested ||
      defaultVariant?.stockNotificationRequested,
  );
  const lowStockLabel =
    !isComboItem &&
    availability.tracked &&
    availableQuantity > 0 &&
    availableQuantity <= 3
      ? `Only ${availableQuantity} left`
      : "";
  const actionLabel = alreadyInCart
    ? fashionMicrocopy.removeFromCart
    : showNotifyAction
      ? "Notify me when back in stock"
      : isOutOfStock
        ? "Currently unavailable"
        : fashionMicrocopy.addToCart;
  const primaryCartButtonStyle = {
    background:
      "linear-gradient(135deg, var(--flavor-color, #24150f) 0%, var(--flavor-hover, #3a2418) 100%)",
    color: "var(--flavor-text, #ffffff)",
    boxShadow:
      "0 18px 35px -26px color-mix(in srgb, var(--flavor-color, #24150f) 58%, transparent)",
  };

  const handleWishlistClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(productData, {
      itemType: wishlistItemType,
      variantId: productVariantId || wishlistVariantId,
      variantName: defaultVariant?.name || "",
      quantity: 1,
    });
  };

  const imgAlt = useSeoAlt(
    productData.images?.[0] || displayProductName || productData.name,
    displayProductName || productData.name,
  );

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAddingToCart) return;

    if (alreadyInCart) {
      setIsAddingToCart(true);
      try {
        if (isComboItem) {
          await removeComboFromCart(productCardId);
        } else {
          await removeFromCart(productCardId, productVariantId);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsAddingToCart(false);
      }
    } else {
      setIsAddingToCart(true);
      try {
        if (isComboItem) {
          await addComboToCart(productData, 1);
        } else {
          const cartPayload = defaultVariant
            ? {
                ...productData,
                parentProductId: productCardId,
                price: defaultVariant.price,
                originalPrice:
                  defaultVariant.originalPrice || productData.originalPrice,
                selectedVariant: {
                  _id: defaultVariant._id,
                  name: defaultVariant.name,
                  sku: defaultVariant.sku,
                  price: defaultVariant.price,
                  weightInGrams: defaultVariant.weightInGrams,
                  label: defaultVariant.label,
                  weight: defaultVariant.weight,
                  unit: defaultVariant.unit,
                },
                variantId: defaultVariant._id,
              }
            : {
                ...productData,
                parentProductId: productCardId,
              };
          await addToCart(cartPayload, 1);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsAddingToCart(false);
      }
    }
  };

  const reviewStatsSource =
    !isComboItem && productData.hasVariants
      ? (productVariantId ? productData : defaultVariant) || productData
      : productData;
  const displayReviewCount = Number(
    reviewStatsSource?.totalReviews ??
      reviewStatsSource?.reviewCount ??
      reviewStatsSource?.numReviews ??
      0,
  );
  const displayRating =
    displayReviewCount > 0
      ? Number(reviewStatsSource?.avgRating ?? reviewStatsSource?.rating ?? 0)
      : 0;
  const productHref = isComboItem
    ? `/combo/${productCardId}`
    : buildProductHref(productData, {
        variantId: productVariantId,
        fallbackId: productCardId,
        fallbackHref: productCardId
          ? `/product/${encodeURIComponent(String(productCardId))}`
          : "/products",
      });
  const productReviewsHref = `${productHref}#reviews`;

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(displayRating);
    const hasHalfStar = displayRating % 1 >= 0.5;
    for (let index = 0; index < 5; index += 1) {
      if (index < fullStars) {
        stars.push(<IoIosStar key={`f-${index}`} className="text-amber-400" />);
      } else if (index === fullStars && hasHalfStar) {
        stars.push(<IoIosStarHalf key="h" className="text-amber-400" />);
      } else {
        stars.push(
          <IoIosStarOutline key={`e-${index}`} className="text-gray-300" />,
        );
      }
    }
    return stars;
  };

  return (
    <div
      data-product-card
      data-product-card-id={productCardId || ""}
      data-product-card-type={resolvedItemType}
      className={`group relative flex w-full min-w-0 flex-col overflow-hidden border bg-white transition-all ${
        collectionListing
          ? "h-full rounded-[18px] p-2 shadow-[0_16px_42px_rgba(47,19,37,0.08)] sm:rounded-[22px] sm:p-3"
          : compactListing
          ? "h-full max-sm:h-[390px] rounded-[18px] p-2 sm:rounded-[22px] sm:p-3"
          : "h-full rounded-[22px] p-3"
      } ${
        isOutOfStock
          ? collectionListing
            ? "border-[#eadfe6] bg-[#fffdfb]"
            : "border-gray-100"
          : collectionListing
            ? "border-[#eadfe6] hover:-translate-y-1 hover:border-[#d8b46b] hover:shadow-[0_24px_65px_rgba(47,19,37,0.13)] active:scale-[0.99]"
          : "border-gray-100 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.12)]"
      }`}
    >
      <Link
        href={productHref}
        aria-label={`Open ${displayProductName || productData.name}`}
        className="absolute inset-0 z-10 rounded-[inherit]"
      >
        <span className="sr-only">{displayProductName || productData.name}</span>
      </Link>

      {/* Image Container */}
      <ProductImage
        src={productData.images?.[0]}
        alt={imgAlt}
        cardImage
        aspect={collectionListing ? "aspect-[3/4] sm:aspect-[4/5]" : compactListing ? "aspect-square sm:aspect-square" : "aspect-square"}
        fit="cover"
        rounded={collectionListing ? "rounded-[14px] sm:rounded-[18px]" : undefined}
        className={
          collectionListing
            ? "relative mb-3 w-full bg-[#f7f2ed]"
            : compactListing
              ? "relative mb-1.5 w-full bg-[#f5f5f5] sm:mb-3"
              : "relative mb-3 w-full bg-[#f5f5f5]"
        }
        imgClassName={`object-cover transition-all duration-300 ${
          isOutOfStock
            ? "grayscale-[0.45] saturate-50 opacity-70"
            : collectionListing
              ? "group-hover:scale-[1.045] group-hover:saturate-[1.06]"
              : "group-hover:scale-105"
        }`}
      >
        <ProductCardBadges
          isNewArrival={isNewArrival}
          isBestSeller={isBestSeller}
          showDiscountBadge={showDiscountBadge}
          discountLabel={`${normalizedDisplayDiscount}% OFF`}
          isExclusive={isExclusiveProduct}
          isHighDemand={isHighDemand}
        />

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistClick}
          aria-label={
            isWishlisted
              ? `Remove ${displayProductName || productData.name} from wishlist`
              : `Add ${displayProductName || productData.name} to wishlist`
          }
          className={`absolute right-2 top-2 z-20 flex items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-all hover:bg-red-50 hover:text-red-500 active:scale-95 ${
            collectionListing
              ? "h-10 w-10 border border-white/90 bg-white/94 text-[#7c2d62] shadow-[0_10px_26px_rgba(47,19,37,0.14)]"
              : compactListing
                ? "h-7 w-7 bg-white/80 text-gray-400 sm:h-8 sm:w-8"
                : "h-8 w-8 bg-white/80 text-gray-400"
          }`}
        >
          {isWishlisted ? (
            <IoMdHeart className="text-red-500" />
          ) : (
            <IoMdHeartEmpty />
          )}
        </button>

        {/* Share Button */}
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className={collectionListing ? "absolute right-2 top-[56px] z-20" : "absolute right-2 top-12 z-20"}
        >
          <ShareButton
            productId={productCardId}
            productName={displayProductName || productData.name}
            variant="icon"
            iconSizeClass={compactListing ? "h-7 w-7 sm:h-8 sm:w-8" : "h-8 w-8"}
            iconGlyphClass={compactListing ? "h-3.5 w-3.5 sm:h-4 sm:w-4" : "h-4 w-4"}
          />
        </div>

        {collectionListing && !isOutOfStock ? (
          <button
            type="button"
            aria-label={`Quick view for ${displayProductName || productData.name} coming soon`}
            title="Quick View"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="absolute inset-x-3 bottom-3 z-20 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/80 bg-white/92 text-xs font-black uppercase tracking-[0.12em] text-[#2f1325] opacity-100 shadow-[0_14px_32px_rgba(47,19,37,0.16)] backdrop-blur transition hover:bg-[#fff8fb] sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            Quick View
          </button>
        ) : null}

        {isOutOfStock ? (
          <>
            <div className="absolute inset-0 bg-black/18" />
            <div className={`absolute border border-white/15 bg-black/55 text-white shadow-[0_18px_35px_-24px_rgba(0,0,0,0.6)] backdrop-blur-sm ${
              compactListing
                ? "inset-x-2 bottom-2 rounded-xl px-2 py-1.5 sm:inset-x-3 sm:bottom-3 sm:rounded-2xl sm:px-3 sm:py-2"
                : "inset-x-3 bottom-3 rounded-2xl px-3 py-2"
            }`}>
              <p className={compactListing ? "text-[9px] font-bold uppercase tracking-[0.14em] text-white sm:text-[10px]" : "text-[10px] font-bold uppercase tracking-[0.16em] text-white"}>
                Out of stock
              </p>
              <p className={compactListing ? "mt-0.5 line-clamp-1 text-[10px] font-medium text-white/80 sm:mt-1 sm:text-[11px]" : "mt-1 text-[11px] font-medium text-white/80"}>
                We're restocking soon
              </p>
            </div>
          </>
        ) : null}
      </ProductImage>

      {/* Content */}
      <div className="relative flex flex-1 flex-col">
        <p className={collectionListing ? "mb-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#9d6b19] sm:text-[10px]" : compactListing ? "mb-0.5 min-h-[20px] text-[8px] font-semibold uppercase tracking-[0.15em] text-gray-400 line-clamp-2 sm:mb-1 sm:min-h-0 sm:text-[10px]" : "mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400"}>
          {productData.brand}
        </p>
        <h3 className={collectionListing ? "min-h-[40px] line-clamp-2 text-[13px] font-black leading-snug text-[#2f1325] transition-colors group-hover:text-[#7c2d62] sm:min-h-[42px] sm:text-sm" : compactListing ? "min-h-[34px] line-clamp-2 text-[12px] font-bold leading-snug text-gray-900 transition-colors group-hover:text-primary sm:min-h-0 sm:text-[13px] sm:font-semibold" : "text-[13px] font-semibold leading-snug text-gray-900 transition-colors group-hover:text-primary"}>
          {displayProductName || productData.name}
        </h3>
        <div className={collectionListing ? "mt-1 min-h-[30px] sm:min-h-8" : compactListing ? "mt-1 min-h-[16px] sm:min-h-7" : "mt-1 min-h-7"}>
          {displayShortDescription ? (
            <p className={collectionListing ? "line-clamp-2 text-[10.5px] font-semibold leading-5 text-[#806574] sm:text-[11px]" : compactListing ? "line-clamp-1 text-[10px] font-medium text-gray-500 sm:line-clamp-2 sm:text-[11px]" : "line-clamp-2 text-[11px] font-medium text-gray-500"}>
              {displayShortDescription}
            </p>
          ) : null}
        </div>

        {/* Weight */}
        {displayWeightLabel && (
          <span className={collectionListing ? "mt-2 inline-flex w-fit rounded-full border border-[#ead3df] bg-[#fff8fb] px-2.5 py-0.5 text-[11px] font-bold text-[#6b244d]" : compactListing ? "mt-1 inline-flex w-fit rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[10px] font-semibold text-gray-600 sm:mt-2 sm:px-2.5 sm:text-[11px]" : "mt-2 inline-flex w-fit rounded-full bg-[#f0f0f0] px-2.5 py-0.5 text-[11px] font-semibold text-gray-600"}>
            {displayWeightLabel}
            {productData.hasVariants && productData.variants?.length > 1 && (
              <span className="ml-1 text-gray-400">
                +{productData.variants.length - 1} more
              </span>
            )}
          </span>
        )}

        {/* Rating */}
        <Link
          href={productReviewsHref}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Jump to ratings and reviews for ${displayProductName || productData.name}`}
          className={`relative z-20 w-fit rounded-md transition hover:opacity-80 ${
            compactListing
              ? "mt-1 flex items-center gap-1 sm:mt-2"
              : "mt-2 flex items-center gap-1"
          }`}
        >
          <div className={compactListing ? "flex text-[10px] sm:text-xs" : "flex text-xs"}>
            {renderStars()}
          </div>
          <span className="text-[10px] text-gray-400">
            ({displayReviewCount})
          </span>
        </Link>

        {lowStockLabel ? (
          <div className={compactListing ? "mt-1 sm:mt-2" : "mt-2"}>
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700">
              {lowStockLabel}
            </span>
          </div>
        ) : null}

        {/* Price & Cart */}
        <div className={collectionListing ? "mt-auto border-t border-[#eadfe6] pt-2.5 sm:pt-3" : compactListing ? "mt-auto border-t border-[#f3ece6] pt-2 sm:pt-3" : "mt-auto border-t border-[#f3ece6] pt-3"}>
          <div className={compactListing ? "flex items-end sm:min-h-10" : "min-h-10 flex items-end"}>
            <div>
              <ProductCardPriceBlock
                originalPrice={displayOriginalPrice}
                finalPrice={displayPrice}
              />
            </div>
          </div>

          <div className={compactListing ? "mt-2 sm:mt-3 sm:min-h-11" : "mt-3 min-h-11"}>
            {showNotifyAction ? (
              <div className="relative z-20">
                <StockNotificationButton
                  productId={productCardId}
                  productName={displayProductName || productData.name}
                  variantId={notifyVariantId}
                  variantName={notifyVariantName}
                  initialRequested={notifyRequested}
                  compact
                  className={
                    compactListing
                      ? "max-sm:min-h-9 max-sm:rounded-xl max-sm:px-2 max-sm:py-1.5 max-sm:text-[11px] max-sm:leading-tight"
                      : ""
                  }
                  preventNavigation
                />
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                aria-label={
                  alreadyInCart
                    ? `Remove ${displayProductName || productData.name} from cart`
                    : isOutOfStock
                      ? `${displayProductName || productData.name} is unavailable`
                      : `Add ${displayProductName || productData.name} to cart`
                }
                disabled={isAddingToCart || (!alreadyInCart && isOutOfStock)}
                className={`relative z-20 inline-flex w-full items-center justify-center gap-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                  compactListing
                    ? "min-h-9 rounded-xl px-2 py-1.5 text-[12px] sm:min-h-11 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm"
                    : "min-h-11 rounded-2xl px-4 py-3 text-sm"
                } ${
                  alreadyInCart
                    ? "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                    : isOutOfStock
                      ? "border border-[#e4d6ca] bg-[#f4ede7] text-[#a08979]"
                      : "hover:-translate-y-0.5 hover:brightness-[1.03] active:brightness-95"
                }`}
                style={
                  !alreadyInCart && !isOutOfStock
                    ? primaryCartButtonStyle
                    : undefined
                }
              >
                {isAddingToCart ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : alreadyInCart ? (
                  <MdDeleteOutline size={18} />
                ) : (
                  <IoMdCart size={18} />
                )}
                <span>{actionLabel}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ProductItem);
