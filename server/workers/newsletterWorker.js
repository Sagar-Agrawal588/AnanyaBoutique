import dotenv from "dotenv";
dotenv.config();

import { PubSub } from "@google-cloud/pubsub";
import connectDb from "../config/connectDb.js";
import Newsletter from "../models/newsletter.model.js";
import UserModel from "../models/user.model.js";
import EmailLogModel from "../models/emailLog.model.js";
import { sendEmail } from "../config/emailService.js";

const getPublicApiUrl = () => {
  const raw =
    process.env.API_BASE_URL || process.env.BACKEND_URL || process.env.SERVER_URL || "https://api.ananyaboutique.com";
  return String(raw)
    .split(",")[0]
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "");
};

const buildNewsletterUnsubscribeUrl = (email, { confirm = false } = {}) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return "";
  const base = `${getPublicApiUrl()}/api/newsletter/unsubscribe?email=${encodeURIComponent(normalizedEmail)}`;
  return confirm ? `${base}&confirm=1` : base;
};

const TOPIC_NAME = process.env.NEWSLETTER_PUBSUB_TOPIC || "newsletter-broadcasts";
const SUBSCRIPTION_NAME =
  process.env.NEWSLETTER_PUBSUB_SUBSCRIPTION || "newsletter-broadcasts-sub";

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const renderBroadcastHtml = (html, email) => {
  const safeEmail = String(email || "").trim();
  return String(html || "")
    .replaceAll("{{email}}", safeEmail)
    .replaceAll("{{ year }}", String(new Date().getFullYear()))
    .replaceAll("{{year}}", String(new Date().getFullYear()));
};

const appendNewsletterUnsubscribeFooter = (html, email) => {
  const unsubscribeUrl = buildNewsletterUnsubscribeUrl(email);
  if (!unsubscribeUrl) return String(html || "");

  return `${String(html || "")}\n<div style="margin-top:18px;padding-top:14px;border-top:1px solid #e2e8f0;font-family:Arial,sans-serif;color:#64748b;font-size:12px;line-height:1.5;text-align:center;">Prefer not to receive newsletter emails? <a href="${unsubscribeUrl}" style="color:#0f766e;text-decoration:underline;">Unsubscribe</a></div>`;
};

const buildNewsletterUnsubscribeHeaders = (email) => {
  const oneClickUrl = buildNewsletterUnsubscribeUrl(email, { confirm: true });
  if (!oneClickUrl) return {};

  return {
    "List-Unsubscribe": `<${oneClickUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
};

const chunkArray = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

async function startWorker() {
  await connectDb();
  console.log("Newsletter worker connected to MongoDB");
  const pubsub = new PubSub();
  const subscription = pubsub.subscription(SUBSCRIPTION_NAME, {
    flowControl: { maxMessages: Number(process.env.NEWSLETTER_WORKER_CONCURRENCY || 10) },
  });

  const processPayload = async (payload, message) => {
    const statusFilter = payload.status || "active";
    const query = {};
    if (statusFilter === "active") query.isActive = true;
    if (statusFilter === "inactive") query.isActive = false;

    const subscribers = await Newsletter.find(query)
      .select("email isActive")
      .lean();

    let attempted = 0;
    let sent = 0;
    let failed = 0;

    const concurrency = Number(process.env.NEWSLETTER_WORKER_CONCURRENCY || 10);
    const batches = chunkArray(subscribers, concurrency);

    for (const batch of batches) {
      const promises = batch.map(async (subscriber) => {
        const email = String(subscriber?.email || "").trim().toLowerCase();
        attempted += 1;
        if (!email || !isValidEmail(email)) {
          failed += 1;
          return;
        }

        const user = await UserModel.findOne({
          email: {
            $regex: `^${email.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`,
            $options: "i",
          },
        })
          .select("_id email_opt_out notificationSettings")
          .lean();

        if (
          user?.email_opt_out === true ||
          user?.notificationSettings?.promotionalEmails === false ||
          user?.notificationSettings?.emailNotifications === false
        ) {
          await EmailLogModel.create({
            user_id: user?._id || null,
            to_email: email,
            email_type: "newsletter",
            template_type: "newsletterEmailTemplate",
            subject: payload.subject,
            status: "skipped",
            error_message: "User opted out from promotional emails",
          });
          return;
        }

        const emailLog = await EmailLogModel.create({
          user_id: user?._id || null,
          to_email: email,
          email_type: "newsletter",
          template_type: "newsletterEmailTemplate",
          subject: payload.subject,
          status: "queued",
        });

        const attachments = (payload.attachments || []).map((a) => ({
          filename: a.filename,
          content: a.content ? Buffer.from(String(a.content), "base64") : null,
          contentType: a.contentType,
        }));

        try {
          const result = await sendEmail({
            to: email,
            subject: payload.subject,
            html: appendNewsletterUnsubscribeFooter(
              renderBroadcastHtml(payload.html, email),
              email,
            ),
            text: payload.subject,
            context: "newsletter.broadcast",
            attachments,
            headers: buildNewsletterUnsubscribeHeaders(email),
          });

          if (result?.success) {
            sent += 1;
            await EmailLogModel.updateOne(
              { _id: emailLog._id },
              {
                $set: {
                  status: "sent",
                  sent_at: new Date(),
                  provider_message_id: String(result?.messageId || ""),
                },
              },
            );
          } else {
            failed += 1;
            await EmailLogModel.updateOne(
              { _id: emailLog._id },
              {
                $set: {
                  status: "failed",
                  error_message: String(result?.error || "Failed to send").slice(0, 1000),
                },
              },
            );
          }
        } catch (err) {
          failed += 1;
          await EmailLogModel.updateOne(
            { _id: emailLog._id },
            {
              $set: {
                status: "failed",
                error_message: String(err?.message || err).slice(0, 1000),
              },
            },
          );
        }
      });

      await Promise.all(promises);
      // No job object to update progress; we can log progress instead
      console.log(`Batch progress: attempted=${attempted} sent=${sent} failed=${failed}`);
    }

    // If invoked via Pub/Sub, message ack should be done by caller
    return { attempted, sent, failed };
  };

  subscription.on("message", async (message) => {
    let payload = null;
    try {
      payload = JSON.parse(message.data.toString());
    } catch (err) {
      console.error("Invalid message payload, acknowledging to drop:", err?.message || err);
      message.ack();
      return;
    }

    try {
      const result = await processPayload(payload, message);
      console.log("Processed newsletter payload:", result);
      message.ack();
    } catch (err) {
      console.error("Failed to process newsletter payload:", err?.message || err);
      // Let Pub/Sub redeliver by not acking, or nack if desired
      try {
        message.nack();
      } catch (e) {
        console.warn("message.nack() failed:", e?.message || e);
      }
    }
  });

  subscription.on("error", (err) => {
    console.error("Pub/Sub subscription error:", err?.message || err);
  });

  console.log("Newsletter Pub/Sub worker started, listening on subscription:", SUBSCRIPTION_NAME);
}

startWorker().catch((err) => {
  console.error("Newsletter worker fatal error:", err);
  process.exit(1);
});
