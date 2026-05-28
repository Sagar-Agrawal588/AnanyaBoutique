import "dotenv/config";
import ExcelJS from "exceljs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import UserModel from "../models/user.model.js";

const baseUrl =
  process.env.API_BASE_URL?.trim() ||
  "https://healthyonegram-backend-xb7znoco6a-uc.a.run.app";
const mongoUri =
  process.env.MONGODB_URI?.trim() ||
  process.env.MONGO_URI?.trim() ||
  process.env.MONGODB_URL?.trim() ||
  "";
const secret =
  process.env.ACCESS_TOKEN_SECRET?.trim() ||
  process.env.SECRET_KEY_ACCESS_TOKEN?.trim() ||
  process.env.JSON_WEB_TOKEN_SECRET_KEY?.trim() ||
  "";

if (!mongoUri) {
  throw new Error("Missing MongoDB URI in environment.");
}
if (!secret) {
  throw new Error("Missing access token secret in environment.");
}

const startDate = process.argv[2] || "2026-02-01";
const endDate = process.argv[3] || "2026-03-20";
const includeRto = "true";

let conn;
try {
  conn = await mongoose.connect(mongoUri);

  const admin = await UserModel.findOne({ role: "Admin", status: "active" })
    .select("_id email role status")
    .lean();

  if (!admin?._id) {
    throw new Error("No active admin user found in DB.");
  }

  const token = jwt.sign({ id: String(admin._id) }, secret, {
    expiresIn: "10m",
  });

  const url = `${baseUrl.replace(/\/+$/, "")}/api/admin/orders/export?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&includeRto=${includeRto}`;

  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    const bodyText = await resp.text();
    throw new Error(
      `Export request failed with HTTP ${resp.status}: ${bodyText.slice(0, 250)}`,
    );
  }

  const arrayBuffer = await resp.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(arrayBuffer));
  const worksheet =
    workbook.getWorksheet("Order Report") || workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("No worksheet found in export response.");
  }

  const headers = worksheet
    .getRow(1)
    .values.slice(1)
    .map((value) => String(value || "").trim());
  const paidIndex = headers.findIndex((header) =>
    header.toLowerCase().includes("customer paid (after discount)"),
  );

  console.log("status=ok");
  console.log(`base_url=${baseUrl}`);
  console.log(`header_count=${headers.length}`);
  console.log(`paid_col_index=${paidIndex >= 0 ? paidIndex + 1 : -1}`);
  console.log(`headers=${headers.join(" | ")}`);
} finally {
  if (conn) {
    await mongoose.disconnect();
  }
}
