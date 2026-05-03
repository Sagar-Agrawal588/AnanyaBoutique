import mongoose from "mongoose";
import connectDb from "../config/connectDb.js";
import OrderModel from "../models/order.model.js";

const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);

const cleanupFilter = {
  $or: [
    { isDemoOrder: true },
    { paymentMethod: "TEST" },
    { couponCode: { $in: ["WELCOME10", "INFLUENCER"] }, paymentMethod: "TEST" },
    { notes: /test|demo/i, paymentMethod: "TEST" },
    {
      createdAt: { $gte: todayStart },
      paymentMethod: "TEST",
    },
  ],
};

const run = async () => {
  await connectDb();
  const matched = await OrderModel.find(cleanupFilter)
    .select("_id displayOrderId couponCode paymentMethod createdAt")
    .sort({ createdAt: -1 })
    .lean();
  const deleted = await OrderModel.deleteMany(cleanupFilter);
  console.log(
    JSON.stringify(
      {
        matchedCount: matched.length,
        deletedCount: Number(deleted?.deletedCount || 0),
        deletedOrders: matched.map((order) => ({
          orderId: String(order._id),
          displayOrderId: order.displayOrderId || null,
          couponCode: order.couponCode || null,
          paymentMethod: order.paymentMethod || null,
          createdAt: order.createdAt || null,
        })),
      },
      null,
      2,
    ),
  );
};

run()
  .catch((error) => {
    console.error("cleanupDemoOrders failed:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect failures
    }
  });
