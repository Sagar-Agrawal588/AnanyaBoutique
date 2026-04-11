import { logger } from "../utils/errorHandler.js";
import {
  ingestWhatsappWebhookPayload,
  verifyWhatsappWebhookSubscription,
} from "../services/whatsapp/whatsappWebhook.service.js";

export const verifyWhatsappMetaWebhook = async (req, res) => {
  const verification = verifyWhatsappWebhookSubscription({
    mode: req.query?.["hub.mode"] || "",
    verifyToken: req.query?.["hub.verify_token"] || "",
    challenge: req.query?.["hub.challenge"] || "",
    expectedVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "",
  });

  if (!verification.ok) {
    return res.status(verification.statusCode).json({
      error: true,
      success: false,
      message: verification.message,
    });
  }

  return res.status(200).send(verification.challenge);
};

export const handleWhatsappMetaWebhook = async (req, res) => {
  try {
    const result = await ingestWhatsappWebhookPayload(req.body);

    logger.info("whatsapp.webhook", "WhatsApp webhook processed", {
      processedCount: result.processedCount,
      entries: Array.isArray(req.body?.entry) ? req.body.entry.length : 0,
    });

    return res.status(200).json({
      error: false,
      success: true,
      processedCount: result.processedCount,
    });
  } catch (error) {
    logger.error("whatsapp.webhook", "Failed to process WhatsApp webhook", {
      error: error?.message || String(error),
    });

    return res.status(500).json({
      error: true,
      success: false,
      message: "Failed to process WhatsApp webhook.",
    });
  }
};
