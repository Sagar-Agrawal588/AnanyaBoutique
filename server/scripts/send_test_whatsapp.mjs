import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sendWhatsappMessage } from "../services/whatsapp/whatsappMessaging.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const RECIPIENT =
  process.argv[2] || process.env.TEST_WHATSAPP_RECIPIENT || "+918769027048";

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI is not set in environment. Aborting.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("Connected. Sending WhatsApp message to", RECIPIENT);

  try {
    const result = await sendWhatsappMessage({
      to: RECIPIENT,
      mode: "text",
      body: "Dev test: please reply to confirm receipt. — Ananya Boutique dev",
      adminUserId: "dev-test-script",
    });

    console.log("Send result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Send failed:", err && err.message ? err.message : err);
    if (err && err.details)
      console.error("Details:", JSON.stringify(err.details, null, 2));
    process.exitCode = 2;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(3);
});
