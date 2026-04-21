import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAccessTokenSecret } from "../config/authSecrets.js";
import connectDb from "../config/connectDb.js";
import { sendTemplatedEmail } from "../config/emailService.js";
import UserModel from "../models/user.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.resolve(serverRoot, ".env") });

const normalizeBaseUrl = (value) =>
  String(value || "")
    .split(",")[0]
    .trim()
    .replace(/\/+$/, "");

const resolveBackendBaseUrl = () => {
  const candidate =
    normalizeBaseUrl(process.env.BACKEND_URL) ||
    normalizeBaseUrl(process.env.API_BASE_URL) ||
    normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL) ||
    "http://localhost:8000";

  return /\/api$/i.test(candidate) ? candidate : `${candidate}/api`;
};

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const resolveTargetEmail = () => {
  const cliEmail = process.argv.find((arg) => arg.startsWith("--email="));
  if (cliEmail) {
    return normalizeEmail(cliEmail.slice("--email=".length));
  }

  return normalizeEmail(
    process.env.TEST_PROMO_EMAIL ||
      process.env.SUPPORT_ADMIN_EMAIL ||
      process.env.EMAIL_FROM_ADDRESS ||
      process.env.SMTP_USER ||
      "",
  );
};

const getUnsubscribeSecret = () =>
  String(
    process.env.PROMOTIONAL_UNSUBSCRIBE_SECRET || getAccessTokenSecret() || "",
  ).trim();

const createToken = (email) => {
  const secret = getUnsubscribeSecret();
  if (!secret) {
    throw new Error(
      "Missing unsubscribe secret. Set PROMOTIONAL_UNSUBSCRIBE_SECRET or ACCESS_TOKEN_SECRET.",
    );
  }

  return jwt.sign(
    {
      type: "promotional_unsubscribe",
      email,
    },
    secret,
    { expiresIn: "90d" },
  );
};

const run = async () => {
  const targetEmail = resolveTargetEmail();
  if (!targetEmail) {
    throw new Error(
      "Target email missing. Pass --email=<user@example.com> or set TEST_PROMO_EMAIL.",
    );
  }

  const apiBaseUrl = resolveBackendBaseUrl();
  await connectDb();

  const existingUser = await UserModel.findOne({ email: targetEmail })
    .select("email name notificationSettings.promotionalEmails")
    .lean();

  if (!existingUser) {
    throw new Error(`User not found for ${targetEmail}`);
  }

  // Force opted-in before sending and before unsubscribe verification.
  await UserModel.updateOne(
    { email: targetEmail },
    {
      $set: {
        "notificationSettings.promotionalEmails": true,
      },
    },
  );

  const token = createToken(targetEmail);
  const unsubscribeUrl = `${apiBaseUrl}/notifications/unsubscribe/promotional?token=${encodeURIComponent(token)}`;

  const emailResult = await sendTemplatedEmail({
    to: targetEmail,
    subject: "Promotional unsubscribe flow test",
    templateFile: "promotionalOffer.html",
    templateData: {
      customer_name: String(existingUser.name || "Customer").trim(),
      headline: "Promotional test campaign",
      message:
        "This is a controlled test email to validate promotional unsubscribe behavior.",
      offer_details: "Test-only offer details",
      coupon_code: "Coupon code: TESTPROMO",
      discount_text: "Discount: 5% OFF",
      cta_label: "Open store",
      cta_url: "https://healthyonegram.com/products",
      valid_until: "Valid until: Test run",
      site_url: "https://healthyonegram.com",
      support_contact: "support@healthyonegram.com",
      support_url: "https://healthyonegram.com/contact",
      unsubscribe_url: unsubscribeUrl,
      year: String(new Date().getFullYear()),
    },
    text: [
      "Promotional unsubscribe flow test",
      "Use this email only for unsubscribe validation.",
      `Unsubscribe: ${unsubscribeUrl}`,
    ].join("\n"),
    context: "promotional.unsubscribe.flow.test",
  });

  const unsubscribeResponse = await fetch(
    `${apiBaseUrl}/notifications/unsubscribe/promotional`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ token }),
    },
  );

  let unsubscribePayload = null;
  try {
    unsubscribePayload = await unsubscribeResponse.json();
  } catch {
    unsubscribePayload = null;
  }

  const updatedUser = await UserModel.findOne({ email: targetEmail })
    .select("notificationSettings.promotionalEmails")
    .lean();

  const unsubscribed =
    updatedUser?.notificationSettings?.promotionalEmails === false;

  const output = {
    targetEmail,
    apiBaseUrl,
    emailSent: Boolean(emailResult?.success),
    emailMessageId: emailResult?.messageId || null,
    unsubscribeEndpointStatus: unsubscribeResponse.status,
    unsubscribeEndpointSuccess: Boolean(unsubscribePayload?.success),
    unsubscribed,
    unsubscribeUrl,
  };

  console.log(JSON.stringify(output, null, 2));

  if (!emailResult?.success || !unsubscribeResponse.ok || !unsubscribed) {
    process.exitCode = 1;
  }
};

run()
  .catch((error) => {
    console.error("Promotional unsubscribe flow test failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // noop
    }
  });
