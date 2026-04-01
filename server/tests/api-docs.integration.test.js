import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import ApiDocument from "../models/apiDocument.model.js";
import UserModel from "../models/user.model.js";
import { UPLOAD_ROOT } from "../middlewares/upload.js";
import apiDocumentRouter from "../routes/apiDocument.route.js";

let mongoServer;
let httpServer;
let baseUrl = "";
let adminToken = "";
let uploadedFiles = [];

const requestJson = async (relativePath, options = {}) => {
  const response = await fetch(`${baseUrl}${relativePath}`, options);
  const payload =
    response.status === 204 ? null : await response.json().catch(() => null);
  return { response, payload };
};

const adminRequest = async (relativePath, options = {}) => {
  const headers = {
    Authorization: `Bearer ${adminToken}`,
    ...(options.headers || {}),
  };

  return requestJson(relativePath, { ...options, headers });
};

const buildPdfBlob = () => {
  // Minimal PDF header/footer (not a full document, but good enough for upload + download checks).
  const bytes = Buffer.from(
    "%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\nxref\n0 1\n0000000000 65535 f \ntrailer\n<<>>\nstartxref\n0\n%%EOF\n",
    "utf8",
  );
  return new Blob([bytes], { type: "application/pdf" });
};

const extractUploadedFileName = (fileUrl) => {
  const pathname = new URL(String(fileUrl)).pathname;
  const parts = pathname.split("/");
  return parts[parts.length - 1] || "";
};

test.before(async () => {
  process.env.ACCESS_TOKEN_SECRET = "api-docs-integration-test-secret-0123456789";

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: "bogEcom-api-docs-test" });

  const admin = await UserModel.create({
    name: "QA Admin",
    email: "qa-admin@example.com",
    password: "Password@123",
    role: "Admin",
    status: "active",
  });

  adminToken = jwt.sign({ id: String(admin._id) }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });

  const app = express();
  app.use(express.json());
  app.use("/uploads", express.static(UPLOAD_ROOT));
  app.use("/api/api-docs", apiDocumentRouter);
  app.use((err, _req, res, _next) => {
    res.status(err?.status || 500).json({
      success: false,
      message: err?.message || "Internal server error",
    });
  });

  httpServer = await new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });

  const { port } = httpServer.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.afterEach(async () => {
  await ApiDocument.deleteMany({});

  for (const filePath of uploadedFiles) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // ignore
    }
  }
  uploadedFiles = [];
});

test.after(async () => {
  if (httpServer) {
    await new Promise((resolve, reject) => {
      httpServer.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  await Promise.all([ApiDocument.deleteMany({}), UserModel.deleteMany({})]);
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

test("API docs: admin can upload PDF, list it, share it, and delete it", async () => {
  const formData = new FormData();
  formData.append("title", "Partner API Guide (PDF)");
  formData.append("description", "QA upload");
  formData.append("isPublic", "true");
  formData.append("pdf", buildPdfBlob(), "partner-guide.pdf");

  const created = await adminRequest("/api/api-docs/admin/create", {
    method: "POST",
    body: formData,
  });

  assert.equal(created.response.status, 201);
  assert.equal(created.payload?.success, true);
  assert.ok(created.payload?.data?.id);
  assert.ok(created.payload?.data?.slug);
  assert.ok(created.payload?.data?.fileUrl);
  assert.ok(created.payload?.data?.shareUrl);

  const fileName = extractUploadedFileName(created.payload.data.fileUrl);
  assert.ok(fileName.endsWith(".pdf"));

  const absolutePath = path.resolve(UPLOAD_ROOT, "api-docs", fileName);
  assert.ok(fs.existsSync(absolutePath));
  uploadedFiles.push(absolutePath);

  const listAdmin = await adminRequest("/api/api-docs/admin/all");
  assert.equal(listAdmin.response.status, 200);
  assert.equal(listAdmin.payload?.success, true);
  assert.equal(Array.isArray(listAdmin.payload?.data), true);
  assert.ok(listAdmin.payload.data.some((doc) => doc.id === created.payload.data.id));

  const listPublic = await requestJson("/api/api-docs/public");
  assert.equal(listPublic.response.status, 200);
  assert.equal(listPublic.payload?.success, true);
  assert.ok(listPublic.payload.data.some((doc) => doc.id === created.payload.data.id));

  const shareRedirect = await fetch(`${baseUrl}/api/api-docs/public/${created.payload.data.slug}`, {
    redirect: "manual",
  });
  assert.equal(shareRedirect.status, 302);
  const redirectLocation = shareRedirect.headers.get("location");
  assert.ok(redirectLocation);

  const pdfResponse = await fetch(String(redirectLocation));
  assert.equal(pdfResponse.status, 200);
  assert.ok(String(pdfResponse.headers.get("content-type") || "").includes("application/pdf"));

  const shareJson = await requestJson(`/api/api-docs/public/${created.payload.data.slug}?format=json`);
  assert.equal(shareJson.response.status, 200);
  assert.equal(shareJson.payload?.success, true);
  assert.equal(shareJson.payload?.data?.id, created.payload.data.id);

  const toggled = await adminRequest(`/api/api-docs/admin/${created.payload.data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isPublic: false }),
  });
  assert.equal(toggled.response.status, 200);
  assert.equal(toggled.payload?.success, true);
  assert.equal(toggled.payload?.data?.isPublic, false);

  const afterToggle = await requestJson("/api/api-docs/public");
  assert.equal(afterToggle.response.status, 200);
  assert.equal(afterToggle.payload?.success, true);
  assert.ok(!afterToggle.payload.data.some((doc) => doc.id === created.payload.data.id));

  const privateShare = await requestJson(`/api/api-docs/public/${created.payload.data.slug}?format=json`);
  assert.equal(privateShare.response.status, 404);

  const deleted = await adminRequest(`/api/api-docs/admin/${created.payload.data.id}`, {
    method: "DELETE",
  });
  assert.equal(deleted.response.status, 200);
  assert.equal(deleted.payload?.success, true);

  assert.ok(!fs.existsSync(absolutePath));
});
