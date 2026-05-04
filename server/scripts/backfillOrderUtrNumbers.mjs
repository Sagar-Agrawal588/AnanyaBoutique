import connectDb from "../config/connectDb.js";
import OrderModel from "../models/order.model.js";

const shouldApply = process.argv.includes("--apply");
const limitArg = process.argv.find((arg) => String(arg || "").startsWith("--limit="));
const limit = Math.max(Number(limitArg?.split("=")[1] || 0), 0);

const extractUTR = (txnId) => {
  const match = String(txnId || "").match(/\d{12,16}/);
  return match ? match[0] : null;
};

const run = async () => {
  await connectDb();

  const filter = {
    $and: [
      {
        $or: [
          { utrNumber: null },
          { utrNumber: "" },
          { utrNumber: { $exists: false } },
        ],
      },
      {
        $or: [
          { paymentAppTxnId: { $exists: true, $nin: [null, ""] } },
          { paymentId: { $exists: true, $nin: [null, ""] } },
          { paytmTransactionId: { $exists: true, $nin: [null, ""] } },
          { phonepeTransactionId: { $exists: true, $nin: [null, ""] } },
        ],
      },
    ],
  };

  let query = OrderModel.find(filter).sort({ createdAt: -1 });
  if (limit > 0) query = query.limit(limit);

  const orders = await query.select(
    "_id utrNumber paymentAppTxnId paymentId paytmTransactionId phonepeTransactionId",
  );

  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  for (const order of orders) {
    scanned += 1;
    const paymentAppTxnId =
      order.paymentAppTxnId ||
      order.paymentId ||
      order.paytmTransactionId ||
      order.phonepeTransactionId ||
      "";
    const utr = extractUTR(paymentAppTxnId);
    if (!utr) {
      skipped += 1;
      continue;
    }

    if (shouldApply) {
      order.utrNumber = utr;
      if (!order.paymentAppTxnId) order.paymentAppTxnId = paymentAppTxnId;
      await order.save();
    }
    updated += 1;
  }

  console.log(
    `[${shouldApply ? "apply" : "dry-run"}] scanned=${scanned} updated=${updated} skipped=${skipped}`,
  );
  process.exit(0);
};

run().catch((error) => {
  console.error("UTR backfill failed:", error);
  process.exit(1);
});
