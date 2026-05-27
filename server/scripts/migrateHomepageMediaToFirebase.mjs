import { randomUUID } from "crypto";
import fs from "fs/promises";
import mongoose from "mongoose";
import { Storage } from "@google-cloud/storage";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(".env") });

const projectId = String(
  process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || "",
).trim();
const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || "").trim();
const privateKey = String(process.env.FIREBASE_PRIVATE_KEY || "")
  .replace(/^\\s*"|"\s*$/g, "")
  .replace(/\\n/g, "\n");
const mongoUri = String(process.env.MONGO_URI || process.env.MONGODB_URI || "").trim();
const bucketName = String(
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    (projectId ? `${projectId}.firebasestorage.app` : ""),
).trim();

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Missing Firebase service account credentials in server/.env");
}

if (!mongoUri) {
  throw new Error("Missing MONGO_URI/MONGODB_URI in server/.env");
}

if (!bucketName) {
  throw new Error("Missing Firebase storage bucket name");
}

const storage = new Storage({
  projectId,
  credentials: {
    client_email: clientEmail,
    private_key: privateKey,
  },
});

const homepageMediaMap = {
  homeSlides: [
    { title: "Pure Peanut Goodness", localFile: "slide_1.webp", folder: "buyonegram/slides" },
    { title: "New: Chocolate Peanut Butter", localFile: "slide_2.webp", folder: "buyonegram/slides" },
    { title: "Fuel Your Workout", localFile: "slide_3.webp", folder: "buyonegram/slides" },
  ],
  banners: [
    { title: "Free Delivery", localFile: "prodImage1.webp", folder: "buyonegram/banners" },
    { title: "Subscribe & Save 10%", localFile: "prodImage2.webp", folder: "buyonegram/banners" },
  ],
};

const buildFirebaseDownloadUrl = (objectPath, token) =>
  `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
    objectPath,
  )}?alt=media&token=${token}`;

const uploadLocalAsset = async ({ localFile, folder }) => {
  const localPath = path.resolve("../frontend/client/public", localFile);
  const fileBuffer = await fs.readFile(localPath);
  const token = randomUUID();
  const objectPath = `${folder}/${Date.now()}-${localFile}`;
  const bucket = storage.bucket(bucketName);
  const remoteFile = bucket.file(objectPath);

  await remoteFile.save(fileBuffer, {
    resumable: false,
    metadata: {
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  return {
    objectPath,
    token,
    url: buildFirebaseDownloadUrl(objectPath, token),
  };
};

await mongoose.connect(mongoUri);

try {
  const db = mongoose.connection.db;
  const homeSlidesCollection = db.collection("homeslides");
  const bannersCollection = db.collection("banners");

  const updates = {
    homeSlides: [],
    banners: [],
  };

  for (const item of homepageMediaMap.homeSlides) {
    const upload = await uploadLocalAsset(item);
    const result = await homeSlidesCollection.updateOne(
      { title: item.title },
      { $set: { image: upload.url } },
    );
    updates.homeSlides.push({
      title: item.title,
      image: upload.url,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  }

  for (const item of homepageMediaMap.banners) {
    const upload = await uploadLocalAsset(item);
    const result = await bannersCollection.updateOne(
      { title: item.title },
      { $set: { image: upload.url } },
    );
    updates.banners.push({
      title: item.title,
      image: upload.url,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  }

  console.log(JSON.stringify({ bucketName, updates }, null, 2));
} finally {
  await mongoose.disconnect();
}
