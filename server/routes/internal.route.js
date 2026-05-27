import express from "express";
import { clearBannerPublicCache } from "../controllers/banner.controller.js";
import { clearHomeSlidesPublicCache } from "../controllers/homeSlide.controller.js";
import { invalidatePublicResponseCache } from "../middlewares/publicResponseCache.js";
import BannerModel from "../models/banner.model.js";
import HomeSlideModel from "../models/homeSlide.model.js";

const router = express.Router();

// Localhost-only internal endpoint to clear in-memory caches for banners/home-slides
router.post(
  "/clear-media-cache",
  async (req, res) => {
    try {
      // Restrict to localhost to avoid exposing this in production.
      const remote = String(req.ip || req.connection?.remoteAddress || "");
      if (!/(^127\.0\.0\.1$)|(^::1$)|(^::ffff:127\.0\.0\.1$)/.test(remote)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: internal endpoint only accessible from localhost",
          remote,
        });
      }

      clearBannerPublicCache();
      clearHomeSlidesPublicCache();
      // Also increment namespace versions for downstream caches (best-effort)
      await invalidatePublicResponseCache(["banners", "home-slides"]);

      const banners = await BannerModel.find({ isActive: true }).lean();
      const slides = await HomeSlideModel.find({ isActive: true }).lean();

      return res.status(200).json({
        success: true,
        message: "Media caches cleared",
        data: { bannersCount: banners.length, slidesCount: slides.length },
      });
    } catch (error) {
      console.error("Failed to clear media cache:", error);
      return res.status(500).json({ success: false, message: "Failed to clear media cache" });
    }
  },
);

export default router;
