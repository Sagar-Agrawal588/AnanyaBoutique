import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sendWhatsappMessage } from "../services/whatsapp/whatsappMessaging.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const RECIPIENTS = ["+919983531243", "+918769027048"];
const IMAGE_URL =
  "https://via.placeholder.com/800x450.png?text=BuyOneGram+Test+Image";

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI not set. Aborting.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  for (const to of RECIPIENTS) {
    try {
      const result = await sendWhatsappMessage({
        to,
        mode: "image",
        mediaUrl: IMAGE_URL,
        mediaCaption: "Test image from CRM admin upload flow",
        adminUserId: "dev-test-script",
      });
      console.log(
        `Image send accepted for ${to}: ${result.messageId || "N/A"}`,
      );
    } catch (error) {
      console.error(
        `Image send failed for ${to}: ${error?.message || String(error)}`,
      );
      if (error?.details) {
        console.error("Details:", JSON.stringify(error.details, null, 2));
      }
    }
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Unhandled error:", error?.message || error);
  process.exit(2);
});
