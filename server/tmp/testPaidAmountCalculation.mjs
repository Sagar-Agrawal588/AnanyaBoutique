import ExcelJS from "exceljs";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import "dotenv/config";
import UserModel from "../models/user.model.js";

const base_url = "http://localhost:8000";
const secret = process.env.ACCESS_TOKEN_SECRET || process.env.SECRET_KEY_ACCESS_TOKEN || "your_secret_key";
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "";

if (!mongoUri) {
  console.error("Missing MONGODB_URI in environment");
  process.exit(1);
}

let conn;

async function testCalculation() {
  try {
    // Connect to MongoDB
    conn = await mongoose.connect(mongoUri);

    // Get admin user from database
    const admin = await UserModel.findOne({ role: "Admin", status: "active" })
      .select("_id email role status")
      .lean();

    if (!admin?._id) {
      throw new Error("No active admin user found in DB.");
    }

    // Generate token using real admin user ID
    const token = jwt.sign({ id: String(admin._id) }, secret, { expiresIn: "10m" });
    console.log(`✓ Generated admin token using user: ${admin.email}\n`);

    const url = `${base_url}/api/admin/orders/export?startDate=2026-02-01&endDate=2026-03-27&includeRto=true`;
    
    const resp = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!resp.ok) {
      console.error(`❌ HTTP ${resp.status}: ${resp.statusText}`);
      console.log(await resp.text());
      return;
    }

    const arrayBuffer = await resp.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(arrayBuffer));
    const ws = wb.worksheets[0];

    console.log("=== PAID AMOUNT CALCULATION TEST ===\n");
    console.log("Data from export (showing rows where paid amount was calculated):\n");

    const headers = ws.getRow(1).values.slice(1);
    const priceIdx = headers.findIndex(h => String(h || "").toLowerCase().includes("price")) + 1;
    const totalDiscountIdx = headers.findIndex(h => String(h || "").trim() === "Total Discount (Rs)") + 1;
    const paidIdx = headers.findIndex(h => String(h || "").includes("Customer Paid (After Discount)")) + 1;
    const productIdx = headers.findIndex(h => String(h || "").includes("Product Name")) + 1;
    const customerIdx = headers.findIndex(h => String(h || "").includes("Customer")) + 1;

    console.log(`Relevant columns: Price[${priceIdx}], Total Discount[${totalDiscountIdx}], Paid[${paidIdx}], Product[${productIdx}], Customer[${customerIdx}]\n`);

    let rowCount = 0;
    let zeroCount = 0;

    for (let i = 2; i <= Math.min(ws.rowCount, 50); i++) {
      const row = ws.getRow(i);
      const product = String(row.getCell(productIdx).value || "").trim();
      const customer = String(row.getCell(customerIdx).value || "").trim();
      const price = Number(row.getCell(priceIdx).value || 0);
      const totalDiscount = Number(row.getCell(totalDiscountIdx).value || 0);
      const paidAmount = Number(row.getCell(paidIdx).value || 0);

      if (!product) continue;
      rowCount++;

      if (paidAmount === 0 && price > 0) {
        zeroCount++;
        console.log(`❌ ROW ${i} - ZERO PAID AMOUNT FOUND:`);
        console.log(`   Product: ${product}`);
        console.log(`   Customer: ${customer}`);
        console.log(`   Price: ${price}, Total Discount: ${totalDiscount}, Paid: ${paidAmount}`);
        console.log();
      }
    }

    console.log(`\n📊 Summary: Checked ${rowCount} rows`);
    if (zeroCount === 0) {
      console.log(`✅ NO ZERO VALUES FOUND - All calculations working correctly!`);
    } else {
      console.log(`⚠️  Found ${zeroCount} rows with zero paid amounts that shouldn't be zero`);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    if (conn) {
      await mongoose.disconnect();
    }
  }
}

testCalculation();
