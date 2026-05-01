import express from "express";
import auth from "../middlewares/auth.js";
import admin from "../middlewares/admin.js";
import {
  deleteAdminReview,
  getAdminReviews,
  updateAdminReview,
} from "../controllers/review.controller.js";

const router = express.Router();

router.get("/", auth, admin, getAdminReviews);
router.patch("/:id", auth, admin, updateAdminReview);
router.delete("/:id", auth, admin, deleteAdminReview);

export default router;
