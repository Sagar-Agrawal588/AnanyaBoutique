import dotenv from "dotenv";
import fs from "fs/promises";
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
const bucketName = normalizeEnvValue(
  process.env.GCS_MEDIA_BUCKET ||
    process.env.GOOGLE_CLOUD_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    (projectId ? `${projectId}.firebasestorage.app` : ""),
).replace(/^gs:\/\//i, "");

const prefix = String(process.argv[2] || "").trim();
const outputRoot = path.resolve(
  process.cwd(),
  process.argv[3] || "../tmp/firebase-media-export",
);

const buildStorageClient = () => {
  const config = { projectId };
  if (clientEmail && privateKey) {
    config.credentials = {
      client_email: clientEmail,
      private_key: privateKey,
    };
  }
  return new Storage(config);
};

const run = async () => {
  if (!projectId) {
    throw new Error("Missing FIREBASE_PROJECT_ID in server/.env");
  }

  if (!bucketName) {
    throw new Error(
      "Missing bucket config. Set GCS_MEDIA_BUCKET, FIREBASE_STORAGE_BUCKET, or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.",
    );
  }

  const storage = buildStorageClient();
  const bucket = storage.bucket(bucketName);
  const [files] = await bucket.getFiles(prefix ? { prefix } : {});
  const dataFiles = files.filter((file) => !file.name.endsWith("/"));

  await fs.mkdir(outputRoot, { recursive: true });

  for (const file of dataFiles) {
    const destination = path.join(outputRoot, file.name);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await file.download({ destination });
    console.log(`downloaded ${file.name} -> ${destination}`);
  }

  console.log(
    JSON.stringify(
      {
        projectId,
        bucket: bucketName,
        prefix: prefix || null,
        outputRoot,
        count: dataFiles.length,
      },
      null,
      2,
    ),
  );
};

run().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
