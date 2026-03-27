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

async function checkHeaders() {
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
    console.log(`✓ Generated admin token using user: ${admin.email}`);

    const url = `${base_url}/api/admin/orders/export?startDate=2026-02-01&endDate=2026-03-27&includeRto=true`;
    console.log(`✓ Fetching from ${url}...\n`);
    
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

    const headers = ws.getRow(1).values.slice(1).map((v) => String(v || "").trim());
    const paidIndex = headers.findIndex((h) =>
      h.toLowerCase().includes("customer paid (after discount)")
    );

    console.log("=== LOCAL EXPORT VERIFICATION ===");
    console.log(`✓ status=ok`);
    console.log(`✓ base_url=${base_url}`);
    console.log(`✓ header_count=${headers.length}`);
    console.log(`✓ paid_col_index=${paidIndex >= 0 ? paidIndex + 1 : -1}`);
    console.log(`\n📋 Headers returned:`);
    headers.forEach((h, i) => console.log(`  [${i + 1}] ${h}`));
    
    if (paidIndex >= 0) {
      console.log(`\n✅ SUCCESS: "Customer Paid (After Discount)" found at column ${paidIndex + 1}!`);
    } else {
      console.log(`\n❌ FAIL: "Customer Paid (After Discount)" column NOT found`);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    if (conn) {
      await mongoose.disconnect();
    }
  }
}

checkHeaders();
