import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import CrmContact from "../models/crmContact.model.js";
import CrmInteraction from "../models/crmInteraction.model.js";
import { sendWhatsappCampaign } from "../services/whatsapp/whatsappAdmin.service.js";
import { sendWhatsappMessage } from "../services/whatsapp/whatsappMessaging.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const A = process.env.TEST_WHATSAPP_RECIPIENT || "+918769027048";
const B = process.env.TEST_WHATSAPP_RECIPIENT_2 || "+919983531243";

const imageUrl =
  "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png";
const gifUrl =
  "https://res.cloudinary.com/demo/image/upload/v1/ananyaboutique/whatsapp/offer.gif";

async function upsertContact(phone, name) {
  const existing = await CrmContact.findOne({
    phone: { $in: [phone, phone.replace(/^\+/, "")] },
  });
  if (existing) {
    existing.name = name;
    existing.consent = { ...(existing.consent || {}), whatsapp: true };
    await existing.save();
    return existing;
  }

  return CrmContact.create({
    name,
    phone,
    consent: { whatsapp: true },
    lifecycleStage: "customer",
    status: "converted",
  });
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI not set. Aborting.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  const contactA = await upsertContact(A, "Dev Recipient A");
  const contactB = await upsertContact(B, "Dev Recipient B");
  console.log("Contacts ready:", contactA.phone, contactB.phone);

  // Send image to both
  for (const phone of [A, B]) {
    try {
      const res = await sendWhatsappMessage({
        to: phone,
        mode: "image",
        mediaUrl: imageUrl,
        mediaCaption: "Dev test image",
        adminUserId: "dev-test-script",
      });
      console.log("Image send result for", phone, ":", res.messageId || res);
    } catch (err) {
      console.error("Image send failed for", phone, err?.message || err);
    }
  }

  // Send gif to both
  for (const phone of [A, B]) {
    try {
      const res = await sendWhatsappMessage({
        to: phone,
        mode: "gif",
        mediaUrl: gifUrl,
        mediaCaption: "Dev test GIF",
        mediaFilename: "offer.gif",
        adminUserId: "dev-test-script",
      });
      console.log("GIF send result for", phone, ":", res.messageId || res);
    } catch (err) {
      console.error("GIF send failed for", phone, err?.message || err);
    }
  }

  // Run campaign using approved 'testing' template
  try {
    const campaignResult = await sendWhatsappCampaign(
      {
        templateName: "testing",
        campaignName: "Dev Campaign Test",
        segment: "all",
        limit: 10,
        languageCode: "en",
      },
      "dev-test-script",
    );

    console.log("Campaign result:", JSON.stringify(campaignResult, null, 2));
  } catch (err) {
    console.error("Campaign send failed:", err?.message || err);
  }

  // Fetch recent outbound CRM interactions related to whatsapp
  const interactions = await CrmInteraction.find({
    channel: "whatsapp",
    direction: "outbound",
  })
    .sort({ happenedAt: -1 })
    .limit(20)
    .populate("contact", "name phone")
    .lean();

  console.log("Recent outbound interactions:");
  interactions.forEach((it) => {
    console.log(
      `- ${it.happenedAt.toISOString()} | ${it.contact?.phone || it.contact} | ${it.eventName} | ${it.metadata?.messageType || ""} | ${it.metadata?.messageId || it.idempotencyKey || ""}`,
    );
  });

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(2);
});
