import {
  BRAND_DESCRIPTION,
  BRAND_NAME,
  BRAND_SHORT_NAME,
  brandAssets,
} from "@/config/brandAssets";

export default function manifest() {
  return {
    name: BRAND_NAME,
    short_name: BRAND_SHORT_NAME,
    description: BRAND_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: brandAssets.pwa.backgroundColor,
    theme_color: brandAssets.pwa.themeColor,
    icons: [brandAssets.pwa.icon192, brandAssets.pwa.icon512],
  };
}
