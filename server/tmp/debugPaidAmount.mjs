import ExcelJS from "exceljs";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import "dotenv/config";
import UserModel from "../models/user.model.js";

const base_url = "http://localhost:8000";
const secret = process.env.ACCESS_TOKEN_SECRET || process.env.SECRET_KEY_ACCESS_TOKEN || "your_secret_key";
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "";

async function testCalculation() {
  let conn;
  try {
    conn = await mongoose.connect(mongoUri);
    const admin = await UserModel.findOne({ role: "Admin", status: "active" })
      .select("_id").lean();

    if (!admin?._id) throw new Error("No active admin user found.");

    const token = jwt.sign({ id: String(admin._id) }, secret, { expiresIn: "10m" });

    const resp = await fetch(`${base_url}/api/admin/orders/export?startDate=2026-02-01&endDate=2026-03-27&includeRto=true`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!resp.ok) {
      console.error(`HTTP ${resp.status}`);
      return;
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(await resp.arrayBuffer()));
    const ws = wb.worksheets[0];

    console.log("=== DETAILED CALCULATION DEBUG ===\n");

    // Find column indices with better matching
    const headers = ws.getRow(1).values.slice(1);
    const findCol = (pattern) => {
      const idx = headers.findIndex(h => String(h || "").toLowerCase().includes(pattern.toLowerCase()));
      return idx >= 0 ? idx + 1 : -1;
    };

    const qtyIdx = findCol("quantity");
    const priceIdx = findCol("price");
    const totalDiscountIdx = findCol("total discount");
    const paidIdx = findCol("customer paid");
    const productIdx = findCol("product name");
    const customerIdx = findCol("customer");

    console.log(`Columns: Qty[${qtyIdx}], Price[${priceIdx}], Total Discount[${totalDiscountIdx}], Paid[${paidIdx}]\n`);

    // Show all data rows with non-zero processing
    for (let i = 2; i <= Math.min(ws.rowCount, 20); i++) {
      const row = ws.getRow(i);
      const product = String(row.getCell(productIdx).value || "").trim();
      const customer = String(row.getCell(customerIdx).value || "").trim();
      const qty = Number(row.getCell(qtyIdx).value || 0);
      const price = Number(row.getCell(priceIdx).value || 0);
      const totalDiscount = Number(row.getCell(totalDiscountIdx).value || 0);
      const paidAmount = Number(row.getCell(paidIdx).value || 0);

      if (!product || price === 0) continue;

      const expectedMin = Math.max(0, price - totalDiscount);
      const isWrong = paidAmount < expectedMin * 0.5; // Flag if suspiciously low

      console.log(`Row ${i}: ${product.slice(0, 30)}`);
      console.log(`  Customer: ${customer || "(empty)"}`);
      console.log(`  Qty: ${qty}, Price: ${price}, Total Discount: ${totalDiscount}`);
      console.log(`  Paid Amount: ${paidAmount} ${isWrong ? "❌ SUSPICIOUS" : "✓"}`);
      console.log();
    }

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    if (conn) await mongoose.disconnect();
  }
}

testCalculation();
