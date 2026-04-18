import express from "express";
import {
  getAdminCrmWhatsappAudiencePreview,
  getAdminCrmWhatsappOverview,
  getAdminCrmWhatsappTemplates,
  getAdminCrmContactTimeline,
  getAdminCrmContacts,
  getAdminCrmOverview,
  patchAdminCrmContact,
  postAdminCrmContactWhatsappMessage,
  postAdminCrmWhatsappCampaign,
} from "../controllers/adminCrm.controller.js";
import admin from "../middlewares/admin.js";
import auth from "../middlewares/auth.js";

const router = express.Router();

router.get("/overview", auth, admin, getAdminCrmOverview);
router.get("/contacts", auth, admin, getAdminCrmContacts);
router.get("/contacts/:contactId/timeline", auth, admin, getAdminCrmContactTimeline);
router.patch("/contacts/:contactId", auth, admin, patchAdminCrmContact);
router.post(
  "/contacts/:contactId/whatsapp/send",
  auth,
  admin,
  postAdminCrmContactWhatsappMessage,
);
router.get("/whatsapp/overview", auth, admin, getAdminCrmWhatsappOverview);
router.get("/whatsapp/templates", auth, admin, getAdminCrmWhatsappTemplates);
router.get(
  "/whatsapp/audience-preview",
  auth,
  admin,
  getAdminCrmWhatsappAudiencePreview,
);
router.post("/whatsapp/campaign/send", auth, admin, postAdminCrmWhatsappCampaign);

export default router;
