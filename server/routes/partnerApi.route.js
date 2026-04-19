import express from "express";
import {
  adminGetPartnerAnalytics,
  adminGetPartnerDetail,
  adminGetPartnerDynamicState,
  adminGetPartnerLiveMonitoring,
  adminGetPartnerLogs,
  adminGetPartnerOverview,
  adminCreatePartner,
  adminDeletePartner,
  adminGeneratePartnerCredentialPdf,
  adminExportPartnersCsv,
  adminListPartners,
  adminRevokePartnerKey,
  adminRotatePartnerKey,
  adminUpdatePartnerDynamicState,
  adminUpdatePartner,
  getPartnerApiGuide,
  getPartnerApiDashboard,
  getPartnerApiGuidePdf,
  getPartnerCategories,
  getPartnerCombos,
  getPartnerGst,
  getPartnerInventory,
  getPartnerPricing,
  getPartnerProductById,
  getPartnerProducts,
  getPartnerTags,
  partnerHealth,
} from "../controllers/partnerApi.controller.js";
import {
  partnerApiAuth,
  partnerRuntimeLimiter,
  requirePartnerScope,
} from "../middlewares/partnerApiAuth.js";
import { partnerApiActivityTracker } from "../middlewares/partnerApiActivity.js";
import admin from "../middlewares/admin.js";
import auth from "../middlewares/auth.js";

const router = express.Router();

router.get("/guide", getPartnerApiGuide);
router.get("/guide.pdf", getPartnerApiGuidePdf);
router.get("/dashboard", getPartnerApiDashboard);
router.use(partnerApiActivityTracker);

router.get("/health", partnerApiAuth, partnerRuntimeLimiter, partnerHealth);
router.get(
  "/products",
  partnerApiAuth,
  partnerRuntimeLimiter,
  requirePartnerScope("catalog.read"),
  getPartnerProducts,
);
router.get(
  "/products/:productId",
  partnerApiAuth,
  partnerRuntimeLimiter,
  requirePartnerScope("catalog.read"),
  getPartnerProductById,
);
router.get(
  "/inventory",
  partnerApiAuth,
  partnerRuntimeLimiter,
  requirePartnerScope("inventory.read"),
  getPartnerInventory,
);
router.get(
  "/pricing",
  partnerApiAuth,
  partnerRuntimeLimiter,
  requirePartnerScope("pricing.read"),
  getPartnerPricing,
);
router.get(
  "/gst",
  partnerApiAuth,
  partnerRuntimeLimiter,
  requirePartnerScope("gst.read"),
  getPartnerGst,
);
router.get(
  "/combos",
  partnerApiAuth,
  partnerRuntimeLimiter,
  requirePartnerScope("combos.read"),
  getPartnerCombos,
);
router.get(
  "/categories",
  partnerApiAuth,
  partnerRuntimeLimiter,
  requirePartnerScope("catalog.read"),
  getPartnerCategories,
);
router.get(
  "/tags",
  partnerApiAuth,
  partnerRuntimeLimiter,
  requirePartnerScope("catalog.read"),
  getPartnerTags,
);

router.get("/admin/overview", auth, admin, adminGetPartnerOverview);
router.get("/admin/analytics", auth, admin, adminGetPartnerAnalytics);
router.get("/admin/monitoring/live", auth, admin, adminGetPartnerLiveMonitoring);
router.get("/admin/logs", auth, admin, adminGetPartnerLogs);
router.get("/admin/partners", auth, admin, adminListPartners);
router.get("/admin/partners/:partnerId", auth, admin, adminGetPartnerDetail);
router.get("/admin/partners/:partnerId/dynamic", auth, admin, adminGetPartnerDynamicState);
router.get("/admin/partners/export.csv", auth, admin, adminExportPartnersCsv);
router.post("/admin/partners", auth, admin, adminCreatePartner);
router.patch("/admin/partners/:partnerId", auth, admin, adminUpdatePartner);
router.patch(
  "/admin/partners/:partnerId/dynamic",
  auth,
  admin,
  adminUpdatePartnerDynamicState,
);
router.delete("/admin/partners/:partnerId", auth, admin, adminDeletePartner);
router.post("/admin/partners/:partnerId/revoke", auth, admin, adminRevokePartnerKey);
router.post(
  "/admin/partners/:partnerId/credential-pdf",
  auth,
  admin,
  adminGeneratePartnerCredentialPdf,
);
router.post(
  "/admin/partners/:partnerId/rotate-key",
  auth,
  admin,
  adminRotatePartnerKey,
);

export default router;
