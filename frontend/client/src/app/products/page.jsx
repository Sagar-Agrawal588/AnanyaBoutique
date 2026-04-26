"use client";

import ProductItem from "@/components/ProductItem";
import {
    subscribeToStockConnection,
    subscribeToStockUpdates,
} from "@/realtime/stockSocket";
import { fetchDataFromApi } from "@/utils/api";
import { applyStockUpdateToProductCollection } from "@/utils/stockRealtime";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Suspense,
    startTransition,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { FiSearch } from "react-icons/fi";

const PRODUCTS_PER_PAGE = 24;
const FALLBACK_POLL_INTERVAL_MS = 45000;

const ProductsGridSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="aspect-3/4 bg-gray-100 animate-pulse rounded-3xl" />
        ))}
    </div>
);

function ProductsPageContent() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState("");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const searchParams = useSearchParams();
    const router = useRouter();
    const loaderRef = useRef(null);
    const fallbackPollRef = useRef(null);

    // Get search term from URL
    const urlSearchTerm = searchParams.get("search") || searchParams.get("q") || "";
    const urlCategory = searchParams.get("category") || "";
    const urlBestSeller = searchParams.get("bestSeller") === "true";
    const urlNewArrivals = searchParams.get("newArrivals") === "true";
    const urlPriceDrop = searchParams.get("priceDrop") === "true";
    const urlMinDiscount = searchParams.get("minDiscount") || "";
    const [searchTerm, setSearchTerm] = useState(urlSearchTerm);
    const isComboCategory = (category) => {
        const name = String(category?.name || "").toLowerCase();
        const slug = String(category?.slug || "").toLowerCase();
        const comboKeys = [
            "combo-packs",
            "combo-pack",
            "combo-deals",
            "combo-deal",
            "combos",
        ];
        return (
            comboKeys.includes(slug) ||
            name.includes("combo pack") ||
            name.includes("combo packs") ||
            name.includes("combo deal") ||
            name.includes("combo deals")
        );
    };

    useEffect(() => {
        if (!urlCategory) return;
        let isActive = true;
        const checkCategory = async () => {
            try {
                const response = await fetchDataFromApi("/api/categories");
                const list = response?.data || response?.categories || [];
                const match = list.find(
                    (category) =>
                        String(category?._id || category?.id || "") ===
                        String(urlCategory),
                );
                if (match && isComboCategory(match) && isActive) {
                    router.replace("/combo-deals");
                }
            } catch (error) {
                // Best effort redirect only
            }
        };
        checkCategory();
        return () => {
            isActive = false;
        };
    }, [urlCategory, router]);

    // Sync state with URL when URL changes (e.g. from header search)
    useEffect(() => {
        setSearchTerm(urlSearchTerm);
    }, [urlSearchTerm]);

    // Keep URL search param in sync with input (debounced).
    useEffect(() => {
        const currentSearch = String(urlSearchTerm || "").trim();
        const nextSearch = String(searchTerm || "").trim();
        if (currentSearch === nextSearch) return;

        const timeoutId = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (nextSearch) params.set("search", nextSearch);
            else params.delete("search");
            const query = params.toString();
            router.replace(query ? `/products?${query}` : "/products");
        }, 350);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, searchParams, router, urlSearchTerm]);

    const buildQueryString = useCallback((
        targetPage = 1,
        limitOverride = PRODUCTS_PER_PAGE,
    ) => {
        const queryParams = new URLSearchParams();
        if (urlSearchTerm) queryParams.set("search", urlSearchTerm);
        if (urlCategory) queryParams.set("category", urlCategory);
        if (urlBestSeller) queryParams.set("bestSeller", "true");
        if (urlNewArrivals) queryParams.set("newArrivals", "true");
        if (urlPriceDrop) queryParams.set("priceDrop", "true");
        if (urlMinDiscount) queryParams.set("minDiscount", urlMinDiscount);
        queryParams.set("separateVariants", "true");
        queryParams.set("includeCombos", "true");
        queryParams.set("limit", String(limitOverride));
        queryParams.set("page", String(targetPage));
        return queryParams.toString();
    }, [
        urlSearchTerm,
        urlCategory,
        urlBestSeller,
        urlNewArrivals,
        urlPriceDrop,
        urlMinDiscount,
    ]);

    const loadProducts = useCallback(async ({
        targetPage = 1,
        replace = true,
        limitOverride = PRODUCTS_PER_PAGE,
        showLoader = targetPage === 1,
        preserveCurrent = false,
    } = {}) => {
        if (showLoader && targetPage === 1) setLoading(true);
        setFetchError("");
        try {
            const queryString = buildQueryString(targetPage, limitOverride);
            const query = queryString ? `?${queryString}` : "";
            const res = await fetchDataFromApi(`/api/products${query}`, {
                skipCache: true,
            });
            if (res?.error) {
                throw new Error(res?.message || "Failed to load products");
            }

            const productsData = Array.isArray(res) ? res : (res?.products || res?.data || res?.items || []);
            const normalized = productsData.filter((product) => product?.isExclusive !== true);

            setProducts((prev) => {
                const merged = replace ? normalized : [...prev, ...normalized];
                const seen = new Set();
                return merged.filter((product) => {
                    const id = String(product?._id || product?.id || product?.slug || "").trim();
                    if (!id || seen.has(id)) return false;
                    seen.add(id);
                    return true;
                });
            });

            const resolvedTotalProducts = Number(
                res?.totalProducts || normalized.length,
            );
            setTotalProducts(resolvedTotalProducts);
            setPages(
                Math.max(
                    Math.ceil(resolvedTotalProducts / PRODUCTS_PER_PAGE) || 1,
                    1,
                ),
            );
        } catch (error) {
            console.warn("Error loading products:", error?.message || error);
            if (targetPage === 1 && !preserveCurrent) {
                setProducts([]);
                setPages(1);
                setTotalProducts(0);
            }
            setFetchError(
                error?.message ||
                    "Unable to load products right now. Please check API server connectivity.",
            );
        } finally {
            if (showLoader && targetPage === 1) setLoading(false);
        }
    }, [buildQueryString]);

    const syncLoadedProducts = useCallback(() => {
        const loadedItemLimit = Math.max(page, 1) * PRODUCTS_PER_PAGE;
        return loadProducts({
            targetPage: 1,
            replace: true,
            limitOverride: loadedItemLimit,
            showLoader: false,
            preserveCurrent: true,
        });
    }, [loadProducts, page]);

    const stopFallbackPolling = useCallback(() => {
        if (fallbackPollRef.current && typeof window !== "undefined") {
            window.clearInterval(fallbackPollRef.current);
        }
        fallbackPollRef.current = null;
    }, []);

    const startFallbackPolling = useCallback(() => {
        if (typeof window === "undefined" || fallbackPollRef.current) {
            return;
        }

        fallbackPollRef.current = window.setInterval(() => {
            void syncLoadedProducts();
        }, FALLBACK_POLL_INTERVAL_MS);
    }, [syncLoadedProducts]);

    useEffect(() => {
        void loadProducts({ targetPage: page, replace: page === 1 });
    }, [loadProducts, page]);

    useEffect(() => () => {
        stopFallbackPolling();
    }, [stopFallbackPolling]);

    useEffect(() => {
        const unsubscribeStock = subscribeToStockUpdates((payload) => {
            startTransition(() => {
                setProducts((prev) =>
                    applyStockUpdateToProductCollection(prev, payload),
                );
            });
        });

        const unsubscribeConnection = subscribeToStockConnection((event) => {
            if (event?.type === "fallback_active") {
                startFallbackPolling();
                return;
            }

            if (event?.type !== "connected" && event?.type !== "reconnected") {
                return;
            }

            stopFallbackPolling();
            if (event?.type === "reconnected") {
                void syncLoadedProducts();
            }
        });

        return () => {
            unsubscribeStock();
            unsubscribeConnection();
        };
    }, [startFallbackPolling, stopFallbackPolling, syncLoadedProducts]);

    useEffect(() => {
        setPage(1);
        setPages(1);
        setProducts([]);
        setTotalProducts(0);
    }, [urlSearchTerm, urlCategory, urlBestSeller, urlNewArrivals, urlPriceDrop, urlMinDiscount]);

    useEffect(() => {
        if (!loaderRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries[0].isIntersecting) return;
                if (loading) return;
                if (fetchError) return;
                if (page >= pages) return;
                setPage((prev) => prev + 1);
            },
            { rootMargin: "220px" },
        );

        observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [loading, fetchError, page, pages]);

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        const nextSearch = String(searchTerm || "").trim();
        const params = new URLSearchParams(searchParams.toString());
        if (nextSearch) params.set("search", nextSearch);
        else params.delete("search");
        const query = params.toString();
        router.push(query ? `/products?${query}` : "/products");
    };

    return (
        <div className="min-h-screen pb-20 pt-10">
            <div className="container mx-auto px-4">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-2">
                            Our <span className="text-primary">Products</span>
                        </h1>
                        <p className="text-gray-500 font-medium">Explore our premium peanut butter collections</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                        {/* Search Bar */}
                        <form
                            onSubmit={handleSearchSubmit}
                            className="w-full max-w-2xl relative group transition-all duration-500"
                        >
                            <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors text-xl" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-14 pr-8 py-5 bg-white/70 backdrop-blur-md border border-gray-100 rounded-3xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all w-full font-bold text-base shadow-sm"
                            />
                        </form>
                    </div>
                </div>

                {/* Products Grid */}
                {loading ? (
                    <ProductsGridSkeleton />
                ) : fetchError ? (
                    <div className="text-center py-20 bg-red-50/80 backdrop-blur-xl rounded-[40px] border border-red-200">
                        <h3 className="text-xl font-bold text-red-800 mb-2">Unable to load products</h3>
                        <p className="text-red-700">{fetchError}</p>
                        <p className="text-red-600 text-sm mt-2">Start backend API on localhost:8001 or localhost:8000.</p>
                    </div>
                ) : products.length > 0 ? (
                    <div className="space-y-6">
                        <p className="text-sm text-gray-500">
                            Showing {products.length} of {totalProducts || products.length} products
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                            {products.map((product) => (
                                <ProductItem
                                    key={product._id}
                                    product={product}
                                    realtimeManagedExternally
                                />
                            ))}
                        </div>
                        <div ref={loaderRef} />
                        {page < pages ? (
                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => setPage((prev) => prev + 1)}
                                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                                >
                                    Load more products
                                </button>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white/30 backdrop-blur-xl rounded-[40px] border border-dashed border-gray-200">
                        <div className="text-6xl mb-4">🥜</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No products found</h3>
                        <p className="text-gray-500">Try adjusting your search</p>
                    </div>
                )}
            </div>

            {/* Decorative Gradients */}
            <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-100/30 blur-[120px] rounded-full -z-10" />
            <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-100/30 blur-[120px] rounded-full -z-10" />
        </div>
    );
}

export default function ProductsPage() {
    return (
        <Suspense fallback={<ProductsGridSkeleton />}>
            <ProductsPageContent />
        </Suspense>
    );
}
