import mongoose from "mongoose";
import "dotenv/config";
import OrderModel from "../models/order.model.js";

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "";

if (!mongoUri) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

async function checkOrderData() {
  let conn;
  try {
    conn = await mongoose.connect(mongoUri);

    // Find an order with "Extra Crunchy peanut Butter" product
    const order = await OrderModel.findOne({
      "products.productTitle": { $regex: "Extra Crunchy", $options: "i" },
      payment_status: { $in: ["paid", "confirmed", "PAID", "CONFIRMED"] },
    }).lean();

    if (!order) {
      console.log("Order not found");
      return;
    }

    console.log("=== ORDER DATA ===");
    console.log(JSON.stringify({
      _id: order._id,
      totalAmt: order.totalAmt,
      subtotal: order.subtotal,
      discount: order.discount,
      discountAmount: order.discountAmount,
      products_count: order.products?.length,
    }, null, 2));

    console.log("\n=== PRODUCTS ===");
    order.products?.forEach((p, i) => {
      console.log(`Product ${i}:`, {
        productTitle: p.productTitle,
        quantity: p.quantity,
        price: p.price,
        subTotal: p.subTotal,
      });
    });

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    if (conn) await mongoose.disconnect();
  }
}

checkOrderData();
