import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  listApprovedWhatsappTemplates,
  sendWhatsappMessage,
} from "../services/whatsapp/whatsappMessaging.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const RECIPIENT = process.env.TEST_WHATSAPP_RECIPIENT || "+918769027048";

const makeDummyVars = (count) =>
  Array.from({ length: count }, (_, i) => `Value${i + 1}`);

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI not set. Aborting.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  console.log("Fetching approved WhatsApp templates...");
  const templatesResult = await listApprovedWhatsappTemplates();
  const templates = Array.isArray(templatesResult?.templates)
    ? templatesResult.templates
    : [];

  const tmplWithVars = templates.find(
    (t) => Number(t.bodyVariableCount || 0) > 0,
  );
  if (!tmplWithVars) {
    console.error("No approved templates with placeholders found. Aborting.");
    await mongoose.disconnect();
    process.exit(2);
  }

  const varsCount = Number(tmplWithVars.bodyVariableCount || 0);
  const bodyVariables = makeDummyVars(varsCount);

  console.log(
    `Selected template: ${tmplWithVars.name} (expects ${varsCount} params)`,
  );
  console.log("Body preview:", tmplWithVars.bodyPreview || "N/A");
  console.log("Sending with variables:", bodyVariables);

  try {
    const result = await sendWhatsappMessage({
      to: RECIPIENT,
      mode: "template",
      templateName: tmplWithVars.name,
      languageCode: tmplWithVars.language || "en",
      bodyVariables,
      adminUserId: "dev-test-script",
    });

    console.log("Template send result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Template send failed:", err?.message || err);
    if (err?.details)
      console.error("Details:", JSON.stringify(err.details, null, 2));
    process.exitCode = 3;
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(4);
});
