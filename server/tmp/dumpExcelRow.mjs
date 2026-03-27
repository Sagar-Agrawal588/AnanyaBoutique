import ExcelJS from "exceljs";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import "dotenv/config";
import UserModel from "../models/user.model.js";

const base_url = "http://localhost:8000";
const secret = process.env.ACCESS_TOKEN_SECRET || process.env.SECRET_KEY_ACCESS_TOKEN || "";
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "";

async function testExcel() {
  let conn;
  try {
    conn = await mongoose.connect(mongoUri);
    const admin = await UserModel.findOne({ role: "Admin" }).select("_id").lean();
    const token = jwt.sign({ id: String(admin._id) }, secret, { expiresIn: "10m" });

    const resp = await fetch(`${base_url}/api/admin/orders/export?startDate=2026-02-01&endDate=2026-03-27&includeRto=true`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(await resp.arrayBuffer()));
    const ws = wb.worksheets[0];

    console.log("=== ROW 2 ALL COLUMNS ===\n");
    
    const row1 = ws.getRow(1);
    const row2 = ws.getRow(2);

    // Print headers
    console.log("HEADERS:");
    for (let i = 1; i <= 19; i++) {
      const header = row1.getCell(i).value;
      console.log(`  [${i}] ${header}`);
    }

    console.log("\nROW 2 VALUES:");
    for (let i = 1; i <= 19; i++) {
      const value = row2.getCell(i).value;
      console.log(`  [${i}] ${value}`);
    }

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    if (conn) await mongoose.disconnect();
  }
}

testExcel();
