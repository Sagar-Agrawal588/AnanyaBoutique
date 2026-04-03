import mongoose from "mongoose";
import connectDb from "../config/connectDb.js";
import OrderModel from "../models/order.model.js";

const run = async () => {
  await connectDb();

  const filter = {
    order_status: "accepted",
    $or: [
      { isDemoOrder: true },
      { notes: /Demo combo invoice generation/i },
      {
        "statusTimeline.source": {
          $in: [
            "DEMO_COMBO_ORDER",
            "DEMO_COMBO_PAYMENT",
            "DEMO_ORDER_CREATION",
            "DEMO_PAYMENT",
          ],
        },
      },
    ],
  };

  const docs = await OrderModel.find(filter)
    .select(
      "_id final_id temp_id order_status status isDemoOrder notes createdAt",
    )
    .sort({ createdAt: -1 })
    .lean();

  const ids = docs.map((doc) => doc._id);
  let deletedCount = 0;

  if (ids.length > 0) {
    const result = await OrderModel.deleteMany({ _id: { $in: ids } });
    deletedCount = Number(result?.deletedCount || 0);
  }

  console.log(
    JSON.stringify(
      {
        matched: docs.length,
        deleted: deletedCount,
        orders: docs.map((doc) => ({
          id: String(doc._id),
          finalId: doc.final_id || null,
          tempId: doc.temp_id || null,
          createdAt: doc.createdAt,
          isDemoOrder: Boolean(doc.isDemoOrder),
        })),
      },
      null,
      2,
    ),
  );
};

run()
  .catch((error) => {
    console.error(
      "Failed to delete accepted demo orders:",
      error?.message || error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect errors
    }
  });
