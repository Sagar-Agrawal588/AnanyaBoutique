"use client";

import ProductCardBadges from "@/components/productCard/ProductCardBadges";
import ProductCardPriceBlock from "@/components/productCard/ProductCardPriceBlock";
import ShareButton from "@/components/ShareButton";
import { useCart } from "@/context/CartContext";
import { FLAVORS, MyContext } from "@/context/ThemeContext";
import { useWishlist } from "@/context/WishlistContext";
import { getProductCardImageUrl } from "@/utils/imageUtils";
import Image from "next/image";
import Link from "next/link";
import { useContext, useState } from "react";
import {
  IoIosStar,
  IoIosStarHalf,
  IoMdCart,
  IoMdHeart,
  IoMdHeartEmpty,
} from "react-icons/io";
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
  } = props;

  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const {
    addToCart,
    removeFromCart,
    isInCart,
    addComboToCart,
    removeComboFromCart,
    isComboInCart,
  } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const context = useContext(MyContext);
  const flavor = context?.flavor || FLAVORS.creamy;

  const resolvedItemType = String(
    itemType || product?.itemType || "product",
  ).toLowerCase();
  const isComboItem = resolvedItemType === "combo";
  const productCardId = isComboItem
    ? id || _id || product?.comboId || product?._id || product?.id
    : product?.parentProductId || id || _id || product?._id || product?.id;
  const productVariantId = product?.variantId || null;
  const alreadyInCart = isComboItem
    ? isComboInCart(productCardId)
    : isInCart(productCardId, productVariantId);

  const productData = product || {
    _id: id || _id || product?.id || 1,
    name: name || "Classic Peanut Butter",
    brand: brand || "Buy One Gram",
    price: price || 349,
    originalPrice: originalPrice || 499,
    images: [image || "/product_1.png"],
    rating: rating || 4.5,
    discount: discount || 30,
  };
  const isOutOfStock = isComboItem
    ? Number(productData.availableStock ?? productData.stock ?? 0) <= 0
    : productData.stock === 0;

  // Derive display values from default variant when hasVariants
  const defaultVariant =
    productData.hasVariants && productData.variants?.length > 0
      ? productData.variants.find((v) => v.isDefault) || productData.variants[0]
      : null;

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
      className="group relative flex h-full w-full min-w-0 flex-col rounded-3xl border border-gray-100 bg-white p-2.5 sm:p-3 transition-all hover:-translate-y-1 hover:shadow-xl"
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
          className="object-contain p-3 sm:p-4 transition-transform duration-500 group-hover:scale-110 mix-blend-multiply"
        />
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
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <ProductCardPriceBlock
            originalPrice={displayOriginalPrice}
            finalPrice={displayPrice}
          />

          <button
            onClick={handleAddToCart}
            disabled={isAddingToCart || (!alreadyInCart && isOutOfStock)}
            className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-all active:scale-90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70 ${
              alreadyInCart
                ? "bg-linear-to-r from-red-500 to-pink-500 text-white"
                : isOutOfStock
                  ? "bg-gray-200 text-gray-400"
                  : "bg-primary/20 text-primary border border-primary/30"
            }`}
          >
            {isAddingToCart ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : alreadyInCart ? (
              <MdDeleteOutline size={18} />
            ) : (
              <IoMdCart size={18} />
            )}
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductItem;
