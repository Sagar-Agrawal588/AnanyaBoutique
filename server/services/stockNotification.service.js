import mongoose from "mongoose";
import { UnrecoverableError } from "bullmq";
import { sendTemplatedEmail } from "../config/emailService.js";
import EmailLogModel from "../models/emailLog.model.js";
import ProductModel from "../models/product.model.js";
import StockNotificationModel from "../models/stockNotification.model.js";
import UserModel from "../models/user.model.js";
import { createEmailLog } from "./emailAutomation.service.js";
import {
  createRestockConversionEvent,
  trackNotifyClickEvent,
} from "./productAvailabilityAnalytics.service.js";
import {
  enqueueStockNotificationJob,
  registerStockNotificationQueueFailureHandler,
  registerStockNotificationQueueProcessor,
} from "./stockNotificationQueue.service.js";
import { AppError, logger } from "../utils/errorHandler.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOTIFY_REQUEST_COOLDOWN_MS = 5 * 60 * 1000;
const STOCK_NOTIFICATION_ATTEMPTS = 3;
const STOCK_NOTIFICATION_BACKOFF_MS = 1000;

let stockNotificationEmailSender = async (payload) =>
  sendTemplatedEmail(payload);

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeObjectIdString = (value) => {
  const normalized = String(value || "").trim();
  return normalized && mongoose.Types.ObjectId.isValid(normalized)
    ? normalized
    : "";
};

const toObjectId = (value, fieldName) => {
  const normalized = normalizeObjectIdString(value);
  if (!normalized) {
    throw new AppError("INVALID_OBJECT_ID", {
      fieldName,
      value,
      message: `${fieldName} is invalid`,
    });
  }
  return new mongoose.Types.ObjectId(normalized);
};

const isInventoryTracked = (product) => {
  if (!product) return true;
  if (typeof product.track_inventory === "boolean") {
    return product.track_inventory;
  }
  if (typeof product.trackInventory === "boolean") {
    return product.trackInventory;
  }
  return true;
};

const getVariantFromProduct = (product, variantId) => {
  if (!variantId) return null;
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  return (
    variants.find(
      (variant) => String(variant?._id || "") === String(variantId || ""),
    ) || null
  );
};

const getAvailableQuantity = (entry) =>
  Math.max(
    Number(entry?.stock_quantity ?? entry?.stock ?? 0) -
      Number(entry?.reserved_quantity ?? 0),
    0,
  );

const resolveAvailability = (product, variantId = null) => {
  if (!isInventoryTracked(product)) {
    return {
      tracked: false,
      available: Number.MAX_SAFE_INTEGER,
      variant: null,
    };
  }

  const normalizedVariantId = normalizeObjectIdString(variantId);
  if (normalizedVariantId) {
    const variant = getVariantFromProduct(product, normalizedVariantId);
    if (!variant) {
      throw new AppError("INVALID_INPUT", {
        fieldName: "variantId",
        value: variantId,
        message: "Selected pack is invalid",
      });
    }
    return {
      tracked: true,
      available: getAvailableQuantity(variant),
      variant,
    };
  }

  return {
    tracked: true,
    available: getAvailableQuantity(product),
    variant: null,
  };
};

const formatVariantLabel = (variant) => {
  const explicitName = String(variant?.name || "").trim();
  if (explicitName) return explicitName;

  const weight = Number(variant?.weight || 0);
  const unit = String(variant?.unit || "").trim();
  if (weight > 0) {
    return `${weight}${unit || "g"}`;
  }

  return "";
};

const normalizeBaseUrl = (value) =>
  String(value || "")
    .split(",")[0]
    .trim()
    .replace(/\/+$/, "");

const getFrontendBaseUrl = () => {
  const candidate =
    normalizeBaseUrl(process.env.CLIENT_URL) ||
    normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeBaseUrl(process.env.FRONTEND_URL) ||
    "https://healthyonegram.com";

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(candidate)) {
    return process.env.NODE_ENV === "production"
      ? "https://healthyonegram.com"
      : candidate;
  }

  return candidate;
};

const resolveProductUrl = (product) => {
  const frontendBaseUrl = getFrontendBaseUrl();
  const slugOrId = String(product?.slug || product?._id || "").trim();
  return `${frontendBaseUrl}/product/${encodeURIComponent(slugOrId)}`;
};

const toAbsoluteUrl = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) return normalized;
  const frontendBaseUrl = getFrontendBaseUrl();
  return `${frontendBaseUrl}${normalized.startsWith("/") ? "" : "/"}${normalized}`;
};

const toNotificationKey = (productId, variantId = null) =>
  `${String(productId || "").trim()}::${String(variantId || "").trim()}`;

const resolveNotificationIdentityFilter = ({
  productObjectId,
  variantId = null,
  userId = "",
  email = "",
}) => {
  const normalizedUserId = normalizeObjectIdString(userId);
  const normalizedEmail = normalizeEmail(email);
  const orConditions = [
    ...(normalizedUserId ? [{ user_id: new mongoose.Types.ObjectId(normalizedUserId) }] : []),
    ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
  ];

  if (!orConditions.length) {
    return null;
  }

  return {
    product_id: productObjectId,
    variant_id: variantId || null,
    $or: orConditions,
  };
};

const extractResolvedEmail = (notification, userMap) => {
  const directEmail = normalizeEmail(notification?.email);
  if (directEmail) return directEmail;

  const userId = String(notification?.user_id || "").trim();
  if (!userId) return "";

  return normalizeEmail(userMap.get(userId)?.email);
};

const extractRecipientName = (notification, userMap) => {
  const userId = String(notification?.user_id || "").trim();
  if (!userId) return "there";
  return String(userMap.get(userId)?.name || "").trim() || "there";
};

const buildRestockBatchKey = ({ productId, variantId = null }) => {
  const productKey = String(productId || "product").trim() || "product";
  const variantKey = String(variantId || "base").trim() || "base";
  return `${productKey}-${variantKey}-${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, "-");
};

const buildBackInStockEmailPayload = ({
  to,
  customerName,
  product,
  variant = null,
  availableQuantity = 0,
}) => {
  const variantLabel = formatVariantLabel(variant);
  const productName = String(product?.name || "Your product").trim();
  const productUrl = resolveProductUrl(product);
  const frontendBaseUrl = getFrontendBaseUrl();
  const subject = variantLabel
    ? `${productName} (${variantLabel}) is back in stock`
    : `${productName} is back in stock`;
  const previewImage = String(
    toAbsoluteUrl(product?.thumbnail || product?.images?.[0]) ||
      `${frontendBaseUrl}/logo.png`,
  ).trim();

  return {
    to,
    subject,
    templateFile: "stockBackInStock.html",
    templateData: {
      customer_name: customerName || "there",
      product_name: productName,
      variant_name: variantLabel ? ` (${variantLabel})` : "",
      available_quantity: String(Math.max(Number(availableQuantity || 0), 1)),
      product_url: productUrl,
      preview_image: previewImage,
      brand: String(product?.brand || "Healthy One Gram").trim(),
      year: String(new Date().getFullYear()),
    },
    text: [
      `Hi ${customerName || "there"},`,
      "",
      variantLabel
        ? `${productName} (${variantLabel}) is back in stock.`
        : `${productName} is back in stock.`,
      `Available now: ${Math.max(Number(availableQuantity || 0), 1)}`,
      `Shop now: ${productUrl}`,
    ].join("\n"),
    context: "stock.notification.back_in_stock",
  };
};

const markEmailLogSent = async (emailLogId, result = {}) => {
  if (!emailLogId) return;
  await EmailLogModel.updateOne(
    { _id: emailLogId },
    {
      $set: {
        status: "sent",
        sent_at: new Date(),
        provider_message_id: String(result?.messageId || "").trim(),
        error_message: "",
      },
    },
  );
};

const markEmailLogFailed = async (emailLogId, errorMessage) => {
  if (!emailLogId) return;
  await EmailLogModel.updateOne(
    { _id: emailLogId },
    {
      $set: {
        status: "failed",
        error_message: String(errorMessage || "Send failed").slice(0, 1000),
      },
    },
  );
};

const updateNotificationAttempt = async (notificationId, errorMessage = "") => {
  if (!notificationId) return;
  await StockNotificationModel.updateOne(
    { _id: notificationId },
    {
      $set: {
        last_attempt_at: new Date(),
        last_error: String(errorMessage || "").slice(0, 1000),
      },
    },
  );
};

const finalizeNotificationFailure = async ({
  notificationId,
  emailLogId = null,
  errorMessage = "send_failed",
}) => {
  if (!notificationId) return;

  await StockNotificationModel.updateOne(
    { _id: notificationId },
    {
      $set: {
        notification_status: "failed",
        last_failure_at: new Date(),
        last_error: String(errorMessage || "send_failed").slice(0, 1000),
        notified: true,
      },
    },
  );
  await markEmailLogFailed(emailLogId, errorMessage);
};

const resolveNotificationRecipient = async (notification) => {
  if (!notification) {
    return { email: "", name: "there", user: null };
  }

  const directEmail = normalizeEmail(notification?.email);
  if (directEmail) {
    return {
      email: directEmail,
      name: "there",
      user: null,
    };
  }

  const userId = normalizeObjectIdString(notification?.user_id);
  if (!userId) {
    return { email: "", name: "there", user: null };
  }

  const user = await UserModel.findById(userId)
    .select("_id email name")
    .lean();

  return {
    email: normalizeEmail(user?.email),
    name: String(user?.name || "").trim() || "there",
    user,
  };
};

const processStockNotificationJob = async (job) => {
  const notificationId = normalizeObjectIdString(job?.data?.notification_id);
  if (!notificationId) {
    throw new UnrecoverableError("missing_notification_id");
  }

  const notification = await StockNotificationModel.findById(notificationId).lean();
  if (!notification) {
    logger.warn("stockNotification", "Skipping missing notification job", {
      jobId: String(job?.id || ""),
      notificationId,
    });
    return { skipped: true };
  }

  if (String(notification?.notification_status || "").trim() === "sent") {
    return { skipped: true };
  }

  const productId = normalizeObjectIdString(
    job?.data?.product_id || notification?.product_id,
  );
  const variantId =
    normalizeObjectIdString(job?.data?.variant_id || notification?.variant_id) ||
    null;
  const product = await ProductModel.findById(productId)
    .select(
      "name slug brand thumbnail images track_inventory trackInventory stock stock_quantity reserved_quantity variants",
    )
    .lean();

  if (!product) {
    await updateNotificationAttempt(notificationId, "product_not_found");
    throw new UnrecoverableError("product_not_found");
  }

  const variant = variantId ? getVariantFromProduct(product, variantId) : null;
  const availableQuantity = variant
    ? getAvailableQuantity(variant)
    : getAvailableQuantity(product);

  const recipient = await resolveNotificationRecipient(notification);
  if (!recipient.email || !EMAIL_REGEX.test(recipient.email)) {
    await updateNotificationAttempt(notificationId, "missing_or_invalid_email");
    throw new UnrecoverableError("missing_or_invalid_email");
  }

  const emailPayload = buildBackInStockEmailPayload({
    to: recipient.email,
    customerName: recipient.name,
    product,
    variant,
    availableQuantity,
  });

  const result = await stockNotificationEmailSender(emailPayload);
  if (!result?.success) {
    const sendError = String(result?.error || "send_failed");
    await updateNotificationAttempt(notificationId, sendError);
    throw new Error(sendError);
  }

  await StockNotificationModel.updateOne(
    { _id: notificationId },
    {
      $set: {
        notified: true,
        notified_at: new Date(),
        notification_status: "sent",
        last_attempt_at: new Date(),
        last_error: "",
      },
    },
  );
  await markEmailLogSent(
    job?.data?.email_log_id || notification?.email_log_id || null,
    result,
  );

  logger.info("stockNotification", "Back-in-stock email sent", {
    notificationId,
    productId,
    variantId,
    to: recipient.email,
    jobId: String(job?.id || ""),
  });

  return { success: true };
};

const handleStockNotificationJobFinalFailure = async (job, error) => {
  const notificationId = normalizeObjectIdString(job?.data?.notification_id);
  if (!notificationId) return;

  const emailLogId =
    normalizeObjectIdString(job?.data?.email_log_id) || null;
  const errorMessage = String(error?.message || "send_failed");

  await finalizeNotificationFailure({
    notificationId,
    emailLogId,
    errorMessage,
  });

  logger.warn("stockNotification", "Back-in-stock job exhausted retries", {
    notificationId,
    productId: normalizeObjectIdString(job?.data?.product_id) || null,
    variantId: normalizeObjectIdString(job?.data?.variant_id) || null,
    attemptsMade: Number(job?.attemptsMade || 0),
    attempts: Number(job?.opts?.attempts || STOCK_NOTIFICATION_ATTEMPTS),
    error: errorMessage,
  });
};

registerStockNotificationQueueProcessor(processStockNotificationJob);
registerStockNotificationQueueFailureHandler(
  handleStockNotificationJobFinalFailure,
);

export const __setStockNotificationEmailSenderForTests = (sender) => {
  stockNotificationEmailSender =
    typeof sender === "function"
      ? sender
      : async (payload) => sendTemplatedEmail(payload);
};

export const createStockNotificationSubscription = async ({
  productId,
  variantId = null,
  userId = null,
  email = "",
}) => {
  const productObjectId = toObjectId(productId, "productId");
  const normalizedVariantId = normalizeObjectIdString(variantId);
  const normalizedUserId = normalizeObjectIdString(userId);
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedUserId && !normalizedEmail) {
    throw new AppError("INVALID_INPUT", {
      fieldName: "email",
      message: "Email is required to create a stock alert",
    });
  }

  if (normalizedEmail && !EMAIL_REGEX.test(normalizedEmail)) {
    throw new AppError("INVALID_INPUT", {
      fieldName: "email",
      value: email,
      message: "Please enter a valid email address",
    });
  }

  const product = await ProductModel.findById(productObjectId)
    .select(
      "name slug brand thumbnail images track_inventory trackInventory stock stock_quantity reserved_quantity variants",
    )
    .lean();

  if (!product) {
    throw new AppError("PRODUCT_NOT_FOUND", {
      message: "Product not found",
      productId,
    });
  }

  const availability = resolveAvailability(product, normalizedVariantId);
  let resolvedUserId = normalizedUserId;
  let resolvedGuestEmail = normalizedEmail;

  if (resolvedUserId) {
    const user = await UserModel.findById(resolvedUserId)
      .select("_id email")
      .lean();
    if (!user) {
      throw new AppError("USER_NOT_FOUND", {
        message: "User not found",
      });
    }

    resolvedGuestEmail = normalizeEmail(user?.email);
  }

  const analyticsIdentity = {
    productId: String(productObjectId),
    variantId: normalizedVariantId || null,
    userId: resolvedUserId || null,
    email: resolvedUserId ? resolvedGuestEmail : resolvedGuestEmail,
  };

  if (!availability.tracked || availability.available > 0) {
    await trackNotifyClickEvent({
      ...analyticsIdentity,
      status: "available",
    });
    return {
      status: "available",
      message: "This product is already back in stock.",
      notification: null,
    };
  }

  const identityFilter = resolveNotificationIdentityFilter({
    productObjectId,
    variantId: normalizedVariantId,
    userId: resolvedUserId,
    email: resolvedGuestEmail,
  });

  const existingNotification = identityFilter
    ? await StockNotificationModel.findOne({
        ...identityFilter,
        notified: false,
      })
    : null;

  if (existingNotification) {
    if (resolvedUserId && !existingNotification.user_id) {
      existingNotification.user_id = new mongoose.Types.ObjectId(resolvedUserId);
      await existingNotification.save();
    }

    await trackNotifyClickEvent({
      ...analyticsIdentity,
      status: "already_registered",
    });
    return {
      status: "already_registered",
      message: "You'll be notified when this product is back in stock.",
      notification: existingNotification,
    };
  }

  if (identityFilter) {
    const cooldownCutoff = new Date(Date.now() - NOTIFY_REQUEST_COOLDOWN_MS);
    const recentRequest = await StockNotificationModel.findOne({
      ...identityFilter,
      created_at: { $gte: cooldownCutoff },
    })
      .sort({ created_at: -1 })
      .lean();

    if (recentRequest) {
      await trackNotifyClickEvent({
        ...analyticsIdentity,
        status: "cooldown",
      });
      return {
        status: "already_registered",
        message: "You've already requested a stock alert recently. Please wait a few minutes.",
        notification: recentRequest,
        cooldownRemainingMs: Math.max(
          NOTIFY_REQUEST_COOLDOWN_MS -
            (Date.now() - new Date(recentRequest.created_at).getTime()),
          0,
        ),
      };
    }
  }

  try {
    const notification = await StockNotificationModel.create({
      product_id: productObjectId,
      variant_id: normalizedVariantId || null,
      user_id: resolvedUserId || null,
      email: resolvedUserId ? "" : resolvedGuestEmail,
      notification_status: "pending",
      notified: false,
    });

    logger.info("stockNotification", "Stock notification created", {
      productId: String(productObjectId),
      variantId: normalizedVariantId || null,
      userId: resolvedUserId || null,
      email: resolvedUserId ? null : resolvedGuestEmail,
    });

    await trackNotifyClickEvent({
      ...analyticsIdentity,
      status: "created",
    });

    return {
      status: "created",
      message: "We'll let you know as soon as this is back in stock.",
      notification,
    };
  } catch (error) {
    if (Number(error?.code) === 11000) {
      const duplicateNotification = await StockNotificationModel.findOne({
        product_id: productObjectId,
        variant_id: normalizedVariantId || null,
        notified: false,
        ...(resolvedUserId
          ? { user_id: new mongoose.Types.ObjectId(resolvedUserId) }
          : { email: resolvedGuestEmail }),
      });

      await trackNotifyClickEvent({
        ...analyticsIdentity,
        status: "already_registered",
      });

      return {
        status: "already_registered",
        message: "You'll be notified when this product is back in stock.",
        notification: duplicateNotification,
      };
    }

    throw error;
  }
};

export const getPendingStockNotificationKeySet = async ({ userId }) => {
  const normalizedUserId = normalizeObjectIdString(userId);
  if (!normalizedUserId) return new Set();

  const notifications = await StockNotificationModel.find({
    user_id: new mongoose.Types.ObjectId(normalizedUserId),
    notified: false,
    notification_status: "pending",
  })
    .select("product_id variant_id")
    .lean();

  return new Set(
    notifications.map((notification) =>
      toNotificationKey(notification?.product_id, notification?.variant_id),
    ),
  );
};

export const notifyBackInStock = async ({
  product,
  variant = null,
  source = "INVENTORY_AVAILABLE",
}) => {
  const productId = normalizeObjectIdString(product?._id);
  if (!productId) return { attempted: 0, queued: 0, failed: 0 };

  const productForNotifications =
    product?.name && product?.slug
      ? product
      : await ProductModel.findById(productId)
          .select(
            "name slug brand thumbnail images track_inventory trackInventory stock stock_quantity reserved_quantity variants",
          )
          .lean();
  if (!productForNotifications) {
    return { attempted: 0, queued: 0, failed: 0 };
  }

  const variantId =
    normalizeObjectIdString(variant?._id) || null;
  const resolvedVariant =
    variantId
      ? variant?.name || variant?.weight || variant?.unit
        ? variant
        : getVariantFromProduct(productForNotifications, variantId)
      : null;
  const availableQuantity = resolvedVariant
    ? getAvailableQuantity(resolvedVariant)
    : getAvailableQuantity(productForNotifications);
  if (availableQuantity <= 0) {
    return { attempted: 0, queued: 0, failed: 0 };
  }

  const pendingNotifications = await StockNotificationModel.find({
    product_id: new mongoose.Types.ObjectId(productId),
    variant_id: variantId ? new mongoose.Types.ObjectId(variantId) : null,
    notified: false,
    notification_status: "pending",
  }).lean();

  if (!pendingNotifications.length) {
    return { attempted: 0, queued: 0, failed: 0 };
  }

  const userIds = [
    ...new Set(
      pendingNotifications
        .map((notification) => String(notification?.user_id || "").trim())
        .filter(Boolean),
    ),
  ];

  const users = userIds.length
    ? await UserModel.find({ _id: { $in: userIds } })
        .select("_id email name")
        .lean()
    : [];

  const userMap = new Map(users.map((user) => [String(user._id), user]));
  const restockBatchKey = buildRestockBatchKey({ productId, variantId });
  const queuedAt = new Date();
  let queued = 0;
  let failed = 0;

  await createRestockConversionEvent({
    productId,
    variantId,
    restockBatchKey,
    source,
    notifiedUsersCount: pendingNotifications.length,
  });

  for (const notification of pendingNotifications) {
    const recipientEmail = extractResolvedEmail(notification, userMap);
    const recipientName = extractRecipientName(notification, userMap);
    const emailPayload = buildBackInStockEmailPayload({
      to: recipientEmail || "unknown@unknown.invalid",
      customerName: recipientName,
      product: productForNotifications,
      variant: resolvedVariant,
      availableQuantity,
    });

    const emailLog = await createEmailLog({
      user_id: notification?.user_id || null,
      order_id: null,
      to_email: recipientEmail || "unknown@unknown.invalid",
      email_type: "stock_back_in_stock",
      template_type: "stockBackInStock.html",
      subject: emailPayload.subject,
      status: "queued",
      metadata: {
        notificationId: String(notification?._id || ""),
        productId,
        productName: String(productForNotifications?.name || "").trim(),
        variantId: variantId || null,
        variantLabel: formatVariantLabel(resolvedVariant),
        restockBatchKey,
      },
    });

    await StockNotificationModel.updateOne(
      {
        _id: notification._id,
        notification_status: "pending",
        notified: false,
      },
      {
        $set: {
          notification_status: "queued",
          queued_at: queuedAt,
          email_log_id: emailLog?._id || null,
          restock_batch_key: restockBatchKey,
          restocked_at: queuedAt,
          last_error: "",
        },
      },
    );

    try {
      const jobId = `stock-notification-${String(notification?._id || "")}-${restockBatchKey}`.replace(
        /[^a-zA-Z0-9_-]/g,
        "-",
      );

      const enqueueResult = await enqueueStockNotificationJob(
        {
          notification_id: String(notification?._id || ""),
          product_id: productId,
          variant_id: variantId || null,
          email: recipientEmail || "",
          user_id: normalizeObjectIdString(notification?.user_id) || null,
          email_log_id: normalizeObjectIdString(emailLog?._id) || null,
          restock_batch_key: restockBatchKey,
        },
        {
          jobId,
          attempts: STOCK_NOTIFICATION_ATTEMPTS,
          backoffDelayMs: STOCK_NOTIFICATION_BACKOFF_MS,
        },
      );

      if (enqueueResult?.duplicate) {
        logger.warn("stockNotification", "Duplicate notification job skipped", {
          productId,
          variantId: variantId || null,
          notificationId: String(notification?._id || ""),
          jobId,
        });
      }

      queued += 1;
    } catch (error) {
      failed += 1;
      await StockNotificationModel.updateOne(
        { _id: notification._id },
        {
          $set: {
            notification_status: "pending",
            last_error: String(error?.message || "queue_enqueue_failed").slice(
              0,
              1000,
            ),
            email_log_id: emailLog?._id || null,
          },
          $unset: {
            queued_at: "",
            restocked_at: "",
            restock_batch_key: "",
          },
        },
      );
      await markEmailLogFailed(
        emailLog?._id || null,
        error?.message || "queue_enqueue_failed",
      );
      logger.error("stockNotification", "Failed to enqueue notification job", {
        productId,
        variantId: variantId || null,
        notificationId: String(notification?._id || ""),
        error: error?.message || String(error),
      });
    }
  }

  logger.info("stockNotification", "Back-in-stock notifications queued", {
    productId,
    variantId: variantId || null,
    source,
    attempted: pendingNotifications.length,
    queued,
    failed,
  });

  return {
    attempted: pendingNotifications.length,
    queued,
    failed,
  };
};
