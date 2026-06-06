import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Storage } from "@google-cloud/storage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const normalizeEnvValue = (value) =>
  String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");

const projectId = normalizeEnvValue(process.env.FIREBASE_PROJECT_ID);
const clientEmail = normalizeEnvValue(process.env.FIREBASE_CLIENT_EMAIL);
const privateKey = normalizeEnvValue(process.env.FIREBASE_PRIVATE_KEY).replace(
  /\\n/g,
  "\n",
);
const inferredBucketName = normalizeEnvValue(
  process.env.GCS_MEDIA_BUCKET ||
    process.env.GOOGLE_CLOUD_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    (projectId ? `${projectId}.firebasestorage.app` : ""),
).replace(/^gs:\/\//i, "");

const bucketPublicBaseUrl = normalizeEnvValue(
  process.env.GCS_MEDIA_PUBLIC_BASE_URL,
).replace(/\/+$/, "");

const folderArgs = process.argv.slice(2).filter(Boolean);
const folders =
  folderArgs.length > 0
    ? folderArgs
    : ["ananyaboutique/slides", "ananyaboutique/banners", "ananyaboutique/products"];

const buildPublicUrl = (bucketName, objectPath) => {
  const encodedPath = String(objectPath || "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  if (bucketPublicBaseUrl) {
    return `${bucketPublicBaseUrl}/${encodedPath}`;
  }

  return `https://storage.googleapis.com/${bucketName}/${encodedPath}`;
};

const summarizeObject = (bucketName, file) => ({
  name: file.name,
  url: buildPublicUrl(bucketName, file.name),
  updated: file.metadata?.updated || null,
  size: Number(file.metadata?.size || 0),
  contentType: file.metadata?.contentType || "",
  cacheControl: file.metadata?.cacheControl || "",
});

const run = async () => {
  if (!projectId) {
    throw new Error("Missing FIREBASE_PROJECT_ID in server/.env");
  }

  if (!inferredBucketName) {
    throw new Error(
      "Missing bucket config. Set GCS_MEDIA_BUCKET, FIREBASE_STORAGE_BUCKET, or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.",
    );
  }

  const storageClientConfig = { projectId };
  if (clientEmail && privateKey) {
    storageClientConfig.credentials = {
      client_email: clientEmail,
      private_key: privateKey,
    };
  }

  const storage = new Storage(storageClientConfig);
  const bucket = storage.bucket(inferredBucketName);

  const result = {
    projectId,
    bucket: inferredBucketName,
    folders: {},
  };

  for (const folder of folders) {
    const [files] = await bucket.getFiles({ prefix: folder });
    result.folders[folder] = files
      .filter((file) => !file.name.endsWith("/"))
      .map((file) => summarizeObject(inferredBucketName, file));
  }

  console.log(JSON.stringify(result, null, 2));
};

run().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
