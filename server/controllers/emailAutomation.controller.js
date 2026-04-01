import NewsletterModel from "../models/newsletter.model.js";
import UserModel from "../models/user.model.js";
import OrderModel from "../models/order.model.js";
import EmailLogModel from "../models/emailLog.model.js";
import { renderEmailTemplate, sendEmail } from "../config/emailService.js";
import {
  createEmailLog,
  getEmailAutomationSettings,
  getEmailLogSummary,
  updateEmailAutomationSettings,
} from "../services/emailAutomation.service.js";

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

const getSiteUrl = () =>
  String(
    process.env.CLIENT_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.FRONTEND_URL ||
      "https://healthyonegram.com",
  )
    .split(",")[0]
    .trim()
    .replace(/\/+$/, "");

const appendUnsubscribeFooter = (html, email) => {
  const unsubscribeUrl = `${getSiteUrl()}/api/newsletter/unsubscribe?email=${encodeURIComponent(
    normalizeEmail(email),
  )}`;
  return `${String(html || "")}<div style="margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">To stop marketing emails, <a href="${unsubscribeUrl}">unsubscribe here</a>.</div>`;
};

const buildSegmentFilter = ({ segment, inactiveDays }) => {
  const normalized = String(segment || "all").trim().toLowerCase();
  const cutoff = new Date(Date.now() - Math.max(Number(inactiveDays || 30), 1) * 24 * 60 * 60 * 1000);

  if (normalized === "new") {
    return {
      createdAt: { $gte: cutoff },
    };
  }

  if (normalized === "inactive") {
    return {
      last_login_date: { $lt: cutoff },
    };
  }

  return {};
};

const getRepeatUserIds = async () => {
  const rows = await OrderModel.aggregate([
    { $match: { user: { $ne: null } } },
    { $group: { _id: "$user", totalOrders: { $sum: 1 } } },
    { $match: { totalOrders: { $gte: 2 } } },
    { $project: { _id: 1 } },
  ]);

  return rows.map((item) => item._id);
};

const getTargetUsers = async ({ segment, inactiveDays = 30, manualEmails = [], limit = 500 }) => {
  const normalizedSegment = String(segment || "all").trim().toLowerCase();

  if (manualEmails.length) {
    const emailList = manualEmails.map(normalizeEmail).filter(isValidEmail);
    const users = await UserModel.find({
      email: { $in: emailList },
      email_opt_out: { $ne: true },
    })
      .select("_id email name notificationSettings email_opt_out")
      .lean();

    const userByEmail = new Map(users.map((user) => [normalizeEmail(user.email), user]));
    return emailList
      .slice(0, limit)
      .map((email) => userByEmail.get(email) || { _id: null, email, name: "Customer", email_opt_out: false })
      .filter((user) => user.email_opt_out !== true);
  }

  const baseFilter = {
    status: { $ne: "inactive" },
    email_opt_out: { $ne: true },
    "notificationSettings.promotionalEmails": { $ne: false },
    "notificationSettings.emailNotifications": { $ne: false },
    ...buildSegmentFilter({ segment: normalizedSegment, inactiveDays }),
  };

  if (normalizedSegment === "repeat") {
    const repeatUserIds = await getRepeatUserIds();
    baseFilter._id = { $in: repeatUserIds };
  }

  return UserModel.find(baseFilter)
    .select("_id email name notificationSettings email_opt_out")
    .sort({ createdAt: -1 })
    .limit(Math.max(Number(limit || 500), 1))
    .lean();
};

export const getAutomationSettings = async (_req, res) => {
  try {
    const settings = await getEmailAutomationSettings();
    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch automation settings",
    });
  }
};

export const updateAutomationSettings = async (req, res) => {
  try {
    const adminId = req.user?.id || req.user || null;
    const saved = await updateEmailAutomationSettings({
      adminId,
      payload: req.body || {},
    });

    return res.status(200).json({
      success: true,
      message: "Automation settings updated",
      data: saved,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to update automation settings",
    });
  }
};

export const getEmailLogs = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(String(req.query.page || "1"), 10) || 1, 1);
    const limit = Math.min(
      Math.max(Number.parseInt(String(req.query.limit || "30"), 10) || 30, 1),
      200,
    );
    const skip = (page - 1) * limit;
    const type = String(req.query.type || "").trim();
    const status = String(req.query.status || "").trim();
    const days = Math.max(Number.parseInt(String(req.query.days || "30"), 10) || 30, 1);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const query = {
      createdAt: { $gte: since },
    };
    if (type) query.email_type = type;
    if (status) query.status = status;

    const [rows, total, summary] = await Promise.all([
      EmailLogModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmailLogModel.countDocuments(query),
      getEmailLogSummary({ days }),
    ]);

    return res.status(200).json({
      success: true,
      data: rows,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch email logs",
    });
  }
};

export const previewTemplate = async (req, res) => {
  try {
    const templateFile = String(req.body?.templateFile || "").trim();
    const templateData = req.body?.templateData || {};

    if (!templateFile || !templateFile.endsWith(".html")) {
      return res.status(400).json({
        success: false,
        message: "templateFile (.html) is required",
      });
    }

    const html = await renderEmailTemplate(templateFile, templateData);
    return res.status(200).json({
      success: true,
      data: {
        html,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to preview template",
    });
  }
};

export const getTargetingPreview = async (req, res) => {
  try {
    const segment = String(req.query.segment || "all").trim().toLowerCase();
    const inactiveDays = Number.parseInt(String(req.query.inactiveDays || "30"), 10) || 30;

    const users = await getTargetUsers({
      segment,
      inactiveDays,
      limit: 1000,
    });

    return res.status(200).json({
      success: true,
      data: {
        segment,
        count: users.length,
        sample: users.slice(0, 10).map((user) => ({
          id: user?._id || null,
          email: user?.email || "",
          name: user?.name || "Customer",
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to preview targeting",
    });
  }
};

export const sendPromotionalCampaign = async (req, res) => {
  try {
    const subject = String(req.body?.subject || "").trim();
    const html = String(req.body?.html || "").trim();
    const segment = String(req.body?.segment || "all").trim().toLowerCase();
    const inactiveDays = Number.parseInt(String(req.body?.inactiveDays || "30"), 10) || 30;
    const manualEmails = Array.isArray(req.body?.manualEmails) ? req.body.manualEmails : [];

    if (!subject || !html) {
      return res.status(400).json({
        success: false,
        message: "subject and html are required",
      });
    }

    const users = await getTargetUsers({
      segment,
      inactiveDays,
      manualEmails,
      limit: 3000,
    });

    const activeSubscribers = await NewsletterModel.find({ isActive: true })
      .select("email")
      .lean();
    const subscriberSet = new Set(activeSubscribers.map((item) => normalizeEmail(item.email)));

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const user of users) {
      const to = normalizeEmail(user?.email || "");
      if (!to || !isValidEmail(to)) {
        skipped += 1;
        continue;
      }

      if (!subscriberSet.has(to)) {
        skipped += 1;
        continue;
      }

      const emailLog = await createEmailLog({
        user_id: user?._id || null,
        order_id: null,
        to_email: to,
        email_type: "promotion",
        template_type: "custom_campaign",
        subject,
        status: "queued",
        segment,
      });

      const result = await sendEmail({
        to,
        subject,
        html: appendUnsubscribeFooter(html, to),
        text: subject,
        context: "email.promotion.manual_campaign",
      });

      if (result?.success) {
        sent += 1;
        await EmailLogModel.updateOne(
          { _id: emailLog?._id },
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
          { _id: emailLog?._id },
          {
            $set: {
              status: "failed",
              error_message: String(result?.error || "Send failed").slice(0, 1000),
            },
          },
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Promotional campaign processed",
      data: {
        attempted: users.length,
        sent,
        failed,
        skipped,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to send campaign",
    });
  }
};
