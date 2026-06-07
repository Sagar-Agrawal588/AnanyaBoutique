"use client";

import ProductItem from "@/components/ProductItem";
import ResponsiveMediaImage from "@/components/ResponsiveMediaImage";
import BrandArtworkFrame from "@/components/brand/BrandArtworkFrame";
import useStorefrontContent from "@/hooks/useStorefrontContent";
import {
    artworkRegistry,
    getArtworkSource,
    getCategoryArtwork,
} from "@/config/visualIdentity";
import {
    categories as siteCategoryDefaults,
    contactConfig,
    getWhatsAppHref,
} from "@/config/siteConfig";
import {
    subscribeToStockConnection,
    subscribeToStockUpdates,
} from "@/realtime/stockSocket";
import { isProductOutOfStock } from "@/utils/productAvailability";
import { fetchDataFromApi } from "@/utils/api";
import { applyStockUpdateToProductCollection } from "@/utils/stockRealtime";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    Suspense,
    startTransition,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ArrowRight,
    Check,
    ChevronDown,
    Filter,
    Heart,
    Home,
    Instagram,
    MessageCircle,
    Search,
    ShieldCheck,
    ShoppingBag,
    SlidersHorizontal,
    Sparkles,
    X,
} from "lucide-react";

const PRODUCTS_PER_PAGE = 8;
const FALLBACK_POLL_INTERVAL_MS = 45000;

const PRICE_FILTERS = [
    { label: "All prices", min: "", max: "" },
    { label: "Under Rs. 500", min: "", max: "500" },
    { label: "Rs. 500 - Rs. 799", min: "500", max: "799" },
    { label: "Rs. 800 and above", min: "800", max: "" },
];

const FLAVOR_FILTERS = [
    { label: "All styles", value: "" },
    { label: "Sarees", value: "saree" },
    { label: "Suits", value: "suit" },
    { label: "Kurtis", value: "kurti" },
    { label: "Jewellery", value: "jewellery" },
    { label: "Accessories", value: "accessories" },
];

const PRODUCT_TYPE_FILTERS = [
    { label: "All items", value: "all" },
    { label: "Products only", value: "product" },
    { label: "Combos only", value: "combo" },
];

const MERCHANDISING_COLLECTION_FILTERS = [
    { label: "All collections", value: "" },
    { label: "Wedding Collection", value: "Wedding Collection" },
    { label: "Festive Collection", value: "Festive Collection" },
    { label: "Daily Wear", value: "Daily Wear" },
    { label: "Party Wear", value: "Party Wear" },
    { label: "New Arrivals", value: "New Arrivals" },
    { label: "Best Sellers", value: "Best Sellers" },
];

const SORT_OPTIONS = [
    { label: "Newest first", sortBy: "createdAt", order: "desc" },
    { label: "Newest combos", sortBy: "newestCombos", order: "desc", productType: "combo" },
    { label: "Most selling", sortBy: "soldCount", order: "desc" },
    { label: "Best sellers", sortBy: "bestSeller", order: "desc" },
    { label: "Price: Low to high", sortBy: "price", order: "asc" },
    { label: "Price: High to low", sortBy: "price", order: "desc" },
];

const TRUST_PILLS = [
    { label: "Founded in 2012", Icon: Sparkles },
    { label: "Family-Owned", Icon: Home },
    { label: "Trusted Boutique", Icon: ShieldCheck },
    { label: "Curated With Love", Icon: Heart },
];

const TRUST_STRIP_ITEMS = [
    "Trusted Since 2012",
    "Secure Checkout",
    "WhatsApp Support",
    "Curated Fashion",
    "Family-Owned Business",
];

const CATEGORY_SHOWCASE = [
    {
        title: "Sarees",
        slug: "sarees",
        aliases: ["saree", "sarees"],
        copy: "Elegant drapes for celebration and everyday grace.",
        palette: "from-[#fbe7ef] via-[#fffdfb] to-[#eee7ff]",
        artworkKey: "categories.sarees",
    },
    {
        title: "Suits",
        slug: "suits",
        aliases: ["suit", "suits"],
        copy: "Coordinated looks for visits, work, and occasions.",
        palette: "from-[#efe7ff] via-[#ffffff] to-[#ffe7f0]",
        artworkKey: "categories.suits",
    },
    {
        title: "Kurtis",
        slug: "kurtis",
        aliases: ["kurti", "kurtis"],
        copy: "Easy daily elegance with boutique detail.",
        palette: "from-[#ffeaf2] via-[#ffffff] to-[#e9f7f0]",
        artworkKey: "categories.kurtis",
    },
    {
        title: "Leggings",
        slug: "leggings",
        aliases: ["legging", "leggings", "bottomwear"],
        copy: "Essential comfort for polished daily styling.",
        palette: "from-[#f7efe6] via-[#ffffff] to-[#e7f3ff]",
        artworkKey: "categories.leggings",
    },
    {
        title: "Cosmetics",
        slug: "cosmetics",
        aliases: ["cosmetic", "cosmetics", "beauty"],
        copy: "Beauty essentials for the final glow.",
        palette: "from-[#fff1f1] via-[#ffffff] to-[#f1ecff]",
        artworkKey: "categories.cosmetics",
    },
    {
        title: "Artificial Jewellery",
        slug: "artificial-jewellery",
        aliases: ["artificial-jewellery", "artificial jewellery", "jewellery", "jewelry"],
        copy: "Statement details and delicate finishing pieces.",
        palette: "from-[#fff4db] via-[#ffffff] to-[#ffe7ef]",
        artworkKey: "categories.artificial-jewellery",
    },
    {
        title: "Fashion Accessories",
        slug: "fashion-accessories",
        aliases: ["fashion-accessories", "fashion accessories", "accessory", "accessories"],
        copy: "Finishing touches for every outfit story.",
        palette: "from-[#ffeaf2] via-[#ffffff] to-[#f1ecff]",
        artworkKey: "categories.fashion-accessories",
    },
];

const INSTAGRAM_PLACEHOLDERS = [
    "New Arrivals",
    "Saree Edits",
    "Jewellery Details",
    "Beauty Picks",
    "Boutique Moments",
    "Customer Love",
];

const COLLECTION_WHATSAPP_MESSAGE =
    "Hi Ananya Boutique, I would like to chat about your collection.";
const WHATSAPP_COLLECTION_HREF = getWhatsAppHref(COLLECTION_WHATSAPP_MESSAGE);

const normalizeKey = (value = "") =>
    String(value || "")
        .trim()
        .toLowerCase()
        .replace(/['`]/g, "")
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

const flattenCategories = (list = []) => {
    const result = [];
    const visit = (items = []) => {
        items.forEach((item) => {
            if (!item) return;
            result.push(item);
            if (Array.isArray(item.subcategories)) visit(item.subcategories);
            if (Array.isArray(item.children)) visit(item.children);
        });
    };
    visit(Array.isArray(list) ? list : []);
    return result;
};

const getCategoryIdentifier = (category, fallback = "") =>
    String(category?._id || category?.id || category?.slug || fallback || "").trim();

const getProductCategoryKeys = (product) => {
    const category = product?.category;
    if (!category) return [];
    if (typeof category === "object") {
        return [
            category._id,
            category.id,
            category.slug,
            category.name,
        ].filter(Boolean).map(normalizeKey);
    }
    return [normalizeKey(category)];
};

const formatCountLabel = (count = 0) => {
    const normalized = Number(count || 0);
    if (!Number.isFinite(normalized) || normalized <= 0) return "Explore edit";
    return `${normalized} ${normalized === 1 ? "product" : "products"}`;
};

function CategoryArtworkSurface({ item }) {
    const bannerImage = String(item?.bannerImage || "").trim();
    if (bannerImage) {
        return (
            <ResponsiveMediaImage
                desktopSrc={bannerImage}
                mobileSrc={bannerImage}
                alt={item.title}
                className="absolute inset-0"
                imgClassName="object-cover transition duration-500 group-hover:scale-[1.04]"
                desktopProfile="card"
                mobileProfile="card"
                loading="lazy"
                fetchPriority="auto"
            />
        );
    }

    const artwork = getCategoryArtwork(item.slug || item.title, "card");
    const desktopSrc = getArtworkSource(artwork, "desktop");
    const mobileSrc = getArtworkSource(artwork, "mobile") || desktopSrc;

    if (desktopSrc || mobileSrc) {
        return (
            <ResponsiveMediaImage
                desktopSrc={desktopSrc}
                mobileSrc={mobileSrc}
                alt={artwork.alt || item.title}
                className="absolute inset-0"
                imgClassName="transition duration-500 group-hover:scale-[1.04]"
                desktopProfile={artwork.variants?.desktop?.profile || "card"}
                mobileProfile={artwork.variants?.mobile?.profile || "card"}
                loading="lazy"
                fetchPriority="auto"
            />
        );
    }

    return (
        <>
            <span className="absolute inset-4 rounded-lg border border-white/75" />
            <span className="absolute left-6 top-6 h-24 w-16 rounded-t-full rounded-b-lg bg-white/82 shadow-lg transition duration-500 group-hover:-translate-y-1" />
            <span className="absolute bottom-6 left-12 h-28 w-24 rounded-lg bg-[#f8d7e7]/80 shadow-lg transition duration-500 group-hover:translate-x-1" />
            <span className="absolute right-8 top-8 h-32 w-24 rounded-t-full rounded-b-lg bg-white/88 shadow-xl transition duration-500 group-hover:translate-y-1" />
            <span className="absolute bottom-8 right-14 h-16 w-16 rounded-lg border border-[#d8b46b]/45 bg-[#fff8e8]/90 shadow-lg" />
        </>
    );
}

const ProductsGridSkeleton = () => (
    <div className="grid grid-cols-2 gap-3.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-[18px] bg-[#efe8e1] sm:aspect-[4/5] sm:rounded-[22px]" />
        ))}
    </div>
);

function CollectionHero() {
    return (
        <section className="border-b border-[#eadfe6] bg-[linear-gradient(135deg,#fff8f1_0%,#fffdfb_43%,#f4ecff_100%)]">
            <div className="container mx-auto grid gap-7 px-4 py-8 sm:py-12 lg:grid-cols-[1fr_0.88fr] lg:items-center lg:py-16">
                <div className="max-w-3xl">
                    <div className="flex flex-wrap gap-2">
                        {TRUST_PILLS.map(({ label, Icon }) => (
                            <span
                                key={label}
                                className="inline-flex items-center gap-2 rounded-full border border-[#ead3df] bg-white/82 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b244d] shadow-sm sm:text-xs"
                            >
                                <Icon className="h-3.5 w-3.5 text-[#b7791f]" aria-hidden="true" />
                                {label}
                            </span>
                        ))}
                    </div>

                    <h1 className="brand-story-heading mt-6 max-w-3xl text-[3.25rem] font-semibold leading-[0.92] text-[#2f1325] sm:text-6xl lg:text-7xl">
                        Discover Your Style
                    </h1>
                    <p className="mt-5 max-w-2xl text-[15px] font-medium leading-7 text-[#6c4b5d] sm:text-lg">
                        Fashion selected with love, trust, and years of dedication.
                    </p>

                    <a
                        href="#collection-products"
                        className="mt-8 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-[18px] bg-[#2f1325] px-7 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_22px_55px_rgba(47,19,37,0.28)] transition hover:-translate-y-0.5 hover:bg-[#4b1f3a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f1325] sm:w-auto sm:rounded-lg"
                    >
                        <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                        Shop Collection
                    </a>
                </div>

                <BrandArtworkFrame
                    artwork={artworkRegistry.homepage.heroDesktop}
                    aspect="hero"
                    icon={Sparkles}
                    label="Artwork Placeholder"
                    motionEnabled={false}
                    className="rounded-[28px] shadow-[0_24px_70px_rgba(47,19,37,0.16)] sm:rounded-lg"
                />
            </div>
        </section>
    );
}

function FounderMessage() {
    return (
        <section className="bg-white">
            <div className="container mx-auto px-4 py-8 sm:py-10">
                <div className="grid gap-5 border-y border-[#eadfe6] py-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                    <p className="brand-story-heading text-3xl font-semibold leading-tight text-[#2f1325] sm:text-4xl">
                        Every purchase supports a dream that began inside a home.
                    </p>
                    <p className="text-base font-medium leading-8 text-[#60485a] sm:text-lg">
                        Ananya Boutique was built by a homemaker with a passion for fashion and a commitment to serving women with care and honesty.
                    </p>
                </div>
            </div>
        </section>
    );
}

function CategoryShowcase({ items, onExplore }) {
    return (
        <section className="bg-[#fffdfb]">
            <div className="container mx-auto px-4 py-10 sm:py-12">
                <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9d6b19]">
                            Boutique Categories
                        </p>
                        <h2 className="brand-story-heading mt-2 text-3xl font-semibold text-[#2f1325] sm:text-4xl">
                            Premium Category Showcase
                        </h2>
                    </div>
                    <p className="max-w-xl text-sm font-medium leading-6 text-[#6c4b5d]">
                        Explore curated edits across fashion, beauty, and finishing touches.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                        <article
                            key={item.title}
                            className="group overflow-hidden rounded-lg border border-[#eadfe6] bg-white shadow-[0_16px_45px_rgba(47,19,37,0.08)] transition hover:-translate-y-1 hover:border-[#d8b46b] hover:shadow-[0_24px_60px_rgba(47,19,37,0.13)]"
                        >
                            <button
                                type="button"
                                onClick={() => onExplore(item)}
                                className={`relative block aspect-[16/11] w-full overflow-hidden bg-gradient-to-br ${item.palette} text-left`}
                            >
                                <CategoryArtworkSurface item={item} />
                                <span className="absolute right-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/86 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#6b244d]">
                                    {formatCountLabel(item.productCount)}
                                </span>
                            </button>
                            <div className="flex items-center justify-between gap-4 p-4">
                                <div>
                                    <h3 className="text-lg font-black text-[#2f1325]">
                                        {item.title}
                                    </h3>
                                    <p className="mt-1 text-sm font-semibold text-[#806574]">
                                        {item.copy}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onExplore(item)}
                                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#ead3df] bg-white px-3 text-xs font-black uppercase tracking-[0.12em] text-[#6b244d] transition hover:border-[#d8b46b] hover:text-[#2f1325]"
                                >
                                    Explore
                                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

function TrustStrip() {
    return (
        <section className="border-y border-[#eadfe6] bg-[#2f1325] text-white">
            <div className="container mx-auto grid gap-3 px-4 py-5 sm:grid-cols-2 lg:grid-cols-5">
                {TRUST_STRIP_ITEMS.map((item) => (
                    <div
                        key={item}
                        className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/10 px-3 py-3 text-sm font-bold"
                    >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#e8c67a] text-[#2f1325]">
                            <Check className="h-4 w-4" aria-hidden="true" />
                        </span>
                        {item}
                    </div>
                ))}
            </div>
        </section>
    );
}

function InstagramShowcase() {
    return (
        <section className="bg-white">
            <div className="container mx-auto px-4 py-10 sm:py-12">
                <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9d6b19]">
                            Instagram
                        </p>
                        <h2 className="brand-story-heading mt-2 text-3xl font-semibold text-[#2f1325] sm:text-4xl">
                            Follow Our Journey
                        </h2>
                    </div>
                    <a
                        href={contactConfig.instagramUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#ead3df] bg-[#fff8fb] px-4 text-sm font-black text-[#6b244d] transition hover:border-[#d8b46b] hover:bg-white"
                    >
                        <Instagram className="h-4 w-4" aria-hidden="true" />
                        {contactConfig.instagramHandle}
                    </a>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                    {INSTAGRAM_PLACEHOLDERS.map((item, index) => (
                        <a
                            key={item}
                            href={contactConfig.instagramUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="group relative aspect-[4/5] overflow-hidden rounded-lg border border-[#eadfe6] bg-[linear-gradient(135deg,#fff8f1_0%,#fff_48%,#f1ecff_100%)] shadow-[0_14px_35px_rgba(47,19,37,0.08)]"
                        >
                            <span className="absolute inset-3 rounded-lg border border-white/80" />
                            <span className="absolute left-5 top-5 h-16 w-12 rounded-t-full rounded-b-lg bg-white/88 shadow-md transition group-hover:-translate-y-1" />
                            <span className="absolute bottom-6 right-5 h-20 w-14 rounded-lg bg-[#f8d7e7]/80 shadow-md transition group-hover:translate-y-1" />
                            <span className="absolute inset-x-3 bottom-3 rounded-md bg-white/88 px-3 py-2 text-xs font-black text-[#2f1325] shadow-sm">
                                {String(index + 1).padStart(2, "0")} / {item}
                            </span>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}

function FinalCollectionCta() {
    return (
        <section className="bg-[linear-gradient(135deg,#2f1325_0%,#4b1f3a_58%,#7c2d62_100%)] text-white">
            <div className="container mx-auto grid gap-6 px-4 py-10 sm:py-12 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="max-w-3xl">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e8c67a]">
                        Ananya Boutique
                    </p>
                    <h2 className="brand-story-heading mt-3 text-4xl font-semibold text-white sm:text-5xl">
                        Fashion Chosen With Care
                    </h2>
                    <p className="mt-4 text-base font-medium leading-7 text-white/82 sm:text-lg">
                        Every product in our collection is selected with the same care and attention we would choose for our own family.
                    </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                    <a
                        href="#collection-products"
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-black uppercase tracking-[0.14em] text-[#2f1325] transition hover:-translate-y-0.5 hover:bg-[#fff8e8]"
                    >
                        <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                        Explore Collection
                    </a>
                    <a
                        href={WHATSAPP_COLLECTION_HREF}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-5 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:bg-white/20"
                    >
                        <MessageCircle className="h-4 w-4" aria-hidden="true" />
                        Chat on WhatsApp
                    </a>
                </div>
            </div>
        </section>
    );
}

function ProductsPageContent() {
    const { content: storefrontContent } = useStorefrontContent();
    const categoryBannerSlots =
        storefrontContent?.mediaSlots?.categoryBanners || {};
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [fetchError, setFetchError] = useState("");
    const [paginationError, setPaginationError] = useState("");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [showSort, setShowSort] = useState(false);
    const [categories, setCategories] = useState(siteCategoryDefaults);
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const loaderRef = useRef(null);
    const fallbackPollRef = useRef(null);
    const latestLoadRequestRef = useRef(0);
    const loadingMoreRef = useRef(false);

    // Get search term from URL
    const urlSearchTerm = searchParams.get("search") || searchParams.get("q") || "";
    const urlCategory = searchParams.get("category") || "";
    const urlCollection = searchParams.get("collection") || "";
    const urlFeatured = searchParams.get("featured") === "true";
    const urlBestSeller = searchParams.get("bestSeller") === "true";
    const urlNewArrivals = searchParams.get("newArrivals") === "true";
    const urlPriceDrop = searchParams.get("priceDrop") === "true";
    const urlMinDiscount = searchParams.get("minDiscount") || "";
    const urlMinPrice = searchParams.get("minPrice") || "";
    const urlMaxPrice = searchParams.get("maxPrice") || "";
    const urlFlavor = searchParams.get("flavor") || "";
    const urlProductType = searchParams.get("productType") || "all";
    const urlSortBy = searchParams.get("sortBy") || "createdAt";
    const urlOrder = searchParams.get("order") || "desc";
    const [searchTerm, setSearchTerm] = useState(urlSearchTerm);
    const [activeSearchTerm, setActiveSearchTerm] = useState(urlSearchTerm);
    const lastAppliedUrlSearchRef = useRef(urlSearchTerm);
    const pendingUrlSearchRef = useRef(null);
    const legacyProductSlug = useMemo(() => {
        const match = String(pathname || "").match(/^\/products\/([^/?#]+)\/?$/);
        return match?.[1] ? decodeURIComponent(match[1]) : "";
    }, [pathname]);
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
        let isActive = true;
        const loadCategories = async () => {
            try {
                const response = await fetchDataFromApi("/api/categories", {
                    cacheTtlMs: 300000,
                });
                const list = response?.data || response?.categories || [];
                if (isActive && Array.isArray(list) && list.length > 0) {
                    setCategories(list);
                }
            } catch (error) {
                // Keep local category defaults if the public category API is unavailable.
            }
        };

        void loadCategories();
        return () => {
            isActive = false;
        };
    }, []);

    useEffect(() => {
        if (legacyProductSlug) {
            router.replace(`/product/${encodeURIComponent(legacyProductSlug)}`);
            return;
        }

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
    }, [legacyProductSlug, urlCategory, router]);

    // Sync state with URL when URL changes (e.g. from header search).
    // Ignore URL writes started by this input so delayed route updates cannot
    // replace newer letters while the user is typing quickly.
    useEffect(() => {
        const normalizedUrlSearch = String(urlSearchTerm || "").trim();

        if (pendingUrlSearchRef.current === normalizedUrlSearch) {
            pendingUrlSearchRef.current = null;
            lastAppliedUrlSearchRef.current = normalizedUrlSearch;
            return;
        }

        if (lastAppliedUrlSearchRef.current === normalizedUrlSearch) return;

        lastAppliedUrlSearchRef.current = normalizedUrlSearch;
        setSearchTerm(normalizedUrlSearch);
        setActiveSearchTerm(normalizedUrlSearch);
    }, [urlSearchTerm]);

    // Keep results and URL search param in sync with input (debounced).
    useEffect(() => {
        const nextSearch = String(searchTerm || "").trim();

        const timeoutId = setTimeout(() => {
            setActiveSearchTerm((current) =>
                current === nextSearch ? current : nextSearch,
            );

            const currentSearch = String(urlSearchTerm || "").trim();
            if (currentSearch === nextSearch) return;

            const params = new URLSearchParams(searchParams.toString());
            if (nextSearch) params.set("search", nextSearch);
            else params.delete("search");
            const query = params.toString();
            pendingUrlSearchRef.current = nextSearch;
            startTransition(() => {
                router.replace(query ? `/products?${query}` : "/products", {
                    scroll: false,
                });
            });
        }, 250);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, searchParams, router, urlSearchTerm]);

    const buildQueryString = useCallback((
        targetPage = 1,
        limitOverride = PRODUCTS_PER_PAGE,
    ) => {
        const queryParams = new URLSearchParams();
        if (activeSearchTerm) queryParams.set("search", activeSearchTerm);
        if (urlCategory) queryParams.set("category", urlCategory);
        if (urlCollection) queryParams.set("collection", urlCollection);
        if (urlFeatured) queryParams.set("featured", "true");
        if (urlBestSeller) queryParams.set("bestSeller", "true");
        if (urlNewArrivals) queryParams.set("newArrivals", "true");
        if (urlPriceDrop) queryParams.set("priceDrop", "true");
        if (urlMinDiscount) queryParams.set("minDiscount", urlMinDiscount);
        if (urlMinPrice) queryParams.set("minPrice", urlMinPrice);
        if (urlMaxPrice) queryParams.set("maxPrice", urlMaxPrice);
        if (urlFlavor) queryParams.set("flavor", urlFlavor);
        if (urlProductType && urlProductType !== "all") {
            queryParams.set("productType", urlProductType);
        }
        queryParams.set("sortBy", urlSortBy);
        queryParams.set("order", urlOrder);
        queryParams.set("separateVariants", "true");
        queryParams.set("includeCombos", "true");
        queryParams.set("limit", String(limitOverride));
        queryParams.set("page", String(targetPage));
        return queryParams.toString();
    }, [
        activeSearchTerm,
        urlCategory,
        urlCollection,
        urlFeatured,
        urlBestSeller,
        urlNewArrivals,
        urlPriceDrop,
        urlMinDiscount,
        urlMinPrice,
        urlMaxPrice,
        urlFlavor,
        urlProductType,
        urlSortBy,
        urlOrder,
    ]);

    const loadProducts = useCallback(async ({
        targetPage = 1,
        replace = true,
        limitOverride = PRODUCTS_PER_PAGE,
        showLoader = targetPage === 1,
        preserveCurrent = false,
        skipCache = false,
    } = {}) => {
        if (targetPage > 1 && loadingMoreRef.current) return;
        const requestId = latestLoadRequestRef.current + 1;
        latestLoadRequestRef.current = requestId;
        if (showLoader && targetPage === 1) setLoading(true);
        if (targetPage > 1) {
            loadingMoreRef.current = true;
            setLoadingMore(true);
        }
        if (targetPage === 1) setFetchError("");
        setPaginationError("");
        try {
            const queryString = buildQueryString(targetPage, limitOverride);
            const query = queryString ? `?${queryString}` : "";
            const res = await fetchDataFromApi(`/api/products${query}`, {
                skipCache,
            });
            if (res?.error) {
                throw new Error(res?.message || "Failed to load products");
            }

            const productsData = Array.isArray(res) ? res : (res?.products || res?.data || res?.items || []);
            const normalized = productsData.filter((product) => product?.isExclusive !== true);

            if (requestId !== latestLoadRequestRef.current) return;

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
            const resolvedTotalPages = Number(
                res?.totalPages || res?.pages || 0,
            );
            setTotalProducts(resolvedTotalProducts);
            setPages(
                Math.max(
                    resolvedTotalPages ||
                        Math.ceil(resolvedTotalProducts / limitOverride) ||
                        targetPage,
                    1,
                ),
            );
            setPage(Number(res?.currentPage || targetPage) || targetPage);
        } catch (error) {
            if (requestId !== latestLoadRequestRef.current) return;

            console.warn("Error loading products:", error?.message || error);
            if (targetPage > 1) {
                setPaginationError(
                    error?.message ||
                        "Unable to load more products right now. Please try again.",
                );
            } else if (!preserveCurrent) {
                setProducts([]);
                setPages(1);
                setTotalProducts(0);
                setFetchError(
                    error?.message ||
                        "Unable to load products right now. Please check API server connectivity.",
                );
            }
        } finally {
            if (
                requestId === latestLoadRequestRef.current &&
                showLoader &&
                targetPage === 1
            ) {
                setLoading(false);
            }
            if (targetPage > 1) {
                loadingMoreRef.current = false;
            }
            if (requestId === latestLoadRequestRef.current && targetPage > 1) {
                setLoadingMore(false);
            }
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
            skipCache: true,
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
        if (legacyProductSlug) return;
        loadingMoreRef.current = false;
        setLoadingMore(false);
        setPage(1);
        setPages(1);
        setProducts([]);
        setTotalProducts(0);
        setPaginationError("");
        void loadProducts({ targetPage: 1, replace: true });
    }, [legacyProductSlug, loadProducts]);

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

    const loadNextPage = useCallback(() => {
        if (loading || loadingMoreRef.current || fetchError) return;
        if (page >= pages) return;
        void loadProducts({
            targetPage: page + 1,
            replace: false,
            showLoader: false,
        });
    }, [fetchError, loadProducts, loading, page, pages]);

    useEffect(() => {
        if (!loaderRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries[0].isIntersecting) return;
                loadNextPage();
            },
            { rootMargin: "360px 0px" },
        );

        observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [loadNextPage]);

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        const nextSearch = String(searchTerm || "").trim();
        setActiveSearchTerm(nextSearch);
        const params = new URLSearchParams(searchParams.toString());
        if (nextSearch) params.set("search", nextSearch);
        else params.delete("search");
        const query = params.toString();
        pendingUrlSearchRef.current = nextSearch;
        router.push(query ? `/products?${query}` : "/products", {
            scroll: false,
        });
    };

    const replaceProductsParams = useCallback((updates = {}) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            const normalized = String(value ?? "").trim();
            if (!normalized || normalized === "all") {
                params.delete(key);
            } else {
                params.set(key, normalized);
            }
        });
        const query = params.toString();
        router.replace(query ? `/products?${query}` : "/products", {
            scroll: false,
        });
    }, [router, searchParams]);

    const applyPriceFilter = (priceFilter) => {
        replaceProductsParams({
            minPrice: priceFilter.min,
            maxPrice: priceFilter.max,
        });
    };

    const applySortOption = (option) => {
        replaceProductsParams({
            sortBy: option.sortBy,
            order: option.order,
            productType: option.productType || "",
        });
        setShowSort(false);
    };

    const clearFilters = () => {
        replaceProductsParams({
            minPrice: "",
            maxPrice: "",
            flavor: "",
            productType: "",
            collection: "",
            featured: "",
            bestSeller: "",
            newArrivals: "",
            priceDrop: "",
            minDiscount: "",
            category: "",
        });
    };

    const activePriceLabel =
        PRICE_FILTERS.find(
            (item) => item.min === urlMinPrice && item.max === urlMaxPrice,
        )?.label || "Custom price";
    const activeFlavorLabel =
        FLAVOR_FILTERS.find((item) => item.value === urlFlavor)?.label ||
        "All styles";
    const activeProductTypeLabel =
        PRODUCT_TYPE_FILTERS.find((item) => item.value === urlProductType)
            ?.label || "All items";
    const activeCollectionLabel =
        MERCHANDISING_COLLECTION_FILTERS.find((item) => item.value === urlCollection)
            ?.label || "All collections";
    const activeSortLabel =
        SORT_OPTIONS.find(
            (item) => item.sortBy === urlSortBy && item.order === urlOrder,
        )?.label || "Newest first";
    const activeFilterCount = [
        urlMinPrice || urlMaxPrice,
        urlFlavor,
        urlProductType !== "all" ? urlProductType : "",
        urlCollection,
        urlFeatured ? "featured" : "",
        urlBestSeller ? "bestSeller" : "",
        urlNewArrivals ? "newArrivals" : "",
        urlPriceDrop ? "priceDrop" : "",
        urlCategory,
    ].filter(Boolean).length;
    const flatCategoryList = useMemo(
        () => flattenCategories(categories),
        [categories],
    );
    const showcaseCategories = useMemo(() => {
        return CATEGORY_SHOWCASE.map((item) => {
            const aliasKeys = item.aliases.map(normalizeKey);
            const matchedCategory = flatCategoryList.find((category) => {
                const categoryKeys = [
                    category?._id,
                    category?.id,
                    category?.slug,
                    category?.name,
                ].filter(Boolean).map(normalizeKey);

                return aliasKeys.some((alias) =>
                    categoryKeys.some((key) =>
                        key === alias ||
                        key.includes(alias) ||
                        alias.includes(key),
                    ),
                );
            });
            const matchedKeys = [
                matchedCategory?._id,
                matchedCategory?.id,
                matchedCategory?.slug,
                matchedCategory?.name,
                item.slug,
                item.title,
            ].filter(Boolean).map(normalizeKey);
            const loadedCount = products.filter((product) => {
                const productCategoryKeys = getProductCategoryKeys(product);
                if (
                    productCategoryKeys.some((key) =>
                        matchedKeys.some((matchedKey) => key === matchedKey),
                    )
                ) {
                    return true;
                }

                const productName = normalizeKey(product?.name);
                const productTags = Array.isArray(product?.tags)
                    ? product.tags.map(normalizeKey)
                    : [];
                return aliasKeys.some(
                    (alias) =>
                        productName.includes(alias) ||
                        productTags.some((tag) => tag.includes(alias)),
                );
            }).length;
            const apiCount = Number(
                matchedCategory?.productCount ??
                    matchedCategory?.productsCount ??
                    matchedCategory?.count ??
                    0,
            );

            return {
                ...item,
                category: matchedCategory,
                categoryIdentifier: getCategoryIdentifier(
                    matchedCategory,
                    item.slug,
                ),
                copy: matchedCategory?.description || item.copy,
                bannerImage:
                    categoryBannerSlots[item.slug] ||
                    categoryBannerSlots[matchedCategory?.slug] ||
                    matchedCategory?.image ||
                    "",
                productCount:
                    Number.isFinite(apiCount) && apiCount > 0
                        ? apiCount
                        : loadedCount,
            };
        });
    }, [categoryBannerSlots, flatCategoryList, products]);
    const {
        productItems,
        outOfStockProductItems,
        comboItems,
        outOfStockComboItems,
    } = useMemo(() => {
        const nextProductItems = [];
        const nextOutOfStockProductItems = [];
        const nextComboItems = [];
        const nextOutOfStockComboItems = [];

        products.forEach((product) => {
            const isComboItem = String(product?.itemType || "") === "combo";
            const isOutOfStock = isProductOutOfStock(product);

            if (isComboItem) {
                if (isOutOfStock) {
                    nextOutOfStockComboItems.push(product);
                    return;
                }

                nextComboItems.push(product);
                return;
            }

            if (isOutOfStock) {
                nextOutOfStockProductItems.push(product);
                return;
            }

            nextProductItems.push(product);
        });

        return {
            productItems: nextProductItems,
            outOfStockProductItems: nextOutOfStockProductItems,
            comboItems: nextComboItems,
            outOfStockComboItems: nextOutOfStockComboItems,
        };
    }, [products]);
    const drawerMode = showSort ? "sort" : "filters";
    const isDrawerOpen = showFilters || showSort;
    const closeDrawer = useCallback(() => {
        setShowFilters(false);
        setShowSort(false);
    }, []);
    const handleCategoryExplore = useCallback((item) => {
        replaceProductsParams({
            category: item.categoryIdentifier || item.slug,
            flavor: "",
        });
        window.requestAnimationFrame(() => {
            document
                .getElementById("collection-products")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }, [replaceProductsParams]);

    useEffect(() => {
        if (!isDrawerOpen || typeof document === "undefined") return undefined;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleEscape = (event) => {
            if (event.key === "Escape") closeDrawer();
        };

        document.addEventListener("keydown", handleEscape);
        return () => {
            document.body.style.overflow = originalOverflow;
            document.removeEventListener("keydown", handleEscape);
        };
    }, [closeDrawer, isDrawerOpen]);

    return (
        <div className="min-h-screen bg-[#fffdfb] pb-0">
            <CollectionHero />
            <FounderMessage />
            <CategoryShowcase
                items={showcaseCategories}
                onExplore={handleCategoryExplore}
            />

            <section
                id="collection-products"
                className="scroll-mt-[calc(var(--header-height,118px)+28px)] border-t border-[#eadfe6] bg-[linear-gradient(180deg,#fffdfb_0%,#fff8fb_44%,#ffffff_100%)]"
            >
                <div className="sticky top-[calc(var(--header-height,118px)-1px)] z-40 border-b border-[#eadfe6] bg-white/94 shadow-[0_16px_40px_rgba(47,19,37,0.08)] backdrop-blur-xl">
                    <div className="container mx-auto px-3 py-3 sm:px-4">
                        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-center">
                            <form
                                onSubmit={handleSearchSubmit}
                                className="group relative min-w-0"
                            >
                                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9b7b8d] transition-colors group-focus-within:text-[#7c2d62]" />
                                <input
                                    type="text"
                                    placeholder="Search the collection"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-12 w-full rounded-[18px] border border-[#ead3df] bg-[#fffdfb] pl-12 pr-4 text-sm font-bold text-[#2f1325] shadow-sm outline-none transition placeholder:text-[#a68c9d] focus:border-[#7c2d62] focus:ring-4 focus:ring-[#f8d7e7]/55 sm:h-[52px] sm:rounded-lg"
                                />
                            </form>

                            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowFilters(true);
                                        setShowSort(false);
                                    }}
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-[#ead3df] bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-[#2f1325] shadow-sm transition hover:border-[#d8b46b] hover:text-[#7c2d62] active:scale-[0.98] sm:h-12 sm:rounded-lg sm:text-sm"
                                >
                                    <Filter className="h-4 w-4" />
                                    Filters
                                    {activeFilterCount > 0 ? (
                                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#7c2d62] px-1.5 text-xs text-white">
                                            {activeFilterCount}
                                        </span>
                                    ) : null}
                                    <ChevronDown className="h-4 w-4 text-[#9b7b8d]" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowSort(true);
                                        setShowFilters(false);
                                    }}
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-[#ead3df] bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-[#2f1325] shadow-sm transition hover:border-[#d8b46b] hover:text-[#7c2d62] active:scale-[0.98] sm:h-12 sm:rounded-lg sm:text-sm"
                                >
                                    <SlidersHorizontal className="h-4 w-4" />
                                    Sort
                                    <ChevronDown className="h-4 w-4 text-[#9b7b8d]" />
                                </button>
                            </div>
                        </div>

                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            <button
                                type="button"
                                onClick={() => replaceProductsParams({ category: "", flavor: "" })}
                                className={`h-9 shrink-0 rounded-full border px-4 text-xs font-black uppercase tracking-[0.12em] transition ${
                                    !urlCategory && !urlFlavor
                                        ? "border-[#2f1325] bg-[#2f1325] text-white"
                                        : "border-[#ead3df] bg-[#fff8fb] text-[#6b244d] hover:border-[#d8b46b]"
                                }`}
                            >
                                All
                            </button>
                            {showcaseCategories.map((item) => {
                                const activeCategoryKeys = [
                                    item.categoryIdentifier,
                                    item.slug,
                                    item.category?.slug,
                                    item.category?.name,
                                ].filter(Boolean).map(normalizeKey);
                                const isActive = activeCategoryKeys.includes(
                                    normalizeKey(urlCategory),
                                );

                                return (
                                    <button
                                        key={`chip-${item.title}`}
                                        type="button"
                                        onClick={() => handleCategoryExplore(item)}
                                        className={`h-9 shrink-0 rounded-full border px-4 text-xs font-black uppercase tracking-[0.12em] transition ${
                                            isActive
                                                ? "border-[#2f1325] bg-[#2f1325] text-white"
                                                : "border-[#ead3df] bg-[#fff8fb] text-[#6b244d] hover:border-[#d8b46b]"
                                        }`}
                                    >
                                        {item.title}
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() =>
                                    replaceProductsParams({
                                        featured: urlFeatured ? "" : "true",
                                    })
                                }
                                className={`h-9 shrink-0 rounded-full border px-4 text-xs font-black uppercase tracking-[0.12em] transition ${
                                    urlFeatured
                                        ? "border-[#2f1325] bg-[#2f1325] text-white"
                                        : "border-[#ead3df] bg-white text-[#6b244d] hover:border-[#d8b46b]"
                                }`}
                            >
                                Featured
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    replaceProductsParams({
                                        newArrivals:
                                            urlNewArrivals || urlCollection === "New Arrivals"
                                                ? ""
                                                : "true",
                                        collection:
                                            urlNewArrivals || urlCollection === "New Arrivals"
                                                ? ""
                                                : "New Arrivals",
                                    })
                                }
                                className={`h-9 shrink-0 rounded-full border px-4 text-xs font-black uppercase tracking-[0.12em] transition ${
                                    urlNewArrivals || urlCollection === "New Arrivals"
                                        ? "border-[#2f1325] bg-[#2f1325] text-white"
                                        : "border-[#ead3df] bg-white text-[#6b244d] hover:border-[#d8b46b]"
                                }`}
                            >
                                New Arrivals
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    replaceProductsParams({
                                        bestSeller:
                                            urlBestSeller || urlCollection === "Best Sellers"
                                                ? ""
                                                : "true",
                                        collection:
                                            urlBestSeller || urlCollection === "Best Sellers"
                                                ? ""
                                                : "Best Sellers",
                                    })
                                }
                                className={`h-9 shrink-0 rounded-full border px-4 text-xs font-black uppercase tracking-[0.12em] transition ${
                                    urlBestSeller || urlCollection === "Best Sellers"
                                        ? "border-[#2f1325] bg-[#2f1325] text-white"
                                        : "border-[#ead3df] bg-white text-[#6b244d] hover:border-[#d8b46b]"
                                }`}
                            >
                                Best Sellers
                            </button>
                            {MERCHANDISING_COLLECTION_FILTERS.filter(
                                (item) =>
                                    item.value &&
                                    !["New Arrivals", "Best Sellers"].includes(item.value),
                            ).map((item) => (
                                <button
                                    key={`collection-chip-${item.value}`}
                                    type="button"
                                    onClick={() =>
                                        replaceProductsParams({
                                            collection:
                                                urlCollection === item.value ? "" : item.value,
                                        })
                                    }
                                    className={`h-9 shrink-0 rounded-full border px-4 text-xs font-black uppercase tracking-[0.12em] transition ${
                                        urlCollection === item.value
                                            ? "border-[#2f1325] bg-[#2f1325] text-white"
                                            : "border-[#ead3df] bg-white text-[#6b244d] hover:border-[#d8b46b]"
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-8 sm:py-10">
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9d6b19]">
                                Collection
                            </p>
                            <h2 className="brand-story-heading mt-2 text-3xl font-semibold text-[#2f1325] sm:text-4xl">
                                Boutique Picks
                            </h2>
                        </div>
                        <p className="text-sm font-bold text-[#806574]">
                            Showing {products.length} of {totalProducts || products.length} products
                            <span className="mx-2 text-[#d8b46b]">/</span>
                            {activeSortLabel}
                        </p>
                    </div>

                    {legacyProductSlug ? (
                        <div className="rounded-lg border border-[#eadfe6] bg-white px-5 py-16 text-center shadow-[0_16px_45px_rgba(47,19,37,0.08)]">
                            <h3 className="text-xl font-bold text-[#2f1325]">Opening product...</h3>
                            <p className="mt-2 text-[#6c4b5d]">Taking you to the product detail page.</p>
                        </div>
                    ) : loading ? (
                        <ProductsGridSkeleton />
                    ) : fetchError ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-16 text-center shadow-sm">
                            <h3 className="text-xl font-bold text-red-800">Unable to load products</h3>
                            <p className="mt-2 text-red-700">{fetchError}</p>
                            <p className="mt-2 text-sm text-red-600">Check that the backend API is reachable from the deployed site.</p>
                        </div>
                    ) : products.length > 0 ? (
                        <div className="space-y-9">
                            {productItems.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-3 border-b border-[#eadfe6] pb-3">
                                        <h3 className="text-lg font-black text-[#2f1325]">Fresh From The Boutique</h3>
                                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#9b7b8d]">
                                            {productItems.length} items
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                                        {productItems.map((product) => (
                                            <ProductItem
                                                key={product._id}
                                                product={product}
                                                realtimeManagedExternally
                                                collectionListing
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                            {outOfStockProductItems.length > 0 ? (
                                <div className="rounded-lg border border-[#f0cfc7] bg-[#fff7f5] p-4 sm:p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg font-black text-[#9f2f25]">
                                                Restock Edit
                                            </h3>
                                            <p className="text-sm font-semibold text-[#806574]">
                                                We&apos;re restocking these soon
                                            </p>
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#b4665f]">
                                            {outOfStockProductItems.length} items
                                        </span>
                                    </div>
                                    <div className="mt-5 grid grid-cols-2 gap-3.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                                        {outOfStockProductItems.map((product) => (
                                            <ProductItem
                                                key={product._id}
                                                product={product}
                                                realtimeManagedExternally
                                                collectionListing
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                            {comboItems.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 pt-1">
                                        <div className="h-px flex-1 bg-[linear-gradient(90deg,transparent,#d8b46b,transparent)]" />
                                        <div className="rounded-full border border-[#ead3df] bg-white px-4 py-2 text-center shadow-sm">
                                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6b244d]">
                                                Combo Deals
                                            </p>
                                        </div>
                                        <div className="h-px flex-1 bg-[linear-gradient(90deg,transparent,#d8b46b,transparent)]" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                                        {comboItems.map((product) => (
                                            <ProductItem
                                                key={product._id}
                                                product={product}
                                                realtimeManagedExternally
                                                collectionListing
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                            {outOfStockComboItems.length > 0 ? (
                                <div className="rounded-lg border border-[#f0cfc7] bg-[#fff7f5] p-4 sm:p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg font-black text-[#9f2f25]">
                                                Combo Restocks
                                            </h3>
                                            <p className="text-sm font-semibold text-[#806574]">
                                                We&apos;re restocking these soon
                                            </p>
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#b4665f]">
                                            {outOfStockComboItems.length} items
                                        </span>
                                    </div>
                                    <div className="mt-5 grid grid-cols-2 gap-3.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                                        {outOfStockComboItems.map((product) => (
                                            <ProductItem
                                                key={product._id}
                                                product={product}
                                                realtimeManagedExternally
                                                collectionListing
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                            <div
                                ref={loaderRef}
                                aria-hidden="true"
                                className="h-8 w-full"
                            />
                            {page < pages ? (
                                <div className="text-center">
                                    {loadingMore ? (
                                        <p className="text-sm font-semibold text-[#806574]">
                                            Loading more products...
                                        </p>
                                    ) : null}
                                    {paginationError ? (
                                        <p className="mb-3 text-sm font-semibold text-red-600">
                                            {paginationError}
                                        </p>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={loadNextPage}
                                        disabled={loadingMore}
                                        className="inline-flex h-11 items-center justify-center rounded-lg border border-[#ead3df] bg-white px-5 text-sm font-black text-[#2f1325] transition hover:border-[#d8b46b] hover:bg-[#fff8fb] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {loadingMore ? "Loading..." : "Load more products"}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed border-[#d9c8d2] bg-white px-5 py-16 text-center shadow-sm">
                            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-lg bg-[#fff1f7] text-xl font-black text-[#7c2d62]">
                                AB
                            </div>
                            <h3 className="text-xl font-bold text-[#2f1325]">No products found</h3>
                            <p className="mt-2 text-[#6c4b5d]">Try adjusting your search</p>
                        </div>
                    )}
                </div>
            </section>

            <TrustStrip />
            <InstagramShowcase />
            <FinalCollectionCta />

            {isDrawerOpen ? (
                <div className="fixed inset-0 z-[80]">
                    <button
                        type="button"
                        aria-label="Close filters"
                        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
                        onClick={closeDrawer}
                    />
                    <aside className="absolute right-0 top-0 flex h-full w-[92vw] max-w-[430px] flex-col overflow-hidden rounded-l-[28px] bg-white shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-[#eadfe6] p-5">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9d6b19]">
                                    Collection
                                </p>
                                <h2 className="mt-1 text-2xl font-black text-[#2f1325]">
                                    {drawerMode === "sort" ? "Sort by" : "Filters"}
                                </h2>
                                <p className="mt-1 text-sm font-semibold text-[#806574]">
                                    {drawerMode === "sort"
                                        ? activeSortLabel
                                        : `${activePriceLabel} / ${activeCollectionLabel} / ${activeProductTypeLabel}`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeDrawer}
                                aria-label="Close"
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#ead3df] text-[#6c4b5d] transition hover:border-[#d8b46b] hover:text-[#7c2d62]"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5">
                            {drawerMode === "sort" ? (
                                <div className="grid gap-3">
                                    {SORT_OPTIONS.map((item) => {
                                        const active = item.sortBy === urlSortBy && item.order === urlOrder;
                                        return (
                                            <button
                                                key={`${item.sortBy}-${item.order}`}
                                                type="button"
                                                onClick={() => applySortOption(item)}
                                                className={`rounded-2xl border px-4 py-4 text-left text-base font-black transition ${active ? "border-[#2f1325] bg-[#2f1325] text-white" : "border-[#eadfe6] text-[#2f1325] hover:border-[#d8b46b] hover:bg-[#fff8fb]"}`}
                                            >
                                                {item.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="space-y-7">
                                    <section>
                                        <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#9d6b19]">Price</p>
                                        <div className="grid gap-3">
                                            {PRICE_FILTERS.map((item) => {
                                                const active = item.min === urlMinPrice && item.max === urlMaxPrice;
                                                return (
                                                    <button
                                                        key={`${item.min}-${item.max}-${item.label}`}
                                                        type="button"
                                                        onClick={() => applyPriceFilter(item)}
                                                        className={`rounded-2xl border px-4 py-3 text-left text-base font-black transition ${active ? "border-[#2f1325] bg-[#2f1325] text-white" : "border-[#eadfe6] text-[#2f1325] hover:border-[#d8b46b] hover:bg-[#fff8fb]"}`}
                                                    >
                                                        {item.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>

                                    <section>
                                        <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#9d6b19]">Style</p>
                                        <div className="grid gap-3">
                                            {FLAVOR_FILTERS.map((item) => {
                                                const active = item.value === urlFlavor;
                                                return (
                                                    <button
                                                        key={item.value || "all-styles"}
                                                        type="button"
                                                        onClick={() => replaceProductsParams({ flavor: item.value })}
                                                        className={`rounded-2xl border px-4 py-3 text-left text-base font-black transition ${active ? "border-[#2f1325] bg-[#2f1325] text-white" : "border-[#eadfe6] text-[#2f1325] hover:border-[#d8b46b] hover:bg-[#fff8fb]"}`}
                                                    >
                                                        {item.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>

                                    <section>
                                        <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#9d6b19]">Merchandising</p>
                                        <div className="grid gap-3">
                                            {[
                                                { label: "Featured Products", key: "featured", active: urlFeatured },
                                                { label: "New Arrivals", key: "newArrivals", active: urlNewArrivals },
                                                { label: "Best Sellers", key: "bestSeller", active: urlBestSeller },
                                            ].map((item) => (
                                                <button
                                                    key={item.key}
                                                    type="button"
                                                    onClick={() =>
                                                        replaceProductsParams({
                                                            [item.key]: item.active ? "" : "true",
                                                        })
                                                    }
                                                    className={`rounded-2xl border px-4 py-3 text-left text-base font-black transition ${item.active ? "border-[#2f1325] bg-[#2f1325] text-white" : "border-[#eadfe6] text-[#2f1325] hover:border-[#d8b46b] hover:bg-[#fff8fb]"}`}
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </section>

                                    <section>
                                        <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#9d6b19]">Collection</p>
                                        <div className="grid gap-3">
                                            {MERCHANDISING_COLLECTION_FILTERS.map((item) => {
                                                const active = item.value === urlCollection;
                                                return (
                                                    <button
                                                        key={item.value || "all-collections"}
                                                        type="button"
                                                        onClick={() =>
                                                            replaceProductsParams({
                                                                collection: item.value,
                                                            })
                                                        }
                                                        className={`rounded-2xl border px-4 py-3 text-left text-base font-black transition ${active ? "border-[#2f1325] bg-[#2f1325] text-white" : "border-[#eadfe6] text-[#2f1325] hover:border-[#d8b46b] hover:bg-[#fff8fb]"}`}
                                                    >
                                                        {item.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>

                                    <section>
                                        <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#9d6b19]">Product type</p>
                                        <div className="grid gap-3">
                                            {PRODUCT_TYPE_FILTERS.map((item) => {
                                                const active = item.value === urlProductType;
                                                return (
                                                    <button
                                                        key={item.value}
                                                        type="button"
                                                        onClick={() => replaceProductsParams({ productType: item.value })}
                                                        className={`rounded-2xl border px-4 py-3 text-left text-base font-black transition ${active ? "border-[#2f1325] bg-[#2f1325] text-white" : "border-[#eadfe6] text-[#2f1325] hover:border-[#d8b46b] hover:bg-[#fff8fb]"}`}
                                                    >
                                                        {item.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>
                                </div>
                            )}
                        </div>

                        {drawerMode === "filters" ? (
                            <div className="grid grid-cols-2 gap-3 border-t border-[#eadfe6] p-5">
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="h-12 rounded-2xl border border-[#ead3df] text-sm font-black text-[#2f1325] transition hover:border-[#d8b46b] hover:text-[#7c2d62]"
                                >
                                    Clear all
                                </button>
                                <button
                                    type="button"
                                    onClick={closeDrawer}
                                    className="h-12 rounded-2xl bg-[#2f1325] text-sm font-black text-white transition hover:bg-[#4b1f3a]"
                                >
                                    Show products
                                </button>
                            </div>
                        ) : null}
                    </aside>
                </div>
            ) : null}
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
