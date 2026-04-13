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

const run = async () => {
  await connectDb();

  const demoOrders = await OrderModel.find({ isDemoOrder: true })
    .select("_id inventoryStatus products combos")
    .lean();

  if (demoOrders.length === 0) {
    console.log(
      JSON.stringify(
        {
          totalMatched: 0,
          deletedCount: 0,
          skippedCount: 0,
          releasedInventoryCount: 0,
          releasedComboCount: 0,
          restoredInventoryCount: 0,
          restoredComboCount: 0,
          deletedComboOrdersCount: 0,
          deletedInvoicesCount: 0,
          skippedOrderIds: [],
        },
        null,
        2,
      ),
    );
    return;
  }

  let releasedInventoryCount = 0;
  let releasedComboCount = 0;
  let restoredInventoryCount = 0;
  let restoredComboCount = 0;
  let deletedCount = 0;
  let skippedCount = 0;
  let deletedComboOrdersCount = 0;
  let deletedInvoicesCount = 0;
  const skippedOrderIds = [];

  for (const order of demoOrders) {
    try {
      const inventoryStatus = String(order?.inventoryStatus || "")
        .trim()
        .toLowerCase();

      if (inventoryStatus === "reserved") {
        const inventoryRelease = await releaseInventory(
          order,
          "ADMIN_DEMO_PURGE",
        );
        if (inventoryRelease?.status === "released") {
          releasedInventoryCount += 1;
        }

        const comboRelease = await releaseComboStock(order, "ADMIN_DEMO_PURGE");
        if (comboRelease?.status === "released") {
          releasedComboCount += 1;
        }
      } else if (inventoryStatus === "deducted") {
        const inventoryRestore = await restoreInventory(
          order,
          "ADMIN_DEMO_PURGE",
        );
        if (inventoryRestore?.status === "restored") {
          restoredInventoryCount += 1;
        }

        const comboRestore = await restoreComboStock(order, "ADMIN_DEMO_PURGE");
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
        "[demo-cleanup] Failed to remove demo order",
        String(order?._id || ""),
        error?.message || String(error),
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        totalMatched: demoOrders.length,
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
    console.error("[demo-cleanup] Failed:", error?.message || String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect errors
    }
  });
