export const DEFAULT_PRODUCT_IMAGE =
  "https://firebasestorage.googleapis.com/v0/b/studio-8452116634-cdb59.firebasestorage.app/o/buyonegram%2Fsystem%2Fproduct-default.webp?alt=media&token=2239320a-df4e-40bf-8c08-597f825fa257";

export const DEFAULT_HOME_SLIDES = [
  "https://firebasestorage.googleapis.com/v0/b/studio-8452116634-cdb59.firebasestorage.app/o/buyonegram%2Fsystem%2Fhome-slide-default-1.webp?alt=media&token=65e6ee68-27f4-4421-837e-7e1543cf92e5",
  "https://firebasestorage.googleapis.com/v0/b/studio-8452116634-cdb59.firebasestorage.app/o/buyonegram%2Fsystem%2Fhome-slide-default-2.webp?alt=media&token=a03fee1f-c1a9-4d77-af0a-49829ac48fb6",
  "https://firebasestorage.googleapis.com/v0/b/studio-8452116634-cdb59.firebasestorage.app/o/buyonegram%2Fsystem%2Fhome-slide-default-3.webp?alt=media&token=033b528f-b621-40eb-a07e-85e82b58164d",
];

export const DEFAULT_BANNER_IMAGES = [
  "https://firebasestorage.googleapis.com/v0/b/studio-8452116634-cdb59.firebasestorage.app/o/buyonegram%2Fsystem%2Fbanner-default-1.webp?alt=media&token=42c36dc4-fed0-4d78-a67c-73a9a2174064",
  "https://firebasestorage.googleapis.com/v0/b/studio-8452116634-cdb59.firebasestorage.app/o/buyonegram%2Fsystem%2Fbanner-default-2.webp?alt=media&token=639fa7fc-a2c3-4207-b6de-d59fadd24862",
  "https://firebasestorage.googleapis.com/v0/b/studio-8452116634-cdb59.firebasestorage.app/o/buyonegram%2Fsystem%2Fbanner-default-3.webp?alt=media&token=40643a56-a74e-42da-a78d-2591044935c8",
];

export const DEFAULT_MEDIA_VIDEO_POSTER = DEFAULT_PRODUCT_IMAGE;

export const LEGACY_LOCAL_MEDIA_MAP = {
  "/product_placeholder.png": DEFAULT_PRODUCT_IMAGE,
  "/product_1.png": DEFAULT_PRODUCT_IMAGE,
  "/product_1.webp": DEFAULT_PRODUCT_IMAGE,
  "/slide_1.webp": DEFAULT_HOME_SLIDES[0],
  "/slide_2.webp": DEFAULT_HOME_SLIDES[1],
  "/slide_3.webp": DEFAULT_HOME_SLIDES[2],
  "/prodImage1.webp": DEFAULT_BANNER_IMAGES[0],
  "/prodImage2.webp": DEFAULT_BANNER_IMAGES[1],
  "/prodImage3.webp": DEFAULT_BANNER_IMAGES[2],
  "product_placeholder.png": DEFAULT_PRODUCT_IMAGE,
  "product_1.png": DEFAULT_PRODUCT_IMAGE,
  "product_1.webp": DEFAULT_PRODUCT_IMAGE,
  "slide_1.webp": DEFAULT_HOME_SLIDES[0],
  "slide_2.webp": DEFAULT_HOME_SLIDES[1],
  "slide_3.webp": DEFAULT_HOME_SLIDES[2],
  "prodImage1.webp": DEFAULT_BANNER_IMAGES[0],
  "prodImage2.webp": DEFAULT_BANNER_IMAGES[1],
  "prodImage3.webp": DEFAULT_BANNER_IMAGES[2],
};

export const resolveLegacyLocalMedia = (value = "") =>
  LEGACY_LOCAL_MEDIA_MAP[String(value || "").trim()] || "";
