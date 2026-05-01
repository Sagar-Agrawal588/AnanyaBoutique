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
    "Usage: node check_interactions_for_numbers.mjs <number1> [number2 ...]",
  );
  process.exit(1);
}

async function findContactByPhone(phone) {
  const normalized = String(phone || "").trim();
  const variants = [normalized, normalized.replace(/^\+/, "")];
  return CrmContact.findOne({ phone: { $in: variants } }).lean();
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI not set.");
    process.exit(2);
  }
  await mongoose.connect(mongoUri);

  for (const num of numbers) {
    console.log("--- Checking", num, "---");
    const contact = await findContactByPhone(num);
    if (!contact) {
      console.log("No CRM contact found for", num);
      // still search interactions by metadata.phone
      const interactions = await CrmInteraction.find({
        $or: [
          { "metadata.phone": num },
          { "metadata.phone": `+91${num}` },
          { "metadata.phone": num.replace(/^\+/, "") },
        ],
      })
        .sort({ happenedAt: -1 })
        .limit(20)
        .lean();
      if (interactions.length === 0) {
        console.log("No interactions found for", num);
      } else {
        console.log("Found interactions (no contact):");
        interactions.forEach((it) => {
          console.log(
            `${it.happenedAt.toISOString()} | ${it.eventName} | ${it.metadata?.messageType || ""} | ${it.metadata?.messageId || ""} | ${it.message || it.metadata?.bodyPreview || ""}`,
          );
        });
      }
      continue;
    }

    console.log(
      "Contact:",
      contact.name || "(no name)",
      contact.phone || "no phone",
      "consent:",
      JSON.stringify(contact.consent || {}),
    );
    const interactions = await CrmInteraction.find({ contact: contact._id })
      .sort({ happenedAt: -1 })
      .limit(50)
      .lean();
    if (interactions.length === 0) {
      console.log("No interactions for contact.");
    } else {
      interactions.forEach((it) => {
        console.log(
          `${it.happenedAt.toISOString()} | ${it.eventName} | ${it.direction} | ${it.metadata?.messageType || ""} | ${it.metadata?.messageId || ""} | ${it.message?.slice(0, 80) || it.metadata?.bodyPreview || ""}`,
        );
      });
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Error:", err?.message || err);
  process.exit(3);
});
