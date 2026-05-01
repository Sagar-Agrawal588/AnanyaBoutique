import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import CrmContact from "../models/crmContact.model.js";
import {
  getWhatsappMessageStatus,
  sendWhatsappMessage,
} from "../services/whatsapp/whatsappMessaging.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const TARGET =
  process.argv[2] || process.env.TEST_WHATSAPP_RECIPIENT || "+919983531243";

async function upsert(phone) {
  const p = String(phone || "").trim();
  const existing = await CrmContact.findOne({
    phone: { $in: [p, p.replace(/^\+/, "")] },
  });
  if (existing) {
    existing.consent = { ...(existing.consent || {}), whatsapp: true };
    await existing.save();
    return existing;
  }
  return CrmContact.create({
    name: "Dev Doc Recipient",
    phone: p,
    consent: { whatsapp: true },
    lifecycleStage: "customer",
    status: "converted",
  });
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI not set.");
    process.exit(1);
  }
  await mongoose.connect(mongoUri);
  await upsert(TARGET);

  console.log("Sending document (PDF) to", TARGET);
  const docUrl =
    "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
  let res;
  try {
    res = await sendWhatsappMessage({
      to: TARGET,
      mode: "document",
      mediaUrl: docUrl,
      mediaFilename: "dummy.pdf",
      mediaCaption: "Dev test PDF document",
      adminUserId: "dev-test-script",
    });
    console.log("Document send accepted:", res.messageId);
  } catch (err) {
    console.error("Document send failed:", err?.message || err);
  }

  console.log("Sending image (alternate URL) to", TARGET);
  try {
    const r2 = await sendWhatsappMessage({
      to: TARGET,
      mode: "image",
      mediaUrl: "https://via.placeholder.com/800x400.png?text=Dev+Image",
      mediaCaption: "Alt Dev Image",
      adminUserId: "dev-test-script",
    });
    console.log("Image send accepted:", r2.messageId);
  } catch (err) {
    console.error("Image send failed:", err?.message || err);
  }

  console.log("Sending GIF (alternate URL) to", TARGET);
  try {
    const r3 = await sendWhatsappMessage({
      to: TARGET,
      mode: "gif",
      mediaUrl: "https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif",
      mediaCaption: "Alt Dev GIF",
      mediaFilename: "giphy.gif",
      adminUserId: "dev-test-script",
    });
    console.log("GIF send accepted:", r3.messageId);
  } catch (err) {
    console.error("GIF send failed:", err?.message || err);
  }

  if (res && res.messageId) {
    console.log("Checking provider status for messageId", res.messageId);
    try {
      const status = await getWhatsappMessageStatus({
        messageId: res.messageId,
      });
      console.log("Provider status response:", JSON.stringify(status, null, 2));
    } catch (err) {
      console.error("Status query failed:", err?.message || err);
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(2);
});
