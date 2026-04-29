import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import CrmContact from "../models/crmContact.model.js";
import CrmInteraction from "../models/crmInteraction.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const numbers = process.argv.slice(2);
if (numbers.length === 0) {
  console.error(
    "Usage: node inspect_media_interactions.mjs <number1> [number2 ...]",
  );
  process.exit(1);
}

const normalizeVariants = (phone) => [
  phone,
  phone.replace(/^\+/, ""),
  `+91${phone.replace(/^\+91/, "")}`,
];

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI not set.");
    process.exit(2);
  }
  await mongoose.connect(mongoUri);

  for (const num of numbers) {
    console.log("---", num, "---");
    const variants = normalizeVariants(num);
    const contact = await CrmContact.findOne({
      phone: { $in: variants },
    }).lean();
    if (!contact) {
      console.log("No CRM contact found for", num);
    }

    const interactions = await CrmInteraction.find({
      $or: [
        { contact: contact?._id || null },
        { "metadata.phone": { $in: variants } },
      ],
      channel: "whatsapp",
      direction: "outbound",
      $or: [
        { eventName: "whatsapp_image" },
        { eventName: "whatsapp_gif" },
        { eventName: "whatsapp_template" },
        { eventName: "whatsapp_text" },
      ],
    })
      .sort({ happenedAt: -1 })
      .limit(20)
      .lean();

    if (!interactions || interactions.length === 0) {
      console.log("No recent WhatsApp outbound interactions for", num);
      continue;
    }

    interactions.forEach((it) => {
      const meta = it.metadata || {};
      console.log(`Time: ${it.happenedAt.toISOString()}`);
      console.log(
        `  Event: ${it.eventName} | Type: ${meta.messageType || ""} | ProviderType: ${meta.providerPayloadType || ""}`,
      );
      console.log(`  messageId: ${meta.messageId || ""}`);
      if (meta.mediaUrl) console.log(`  mediaUrl: ${meta.mediaUrl}`);
      if (meta.mediaFilename)
        console.log(`  mediaFilename: ${meta.mediaFilename}`);
      if (meta.mediaCaption)
        console.log(`  mediaCaption: ${meta.mediaCaption}`);
      if (meta.providerPayloadType)
        console.log(`  providerPayloadType: ${meta.providerPayloadType}`);
      console.log(`  preview/body: ${it.message || meta.bodyPreview || ""}`);
      console.log("");
    });
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Error:", err?.message || err);
  process.exit(3);
});
