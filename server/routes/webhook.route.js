import express from "express";
import { handleExpressbeesWebhook } from "../controllers/expressbeesWebhook.controller.js";
import {
  handleWhatsappMetaWebhook,
  verifyWhatsappMetaWebhook,
} from "../controllers/whatsappWebhook.controller.js";
import { verifyExpressbeesWebhookAuth } from "../utils/expressbeesWebhookSignature.js";
import { verifyWhatsappWebhookSignature } from "../utils/whatsappWebhookSignature.js";

const router = express.Router();

const verifyExpressbeesSecret = (req, res, next) => {
  const configuredSecret = String(process.env.XPRESSBEES_WEBHOOK_SECRET || "").trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (!configuredSecret) {
    if (isProduction) {
      return res.status(503).json({
        error: true,
        success: false,
        message: "Webhook secret not configured",
      });
    }
    return next();
  }

  const verification = verifyExpressbeesWebhookAuth({
    headers: req.headers,
    rawBody: req.rawBody,
    body: req.body,
    secret: configuredSecret,
  });

  if (!verification.ok) {
    return res.status(401).json({
      error: true,
      success: false,
      message: "Unauthorized webhook",
    });
  }

  req.expressbeesAuthMode = verification.mode || "unknown";

  return next();
};

const verifyWhatsappMetaSignature = (req, res, next) => {
  const configuredSecret = String(process.env.WHATSAPP_APP_SECRET || "").trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (!configuredSecret) {
    if (isProduction) {
      return res.status(503).json({
        error: true,
        success: false,
        message: "WhatsApp app secret not configured",
      });
    }
    return next();
  }

  const verification = verifyWhatsappWebhookSignature({
    headers: req.headers,
    rawBody: req.rawBody,
    appSecret: configuredSecret,
  });

  if (!verification.ok) {
    return res.status(401).json({
      error: true,
      success: false,
      message: "Unauthorized WhatsApp webhook",
    });
  }

  req.whatsappAuthMode = verification.mode || "unknown";
  return next();
};

// If Expressbees cannot send headers, enforce an IP allowlist at the edge (WAF/NGINX).
router.post("/expressbees", verifyExpressbeesSecret, handleExpressbeesWebhook);
router.post("/xpressbees", verifyExpressbeesSecret, handleExpressbeesWebhook);
router.get("/whatsapp/meta", verifyWhatsappMetaWebhook);
router.get("/whatsapp", verifyWhatsappMetaWebhook);
router.post("/whatsapp/meta", verifyWhatsappMetaSignature, handleWhatsappMetaWebhook);
router.post("/whatsapp", verifyWhatsappMetaSignature, handleWhatsappMetaWebhook);

export default router;
