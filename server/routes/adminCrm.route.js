import express from "express";
import {
  getAdminCrmContactTimeline,
  getAdminCrmContacts,
  getAdminCrmOverview,
  patchAdminCrmContact,
} from "../controllers/adminCrm.controller.js";
import admin from "../middlewares/admin.js";
import auth from "../middlewares/auth.js";

const router = express.Router();

router.get("/overview", auth, admin, getAdminCrmOverview);
router.get("/contacts", auth, admin, getAdminCrmContacts);
router.get("/contacts/:contactId/timeline", auth, admin, getAdminCrmContactTimeline);
router.patch("/contacts/:contactId", auth, admin, patchAdminCrmContact);

export default router;
