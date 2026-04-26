import express from "express";
import admin from "../middlewares/admin.js";
import auth from "../middlewares/auth.js";
import {
  getAdminProductDemandByProduct,
  getAdminProductDemandSummary,
} from "../controllers/productDemand.controller.js";

const router = express.Router();

router.get("/product-demand", auth, admin, getAdminProductDemandSummary);
router.get(
  "/product-demand/:productId",
  auth,
  admin,
  getAdminProductDemandByProduct,
);

export default router;
