"use client";

import ProductCardBadges from "@/components/productCard/ProductCardBadges";
import ProductCardPriceBlock from "@/components/productCard/ProductCardPriceBlock";
import { subscribeToStockUpdates } from "@/realtime/stockSocket";
import ShareButton from "@/components/ShareButton";
import StockNotificationButton from "@/components/StockNotificationButton";
import { useCart } from "@/context/CartContext";
import { applyStockUpdateToProduct } from "@/utils/stockRealtime";
import { useWishlist } from "@/context/WishlistContext";
import { getProductCardImageUrl } from "@/utils/imageUtils";
import Image from "next/image";
import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import {
  IoIosStar,
  IoIosStarHalf,
  IoMdCart,
  IoMdHeart,
  IoMdHeartEmpty,
} from "react-icons/io";
import { MdDeleteOutline } from "react-icons/md";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isInventoryTracked = (entry, fallbackEntry = null) => {
  const source = entry || fallbackEntry || {};
  if (source?.track_inventory === false || source?.trackInventory === false) {
    return false;
  }
  return true;
};

const resolveAvailability = (entry, fallbackEntry = null) => {
  const source = entry || fallbackEntry || {};
  const tracked = isInventoryTracked(entry, fallbackEntry);
  const explicitAvailable = [
    source?.available_quantity,
    source?.available_stock,
    source?.availableStock,
  ]
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value));
  const stock = toNumber(source?.stock_quantity ?? source?.stock, 0);
  const reserved = toNumber(source?.reserved_quantity, 0);
  const available = tracked
    ? Number.isFinite(explicitAvailable)
      ? Math.max(explicitAvailable, 0)
      : Math.max(stock - reserved, 0)
    : Number.MAX_SAFE_INTEGER;

  return {
    tracked,
    stock,
    reserved,
    available,
  };
};

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
        setLiveProduct((previous) => applyStockUpdateToProduct(previous, payload));
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

  const productData = liveProduct || product || {
    _id: id || _id || product?.id || 1,
    name: name || "Classic Peanut Butter",
    brand: brand || "Buy One Gram",
    price: price || 349,
    originalPrice: originalPrice || 499,
    images: [image || "/product_1.png"],
    rating: rating || 4.5,
    discount: discount || 30,
  };

  // Derive display values from default variant when hasVariants
  const defaultVariant =
    productData.hasVariants && productData.variants?.length > 0
      ? productData.variants.find((v) => v.isDefault) || productData.variants[0]
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
  const displayDiscount = defaultVariant
    ? defaultVariant.discountPercent ||
      (defaultVariant.originalPrice &&
      defaultVariant.originalPrice > defaultVariant.price
        ? Math.round(
            ((defaultVariant.originalPrice - defaultVariant.price) /
              defaultVariant.originalPrice) *
              100,
          )
        : 0)
    : productData.discount;
  const normalizedDisplayDiscount = isComboItem
    ? Math.ceil(Number(displayDiscount || 0))
    : Number(displayDiscount || 0);
  const showDiscountBadge =
    Number(normalizedDisplayDiscount) > 0 && !productData.isBestSeller;
  const displayWeight = defaultVariant
    ? defaultVariant.weight
    : productData.weight;
  const displayUnit = defaultVariant
    ? defaultVariant.unit || "g"
    : productData.unit && productData.unit !== "piece"
      ? productData.unit
      : "g";
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
  const actionLabel = alreadyInCart
    ? isComboItem
      ? "Remove combo"
      : "Remove from cart"
    : showNotifyAction
      ? "Notify me when back in stock"
      : isOutOfStock
        ? "Currently unavailable"
        : isComboItem
          ? "Add combo to cart"
          : "Add to cart";
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

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(productData.rating);
    const hasHalfStar = productData.rating % 1 >= 0.5;
    for (let i = 0; i < fullStars; i++) {
      stars.push(<IoIosStar key={`f-${i}`} className="text-amber-400" />);
    }
    if (hasHalfStar) {
      stars.push(<IoIosStarHalf key="h" className="text-amber-400" />);
    }
    return stars;
  };
  const displayReviewCount = Number(productData.reviewCount || 0);

  return (
    <Link
      href={isComboItem ? `/combo/${productCardId}` : `/product/${productCardId}`}
      className={`group relative flex h-full w-full min-w-0 flex-col rounded-3xl border bg-white p-2.5 transition-all sm:p-3 ${
        isOutOfStock
          ? "border-gray-100 shadow-[0_20px_48px_-40px_rgba(36,21,15,0.28)]"
          : "border-gray-100 hover:-translate-y-1 hover:shadow-xl"
      }`}
    >
      {/* Image Container */}
      <div className="relative mb-3 flex h-32 w-full items-center justify-center overflow-hidden rounded-2xl bg-gray-50 sm:h-40">
        <ProductCardBadges
          isBestSeller={Boolean(productData.isBestSeller)}
          showDiscountBadge={showDiscountBadge}
          discountLabel={`${normalizedDisplayDiscount}% OFF`}
          isExclusive={isExclusiveProduct}
        />

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistClick}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm text-gray-400 shadow-sm transition-all hover:bg-red-50 hover:text-red-500 active:scale-95"
        >
          {isWishlisted ? (
            <IoMdHeart className="text-red-500" />
          ) : (
            <IoMdHeartEmpty />
          )}
        </button>

        {/* Share Button */}
        <div
          onClick={(e) => e.preventDefault()}
          className="absolute right-2 top-12 z-10"
        >
          <ShareButton
            productId={productCardId}
            productName={productData.name}
            variant="icon"
            iconSizeClass="h-8 w-8"
            iconGlyphClass="h-4 w-4"
          />
        </div>

        <Image
          src={getProductCardImageUrl(productData.images?.[0])}
          alt={productData.name}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 220px"
          className={`object-contain p-3 mix-blend-multiply transition-all duration-300 sm:p-4 ${
            isOutOfStock
              ? "grayscale-[0.45] saturate-50 opacity-70"
              : "group-hover:scale-110"
          }`}
        />
        {isOutOfStock ? (
          <>
            <div className="absolute inset-0 bg-black/18" />
            <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/15 bg-black/55 px-3 py-2 text-white shadow-[0_18px_35px_-24px_rgba(0,0,0,0.6)] backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                Out of stock
              </p>
              <p className="mt-1 text-[11px] font-medium text-white/80">
                We&apos;re restocking soon
              </p>
            </div>
          </>
        ) : null}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col px-1">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          {productData.brand}
        </p>
        <h3 className="min-h-[2.75rem] line-clamp-2 text-sm font-bold text-gray-900 transition-colors group-hover:text-primary sm:min-h-10">
          {productData.name}
        </h3>
        <div className="mt-1 min-h-7 sm:min-h-8">
          {productData.shortDescription ? (
            <p className="line-clamp-2 text-[11px] font-medium text-gray-500">
              {productData.shortDescription}
            </p>
          ) : null}
        </div>

        {/* Weight */}
        {displayWeight > 0 && (
          <span className="inline-block mt-1 text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {Number(displayWeight) >= 1000 && displayUnit === "g"
              ? `${Number(displayWeight) / 1000} kg`
              : `${displayWeight}${displayUnit}`}
            {productData.hasVariants && productData.variants?.length > 1 && (
              <span className="text-gray-400 ml-1">
                +{productData.variants.length - 1} more
              </span>
            )}
          </span>
        )}

        {/* Rating */}
        <div className="mt-1 flex items-center gap-1">
          <div className="flex text-xs">{renderStars()}</div>
          <span className="text-[10px] text-gray-400">
            ({displayReviewCount > 0 ? displayReviewCount : productData.rating})
          </span>
        </div>

        {/* Price & Cart */}
        <div className="mt-auto border-t border-[#f3ece6] pt-3">
          <div className="min-h-[42px] flex items-end">
            <div>
              <ProductCardPriceBlock
                originalPrice={displayOriginalPrice}
                finalPrice={displayPrice}
              />
            </div>
          </div>

          <div className="mt-3 min-h-[44px]">
            {showNotifyAction ? (
              <StockNotificationButton
                productId={productCardId}
                productName={productData.name}
                variantId={notifyVariantId}
                variantName={notifyVariantName}
                initialRequested={notifyRequested}
                compact
                preventNavigation
              />
            ) : (
              <button
                onClick={handleAddToCart}
                aria-label={
                  alreadyInCart
                    ? `Remove ${productData.name} from cart`
                    : isOutOfStock
                      ? `${productData.name} is unavailable`
                      : `Add ${productData.name} to cart`
                }
                disabled={isAddingToCart || (!alreadyInCart && isOutOfStock)}
                className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
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
    </Link>
  );
};

export default ProductItem;
