import express from "express";
import admin from "../middlewares/admin.js";
import auth from "../middlewares/auth.js";
import {
  getAutomationSettings,
  getEmailLogs,
  getTargetingPreview,
  previewTemplate,
  sendPromotionalCampaign,
  updateAutomationSettings,
} from "../controllers/emailAutomation.controller.js";

const router = express.Router();

router.get("/admin/automation/settings", auth, admin, getAutomationSettings);
router.put("/admin/automation/settings", auth, admin, updateAutomationSettings);
router.get("/admin/logs", auth, admin, getEmailLogs);
router.get("/admin/targeting/preview", auth, admin, getTargetingPreview);
router.post("/admin/template/preview", auth, admin, previewTemplate);
router.post("/admin/campaign/send", auth, admin, sendPromotionalCampaign);

export default router;
