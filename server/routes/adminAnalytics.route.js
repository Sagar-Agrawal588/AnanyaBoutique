import express from "express";
import auth from "../middlewares/auth.js";
import admin from "../middlewares/admin.js";
import requireAdminPermission from "../middlewares/requireAdminPermission.js";
import {
  getAdminAnalyticsCharts,
  getAdminAnalyticsOverview,
  getAdminUserActivity,
  getBehaviorAnalyticsEngagement,
  getBehaviorAnalyticsOverview,
  getBehaviorAnalyticsPerformance,
  getBehaviorSessions,
  getBehaviorAnalyticsUserActivity,
  getBehaviorProductJourney,
  getBehaviorTimeline,
} from "../controllers/adminAnalytics.controller.js";

const router = express.Router();

router.use(auth, admin, requireAdminPermission("view_analytics"));

// Legacy analytics endpoints (kept for backward compatibility)
router.get("/overview", getAdminAnalyticsOverview);
router.get("/charts", getAdminAnalyticsCharts);
router.get("/users/:userId", getAdminUserActivity);
router.get("/users", getAdminUserActivity);

// Behavior analytics endpoints
router.get("/behavior/overview", getBehaviorAnalyticsOverview);
router.get("/behavior/engagement", getBehaviorAnalyticsEngagement);
router.get("/behavior/performance", getBehaviorAnalyticsPerformance);
router.get("/behavior/sessions", getBehaviorSessions);
router.get("/behavior/user-activity", getBehaviorAnalyticsUserActivity);
router.get("/behavior/product-journey", getBehaviorProductJourney);
router.get("/behavior/timeline", getBehaviorTimeline);

export default router;
