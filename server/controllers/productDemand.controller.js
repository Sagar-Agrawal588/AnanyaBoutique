import mongoose from "mongoose";
import ProductModel from "../models/product.model.js";
import StockNotificationModel from "../models/stockNotification.model.js";
import UserModel from "../models/user.model.js";
import { getAdminProductDemandSummary as getAdminProductDemandSummaryData } from "../services/productAvailabilityAnalytics.service.js";

const normalizeObjectIdString = (value) => {
  const normalized = String(value || "").trim();
  return normalized && mongoose.Types.ObjectId.isValid(normalized)
    ? normalized
    : "";
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

const resolveNotificationStatusLabel = (notification) => {
  const rawStatus = String(notification?.notification_status || "")
    .trim()
    .toLowerCase();

  if (rawStatus === "queued") return "pending";
  if (rawStatus === "sent") return "sent";
  if (rawStatus === "failed") return "failed";
  return "pending";
};

export const getAdminProductDemandSummary = async (_req, res) => {
  try {
    const rows = await getAdminProductDemandSummaryData();
    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch product demand summary",
    });
  }
};

export const getAdminProductDemandByProduct = async (req, res) => {
  try {
    const normalizedProductId = normalizeObjectIdString(req.params?.productId);
    if (!normalizedProductId) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const product = await ProductModel.findById(normalizedProductId)
      .select("name variants")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const notifications = await StockNotificationModel.find({
      product_id: new mongoose.Types.ObjectId(normalizedProductId),
    })
      .sort({ created_at: -1 })
      .limit(100)
      .lean();

    const userIds = [
      ...new Set(
        notifications
          .map((notification) => normalizeObjectIdString(notification?.user_id))
          .filter(Boolean),
      ),
    ];
    const users = userIds.length
      ? await UserModel.find({ _id: { $in: userIds } })
          .select("_id name email")
          .lean()
      : [];
    const userMap = new Map(users.map((user) => [String(user._id), user]));
    const variantMap = new Map(
      (Array.isArray(product?.variants) ? product.variants : []).map((variant) => [
        String(variant?._id || ""),
        formatVariantLabel(variant),
      ]),
    );

    const waitingUsersCount = notifications.filter(
      (notification) =>
        notification?.notified !== true &&
        String(notification?.notification_status || "").trim() === "pending",
    ).length;

    const requests = notifications.map((notification) => {
      const userId = normalizeObjectIdString(notification?.user_id);
      const user = userId ? userMap.get(userId) : null;
      const email =
        String(notification?.email || "").trim().toLowerCase() ||
        String(user?.email || "").trim().toLowerCase();
      const variantId = normalizeObjectIdString(notification?.variant_id);

      return {
        id: String(notification?._id || ""),
        user_id: userId || null,
        user_name: String(user?.name || "").trim() || (email ? "Guest" : "Unknown"),
        email,
        requested_at: notification?.created_at || null,
        notification_status: resolveNotificationStatusLabel(notification),
        sent_at: notification?.notified_at || null,
        variant_id: variantId || null,
        variant_label: variantId ? variantMap.get(variantId) || "" : "",
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        product_id: normalizedProductId,
        product_name: String(product?.name || "").trim(),
        waiting_users_count: waitingUsersCount,
        requests,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch product demand detail",
    });
  }
};
