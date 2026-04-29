import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listApprovedWhatsappTemplates } from "../services/whatsapp/whatsappMessaging.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function main() {
  const result = await listApprovedWhatsappTemplates();
  const templates = Array.isArray(result?.templates) ? result.templates : [];
  if (templates.length === 0) {
    console.log("No approved templates found.");
    return;
  }

  templates.forEach((t, i) => {
    console.log(`--- Template ${i + 1} ---`);
    console.log("name:", t.name);
    console.log("language:", t.language);
    console.log("status:", t.status);
    console.log("bodyVariableCount:", t.bodyVariableCount || 0);
    console.log("bodyPreview:", t.bodyPreview || "(none)");
    console.log("");
  });
}

main().catch((err) => {
  console.error("Failed to list templates:", err?.message || err);
  process.exit(1);
});
