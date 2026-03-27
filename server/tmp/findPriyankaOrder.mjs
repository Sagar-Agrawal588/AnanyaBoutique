import mongoose from "mongoose";
import "dotenv/config";
import OrderModel from "../models/order.model.js";

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "";

if (!mongoUri) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

async function findPriyankaOrder() {
  let conn;
  try {
    conn = await mongoose.connect(mongoUri);

    // Find Priyanka's order
    const orders = await OrderModel.find({
      $or: [
        { "billingDetails.fullName": { $regex: "PRIYANKA", $options: "i" } },
        { "deliveryAddressSnapshot.order_name": { $regex: "PRIYANKA", $options: "i" } },
        { "guestDetails.fullName": { $regex: "PRIYANKA", $options: "i" } },
      ],
      payment_status: { $in: ["paid", "confirmed", "PAID", "CONFIRMED"] },
    })
      .lean()
      .limit(5);

    if (!orders.length) {
      console.log("No Priyanka orders found");
      return;
    }

    orders.forEach((order, idx) => {
      console.log(`\n=== ORDER ${idx + 1} ===`);
      const customerName =
        order.billingDetails?.fullName ||
        order.deliveryAddressSnapshot?.order_name ||
        order.guestDetails?.fullName ||
        "Unknown";

      console.log(JSON.stringify({
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerName,
        totalAmt: order.totalAmt,
        subtotal: order.subtotal,
        discount: order.discount,
        products: order.products?.map((p) => ({
          title: p.productTitle.slice(0, 30),
          qty: p.quantity,
          price: p.price,
          subTotal: p.subTotal,
        })),
      }, null, 2));
    });

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    if (conn) await mongoose.disconnect();
  }
}

findPriyankaOrder();
