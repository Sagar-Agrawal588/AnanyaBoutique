import express from "express";
import {
  getDeliveryPreviewController,
  getShippingDisplayMetricsController,
  getShippingQuoteController,
  xpressbeesBookShipment,
  xpressbeesCancelShipment,
  xpressbeesCouriers,
  xpressbeesLogin,
  xpressbeesManifest,
  xpressbeesNdrCreate,
  xpressbeesNdrList,
  xpressbeesReverseShipment,
  xpressbeesServiceability,
  xpressbeesSyncActiveShipments,
  xpressbeesTrackShipment,
} from "../controllers/shipping.controller.js";
import admin from "../middlewares/admin.js";
import auth from "../middlewares/auth.js";
import requireAdminPermission from "../middlewares/requireAdminPermission.js";

const router = express.Router();

// Public shipping endpoints
router.post("/quote", getShippingQuoteController);
router.get("/display-metrics", getShippingDisplayMetricsController);
router.post("/delivery-preview", getDeliveryPreviewController);

// Admin-only shipping operations
router.use(auth, admin);
router.use(requireAdminPermission("manage_shipping"));

router.post("/xpressbees/login", xpressbeesLogin);
router.get("/xpressbees/couriers", xpressbeesCouriers);
router.post("/xpressbees/serviceability", xpressbeesServiceability);
router.post("/xpressbees/book", xpressbeesBookShipment);
router.get("/xpressbees/track/:awb", xpressbeesTrackShipment);
router.post("/xpressbees/sync-active", xpressbeesSyncActiveShipments);
router.post("/xpressbees/manifest", xpressbeesManifest);
router.post("/xpressbees/cancel", xpressbeesCancelShipment);
router.get("/xpressbees/ndr", xpressbeesNdrList);
router.post("/xpressbees/ndr/create", xpressbeesNdrCreate);
router.post("/xpressbees/reverse", xpressbeesReverseShipment);

export default router;
