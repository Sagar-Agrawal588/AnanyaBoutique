import mongoose from "mongoose";
import connectDb from "../config/connectDb.js";
import ComboOrderModel from "../models/comboOrder.model.js";
import InvoiceModel from "../models/invoice.model.js";
import OrderModel from "../models/order.model.js";
import {
  releaseComboStock,
  restoreComboStock,
} from "../services/combos/combo.service.js";
import {
  releaseInventory,
  restoreInventory,
} from "../services/inventory.service.js";

const DEFAULT_TARGET_IDS = ["TMP-YY6YMW", "TMP-2EWWMJ", "TMP-BCE4F5"];

const parseArgs = (argv = []) => {
  const args = {
    apply: false,
    ids: [],
  };

  for (const arg of argv) {
    const value = String(arg || "").trim();
    if (!value) continue;

    if (value === "--apply") {
      args.apply = true;
      continue;
    }

    if (value.startsWith("--ids=")) {
      args.ids = value
        .slice("--ids=".length)
        .split(",")
        .map((item) =>
          String(item || "")
            .trim()
            .toUpperCase(),
        )
        .filter(Boolean);
    }
  }

  return args;
};

const unique = (items = []) => [...new Set(items)];

const run = async () => {
  const args = parseArgs(process.argv.slice(2));
  const targets = unique(
    args.ids.length > 0 ? args.ids : DEFAULT_TARGET_IDS,
  ).map((id) => String(id).trim().toUpperCase());

  if (!targets.length) {
    throw new Error("No target TMP IDs provided.");
  }

  await connectDb();

  const filter = {
    $or: [
      { temp_id: { $in: targets } },
      { orderNumber: { $in: targets } },
      { displayOrderId: { $in: targets } },
      { final_id: { $in: targets } },
    ],
  };

  const matchedOrders = await OrderModel.find(filter)
    .select(
      "_id temp_id final_id orderNumber displayOrderId order_status payment_status inventoryStatus createdAt",
    )
    .sort({ createdAt: -1 })
    .lean();

  const payload = {
    mode: args.apply ? "apply" : "dry-run",
    requestedTargets: targets,
    matchedCount: matchedOrders.length,
    matchedOrders: matchedOrders.map((order) => ({
      id: String(order?._id || ""),
      tempId: String(order?.temp_id || ""),
      orderNumber: String(order?.orderNumber || ""),
      displayOrderId: String(order?.displayOrderId || ""),
      finalId: String(order?.final_id || ""),
      orderStatus: String(order?.order_status || ""),
      paymentStatus: String(order?.payment_status || ""),
      inventoryStatus: String(order?.inventoryStatus || ""),
      createdAt: order?.createdAt || null,
    })),
  };

  if (!args.apply) {
    console.log(JSON.stringify(payload, null, 2));
    console.log("Dry-run complete. Re-run with --apply to delete.");
    return;
  }

  let deletedCount = 0;
  let skippedCount = 0;
  let deletedComboOrdersCount = 0;
  let deletedInvoicesCount = 0;
  let releasedInventoryCount = 0;
  let releasedComboCount = 0;
  let restoredInventoryCount = 0;
  let restoredComboCount = 0;
  const skippedOrderIds = [];

  for (const order of matchedOrders) {
    try {
      const inventoryStatus = String(order?.inventoryStatus || "")
        .trim()
        .toLowerCase();

      if (inventoryStatus === "reserved") {
        const inventoryRelease = await releaseInventory(
          order,
          "ADMIN_TARGETED_PURGE",
        );
        if (inventoryRelease?.status === "released") {
          releasedInventoryCount += 1;
        }

        const comboRelease = await releaseComboStock(
          order,
          "ADMIN_TARGETED_PURGE",
        );
        if (comboRelease?.status === "released") {
          releasedComboCount += 1;
        }
      } else if (inventoryStatus === "deducted") {
        const inventoryRestore = await restoreInventory(
          order,
          "ADMIN_TARGETED_PURGE",
        );
        if (inventoryRestore?.status === "restored") {
          restoredInventoryCount += 1;
        }

        const comboRestore = await restoreComboStock(
          order,
          "ADMIN_TARGETED_PURGE",
        );
        if (comboRestore?.status === "restored") {
          restoredComboCount += 1;
        }
      }

      const [comboDeleteResult, invoiceDeleteResult] = await Promise.all([
        ComboOrderModel.deleteMany({ orderId: order._id }),
        InvoiceModel.deleteMany({ orderId: order._id }),
      ]);

      deletedComboOrdersCount += Number(comboDeleteResult?.deletedCount || 0);
      deletedInvoicesCount += Number(invoiceDeleteResult?.deletedCount || 0);

      const deleteResult = await OrderModel.deleteOne({ _id: order._id });
      if (Number(deleteResult?.deletedCount || 0) === 1) {
        deletedCount += 1;
      } else {
        skippedCount += 1;
        skippedOrderIds.push(String(order._id));
      }
    } catch (error) {
      skippedCount += 1;
      skippedOrderIds.push(String(order?._id || ""));
      console.error(
        "[targeted-order-delete] Failed to remove order",
        String(order?._id || ""),
        error?.message || String(error),
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        ...payload,
        deletedCount,
        skippedCount,
        releasedInventoryCount,
        releasedComboCount,
        restoredInventoryCount,
        restoredComboCount,
        deletedComboOrdersCount,
        deletedInvoicesCount,
        skippedOrderIds,
      },
      null,
      2,
    ),
  );
};

run()
  .catch((error) => {
    console.error(
      "[targeted-order-delete] Failed:",
      error?.message || String(error),
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
