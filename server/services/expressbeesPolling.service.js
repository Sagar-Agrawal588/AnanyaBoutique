import OrderModel from "../models/order.model.js";
import { trackShipment } from "./xpressbees.service.js";
import { logger } from "../utils/errorHandler.js";
import {
  applyOrderStatusTransition,
  mapExpressbeesToOrderStatus,
  ORDER_STATUS,
} from "../utils/orderStatus.js";
import { runWithBackgroundJobLease } from "../utils/backgroundJobLease.js";
import { syncOrderToFirestore } from "../utils/orderFirestoreSync.js";
import { emitOrderStatusUpdate } from "../realtime/orderEvents.js";
import { ensureOrderInvoice } from "../controllers/order.controller.js";
import { syncShipmentStateOnOrder } from "./automatedShipping.service.js";
import {
  extractTrackingStatus,
  extractTrackingUrl,
} from "../utils/xpressbeesTracking.js";

let pollingTimer = null;
let pollingInFlight = false;

const POLL_SOURCE = "XPRESSBEES_POLL";

const hasXpressbeesCredentials = () =>
  Boolean(
    String(process.env.XPRESSBEES_TOKEN || "").trim() ||
      (String(process.env.XPRESSBEES_EMAIL || "").trim() &&
        String(process.env.XPRESSBEES_PASSWORD || "").trim()),
  );

const toBooleanFlag = (value, fallback = false) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return fallback;
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const isEnabled = () => {
  const flag = process.env.XPRESSBEES_POLL_ENABLED;
  if (flag !== undefined && flag !== null) {
    return toBooleanFlag(flag, false);
  }

  return process.env.NODE_ENV === "production" && hasXpressbeesCredentials();
};

const getPollingConfig = () => {
  const intervalMinutes = Number(process.env.XPRESSBEES_POLL_INTERVAL_MINUTES || 5);
  const batchSize = Number(process.env.XPRESSBEES_POLL_BATCH_SIZE || 50);
  return {
    intervalMs: Math.max(intervalMinutes, 2) * 60 * 1000,
    batchSize: Math.max(batchSize, 5),
  };
};

export const pollExpressbeesTracking = async (options = {}) => {
  if (pollingInFlight) {
    return {
      alreadyRunning: true,
      reason: "in_flight",
      checked: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      total: 0,
    };
  }

  pollingInFlight = true;
  const summary = {
    alreadyRunning: false,
    reason: null,
    checked: 0,
    updated: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  };

  try {
    const { batchSize: configuredBatchSize } = getPollingConfig();
    const requestedBatchSize = Number(options.batchSize || configuredBatchSize);
    const batchSize = Number.isFinite(requestedBatchSize)
      ? Math.max(Math.floor(requestedBatchSize), 5)
      : configuredBatchSize;
    const source = options.source || POLL_SOURCE;

    const orders = await OrderModel.find({
      shipping_provider: "XPRESSBEES",
      $or: [{ awb_number: { $ne: null } }, { awbNumber: { $ne: null } }],
      order_status: {
        $nin: [
          ORDER_STATUS.DELIVERED,
          ORDER_STATUS.COMPLETED,
          ORDER_STATUS.RTO_COMPLETED,
        ],
      },
      $nor: [
        {
          order_status: ORDER_STATUS.CANCELLED,
          shipmentStatus: "cancelled",
        },
        {
          order_status: ORDER_STATUS.CANCELLED,
          shipment_status: "cancelled",
        },
      ],
    })
      .limit(batchSize);

    summary.total = orders.length;

    for (const order of orders) {
      try {
        const awb = order.awb_number || order.awbNumber;
        if (!awb) {
          summary.skipped += 1;
          continue;
        }

        const data = await trackShipment(awb);
        const rawStatus = extractTrackingStatus(data);
        summary.checked += 1;
        if (!rawStatus) {
          summary.skipped += 1;
          continue;
        }

        const previousLegacyShipmentStatus = order.shipment_status;
        const previousCanonicalShipmentStatus = order.shipmentStatus;
        const previousTrackingUrl = order.trackingUrl;
        const mappedOrderStatus = mapExpressbeesToOrderStatus(rawStatus);
        const transition = mappedOrderStatus
          ? applyOrderStatusTransition(order, mappedOrderStatus, {
              source,
            })
          : { updated: false, reason: "no_status" };

        const shipmentSync = await syncShipmentStateOnOrder({
          order,
          awb,
          status: rawStatus,
          trackingUrl: extractTrackingUrl(data),
          source,
        });

        const shipmentChanged =
          previousLegacyShipmentStatus !== order.shipment_status ||
          previousCanonicalShipmentStatus !== order.shipmentStatus ||
          previousTrackingUrl !== order.trackingUrl;
        if (!transition.updated && !shipmentChanged) {
          summary.skipped += 1;
          continue;
        }

        if (order.shipmentStatus === "delivered") {
          order.deliveryDate = order.deliveryDate || new Date();
        }

        order.updatedAt = new Date();
        await order.save();

        syncOrderToFirestore(order, "update").catch((err) =>
          logger.error("expressbeesPoll", "Failed to sync to Firestore", {
            orderId: order._id,
            error: err.message,
          }),
        );

        emitOrderStatusUpdate(order, source);
        summary.updated += 1;

        if (
          ["delivered", "completed"].includes(String(order.order_status || "").toLowerCase()) &&
          !order.isInvoiceGenerated
        ) {
          ensureOrderInvoice(order).catch((err) =>
            logger.error("expressbeesPoll", "Failed to auto-generate invoice", {
              orderId: order._id,
              awb,
              error: err.message,
            }),
          );
        }

        logger.info("expressbeesPoll", "Tracking polled", {
          source,
          orderId: order._id,
          awb,
          status: rawStatus,
          mappedStatus: mappedOrderStatus || null,
          shipmentStatus: shipmentSync?.canonicalStatus || null,
          transition: transition.reason || (transition.updated ? "updated" : "skipped"),
        });
      } catch (err) {
        summary.failed += 1;
        logger.error("expressbeesPoll", "Tracking poll failed", {
          orderId: order?._id,
          awb: order?.awb_number,
          error: err.message,
        });
      }
    }
    return summary;
  } finally {
    pollingInFlight = false;
  }
};

export const startExpressbeesPolling = () => {
  if (!isEnabled()) {
    logger.info("expressbeesPoll", "Polling disabled", {
      configured:
        process.env.XPRESSBEES_POLL_ENABLED !== undefined
          ? process.env.XPRESSBEES_POLL_ENABLED
          : "auto",
      hasCredentials: hasXpressbeesCredentials(),
      environment: process.env.NODE_ENV || "development",
    });
    return null;
  }

  const { intervalMs } = getPollingConfig();
  const runScheduledJob = () =>
    runWithBackgroundJobLease({
      jobKey: "expressbees-polling",
      intervalMs,
      task: pollExpressbeesTracking,
    }).catch((error) => {
      logger.error("expressbeesPoll", "Polling lease coordination failed", {
        error: error?.message || String(error),
      });
    });

  pollingTimer = setInterval(runScheduledJob, intervalMs);
  void runScheduledJob();
  logger.info("expressbeesPoll", "Polling started", { intervalMs });
  return pollingTimer;
};

export const stopExpressbeesPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
};
