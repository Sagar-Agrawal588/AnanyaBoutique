"use client";

import { API_BASE_URL } from "@/utils/api";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

export const MyContext = createContext();

const API_URL = API_BASE_URL.endsWith("/api")
  ? API_BASE_URL.slice(0, -4)
  : API_BASE_URL;

// Style palettes with background, accent, hover, and light variants.
export const FLAVORS = {
  creamy: {
    name: "Sarees",
    color: "#FCE7F3",
    hover: "#F9A8D4",
    text: "#831843",
    light: "#FFF5FB",
    glass: "rgba(252,231,243,0.55)",
    gradient: "linear-gradient(135deg, #FFF5FB 0%, #FFFDFE 50%, #FFFFFF 100%)",
    cardBg: "#FFFDFE",
    badge: "#DB2777",
  },
  chocolate: {
    name: "Suits",
    color: "#7C3AED",
    hover: "#6D28D9",
    text: "#FFFFFF",
    light: "#F5F3FF",
    glass: "rgba(124,58,237,0.18)",
    gradient: "linear-gradient(135deg, #F5F3FF 0%, #FAF8FF 50%, #FFFFFF 100%)",
    cardBg: "#FAF8FF",
    badge: "#6D28D9",
  },
  millets: {
    name: "Kurtis",
    color: "#DB2777",
    hover: "#BE185D",
    text: "#FFFFFF",
    light: "#FDF2F8",
    glass: "rgba(219,39,119,0.16)",
    gradient: "linear-gradient(135deg, #FDF2F8 0%, #FFF7FB 50%, #FFFFFF 100%)",
    cardBg: "#FFF7FB",
    badge: "#BE185D",
  },
  nutty: {
    name: "Accessories",
    color: "#C4B5FD",
    hover: "#A78BFA",
    text: "#4C1D95",
    light: "#FAF5FF",
    glass: "rgba(196,181,253,0.34)",
    gradient: "linear-gradient(135deg, #FAF5FF 0%, #FDFBFF 50%, #FFFFFF 100%)",
    cardBg: "#FDFBFF",
    badge: "#8B5CF6",
  },
};

// Default style is Suits.
const DEFAULT_FLAVOR = FLAVORS.chocolate;
const resolveFlavorWithOverrides = (candidate) => {
  if (!candidate || typeof candidate !== "object") {
    return DEFAULT_FLAVOR;
  }

  const flavorKey = Object.keys(FLAVORS).find(
    (key) => FLAVORS[key].name === candidate.name,
  );
  const baseFlavor = flavorKey ? FLAVORS[flavorKey] : DEFAULT_FLAVOR;

  return {
    ...baseFlavor,
    ...candidate,
    name: String(candidate.name || baseFlavor.name || "").trim() || baseFlavor.name,
  };
};

const resolveStoredFlavor = () => {
  if (typeof window === "undefined") {
    return DEFAULT_FLAVOR;
  }

  const savedFlavor = localStorage.getItem("selectedFlavor");
  if (!savedFlavor) {
    return DEFAULT_FLAVOR;
  }

  try {
    const parsed = JSON.parse(savedFlavor);
    return resolveFlavorWithOverrides(parsed);
  } catch {
    return DEFAULT_FLAVOR;
  }
};
const getStoredAccessToken = () => {
  if (typeof window === "undefined") return Cookies.get("accessToken") || "";
  return (
    Cookies.get("accessToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    ""
  );
};
const decodeJwtPayload = (token) => {
  try {
    const tokenPart = String(token || "").split(".")[1];
    if (!tokenPart) return null;
    const normalized = tokenPart
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(tokenPart.length / 4) * 4, "=");
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
};

const ThemeProvider = ({ children }) => {
  const [isOpenAddressBox, setIsOpenAddressBox] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [user, setUser] = useState({
    email: "",
    Password: "",
  });
  const [flavor, setFlavor] = useState(DEFAULT_FLAVOR);

  const router = useRouter();
  const applyThemeToDOM = useCallback((themeColor) => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;

    // Set CSS variables for global theming
    root.style.setProperty("--flavor-color", themeColor.color);
    root.style.setProperty("--flavor-hover", themeColor.hover);
    root.style.setProperty("--flavor-light", themeColor.light);
    root.style.setProperty("--flavor-glass", themeColor.glass);
    root.style.setProperty("--flavor-card-bg", themeColor.cardBg);
    root.style.setProperty("--flavor-badge", themeColor.badge);
    root.style.setProperty("--flavor-text", themeColor.text || "#111111");
    root.style.setProperty("--flavor-gradient", themeColor.gradient);
    root.style.setProperty("--flavor-surface", themeColor.cardBg);
    root.style.setProperty(
      "--flavor-page-bg",
      `linear-gradient(180deg, ${themeColor.light} 0%, #FFFFFF 100%)`,
    );
    root.style.setProperty("--primary", themeColor.color);
    root.style.setProperty("--color-primary", themeColor.color);

    // Update body background
    document.body.style.background = `linear-gradient(180deg, ${themeColor.light} 0%, #FFFFFF 100%)`;
  }, []);

  // Initialize theme + auth state from persisted storage on mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedFlavor = resolveStoredFlavor();
      setFlavor(storedFlavor);
      localStorage.setItem("selectedFlavor", JSON.stringify(storedFlavor));
      applyThemeToDOM(storedFlavor);
    }
    const token = getStoredAccessToken();
    let tokenValid = false;
    if (token) {
      const payload = decodeJwtPayload(token);
      tokenValid = Boolean(payload?.exp && payload.exp * 1000 > Date.now());
    }
    if (tokenValid) {
      Cookies.remove("actionType");
      setIsLogin(true);
      setUser({
        name:
          Cookies.get("userName") ||
          (typeof window !== "undefined"
            ? localStorage.getItem("userName")
            : ""),
        email:
          Cookies.get("userEmail") ||
          (typeof window !== "undefined"
            ? localStorage.getItem("userEmail")
            : ""),
      });
    } else if (token) {
      // Token expired — try refreshing before giving up
      const refreshToken =
        Cookies.get("refreshToken") ||
        (typeof window !== "undefined"
          ? localStorage.getItem("refreshToken")
          : "");
      if (refreshToken) {
        fetch(
          `${API_URL}/api/user/refresh-token`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          },
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            const newToken = data?.data?.accessToken;
            if (newToken) {
              Cookies.set("accessToken", newToken, { expires: 365 });
              if (typeof window !== "undefined") {
                localStorage.setItem("accessToken", newToken);
                localStorage.setItem("token", newToken);
              }
              setIsLogin(true);
              setUser({
                name:
                  Cookies.get("userName") ||
                  (typeof window !== "undefined"
                    ? localStorage.getItem("userName")
                    : ""),
                email:
                  Cookies.get("userEmail") ||
                  (typeof window !== "undefined"
                    ? localStorage.getItem("userEmail")
                    : ""),
              });
            } else {
              // Refresh failed — clear stale cookies
              Cookies.remove("accessToken");
              Cookies.remove("refreshToken");
              Cookies.remove("userName");
              Cookies.remove("userEmail");
              Cookies.remove("userPhoto");
              if (typeof window !== "undefined") {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("token");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("userName");
                localStorage.removeItem("userEmail");
                localStorage.removeItem("userPhoto");
              }
              setIsLogin(false);
            }
          })
          .catch(() => {
            Cookies.remove("accessToken");
            Cookies.remove("refreshToken");
            Cookies.remove("userName");
            Cookies.remove("userEmail");
            Cookies.remove("userPhoto");
            if (typeof window !== "undefined") {
              localStorage.removeItem("accessToken");
              localStorage.removeItem("token");
              localStorage.removeItem("refreshToken");
              localStorage.removeItem("userName");
              localStorage.removeItem("userEmail");
              localStorage.removeItem("userPhoto");
            }
            setIsLogin(false);
          });
      } else {
        // No refresh token — clear stale cookies
        Cookies.remove("accessToken");
        Cookies.remove("userName");
        Cookies.remove("userEmail");
        Cookies.remove("userPhoto");
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("userName");
          localStorage.removeItem("userEmail");
          localStorage.removeItem("userPhoto");
        }
        setIsLogin(false);
      }
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Listen for flavor changes from FlavorSwitcherBar
  useEffect(() => {
    const handleFlavorChange = (event) => {
      const newFlavor = event.detail;
      const fullFlavor = resolveFlavorWithOverrides(newFlavor);
      setFlavor(fullFlavor);
      applyThemeToDOM(fullFlavor);
    };

    window.addEventListener("themeChange", handleFlavorChange);
    return () => window.removeEventListener("themeChange", handleFlavorChange);
  }, []);

  const setSelectedFlavor = (newFlavor) => {
    const resolvedFlavor = resolveFlavorWithOverrides(newFlavor);
    setFlavor(resolvedFlavor);
    localStorage.setItem("selectedFlavor", JSON.stringify(resolvedFlavor));
    applyThemeToDOM(resolvedFlavor);
  };

  const isOpenAddressPanel = () => {
    setIsOpenAddressBox(!isOpenAddressBox);
  };

  const alertBox = (type, msg) => {
    if (type === "success") {
      toast.success(msg);
    } else {
      toast.error(msg);
    }
  };

  const values = {
    setIsOpenAddressBox,
    isOpenAddressBox,
    isOpenAddressPanel,
    alertBox,
    setIsLogin,
    isLogin,
    setUser,
    user,
    flavor,
    setSelectedFlavor,
    FLAVORS,
  };

  return <MyContext.Provider value={values}>{children}</MyContext.Provider>;
};
export default ThemeProvider;
