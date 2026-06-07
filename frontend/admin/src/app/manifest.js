import {
  ADMIN_BRAND_TITLE,
  BRAND_DESCRIPTION,
  brandAssets,
} from "@/config/brandAssets";

export default function manifest() {
  return {
    name: ADMIN_BRAND_TITLE,
    short_name: "Ananya Admin",
    description: BRAND_DESCRIPTION,
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    background_color: brandAssets.pwa.backgroundColor,
    theme_color: brandAssets.pwa.themeColor,
    icons: [brandAssets.pwa.icon192, brandAssets.pwa.icon512],
  };
}
