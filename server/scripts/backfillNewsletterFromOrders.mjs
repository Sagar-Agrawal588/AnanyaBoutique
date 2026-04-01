import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  console.error("Missing MONGODB_URI/MONGO_URI");
  process.exit(1);
}

await mongoose.connect(uri);

const db = mongoose.connection.db;
const ordersCol = db.collection("orders");
const newsletterCol = db.collection("newsletters");
const usersCol = db.collection("users");

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const orders = await ordersCol
  .find(
    {},
    {
      projection: {
        user: 1,
        guestDetails: 1,
        billingDetails: 1,
        deliveryAddressSnapshot: 1,
        createdAt: 1,
      },
    },
  )
  .toArray();

let scanned = 0;
let candidate = 0;
let insertedOrUpdated = 0;
let skipped = 0;

for (const order of orders) {
  scanned += 1;
  const fromOrder = normalize(
    order?.billingDetails?.email ||
      order?.guestDetails?.email ||
      order?.deliveryAddressSnapshot?.email ||
      "",
  );

  let email = fromOrder;

  if (!email && order?.user) {
    const user = await usersCol.findOne(
      { _id: order.user },
      { projection: { email: 1 } },
    );
    email = normalize(user?.email || "");
  }

  if (!email || !isValidEmail(email)) {
    skipped += 1;
    continue;
  }

  candidate += 1;

  const source = order?.user ? "signin_order" : "guest_order";
  const result = await newsletterCol.updateOne(
    { email },
    {
      $setOnInsert: {
        email,
        createdAt: order?.createdAt || new Date(),
        subscribedAt: order?.createdAt || new Date(),
      },
      $set: {
        isActive: true,
        source,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );

  if (result.upsertedCount > 0 || result.modifiedCount > 0) {
    insertedOrUpdated += 1;
  }
}

const bySource = await newsletterCol
  .aggregate([
    { $group: { _id: "$source", c: { $sum: 1 } } },
    { $sort: { c: -1 } },
  ])
  .toArray();

console.log(
  JSON.stringify(
    {
      scanned,
      candidate,
      insertedOrUpdated,
      skipped,
      bySource,
    },
    null,
    2,
  ),
);

await mongoose.disconnect();
