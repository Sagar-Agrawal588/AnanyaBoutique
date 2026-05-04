"use client";
import { useAdmin } from "@/context/AdminContext";
import { deleteData, getData } from "@/utils/api";
import { withAdminBasePath } from "@/utils/basePath";
import { getImageUrl } from "@/utils/imageUtils";
import { Button } from "@mui/material";
import Rating from "@mui/material/Rating";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { IoArrowBack } from "react-icons/io5";
import { RiEdit2Line } from "react-icons/ri";

const normalizeVariantLabel = (variant) => {
  const weight = Number(variant?.weight || 0);
  const rawUnit = String(variant?.unit || "")
    .trim()
    .toLowerCase();

  if (Number.isFinite(weight) && weight > 0) {
    return `${weight}${rawUnit || "g"}`;
  }

  return String(variant?.name || "Variant")
    .trim()
    .replace(/\s+/g, "");
};

const getVariantInventoryLines = (product) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (variants.length === 0) return [];

  return variants.map((variant) => ({
    id: String(variant?._id || normalizeVariantLabel(variant)),
    label: normalizeVariantLabel(variant),
    stock: Math.max(Number(variant?.stock_quantity ?? variant?.stock ?? 0), 0),
  }));
};

const ViewProduct = () => {
  const { token, isAuthenticated, loading } = useAdmin();
  const router = useRouter();
  const params = useParams();
  const productId = params.id;

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [selectedReviewVariant, setSelectedReviewVariant] = useState("all");

  const fetchProduct = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getData(`/api/products/${productId}`, token);
      if (response.success && response.data) {
        setProduct(response.data);
      } else {
        router.push("/products-list");
      }
    } catch (error) {
      console.error("Failed to fetch product:", error);
      router.push("/products-list");
    }
    setIsLoading(false);
  }, [productId, token, router]);

  const fetchProductReviews = useCallback(async () => {
    if (!productId || !token) return;

    setReviewsLoading(true);
    try {
      const variantQuery =
        selectedReviewVariant && selectedReviewVariant !== "all"
          ? `&variantId=${encodeURIComponent(String(selectedReviewVariant))}`
          : "";
      const response = await getData(
        `/api/admin/reviews?productId=${encodeURIComponent(String(productId))}${variantQuery}&limit=100`,
        token,
      );
      if (response?.success && Array.isArray(response?.data)) {
        setReviews(response.data);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error("Failed to fetch product reviews:", error);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [productId, token, selectedReviewVariant]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated && token && productId) {
      fetchProduct();
      fetchProductReviews();
    }
  }, [isAuthenticated, token, productId, fetchProduct, fetchProductReviews]);

  const handleDeleteReview = async (reviewId) => {
    if (!reviewId || !token) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm("Delete this review permanently?")
    ) {
      return;
    }

    try {
      const response = await deleteData(
        `/api/admin/reviews/${reviewId}`,
        token,
      );
      if (!response?.success) {
        throw new Error(response?.message || "Failed to delete review.");
      }
      setReviews((current) =>
        current.filter((review) => review._id !== reviewId),
      );
    } catch (error) {
      console.error("Failed to delete review:", error);
    }
  };

  if (loading || !isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const variantInventoryLines = getVariantInventoryLines(product);
  const totalStock =
    variantInventoryLines.length > 0
      ? variantInventoryLines.reduce((sum, entry) => sum + entry.stock, 0)
      : Math.max(Number(product.stock_quantity ?? product.stock ?? 0), 0);
  const available = totalStock;
  const lowThreshold = Number(
    product.low_stock_threshold ?? product.lowStockThreshold ?? 5,
  );
  const lowStockVariants = variantInventoryLines.filter(
    (entry) => entry.stock <= lowThreshold,
  );
  const isLowStock =
    variantInventoryLines.length > 0
      ? lowStockVariants.length > 0
      : available <= lowThreshold;
  const galleryImages = [
    ...(Array.isArray(product.images) ? product.images : []),
  ];
  if (product.thumbnail && !galleryImages.includes(product.thumbnail)) {
    galleryImages.unshift(product.thumbnail);
  }

  return (
    <section className="w-full py-3 px-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.push("/products-list")}
            className="!min-w-0 !p-2 !rounded-full"
          >
            <IoArrowBack size={20} />
          </Button>
          <h2 className="text-[18px] text-gray-700 font-[600]">
            Product Details
          </h2>
        </div>
        <Link href={`/products-list/edit/${productId}`}>
          <Button className="!bg-blue-600 !text-white !px-4 !py-2 !rounded-md hover:!bg-blue-700 flex items-center gap-2">
            <RiEdit2Line size={18} />
            Edit Product
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Images Section */}
          <div>
            <div className="w-full h-[400px] bg-gray-100 rounded-lg overflow-hidden mb-4">
              <img
                src={getImageUrl(galleryImages[selectedImage])}
                alt={product.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  if (e.currentTarget.dataset.fallbackApplied) return;
                  e.currentTarget.dataset.fallbackApplied = "true";
                  e.currentTarget.src = withAdminBasePath("/placeholder.png");
                }}
              />
            </div>
            {galleryImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {galleryImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-[80px] h-[80px] rounded-lg overflow-hidden border-2 flex-shrink-0 ${
                      selectedImage === index
                        ? "border-blue-500"
                        : "border-gray-200"
                    }`}
                  >
                    <img
                      src={getImageUrl(img)}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        if (e.currentTarget.dataset.fallbackApplied) return;
                        e.currentTarget.dataset.fallbackApplied = "true";
                        e.currentTarget.src =
                          withAdminBasePath("/placeholder.png");
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info Section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              {product.isFeatured && (
                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-medium">
                  Featured
                </span>
              )}
              {product.isNewArrival && (
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                  New Arrival
                </span>
              )}
              {product.isExclusive && (
                <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-medium">
                  Members Only
                </span>
              )}
              {product.isBestSeller && (
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                  Best Seller
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {product.name}
            </h1>

            <p className="text-sm text-gray-500 mb-4">{product.brand}</p>

            <div className="mb-4 text-gray-600">
              {Number(product.reviewCount || product.numReviews || 0) > 0
                ? `${Number(product.rating || 0).toFixed(1)} (${Number(product.reviewCount || product.numReviews || 0)})`
                : "0.0 (0)"}
            </div>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-bold text-red-600">
                ₹{product.price}
              </span>
              {product.originalPrice &&
                product.originalPrice > product.price && (
                  <>
                    <span className="text-xl text-gray-400 line-through">
                      ₹{product.originalPrice}
                    </span>
                    <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-sm font-medium">
                      {product.discount ||
                        Math.round(
                          ((product.originalPrice - product.price) /
                            product.originalPrice) *
                            100,
                        )}
                      % OFF
                    </span>
                  </>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Total Stock</p>
                <p
                  className={`font-bold ${totalStock > 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {totalStock > 0 ? `${totalStock} units` : "Out of Stock"}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Available Stock</p>
                <p
                  className={`font-bold ${available > 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {available > 0 ? `${available} units` : "Out of Stock"}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Low Stock</p>
                <p
                  className={`font-bold ${isLowStock ? "text-amber-600" : "text-green-600"}`}
                >
                  {isLowStock
                    ? variantInventoryLines.length > 0
                      ? lowStockVariants.map((entry) => entry.label).join(", ")
                      : `Low (≤ ${lowThreshold})`
                    : "Healthy"}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-medium text-gray-800">
                  {product.category?.name || "Uncategorized"}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Variants</p>
                <p className="font-medium text-gray-800">
                  {variantInventoryLines.length > 0
                    ? variantInventoryLines
                        .map((entry) => entry.label)
                        .join(", ")
                    : "No variants"}
                </p>
              </div>
            </div>

            {product.shortDescription && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">
                  Short Description
                </h3>
                <p className="text-gray-600">{product.shortDescription}</p>
              </div>
            )}

            {product.tags?.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description Section */}
        {product.description && (
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              Full Description
            </h3>
            <p className="text-gray-600 whitespace-pre-wrap">
              {product.description}
            </p>
          </div>
        )}

        <div className="mt-8 border-t pt-6">
          <div
            id="reviews"
            className="flex items-start justify-between gap-4 mb-4"
          >
            <div>
              <h3 className="text-lg font-semibold text-gray-700">
                Customer Reviews
              </h3>
              <p className="text-sm text-gray-500">
                All reviews currently published or hidden for this product.
              </p>
            </div>
            {variantInventoryLines.length > 0 ? (
              <label className="min-w-[220px] text-sm text-gray-700">
                <span className="mb-1 block font-medium">Review Variant</span>
                <select
                  value={selectedReviewVariant}
                  onChange={(event) =>
                    setSelectedReviewVariant(event.target.value)
                  }
                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 outline-none focus:border-blue-500"
                >
                  <option value="all">All variants</option>
                  {variantInventoryLines.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-right">
              <p className="text-xs uppercase tracking-wide text-blue-700">
                Reviews
              </p>
              <p className="text-lg font-semibold text-blue-900">
                {reviews.length}
              </p>
            </div>
          </div>

          {reviewsLoading ? (
            <p className="text-sm text-gray-500">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
              No reviews have been submitted for this product yet.
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div
                  key={review._id}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-gray-800">
                          {review.userName || "Customer"}
                        </p>
                        <Rating
                          value={Number(review.rating || 0)}
                          precision={0.5}
                          readOnly
                          size="small"
                        />
                        <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 capitalize">
                          {review.visibility || "visible"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {[review.userEmail, review.city]
                          .filter(Boolean)
                          .join(" • ") || "No extra identity"}
                      </p>
                      {review.variantId ? (
                        <p className="mt-1 text-xs font-medium text-blue-700">
                          Variant:{" "}
                          {variantInventoryLines.find(
                            (entry) =>
                              String(entry.id) === String(review.variantId),
                          )?.label || String(review.variantId)}
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm text-gray-700">
                        {review.comment}
                      </p>
                    </div>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      onClick={() => handleDeleteReview(review._id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ViewProduct;
