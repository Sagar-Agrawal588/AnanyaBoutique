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
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI not set. Aborting.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  try {
    console.log("Sending approved template `testing` to", RECIPIENT);
    const result = await sendWhatsappMessage({
      to: RECIPIENT,
      mode: "template",
      templateName: "testing",
      languageCode: "en",
      bodyVariables: [],
      adminUserId: "dev-test-script",
    });

    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Failed:", err?.message || err);
    if (err?.details)
      console.error("Details:", JSON.stringify(err.details, null, 2));
    process.exitCode = 2;
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(3);
});
