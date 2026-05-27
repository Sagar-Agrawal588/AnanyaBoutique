"use client";
import { useAdmin } from "@/context/AdminContext";
import { useAdminRealtime } from "@/hooks/useAdminRealtime";
import { withAdminBasePath } from "@/utils/basePath";
import { ADMIN_PLACEHOLDER_IMAGE } from "@/utils/mediaDefaults";
import { deleteData, getData, patchData } from "@/utils/api";
import { getImageUrl } from "@/utils/imageUtils";
import { Button, Chip } from "@mui/material";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { FaRegTrashAlt } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import { HiOutlineFire } from "react-icons/hi";
import { IoEyeOutline } from "react-icons/io5";
import { RiEdit2Line } from "react-icons/ri";

const columns = [
  { id: "ID", label: "ID", minWidth: 110 },
  { id: "PRODUCT", label: "PRODUCT", minWidth: 300 },
  { id: "CATEGORY", label: "CATEGORY", minWidth: 100 },
  { id: "PRICE", label: "PRICE", minWidth: 100 },
  { id: "AVAILABLE", label: "AVAILABLE", minWidth: 180 },
  { id: "LOWSTOCK", label: "LOW STOCK", minWidth: 120 },
  { id: "DEMAND", label: "DEMAND STATUS", minWidth: 120 },
  { id: "ACCESS", label: "ACCESS", minWidth: 120 },
  { id: "RATING", label: "RATING", minWidth: 100 },
  { id: "ACTIONS", label: "ACTIONS", minWidth: 280 },
];

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
    reserved: Math.max(Number(variant?.reserved_quantity ?? 0), 0),
    available: Math.max(
      Number(
        variant?.available_quantity ??
          variant?.available_stock ??
          Number(variant?.stock_quantity ?? variant?.stock ?? 0) -
            Number(variant?.reserved_quantity ?? 0),
      ),
      0,
    ),
  }));
};

const applyStockUpdateToAdminProduct = (product, payload) => {
  if (!product || !payload) return product;

  const productId = String(payload?.product_id || "").trim();
  const currentProductId = String(product?._id || product?.id || "").trim();
  if (!productId || productId !== currentProductId) {
    return product;
  }

  const nextAvailable = Math.max(Number(payload?.available_stock ?? 0), 0);
  const variantId = String(payload?.variant_id || "").trim();

  if (!variantId) {
    const totalStock = Math.max(
      Number(product?.stock_quantity ?? product?.stock ?? 0),
      0,
    );
    return {
      ...product,
      available_quantity: nextAvailable,
      reserved_quantity: Math.max(totalStock - nextAvailable, 0),
    };
  }

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  let variantChanged = false;
  const nextVariants = variants.map((variant) => {
    const currentVariantId = String(variant?._id || variant?.id || "").trim();
    if (currentVariantId !== variantId) {
      return variant;
    }

    const totalStock = Math.max(
      Number(variant?.stock_quantity ?? variant?.stock ?? 0),
      0,
    );
    const nextVariantAvailable = Math.max(
      Number(payload?.variant_available_stock ?? nextAvailable),
      0,
    );
    variantChanged = true;
    return {
      ...variant,
      available_quantity: nextVariantAvailable,
      reserved_quantity: Math.max(totalStock - nextVariantAvailable, 0),
    };
  });

  if (!variantChanged) {
    return product;
  }

  const totalReserved = nextVariants.reduce(
    (sum, variant) => sum + Math.max(Number(variant?.reserved_quantity ?? 0), 0),
    0,
  );

  return {
    ...product,
    available_quantity: nextAvailable,
    reserved_quantity: totalReserved,
    variants: nextVariants,
  };
};

const ProductsListContent = () => {
  const { token, isAuthenticated, loading } = useAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [fetchError, setFetchError] = useState("");

  useAdminRealtime({
    token,
    onStockUpdate: (payload) => {
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          applyStockUpdateToAdminProduct(product, payload),
        ),
      );
    },
  });

  const fetchCategories = useCallback(async () => {
    try {
      const response = await getData("/api/categories", token);
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }, [token]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setFetchError("");
    try {
      let url = `/api/products?page=${page + 1}&limit=${rowsPerPage}`;
      if (category) url += `&category=${category}`;
      if (search) url += `&search=${search}`;
      if (lowStockOnly) url += `&lowStock=true`;

      const response = await getData(url, token);
      if (response.success) {
        setProducts(response.data || []);
        setTotalProducts(response.totalProducts || 0);
      } else {
        const message = response?.message || "Failed to fetch products";
        setFetchError(message);
        toast.error(message);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
      const message = error?.message || "Failed to fetch products";
      setFetchError(message);
      toast.error(message);
    }
    setIsLoading(false);
  }, [page, rowsPerPage, category, search, lowStockOnly, token]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
      fetchCategories();
    }
  }, [
    isAuthenticated,
    page,
    rowsPerPage,
    category,
    fetchProducts,
    fetchCategories,
  ]);

  useEffect(() => {
    const lowStockParam = searchParams?.get("lowStock");
    setLowStockOnly(lowStockParam === "true");
  }, [searchParams]);

  const handleDeleteProduct = async (productId) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const response = await deleteData(`/api/products/${productId}`, token);
      if (response.success) {
        toast.success("Product deleted successfully");
        fetchProducts();
      } else {
        toast.error(response.message || "Failed to delete product");
      }
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const handleToggleDemand = async (productId, currentStatus) => {
    const newStatus = currentStatus === "HIGH" ? "NORMAL" : "HIGH";
    try {
      const response = await patchData(
        `/api/products/${productId}/demand`,
        { demandStatus: newStatus },
        token,
      );
      if (response.success) {
        toast.success(`Demand status updated to ${newStatus}`);
        fetchProducts();
      } else {
        toast.error(response.message || "Failed to update demand status");
      }
    } catch (error) {
      toast.error("Failed to update demand status");
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleChangeCategory = (event) => {
    setCategory(event.target.value);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleToggleLowStock = () => {
    const next = !lowStockOnly;
    setLowStockOnly(next);
    setPage(0);
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (next) {
      params.set("lowStock", "true");
    } else {
      params.delete("lowStock");
    }
    const queryString = params.toString();
    router.push(`/products-list${queryString ? `?${queryString}` : ""}`);
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <section className="w-full py-3 px-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] text-gray-700 font-[600]">Products</h2>
        <Link href="/products-list/add-product">
          <Button
            className="!bg-blue-600 !text-white !px-4 !py-2 !rounded-md hover:!bg-blue-700"
            size="small"
          >
            Add Product
          </Button>
        </Link>
      </div>

      <div className="w-full p-4 rounded-md shadow-md bg-white mt-3">
          <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
            <div className="col w-[200px]">
              <h6 className="mb-1 text-[14px] text-gray-700">Category By</h6>
            <Select
              value={category}
              onChange={handleChangeCategory}
              displayEmpty
              inputProps={{ "aria-label": "Without label" }}
              size="small"
              className="w-full"
            >
              <MenuItem value="">
                <em>All Categories</em>
              </MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat._id} value={cat._id}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
            </div>

            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-[300px] outline-none focus:border-blue-500"
              />
            </div>
              <Button
                type="submit"
                className="!bg-blue-600 !text-white !px-4 !py-2 !rounded-md"
              >
                Search
              </Button>
            </form>
            <Chip
              label="Low Stock Only"
              onClick={handleToggleLowStock}
              color={lowStockOnly ? "error" : "default"}
              variant={lowStockOnly ? "filled" : "outlined"}
            />
          </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : fetchError ? (
          <div className="text-center py-8 text-red-600">
            <p>{fetchError}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No products found. Add your first product!</p>
          </div>
        ) : (
          <>
            <TableContainer sx={{ width: "100%" }}>
              <Table aria-label="products table">
                <TableHead>
                  <TableRow>
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        align={column.align}
                        style={{ minWidth: column.minWidth }}
                      >
                        {column.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map((product, index) => {
                    const displayImage =
                      product.thumbnail ||
                      product.images?.[0] ||
                      product.image ||
                      "";
                    const variantInventoryLines = getVariantInventoryLines(product);
                    const fallbackStock = Math.max(
                      Number(product.stock_quantity ?? product.stock ?? 0),
                      0,
                    );
                    const fallbackReserved = Math.max(
                      Number(product.reserved_quantity ?? 0),
                      0,
                    );
                    const fallbackAvailable = Math.max(
                      Number(
                        product.available_quantity ??
                          product.available_stock ??
                          fallbackStock - fallbackReserved,
                      ),
                      0,
                    );
                    const lowThreshold = Number(
                      product.low_stock_threshold ??
                        product.lowStockThreshold ??
                        5,
                    );
                    const lowStockVariants = variantInventoryLines.filter(
                      (entry) => entry.available <= lowThreshold,
                    );
                    const isLowStock =
                      variantInventoryLines.length > 0
                        ? lowStockVariants.length > 0
                        : fallbackAvailable <= lowThreshold;
                    const shortId = String(product._id || "")
                      .slice(-8)
                      .toUpperCase();

                    return (
                      <TableRow key={product._id || index}>
                      <TableCell>
                        <span className="font-mono text-xs text-gray-500">
                          {shortId || "N/A"}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="img p-1 bg-white rounded-md w-[50px] h-[70px] overflow-hidden">
                            <img
                              src={getImageUrl(displayImage)}
                              alt="product image"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                if (e.currentTarget.dataset.fallbackApplied) return;
                                e.currentTarget.dataset.fallbackApplied = "true";
                                e.currentTarget.src = ADMIN_PLACEHOLDER_IMAGE;
                              }}
                            />
                          </div>

                          <div className="info">
                            <h3 className="text-[13px] text-gray-800 font-[600]">
                              {product.name?.substring(0, 30)}...
                            </h3>
                            <span className="text-gray-700 text-[13px]">
                              {product.brand}
                            </span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {product.isNewArrival && (
                                <Chip label="New" size="small" color="success" />
                              )}
                              {product.isBestSeller && (
                                <Chip label="Best Seller" size="small" color="warning" />
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>{product.category?.name}</TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-[#CB0000] text-[14px] font-[600]">
                            ₹{product.price}
                          </span>
                          {product.oldPrice && (
                            <span className="text-[#A4A4A4] text-[14px] font-[600] line-through">
                              ₹{product.oldPrice}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {variantInventoryLines.length > 0 ? (
                          <div className="flex flex-col gap-1 py-1">
                            {variantInventoryLines.map((entry) => (
                              <span
                                key={entry.id}
                                className="text-xs font-medium text-gray-700"
                              >
                                {entry.label}: {entry.available} avail / {entry.reserved} reserved / {entry.stock} total
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm font-semibold text-gray-700">
                            {fallbackAvailable} avail / {fallbackReserved} reserved / {fallbackStock} total
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        {isLowStock ? (
                          variantInventoryLines.length > 0 ? (
                            <div className="flex flex-col gap-1 py-1">
                              {lowStockVariants.map((entry) => (
                                <Chip
                                  key={`low-${entry.id}`}
                                  label={`${entry.label} (${entry.stock})`}
                                  color="warning"
                                  size="small"
                                />
                              ))}
                            </div>
                          ) : (
                            <Chip
                              label={`Low (${fallbackStock})`}
                              color="warning"
                              size="small"
                            />
                          )
                        ) : (
                          <Chip label="OK" color="success" size="small" />
                        )}
                      </TableCell>

                      <TableCell>
                        <Chip
                          icon={
                            product.demandStatus === "HIGH" ? (
                              <HiOutlineFire />
                            ) : null
                          }
                          label={
                            product.demandStatus === "HIGH"
                              ? "High Demand"
                              : "Normal"
                          }
                          size="small"
                          color={
                            product.demandStatus === "HIGH"
                              ? "error"
                              : "default"
                          }
                          onClick={() =>
                            handleToggleDemand(
                              product._id,
                              product.demandStatus,
                            )
                          }
                          sx={{ cursor: "pointer" }}
                        />
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={
                            product.isExclusive ? "Members Only" : "Public"
                          }
                          size="small"
                          color={product.isExclusive ? "secondary" : "default"}
                          variant={product.isExclusive ? "filled" : "outlined"}
                        />
                      </TableCell>

                      <TableCell>
                        {Number(product.totalReviews ?? product.reviewCount ?? product.numReviews ?? 0) > 0
                          ? `${Number(product.avgRating ?? product.rating ?? 0).toFixed(1)} (${Number(product.totalReviews ?? product.reviewCount ?? product.numReviews ?? 0)})`
                          : "0.0 (0)"}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Link href={`/products-list/edit/${product._id}`}>
                            <Button className="!w-[40px] !h-[40px] !min-w-[20px] !rounded-full !text-gray-900">
                              <RiEdit2Line size={20} />
                            </Button>
                          </Link>

                          <Link href={`/products-list/${product._id}`}>
                            <Button className="!w-[40px] !h-[40px] !min-w-[20px] !rounded-full !text-gray-900">
                              <IoEyeOutline size={20} />
                            </Button>
                          </Link>

                          <Link href={`/products-list/${product._id}#reviews`}>
                            <Button
                              size="small"
                              variant="outlined"
                              className="!min-w-[78px] !rounded-full"
                            >
                              Reviews
                            </Button>
                          </Link>

                          <Button
                            className="!w-[40px] !h-[40px] !min-w-[20px] !rounded-full !text-red-600"
                            onClick={() => handleDeleteProduct(product._id)}
                          >
                            <FaRegTrashAlt size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={totalProducts}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </div>
    </section>
  );
};

const ProductsList = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <ProductsListContent />
    </Suspense>
  );
};

export default ProductsList;
