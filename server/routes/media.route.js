import express from "express";
import {
  createSignedGcsMediaReadUrl,
  isGcsMediaStorageConfigured,
  isSafeGcsMediaObjectPath,
} from "../config/cloudinary.js";

const router = express.Router();

router.get("/gcs", async (req, res) => {
  try {
    const objectPath = String(req.query?.path || "")
      .trim()
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    if (!objectPath || !isSafeGcsMediaObjectPath(objectPath)) {
      return res.status(400).json({
        error: true,
        success: false,
        message: "Invalid media path",
      });
    }

    if (!isGcsMediaStorageConfigured()) {
      return res.status(503).json({
        error: true,
        success: false,
        message: "Media storage is not configured",
      });
    }

    const signedUrl = await createSignedGcsMediaReadUrl(objectPath);
    res.set("Cache-Control", "public, max-age=300, s-maxage=300");
    return res.redirect(302, signedUrl);
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({
      error: true,
      success: false,
      message: status === 404 ? "Media not found" : "Unable to load media",
    });
  }
});

export default router;
