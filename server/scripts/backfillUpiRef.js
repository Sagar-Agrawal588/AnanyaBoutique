import connectDb from "../config/connectDb.js";
import OrderModel from "../models/order.model.js";
import { getPhonePeOrderStatus } from "../services/phonepe.service.js";

const shouldApply = process.argv.includes("--apply");
const limitArg = process.argv.find((arg) =>
  String(arg || "").startsWith("--limit="),
);
const delayArg = process.argv.find((arg) =>
  String(arg || "").startsWith("--delay-ms="),
);
const orderIdArg = process.argv.find((arg) =>
  String(arg || "").startsWith("--order-id="),
);

const limit = Math.max(Number(limitArg?.split("=")[1] || 0), 0);
const delayMs = Math.max(Number(delayArg?.split("=")[1] || 700), 0);
const singleOrderId = String(orderIdArg?.split("=")[1] || "").trim();

const VALID_UPI_REF_REGEX = /^[0-9]{12,16}$/;
const SUCCESS_PAYMENT_STATUSES = ["paid", "confirmed", "captured", "success", "successful"];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isValidUPIRef = (ref) => VALID_UPI_REF_REGEX.test(String(ref || "").trim());

const extractUpiRefFromStatus = (statusPayload = {}) => {
  const paymentDetails = Array.isArray(statusPayload?.paymentDetails)
    ? statusPayload.paymentDetails
    : [];
  const firstPayment = paymentDetails[0] || {};

  const candidates = [
    firstPayment?.providerReferenceId,
    firstPayment?.utr,
    firstPayment?.rrn,
    firstPayment?.bankTransactionId,
    statusPayload?.providerReferenceId,
    statusPayload?.utr,
    statusPayload?.rrn,
    statusPayload?.bankTransactionId,
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate || "").trim();
    if (isValidUPIRef(normalized)) {
      return normalized;
    }
  }

  return "";
};

const buildTargetFilter = () => {
  const invalidRefFilter = {
    $or: [
      { upiRef: null },
      { upiRef: { $exists: false } },
      { upiRef: { $not: VALID_UPI_REF_REGEX } },
    ],
  };

  const successFilter = {
    $or: [
      { payment_status: { $in: SUCCESS_PAYMENT_STATUSES } },
      { paymentStatus: { $in: ["SUCCESS", "PAID", "success", "paid"] } },
    ],
  };

  const phonepeFilter = {
    $or: [
      { paymentMethod: { $regex: /^phonepe$/i } },
      { payment_method: { $regex: /^phonepe$/i } },
      { phonepeMerchantOrderId: { $exists: true, $nin: [null, ""] } },
      { phonepeOrderId: { $exists: true, $nin: [null, ""] } },
    ],
  };

  if (singleOrderId) {
    return { _id: singleOrderId };
  }

  return {
    $and: [invalidRefFilter, successFilter, phonepeFilter],
  };
};

const resolveMerchantOrderId = (order) =>
  String(
    order?.phonepeMerchantOrderId ||
      order?.merchantTransactionId ||
      order?.paymentId ||
      "",
  ).trim();

const run = async () => {
  console.log(
    shouldApply
      ? "[apply] Starting PhonePe UPI ref backfill."
      : "[dry-run] Starting PhonePe UPI ref backfill. Use --apply to persist.",
  );
  console.log(
    `[config] delay=${delayMs}ms limit=${limit || "all"} orderId=${singleOrderId || "all"}`,
  );

  await connectDb();

  let query = OrderModel.find(buildTargetFilter()).sort({ createdAt: -1 });
  if (limit > 0) {
    query = query.limit(limit);
  }

  const orders = await query
    .select(
      "_id payment_status paymentStatus paymentId paymentMethod payment_method phonepeMerchantOrderId phonepeOrderId phonepeTransactionId upiRef upiReferenceNumber",
    )
    .exec();

  console.log(`[scan] found ${orders.length} candidate orders`);

  const summary = {
    scanned: 0,
    updated: 0,
    skippedNoMerchantId: 0,
    skippedInvalidRef: 0,
    failed: 0,
  };
  const failedOrderIds = [];

  for (const order of orders) {
    summary.scanned += 1;
    const orderId = String(order?._id || "").trim();
    const merchantOrderId = resolveMerchantOrderId(order);

    if (!merchantOrderId || !merchantOrderId.startsWith("BOG_")) {
      summary.skippedNoMerchantId += 1;
      console.log(
        `[skip:no-merchant-id] order=${orderId} merchantOrderId=${merchantOrderId || "N/A"}`,
      );
      continue;
    }

    try {
      const statusPayload = await getPhonePeOrderStatus({ merchantOrderId });
      const upiRef = extractUpiRefFromStatus(statusPayload);

      if (!isValidUPIRef(upiRef)) {
        summary.skippedInvalidRef += 1;
        console.log(`[skip:invalid-ref] order=${orderId} merchantOrderId=${merchantOrderId}`);
      } else if (shouldApply) {
        order.upiRef = upiRef;
        order.upiReferenceNumber = upiRef;
        order.upiReferenceNo = upiRef;
        order.rrn = upiRef;
        order.utr = upiRef;
        await order.save();
        summary.updated += 1;
        console.log(`[updated] order=${orderId} upiRef=${upiRef}`);
      } else {
        summary.updated += 1;
        console.log(`[dry-run:update] order=${orderId} upiRef=${upiRef}`);
      }
    } catch (error) {
      summary.failed += 1;
      failedOrderIds.push(orderId);
      console.error(
        `[failed] order=${orderId} merchantOrderId=${merchantOrderId} error=${error?.message || error}`,
      );
    }

    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  console.log(
    `[summary] scanned=${summary.scanned} updated=${summary.updated} skippedNoMerchantId=${summary.skippedNoMerchantId} skippedInvalidRef=${summary.skippedInvalidRef} failed=${summary.failed}`,
  );
  if (failedOrderIds.length > 0) {
    console.log("[failed-order-ids]", failedOrderIds.join(","));
  }

  process.exit(0);
};

run().catch((error) => {
  console.error("UPI ref backfill failed:", error);
  process.exit(1);
});
