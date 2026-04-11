import express from "express";
import { recordPublicCrmTouchpoint } from "../controllers/crm.controller.js";
import optionalAuth from "../middlewares/optionalAuth.js";

const router = express.Router();

router.post("/touchpoint", optionalAuth, recordPublicCrmTouchpoint);

export default router;
