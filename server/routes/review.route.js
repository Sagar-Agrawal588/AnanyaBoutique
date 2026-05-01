import express from "express";
import auth from "../middlewares/auth.js";
import optionalAuth from "../middlewares/optionalAuth.js";
import {
  getComboReviews,
  getMyReviews,
  getProductReviews,
  submitReview,
} from "../controllers/review.controller.js";

const router = express.Router();

// Customer actions
router.post("/", optionalAuth, submitReview);
router.get("/my", auth, getMyReviews);

// Public product reviews
router.get("/combo/:comboId", getComboReviews);
router.get("/:productId", getProductReviews);

export default router;
