import admin from "firebase-admin";
import { sendEmail, sendTemplatedEmail } from "../config/emailService.js";
import { isFirebaseReady } from "../config/firebaseAdmin.js";
import EmailLogModel from "../models/emailLog.model.js";
import Newsletter from "../models/newsletter.model.js";
import SettingsModel from "../models/settings.model.js";
import UserModel from "../models/user.model.js";
import { logger } from "../utils/errorHandler.js";

const isProduction = process.env.NODE_ENV === "production";
// Debug-only logging to keep production output clean
const debugLog = (...args) => {
  if (!isProduction) {
    console.log(...args);
  }
};

const ALLOWED_SOURCES = new Set([
  "footer",
  "popup",
  "checkout",
  "blogs",
  "guest_order",
  "signin_order",
  "other",
]);

const NEWSLETTER_TEMPLATE_SETTING_KEY = "newsletterEmailTemplate";
const DEFAULT_NEWSLETTER_SUBJECT = "Latest updates from HealthyOneGram";
const DEFAULT_NEWSLETTER_HTML = `
<div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #1f2937; line-height: 1.6;">
  <h1 style="margin-bottom: 12px;">HealthyOneGram Newsletter</h1>
  <p>Hello {{email}},</p>
  <p>Thanks for being part of our community. This is your newsletter content preview.</p>
  <p>Update this template from the admin panel before sending.</p>
</div>
`.trim();

const resolveBroadcastEnabled = () => {
  const raw = String(process.env.NEWSLETTER_BROADCAST_ENABLED || "")
    .trim()
    .toLowerCase();

  if (!raw) {
    return process.env.NODE_ENV !== "production";
  }

  if (["0", "false", "no", "off", "disabled"].includes(raw)) {
    return false;
  }

  return ["1", "true", "yes", "on", "enabled"].includes(raw);
};

const normalizeTemplatePayload = (value = {}) => {
  const subject = String(value.subject || "").trim();
  const html = String(value.html || "").trim();
  return {
    subject: subject || DEFAULT_NEWSLETTER_SUBJECT,
    html: html || DEFAULT_NEWSLETTER_HTML,
    updatedAt: new Date(),
  };
};

const getStoredNewsletterTemplate = async () => {
  const setting = await SettingsModel.findOne({
    key: NEWSLETTER_TEMPLATE_SETTING_KEY,
    isActive: true,
  })
    .select("value")
    .lean();

  return normalizeTemplatePayload(setting?.value || {});
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

const getBroadcastAttachments = (req) => {
  const files = Array.isArray(req?.files) ? req.files : [];

  return files
    .map((file) => {
      if (!file?.buffer) return null;

      return {
        filename: String(file.originalname || file.filename || "attachment"),
        content: file.buffer,
        contentType: String(file.mimetype || "application/octet-stream"),
      };
    })
    .filter(Boolean);
};

const normalizeSource = (source) => {
  const value = String(source || "")
    .trim()
    .toLowerCase();
  return ALLOWED_SOURCES.has(value) ? value : "other";
};

const getPublicSiteUrl = () => {
  const raw =
    process.env.CLIENT_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://healthyonegram.com";
  const first = String(raw).split(",")[0].trim();
  return first.replace(/\/+$/, "");
};

const getPublicApiUrl = () => {
  const raw =
    process.env.API_BASE_URL ||
    process.env.BACKEND_URL ||
    process.env.SERVER_URL ||
    "https://healthy-one-gram.el.r.appspot.com";
  return String(raw).split(",")[0].trim().replace(/\/+$/, "");
};

const buildNewsletterUnsubscribeUrl = (email, { confirm = false } = {}) => {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail) return "";
  const base = `${getPublicApiUrl()}/api/newsletter/unsubscribe?email=${encodeURIComponent(normalizedEmail)}`;
  return confirm ? `${base}&confirm=1` : base;
};

const buildNewsletterUnsubscribeHeaders = (email) => {
  const oneClickUrl = buildNewsletterUnsubscribeUrl(email, { confirm: true });
  if (!oneClickUrl) return {};

  return {
    "List-Unsubscribe": `<${oneClickUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
};

const renderNewsletterUnsubscribePage = ({
  title,
  message,
  showConfirm = false,
  confirmUrl = "",
}) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;background:#f7fafc;font-family:'Segoe UI',Arial,sans-serif;color:#1a202c;">
    <div style="max-width:560px;margin:56px auto;padding:20px;">
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 8px 30px rgba(15,23,42,.06);">
        <h1 style="margin:0 0 10px;font-size:24px;line-height:1.25;color:#0f172a;">${title}</h1>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">${message}</p>
        ${
          showConfirm
            ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;"><a href="${confirmUrl}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:600;">Unsubscribe</a><a href="${getPublicSiteUrl()}" style="display:inline-block;background:#f8fafc;color:#0f172a;text-decoration:none;padding:10px 16px;border-radius:10px;border:1px solid #d1d5db;font-weight:600;">Cancel</a></div>`
            : ""
        }
        <div style="margin-top:18px;padding:12px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;font-size:13px;">You can manage your preferences anytime from account settings or support.</div>
      </div>
    </div>
  </body>
</html>`;

const applyUserEmailOptOut = async (email, optedOut) => {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail) return;

  await UserModel.updateMany(
    {
      email: {
        $regex: `^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    },
    {
      $set: {
        email_opt_out: Boolean(optedOut),
        "notificationSettings.promotionalEmails": !Boolean(optedOut),
      },
    },
  );
};
/**
 * Generate welcome email HTML template
 * @param {string} email - Subscriber email
 * @returns {string} - HTML email template
 */
const getWelcomeEmailTemplate = (email) => {
  const siteUrl = getPublicSiteUrl();
  const unsubscribeUrl = buildNewsletterUnsubscribeUrl(email);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to HealthyOneGram Family</title>
</head>
<body style="margin:0;padding:0;font-family:Segoe UI,Arial,sans-serif;background:#f9f5f0;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:linear-gradient(135deg,#c1591c 0%,#e07830 100%);padding:32px 24px;text-align:center;color:#fff;">
      <h1 style="margin:0;font-size:26px;">Welcome to HealthyOneGram</h1>
      <p style="margin:10px 0 0;font-size:15px;">Your healthy shopping journey starts here.</p>
    </div>

    <div style="padding:28px 24px;color:#444;line-height:1.6;">
      <p>Thank you for subscribing with <strong>${email}</strong>.</p>
      <p>You will receive product updates, special offers, and healthy recipes.</p>
      <p><a href="${siteUrl}/products" style="display:inline-block;background:#c1591c;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;">Explore Products</a></p>
      <p style="margin:14px 0 0;font-size:13px;color:#6b5b4d;">Prefer fewer updates? <a href="${unsubscribeUrl}" style="color:#c1591c;text-decoration:underline;">Unsubscribe</a>.</p>
      <p style="margin-top:18px;">Regards,<br><strong>HealthyOneGram Team</strong></p>
    </div>

    <div style="background:#2c2c2c;padding:20px 24px;color:#aaa;font-size:12px;">
      <p style="margin:0;">&copy; ${new Date().getFullYear()} HealthyOneGram. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Send welcome email to new subscriber
 * @param {string} email - Subscriber email
 */
const sendWelcomeEmail = async (email) => {
  try {
    const siteUrl = getPublicSiteUrl();
    const unsubscribeUrl = buildNewsletterUnsubscribeUrl(email);
    const subject = "Welcome to the HealthyOneGram Family!";
    const text = `Welcome to HealthyOneGram! Thank you for subscribing to our newsletter. You'll now receive updates about exclusive discounts, new products, and healthy recipes. Visit us at ${siteUrl}`;

    const templateResult = await sendTemplatedEmail({
      to: email,
      subject,
      templateFile: "newsletterConfirmation.html",
      templateData: {
        subscriber_email: email,
        site_url: siteUrl,
        products_url: `${siteUrl}/products`,
        unsubscribe_url: unsubscribeUrl,
        year: String(new Date().getFullYear()),
      },
      text,
      context: "newsletter.welcome",
      headers: buildNewsletterUnsubscribeHeaders(email),
    });

    const result = templateResult?.success
      ? templateResult
      : await sendEmail({
          to: email,
          subject,
          text,
          html: getWelcomeEmailTemplate(email),
          context: "newsletter.welcome.fallback",
          headers: buildNewsletterUnsubscribeHeaders(email),
        });

    if (result.success) {
      debugLog(`Welcome email sent to: ${email}`);
    } else {
      logger.error(
        "newsletter.sendWelcomeEmail",
        "Failed to send welcome email",
        {
          email,
          error: result.error,
        },
      );
    }

    return result;
  } catch (error) {
    logger.error("newsletter.sendWelcomeEmail", "Unexpected email error", {
      email,
      error: error?.message || String(error),
    });
    return { success: false, error: error.message };
  }
};

/**
 * Save subscriber to Firebase Firestore
 * @param {Object} subscriberData - Subscriber data to save
 * @returns {Promise<boolean>} - Success status
 */
const saveToFirebase = async (subscriberData) => {
  try {
    if (!isFirebaseReady()) {
      debugLog("Firebase not configured, skipping Firestore save");
      return false;
    }

    const db = admin.firestore();
    const subscribersRef = db.collection("newsletter_subscribers");

    // Use email as document ID for easy lookup
    const docId = subscriberData.email.replace(/[.@]/g, "_");

    await subscribersRef.doc(docId).set(
      {
        email: subscriberData.email,
        source: subscriberData.source || "footer",
        isActive: true,
        subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    debugLog(`Subscriber saved to Firebase: ${subscriberData.email}`);
    return true;
  } catch (error) {
    console.error("Firebase save error:", error.message);
    return false;
  }
};

/**
 * Update subscriber status in Firebase Firestore
 * @param {string} email - Subscriber email
 * @param {boolean} isActive - Active status
 */
const updateFirebaseSubscriber = async (email, isActive) => {
  try {
    if (!isFirebaseReady()) return false;

    const db = admin.firestore();
    const docId = email.replace(/[.@]/g, "_");

    await db
      .collection("newsletter_subscribers")
      .doc(docId)
      .update({
        isActive,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(isActive
          ? {}
          : { unsubscribedAt: admin.firestore.FieldValue.serverTimestamp() }),
      });

    return true;
  } catch (error) {
    console.error("Firebase update error:", error.message);
    return false;
  }
};

/**
 * Email validation helper
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Subscribe to newsletter
export const subscribe = async (req, res) => {
  try {
    const { email, source = "footer" } = req.body;
    const normalizedSource = normalizeSource(source || "footer");
    const schemaSources = Newsletter?.schema?.path("source")?.enumValues || [];
    const safeSource = schemaSources.includes(normalizedSource)
      ? normalizedSource
      : "other";

    // Validate email presence
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Validate email format
    const normalizedEmail = email.toLowerCase().trim();
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // Check if email already exists in MongoDB
    const existingSubscriber = await Newsletter.findOne({
      email: normalizedEmail,
    });

    if (existingSubscriber) {
      // If already subscribed and active
      if (existingSubscriber.isActive) {
        return res.status(200).json({
          success: true,
          message: "You're already subscribed to our newsletter!",
          alreadySubscribed: true,
        });
      }

      // If previously unsubscribed, reactivate
      existingSubscriber.isActive = true;
      existingSubscriber.unsubscribedAt = null;
      existingSubscriber.subscribedAt = new Date();
      await existingSubscriber.save();
      await applyUserEmailOptOut(normalizedEmail, false);

      // Also update in Firebase
      await updateFirebaseSubscriber(normalizedEmail, true);

      // Send welcome back email (awaited for reliable logging)
      await sendWelcomeEmail(normalizedEmail);

      return res.status(200).json({
        success: true,
        message: "Welcome back! You've been resubscribed to our newsletter.",
      });
    }

    // Create new subscriber in MongoDB
    const newSubscriber = await Newsletter.create({
      email: normalizedEmail,
      source: safeSource,
    });

    // Also save to Firebase Firestore
    await saveToFirebase({
      email: normalizedEmail,
      source: safeSource,
    });

    await applyUserEmailOptOut(normalizedEmail, false);

    // Send welcome email to new subscriber (awaited for reliable logging)
    await sendWelcomeEmail(normalizedEmail);

    res.status(201).json({
      success: true,
      message: "Thank you for subscribing to our newsletter!",
      subscriber: {
        email: newSubscriber.email,
        subscribedAt: newSubscriber.subscribedAt,
      },
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(200).json({
        success: true,
        message: "You're already subscribed to our newsletter!",
        alreadySubscribed: true,
      });
    }

    // Handle validation error
    if (error.name === "ValidationError") {
      const errorMessages = Object.values(error.errors || {}).map(
        (err) => err.message,
      );
      const message =
        error.errors?.email?.message ||
        errorMessages[0] ||
        "Invalid subscription details";
      return res.status(400).json({
        success: false,
        message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to subscribe. Please try again later.",
    });
  }
};

// Unsubscribe from newsletter
export const unsubscribe = async (req, res) => {
  try {
    const email = String(req.body?.email || req.query?.email || "").trim();
    const isBrowserGet = String(req.method || "").toUpperCase() === "GET";
    const shouldConfirm = ["1", "true", "yes", "on"].includes(
      String(req.query?.confirm || "")
        .trim()
        .toLowerCase(),
    );

    const sendResponse = (status, payload) => {
      if (isBrowserGet) {
        const success = payload?.success === true;
        const heading = success ? "You unsubscribed" : "Unable to unsubscribe";
        return res
          .status(status)
          .set("Content-Type", "text/html; charset=utf-8")
          .send(
            renderNewsletterUnsubscribePage({
              title: heading,
              message: String(payload?.message || ""),
            }),
          );
      }

      return res.status(status).json(payload);
    };

    if (!email) {
      return sendResponse(400, {
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (isBrowserGet && !shouldConfirm) {
      return res
        .status(200)
        .set("Content-Type", "text/html; charset=utf-8")
        .send(
          renderNewsletterUnsubscribePage({
            title: "Unsubscribe from HealthyOneGram",
            message:
              "Do you want to stop receiving newsletter emails from HealthyOneGram?",
            showConfirm: true,
            confirmUrl: buildNewsletterUnsubscribeUrl(normalizedEmail, {
              confirm: true,
            }),
          }),
        );
    }

    const subscriber = await Newsletter.findOne({ email: normalizedEmail });

    if (!subscriber) {
      return sendResponse(404, {
        success: false,
        message: "Email not found in our newsletter list",
      });
    }

    subscriber.isActive = false;
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();
    await applyUserEmailOptOut(normalizedEmail, true);

    // Also update in Firebase
    await updateFirebaseSubscriber(normalizedEmail, false);

    return sendResponse(200, {
      success: true,
      message: "You have been unsubscribed from our newsletter",
    });
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to unsubscribe. Please try again later.",
    });
  }
};

// Get all subscribers (Admin only)
export const getAllSubscribers = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "all" } = req.query;

    const query = {};
    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;

    const subscribers = await Newsletter.find(query)
      .sort({ subscribedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Newsletter.countDocuments(query);
    const activeCount = await Newsletter.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      subscribers,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
      stats: {
        total,
        active: activeCount,
        inactive: total - activeCount,
      },
    });
  } catch (error) {
    console.error("Get subscribers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscribers",
    });
  }
};

// Delete subscriber (Admin only)
export const deleteSubscriber = async (req, res) => {
  try {
    const { id } = req.params;

    const subscriber = await Newsletter.findByIdAndDelete(id);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "Subscriber not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Subscriber deleted successfully",
    });
  } catch (error) {
    console.error("Delete subscriber error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete subscriber",
    });
  }
};

export const getAdminNewsletterTemplate = async (_req, res) => {
  try {
    const template = await getStoredNewsletterTemplate();
    return res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("Get newsletter template error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch newsletter template",
    });
  }
};

export const updateAdminNewsletterTemplate = async (req, res) => {
  try {
    const { subject, html } = req.body || {};
    const template = normalizeTemplatePayload({ subject, html });
    const adminId = req.user?.id || req.user || null;

    await SettingsModel.findOneAndUpdate(
      { key: NEWSLETTER_TEMPLATE_SETTING_KEY },
      {
        $set: {
          value: template,
          description: "Newsletter HTML template for admin broadcasts",
          category: "notification",
          updatedBy: adminId,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({
      success: true,
      message: "Newsletter template saved",
      data: template,
    });
  } catch (error) {
    console.error("Update newsletter template error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save newsletter template",
    });
  }
};

export const sendNewsletterBroadcast = async (req, res) => {
  try {
    if (!resolveBroadcastEnabled()) {
      return res.status(403).json({
        success: false,
        message:
          "Broadcast sending is disabled. Set NEWSLETTER_BROADCAST_ENABLED=true to enable.",
      });
    }

    const { subject, html, status = "active" } = req.body || {};
    const attachments = getBroadcastAttachments(req);
    const storedTemplate = await getStoredNewsletterTemplate();
    const template = normalizeTemplatePayload({
      subject: subject || storedTemplate.subject,
      html: html || storedTemplate.html,
    });

    const query = {};
    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;

    const subscribers = await Newsletter.find(query)
      .select("email isActive")
      .lean();

    if (!subscribers.length) {
      return res.status(200).json({
        success: true,
        message: "No subscribers available for broadcast",
        data: {
          attempted: 0,
          sent: 0,
          failed: 0,
        },
      });
    }

    let sent = 0;
    let failed = 0;

    for (const subscriber of subscribers) {
      const email = String(subscriber?.email || "")
        .trim()
        .toLowerCase();
      if (!email || !isValidEmail(email)) {
        failed += 1;
        continue;
      }

      const user = await UserModel.findOne({
        email: {
          $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
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
          subject: template.subject,
          status: "skipped",
          error_message: "User opted out from promotional emails",
        });
        continue;
      }

      const emailLog = await EmailLogModel.create({
        user_id: user?._id || null,
        to_email: email,
        email_type: "newsletter",
        template_type: "newsletterEmailTemplate",
        subject: template.subject,
        status: "queued",
      });

      const result = await sendEmail({
        to: email,
        subject: template.subject,
        html: appendNewsletterUnsubscribeFooter(
          renderBroadcastHtml(template.html, email),
          email,
        ),
        text: template.subject,
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
              error_message: String(result?.error || "Failed to send").slice(
                0,
                1000,
              ),
            },
          },
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Newsletter broadcast processed",
      data: {
        attempted: subscribers.length,
        sent,
        failed,
        attachments: attachments.map((item) => item.filename),
      },
    });
  } catch (error) {
    console.error("Newsletter broadcast error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send newsletter broadcast",
    });
  }
};

// Backward-compatible campaign endpoints used by admin UI/routes
export const getCampaignTemplate = async (_req, res) => {
  try {
    const template = await getStoredNewsletterTemplate();
    return res.status(200).json({
      success: true,
      template: {
        subject: template.subject,
        html: template.html,
        text: "",
      },
      updatedAt: template.updatedAt || null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch newsletter template",
    });
  }
};

export const updateCampaignTemplate = async (req, res) => {
  try {
    const { subject, html } = req.body || {};
    const template = normalizeTemplatePayload({ subject, html });
    const adminId = req.user?.id || req.user || null;

    await SettingsModel.findOneAndUpdate(
      { key: NEWSLETTER_TEMPLATE_SETTING_KEY },
      {
        $set: {
          value: template,
          description: "Newsletter HTML template for admin broadcasts",
          category: "notification",
          updatedBy: adminId,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({
      success: true,
      message: "Newsletter template saved",
      template: {
        subject: template.subject,
        html: template.html,
        text: "",
      },
      updatedAt: template.updatedAt || null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to save newsletter template",
    });
  }
};

export const sendCampaign = async (req, res) => {
  try {
    const mode = String(req.body?.mode || "active")
      .trim()
      .toLowerCase();
    const storedTemplate = await getStoredNewsletterTemplate();
    const template = normalizeTemplatePayload({
      subject: req.body?.subject || storedTemplate.subject,
      html: req.body?.html || storedTemplate.html,
    });

    if (mode === "test") {
      const testEmail = String(req.body?.testEmail || "")
        .trim()
        .toLowerCase();
      if (!testEmail || !isValidEmail(testEmail)) {
        return res.status(400).json({
          success: false,
          message: "Valid testEmail is required for test mode",
        });
      }

      const result = await sendEmail({
        to: testEmail,
        subject: template.subject,
        html: appendNewsletterUnsubscribeFooter(
          renderBroadcastHtml(template.html, testEmail),
          testEmail,
        ),
        text: template.subject,
        context: "newsletter.campaign.test",
        headers: buildNewsletterUnsubscribeHeaders(testEmail),
      });

      return res.status(result?.success ? 200 : 502).json({
        success: Boolean(result?.success),
        message: result?.success
          ? "Test newsletter sent"
          : "Failed to send test newsletter",
        result,
      });
    }

    req.body = {
      ...req.body,
      subject: template.subject,
      html: template.html,
      status: "active",
    };
    return sendNewsletterBroadcast(req, res);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to send newsletter campaign",
    });
  }
};
