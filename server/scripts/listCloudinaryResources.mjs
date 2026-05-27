import dotenv from 'dotenv';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

// Load server .env explicitly
const envPath = path.resolve(process.cwd(), 'server', '.env');
dotenv.config({ path: envPath });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

(async () => {
  try {
    const res = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'buyonegram/',
      max_results: 100,
      direction: 'desc'
    });
    console.log(JSON.stringify({ success: true, count: res.resources.length, resources: res.resources.map(r => ({ public_id: r.public_id, secure_url: r.secure_url, format: r.format, bytes: r.bytes })) }, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ success: false, error: String(err?.message || err) }));
    process.exit(1);
  }
})();
