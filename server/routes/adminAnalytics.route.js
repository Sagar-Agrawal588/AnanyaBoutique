import express from "express";
import {
  exportAdminAnalyticsPdfReport,
  exportBehaviorAnalyticsPdfReport,
  getAdminAnalyticsCharts,
  getAdminAnalyticsOverview,
  getAdminUserActivity,
  getBehaviorAnalyticsEngagement,
  getBehaviorAnalyticsOverview,
  getBehaviorAnalyticsPerformance,
  getBehaviorAnalyticsUserActivity,
  getBehaviorProductJourney,
  getBehaviorSessions,
  getBehaviorTimeline,
} from "../controllers/adminAnalytics.controller.js";
import admin from "../middlewares/admin.js";
import auth from "../middlewares/auth.js";
import requireAdminPermission from "../middlewares/requireAdminPermission.js";

const router = express.Router();

router.use(auth, admin, requireAdminPermission("view_analytics"));

// Legacy analytics endpoints (kept for backward compatibility)
router.get("/overview", getAdminAnalyticsOverview);
router.get("/charts", getAdminAnalyticsCharts);
router.get("/export-report", exportAdminAnalyticsPdfReport);
router.get("/users/:userId", getAdminUserActivity);
router.get("/users", getAdminUserActivity);

// Behavior analytics endpoints
router.get("/behavior/overview", getBehaviorAnalyticsOverview);
router.get("/behavior/engagement", getBehaviorAnalyticsEngagement);
router.get("/behavior/performance", getBehaviorAnalyticsPerformance);
router.get("/behavior/export-report", exportBehaviorAnalyticsPdfReport);
router.get("/behavior/sessions", getBehaviorSessions);
router.get("/behavior/user-activity", getBehaviorAnalyticsUserActivity);
router.get("/behavior/product-journey", getBehaviorProductJourney);
router.get("/behavior/timeline", getBehaviorTimeline);

export default router;
