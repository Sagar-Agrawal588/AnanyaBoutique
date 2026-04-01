"use client";

import { API_BASE_URL } from "@/utils/api";
import {
  getResponseErrorMessage,
  parseJsonSafely,
} from "@/utils/safeJsonFetch";
import Cookies from "js-cookie";
import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const WishlistContext = createContext();
const API_URL = API_BASE_URL;
const LOCAL_API_FALLBACKS = ["http://localhost:8000", "http://localhost:8001"];

const sanitizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\/+$/, "");

const normalizeApiPath = (path) => {
  const normalized = String(path || "").startsWith("/")
    ? String(path)
    : `/${String(path || "")}`;
  const baseHasApiSuffix = /\/api$/i.test(sanitizeBaseUrl(API_URL));
  if (!baseHasApiSuffix) return normalized;
  if (/^\/api(\/|$)/i.test(normalized)) {
    return normalized.replace(/^\/api/i, "");
  }
  return normalized;
};

const getApiBaseCandidates = () => {
  const candidates = [sanitizeBaseUrl(API_URL)].filter(Boolean);

  if (typeof window !== "undefined") {
    const hostname = String(window.location.hostname || "").toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      candidates.push(...LOCAL_API_FALLBACKS.map(sanitizeBaseUrl));
    }
  }

  return [...new Set(candidates.filter(Boolean))];
};

const fetchWithApiFallback = async (path, options = {}) => {
  const normalizedPath = normalizeApiPath(path);
  const bases = getApiBaseCandidates();

  let lastError = null;
  let lastResponse = null;

  for (let i = 0; i < bases.length; i += 1) {
    const base = bases[i];
    const target = `${base}${normalizedPath}`;
    const isLastCandidate = i === bases.length - 1;

    try {
      const response = await fetch(target, options);
      if (response.ok) return response;

      lastResponse = response;
      const shouldTryNextBase = !isLastCandidate && response.status >= 500;
      if (!shouldTryNextBase) {
        return response;
      }
    } catch (error) {
      lastError = error;
      if (isLastCandidate) {
        throw error;
      }
    }
  }

  if (lastResponse) return lastResponse;
  if (lastError) throw lastError;

  throw new Error("Failed to reach wishlist API");
};

const resolveWishlistItemType = (value) =>
  String(value || "product")
    .trim()
    .toLowerCase() === "combo"
    ? "combo"
    : "product";

const resolveProductId = (item) =>
  String(
    item?.product?._id ||
      item?.product ||
      item?.productData?._id ||
      item?.id ||
      item?._id ||
      item ||
      "",
  ).trim();

const resolveComboId = (item) =>
  String(
    item?.combo?._id ||
      item?.combo ||
      item?.comboId ||
      item?.comboData?._id ||
      item?.id ||
      item?._id ||
      "",
  ).trim();

const resolveItemIdByType = (itemType, item) =>
  itemType === "combo" ? resolveComboId(item) : resolveProductId(item);

const resolveVariantId = (item) => {
  const raw =
    item?.variantId ||
    item?.variant?._id ||
    item?.variant ||
    item?.selectedVariant?._id ||
    null;
  if (raw === undefined || raw === null || raw === "") return null;
  return String(raw).trim();
};

const resolveQuantity = (item, fallback = 1) => {
  const parsed = Number(item?.quantity ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
};

const getWishlistKey = (itemType, itemId, variantId = null) =>
  `${String(itemType || "product")}::${String(itemId || "")}::${
    itemType === "combo" ? "" : String(variantId || "")
  }`;

const resolveGuestProductSnapshot = ({
  product,
  variantId = null,
  variantName = "",
  quantity = 1,
}) => {
  const normalizedVariantId =
    variantId === undefined || variantId === null || variantId === ""
      ? null
      : String(variantId).trim();
  let resolvedVariantName = String(variantName || "").trim();
  let price = Number(product?.price || 0);
  let originalPrice = Number(
    product?.originalPrice || product?.oldPrice || product?.price || 0,
  );

  if (normalizedVariantId && Array.isArray(product?.variants)) {
    const match = product.variants.find(
      (variant) => String(variant?._id || "") === normalizedVariantId,
    );
    if (match) {
      price = Number(match.price ?? price ?? 0);
      originalPrice = Number(
        match.originalPrice ?? originalPrice ?? price ?? 0,
      );
      if (!resolvedVariantName) {
        resolvedVariantName = String(match.name || "").trim();
      }
    }
  }

  if (!resolvedVariantName && product?.selectedVariant?.name) {
    resolvedVariantName = String(product.selectedVariant.name).trim();
  }

  const parsedQty = Number(quantity);
  const resolvedQuantity =
    Number.isFinite(parsedQty) && parsedQty > 0 ? Math.floor(parsedQty) : 1;

  return {
    variantId: normalizedVariantId,
    variantName: resolvedVariantName,
    quantity: resolvedQuantity,
    priceSnapshot: Number.isFinite(price) ? price : 0,
    originalPriceSnapshot: Number.isFinite(originalPrice) ? originalPrice : 0,
  };
};

const resolveGuestComboSnapshot = ({ combo, quantity = 1 }) => {
  const comboPrice = Number(combo?.comboPrice ?? combo?.price ?? 0);
  const comboOriginal = Number(
    combo?.originalPrice ?? combo?.originalTotal ?? comboPrice,
  );
  const parsedQty = Number(quantity);
  const resolvedQuantity =
    Number.isFinite(parsedQty) && parsedQty > 0 ? Math.floor(parsedQty) : 1;

  return {
    variantId: null,
    variantName: "",
    quantity: resolvedQuantity,
    priceSnapshot: Number.isFinite(comboPrice) ? comboPrice : 0,
    originalPriceSnapshot: Number.isFinite(comboOriginal)
      ? comboOriginal
      : comboPrice,
  };
};

export const WishlistProvider = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [removingItems, setRemovingItems] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return Cookies.get("accessToken") || localStorage.getItem("token");
  };

  const saveLocal = (items) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("wishlist", JSON.stringify(items));
  };

  const loadLocal = () => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("wishlist");
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      setWishlistItems(parsed || []);
      setWishlistCount(parsed?.length || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const token = getToken();

      if (!token) {
        loadLocal();
        return;
      }

      const res = await fetchWithApiFallback("/api/wishlist", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      const data = await parseJsonSafely(res);

      if (!res.ok) {
        setWishlistItems([]);
        setWishlistCount(0);
        return;
      }

      setWishlistItems(data?.data?.items || []);
      setWishlistCount(data?.data?.itemCount || 0);
    } catch (err) {
      console.error(err);
      if (!getToken()) {
        loadLocal();
      } else {
        setWishlistItems([]);
        setWishlistCount(0);
      }
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  };

  const addToWishlist = async (item, options = {}) => {
    const itemType = resolveWishlistItemType(
      options?.itemType || item?.itemType,
    );
    const itemId = resolveItemIdByType(itemType, item);
    const variantId =
      itemType === "product"
        ? resolveVariantId(options) || resolveVariantId(item)
        : null;
    const variantName = String(
      options?.variantName || item?.selectedVariant?.name || "",
    ).trim();
    const quantity = resolveQuantity(options, 1);
    const token = getToken();

    if (!itemId) {
      toast.error(itemType === "combo" ? "Invalid combo" : "Invalid product");
      return;
    }

    if (!token) {
      const exists = wishlistItems.some((entry) => {
        const entryType = resolveWishlistItemType(entry?.itemType);
        const entryId = resolveItemIdByType(entryType, entry);
        const entryVariantId =
          entryType === "product" ? resolveVariantId(entry) : null;
        return (
          getWishlistKey(entryType, entryId, entryVariantId) ===
          getWishlistKey(itemType, itemId, variantId)
        );
      });

      if (exists) {
        toast.error("Already in wishlist");
        return;
      }

      const guestSnapshot =
        itemType === "combo"
          ? resolveGuestComboSnapshot({ combo: item, quantity })
          : resolveGuestProductSnapshot({
              product: item,
              variantId,
              variantName,
              quantity,
            });

      const newItems = [
        ...wishlistItems,
        {
          itemType,
          product: itemType === "product" ? itemId : null,
          productData: itemType === "product" ? item : null,
          combo: itemType === "combo" ? itemId : null,
          comboData: itemType === "combo" ? item : null,
          variantId: itemType === "product" ? guestSnapshot.variantId : null,
          variantName: itemType === "product" ? guestSnapshot.variantName : "",
          quantity: guestSnapshot.quantity,
          priceSnapshot: guestSnapshot.priceSnapshot,
          originalPriceSnapshot: guestSnapshot.originalPriceSnapshot,
          addedAt: new Date().toISOString(),
        },
      ];

      setWishlistItems(newItems);
      setWishlistCount(newItems.length);
      saveLocal(newItems);
      toast.success("Added to wishlist");
      return;
    }

    try {
      const res = await fetchWithApiFallback("/api/wishlist/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          itemType,
          productId: itemType === "product" ? itemId : undefined,
          comboId: itemType === "combo" ? itemId : undefined,
          variantId:
            itemType === "product" ? variantId || undefined : undefined,
          variantName:
            itemType === "product" ? variantName || undefined : undefined,
          quantity,
        }),
      });

      const data = await parseJsonSafely(res);

      if (!res.ok) {
        toast.error(getResponseErrorMessage(data, "Failed to add to wishlist"));
        return;
      }

      setWishlistItems(data?.data?.items || []);
      setWishlistCount(data?.data?.itemCount || 0);
      toast.success("Added to wishlist");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add to wishlist");
    }
  };

  const removeFromWishlist = async (input) => {
    const itemType = resolveWishlistItemType(
      input?.itemType || input?.product?.itemType,
    );
    const itemId = resolveItemIdByType(itemType, input);
    const variantId = itemType === "product" ? resolveVariantId(input) : null;
    const token = getToken();

    if (!itemId) {
      toast.error(itemType === "combo" ? "Invalid combo" : "Invalid product");
      return;
    }

    if (!token) {
      const next = wishlistItems.filter((entry) => {
        const entryType = resolveWishlistItemType(entry?.itemType);
        const entryId = resolveItemIdByType(entryType, entry);
        const entryVariantId =
          entryType === "product" ? resolveVariantId(entry) : null;
        return (
          getWishlistKey(entryType, entryId, entryVariantId) !==
          getWishlistKey(itemType, itemId, variantId)
        );
      });
      setWishlistItems(next);
      setWishlistCount(next.length);
      saveLocal(next);
      toast.success("Removed from wishlist");
      return;
    }

    const removingKey = getWishlistKey(itemType, itemId, variantId);
    setRemovingItems((prev) => ({ ...prev, [removingKey]: true }));

    try {
      const params = new URLSearchParams();
      params.set("itemType", itemType);
      if (itemType === "product" && variantId) {
        params.set("variantId", String(variantId));
      }
      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await fetchWithApiFallback(
        `/api/wishlist/remove/${itemId}${query}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        },
      );

      const data = await parseJsonSafely(res);

      if (!res.ok) {
        toast.error(getResponseErrorMessage(data, "Failed to remove item"));
        return;
      }

      setWishlistItems(data?.data?.items || []);
      setWishlistCount(data?.data?.itemCount || 0);
      toast.success("Removed from wishlist");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove item");
    } finally {
      setRemovingItems((prev) => {
        const next = { ...prev };
        delete next[removingKey];
        return next;
      });
    }
  };

  const isInWishlist = (itemOrId, variantId = null, itemType = "product") => {
    const normalizedType = resolveWishlistItemType(
      typeof itemOrId === "object" && itemOrId !== null
        ? itemOrId?.itemType || itemType
        : itemType,
    );
    const itemId =
      typeof itemOrId === "object" && itemOrId !== null
        ? resolveItemIdByType(normalizedType, itemOrId)
        : String(itemOrId || "");
    const normalizedVariantId =
      normalizedType === "product"
        ? variantId === undefined || variantId === null || variantId === ""
          ? null
          : String(variantId).trim()
        : null;

    return wishlistItems.some((entry) => {
      const entryType = resolveWishlistItemType(entry?.itemType);
      const entryId = resolveItemIdByType(entryType, entry);
      const entryVariantId =
        entryType === "product" ? resolveVariantId(entry) : null;
      return (
        getWishlistKey(entryType, entryId, entryVariantId) ===
        getWishlistKey(normalizedType, itemId, normalizedVariantId)
      );
    });
  };

  const toggleWishlist = (item, options = {}) => {
    const itemType = resolveWishlistItemType(
      options?.itemType || item?.itemType,
    );
    const itemId = resolveItemIdByType(itemType, item);
    const variantId =
      itemType === "product"
        ? resolveVariantId(options) || resolveVariantId(item)
        : null;

    if (isInWishlist(itemId, variantId, itemType)) {
      return removeFromWishlist({
        itemType,
        product: itemType === "product" ? itemId : null,
        combo: itemType === "combo" ? itemId : null,
        variantId,
      });
    }

    return addToWishlist(item, { ...options, itemType });
  };

  const clearWishlist = async () => {
    const token = getToken();

    if (token) {
      await fetchWithApiFallback("/api/wishlist/clear", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
    }

    setWishlistItems([]);
    setWishlistCount(0);
    localStorage.removeItem("wishlist");
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        wishlistCount,
        loading,
        isInitialized,
        removingItems,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isInWishlist,
        clearWishlist,
        fetchWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return ctx;
};

export default WishlistContext;
